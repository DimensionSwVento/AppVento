#!/usr/bin/env node
/**
 * Level 2 of the analysis stage: coverage recommendation.
 *
 * One LLM call per run. The prompt carries the ENTIRE catalog, the gate
 * inventory, and this run's results, and asks which attributes are uncovered or
 * weakly covered and which catalog tests to implement next, in priority order.
 *
 * The hard constraint is that a recommended test must exist verbatim in the
 * `tests` list of the attribute it is recommended for. It is enforced three
 * times over:
 *   1. the response schema restricts suggestedTests to the union of catalog
 *      tests, so an outright invention is rejected by the provider;
 *   2. the prompt states the constraint explicitly;
 *   3. every suggestion is checked here against that specific attribute's tests,
 *      and anything else is dropped and recorded in `validation`.
 *
 * Traceability to the catalog is what makes the recommendation defensible, so
 * what was dropped is reported rather than quietly removed.
 *
 * Result is written into the bundle under `analysis`.
 *
 * Usage:
 *   node quality/scripts/analyze-level2.mjs quality/evidence/run-<id>.json
 */

import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

import {
  QUALITY_DIR,
  computeAttributeCoverage,
  enabledGates,
  loadCatalog,
  loadGates,
  readJsonFile,
} from "./lib/model.mjs";
import {
  completeStructured,
  persistExchange,
  resolveApiKey,
  resolveModel,
} from "./lib/openrouter.mjs";

const MAX_TOKENS = 2000;

function buildResponseSchema(attributeIds, allCatalogTests) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["uncoveredAttributes", "weaklyCoveredAttributes", "recommendations"],
    properties: {
      uncoveredAttributes: {
        type: "array",
        description: "Identifiers of attributes that no gate covers at all.",
        items: { type: "string", enum: attributeIds },
      },
      weaklyCoveredAttributes: {
        type: "array",
        description: "Attributes with gates but only partly implemented catalog tests.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["attributeId", "missing"],
          properties: {
            attributeId: { type: "string", enum: attributeIds },
            missing: {
              type: "string",
              description: "What is concretely absent for this attribute.",
            },
          },
        },
      },
      recommendations: {
        type: "array",
        description: "What to implement next, ordered from highest to lowest priority.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["attributeId", "suggestedTests", "rationale", "priority"],
          properties: {
            attributeId: { type: "string", enum: attributeIds },
            suggestedTests: {
              type: "array",
              description:
                "Tests to implement. Each MUST appear verbatim in the tests list of this attribute's catalog entry.",
              minItems: 1,
              items: { type: "string", enum: allCatalogTests },
            },
            rationale: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
          },
        },
      },
    },
  };
}

function renderCatalog(catalog) {
  const lines = [];
  for (const attribute of catalog.attributes) {
    lines.push(`### ${attribute.id} — ${attribute.name}`);
    lines.push(attribute.description);
    lines.push("Tests required by the catalog:");
    for (const test of attribute.tests) lines.push(`  - ${test}`);
    lines.push("Evidence expected:");
    for (const evidence of attribute.expectedEvidence) lines.push(`  - ${evidence}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderGateInventory(gates, bundle) {
  const statusByGateId = new Map(bundle.gates.map((gate) => [gate.gateId, gate]));
  const lines = [];
  for (const gate of enabledGates(gates)) {
    const outcome = statusByGateId.get(gate.id);
    lines.push(`- \`${gate.id}\` → attribute \`${gate.attributeId}\``);
    lines.push(`  checks: ${gate.description}`);
    lines.push(
      `  catalog tests implemented: ${
        gate.catalogTests.length > 0 ? gate.catalogTests.join("; ") : "none"
      }`,
    );
    lines.push(
      `  this run: ${outcome?.status ?? "not reported"}` +
        (outcome ? ` (${outcome.testsPassed}/${outcome.testsRun} test cases)` : ""),
    );
  }
  return lines.join("\n");
}

function renderComputedCoverage(coverage) {
  const lines = [];
  for (const attribute of coverage.attributes) {
    lines.push(
      `- \`${attribute.attributeId}\`: ${attribute.status.toUpperCase()}, ` +
        `${attribute.implementedTests.length}/${attribute.catalogTestCount} catalog tests implemented`,
    );
    if (attribute.missingTests.length > 0) {
      lines.push(`  missing: ${attribute.missingTests.join("; ")}`);
    }
  }
  return lines.join("\n");
}

function buildUserPrompt({ catalog, gates, bundle, coverage }) {
  const passed = bundle.gates.filter((g) => g.status === "passed").length;
  const failed = bundle.gates.filter((g) => g.status === "failed").length;
  const skipped = bundle.gates.filter((g) => g.status === "skipped").length;

  return [
    "# The catalog of quality attributes",
    "",
    renderCatalog(catalog),
    "# Quality gates that exist in this repository",
    "",
    renderGateInventory(gates, bundle),
    "",
    "# Results of this run",
    "",
    `- run ${bundle.runId}, commit ${bundle.commit.slice(0, 8)}`,
    `- gates: ${passed} passed, ${failed} failed, ${skipped} skipped`,
    `- code coverage: ${bundle.coverage.lines}% lines, ${bundle.coverage.branches}% branches`,
    `- dependency audit: ${bundle.audit.critical} critical, ${bundle.audit.high} high, ` +
      `${bundle.audit.moderate} moderate, ${bundle.audit.low} low`,
    "",
    "# Computed coverage per attribute",
    "",
    renderComputedCoverage(coverage),
    "",
    "# Reminder of the hard constraint",
    "",
    "Every entry of `suggestedTests` must be copied verbatim from the `tests` list",
    "of that same attribute's catalog entry above. Anything else is discarded.",
  ].join("\n");
}

/**
 * Drops every suggested test that is not verbatim one of that attribute's
 * catalog tests, and every recommendation left without a valid test.
 */
export function validateAgainstCatalog(analysis, catalog) {
  const testsByAttribute = new Map(
    catalog.attributes.map((attribute) => [attribute.id, new Set(attribute.tests)]),
  );

  const droppedSuggestedTests = [];
  const droppedRecommendations = [];
  const recommendations = [];

  for (const recommendation of analysis.recommendations ?? []) {
    const validTests = testsByAttribute.get(recommendation.attributeId);
    if (!validTests) {
      droppedRecommendations.push({
        attributeId: recommendation.attributeId,
        reason: "attribute is not in the catalog",
      });
      continue;
    }

    const kept = [];
    for (const test of recommendation.suggestedTests ?? []) {
      if (validTests.has(test)) {
        kept.push(test);
      } else {
        droppedSuggestedTests.push({ attributeId: recommendation.attributeId, test });
      }
    }

    if (kept.length === 0) {
      droppedRecommendations.push({
        attributeId: recommendation.attributeId,
        reason: "no suggested test was a catalog test for this attribute",
      });
      continue;
    }

    recommendations.push({ ...recommendation, suggestedTests: kept });
  }

  return { recommendations, droppedSuggestedTests, droppedRecommendations };
}

/**
 * Compares the model's coverage claims with what the deterministic layer
 * computed.
 *
 * "Weakly covered" here means what the prompt asks for: an attribute that has at
 * least one gate and at least one catalog test still unimplemented. That is a
 * different question from the `weak` bucket of the coverage policy, which is the
 * stricter "implements less than strongCoverageMinRatio of its catalog tests"
 * used for the headline figure. Comparing against the policy bucket would report
 * disagreement where there is only a difference of definition.
 */
function compareWithComputedCoverage(analysis, coverage) {
  const computedUncovered = new Set(coverage.uncovered);
  const computedWeak = new Set(
    coverage.attributes
      .filter((a) => a.gateIds.length > 0 && a.missingTests.length > 0)
      .map((a) => a.attributeId),
  );
  const claimedUncovered = new Set(analysis.uncoveredAttributes ?? []);
  const claimedWeak = new Set(
    (analysis.weaklyCoveredAttributes ?? []).map((entry) => entry.attributeId),
  );

  return {
    uncoveredClaimedButCovered: [...claimedUncovered].filter((id) => !computedUncovered.has(id)),
    uncoveredMissedByModel: [...computedUncovered].filter((id) => !claimedUncovered.has(id)),
    weakClaimedButNotWeak: [...claimedWeak].filter((id) => !computedWeak.has(id)),
    weakMissedByModel: [...computedWeak].filter((id) => !claimedWeak.has(id)),
  };
}

async function main() {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error("[analyze-level2] Usage: analyze-level2.mjs <path to run-*.json>");
    process.exit(1);
  }

  const resolvedBundlePath = path.resolve(bundlePath);
  const bundle = readJsonFile(resolvedBundlePath);
  const catalog = loadCatalog();
  const gates = loadGates();
  const coverage = computeAttributeCoverage(catalog, gates);

  const apiKey = resolveApiKey();
  const model = resolveModel();
  if (!apiKey) {
    console.error("[analyze-level2] OPENROUTER_API_KEY is not set; recording the gap.");
    bundle.analysis = { error: "OPENROUTER_API_KEY not available in this environment" };
    writeFileSync(resolvedBundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    process.exit(1);
  }

  const systemPrompt = readFileSync(
    path.join(QUALITY_DIR, "prompts", "level2-coverage.system.md"),
    "utf8",
  );
  const attributeIds = catalog.attributes.map((a) => a.id);
  const allCatalogTests = [...new Set(catalog.attributes.flatMap((a) => a.tests))];
  const schema = buildResponseSchema(attributeIds, allCatalogTests);
  const userPrompt = buildUserPrompt({ catalog, gates, bundle, coverage });
  const rawDir = path.join(path.dirname(resolvedBundlePath), "raw", String(bundle.runId), "analysis");

  console.log(`[analyze-level2] model ${model}, temperature 0, one call.`);

  const outcome = await completeStructured({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    schema,
    schemaName: "coverage_recommendation",
    maxTokens: MAX_TOKENS,
  });
  persistExchange(rawDir, "level2-coverage", outcome);

  if (!outcome.ok) {
    console.error(`[analyze-level2] call failed: ${outcome.error}`);
    bundle.analysis = { error: outcome.error };
    writeFileSync(resolvedBundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    process.exit(1);
  }

  const { recommendations, droppedSuggestedTests, droppedRecommendations } =
    validateAgainstCatalog(outcome.data, catalog);
  const coverageComparison = compareWithComputedCoverage(outcome.data, coverage);

  bundle.analysis = {
    level: 2,
    model: outcome.model,
    usage: outcome.usage,
    uncoveredAttributes: outcome.data.uncoveredAttributes ?? [],
    weaklyCoveredAttributes: outcome.data.weaklyCoveredAttributes ?? [],
    recommendations,
    validation: {
      droppedSuggestedTests,
      droppedRecommendations,
      coverageComparison,
    },
  };

  writeFileSync(resolvedBundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

  console.log(
    `[analyze-level2] ${recommendations.length} recommendation(s) kept, ` +
      `${droppedRecommendations.length} dropped, ` +
      `${droppedSuggestedTests.length} suggested test(s) dropped as non-catalog.`,
  );
  for (const dropped of droppedSuggestedTests) {
    console.warn(`[analyze-level2]   dropped '${dropped.test}' (${dropped.attributeId})`);
  }
  console.log(`[analyze-level2] Analysis written into ${path.relative(process.cwd(), resolvedBundlePath)}`);
}

if (process.argv[1] && process.argv[1].endsWith("analyze-level2.mjs")) {
  main();
}
