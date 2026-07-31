#!/usr/bin/env node
/**
 * Level 1 of the analysis stage: diagnostic.
 *
 * For every gate that FAILED, one LLM call whose prompt carries the gate's log
 * excerpt, its metrics, and the full catalog entry for the quality attribute
 * that gate serves. The catalog entry is what lets the model move from a line of
 * Vitest or tsc output to a statement about a quality attribute; without it the
 * stage would be a stack-trace paraphraser.
 *
 * `affectedAttributeId` is constrained twice: the response schema restricts it
 * to the catalog identifiers, and the result is validated again here. An answer
 * outside the catalog is rejected and retried once with a corrective message;
 * if it is still invalid the diagnostic is recorded as rejected, never patched.
 *
 * Diagnostics are written back into the bundle under gates[].diagnostic.
 *
 * Usage:
 *   node quality/scripts/analyze-level1.mjs quality/evidence/run-<id>.json
 */

import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

import { QUALITY_DIR, loadCatalog, loadGates, readJsonFile } from "./lib/model.mjs";
import {
  completeStructured,
  persistExchange,
  resolveApiKey,
  resolveModel,
} from "./lib/openrouter.mjs";

const MAX_TOKENS = 700;

function buildResponseSchema(attributeIds) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["rootCause", "affectedAttributeId", "whyItMatters", "remediation", "confidence"],
    properties: {
      rootCause: {
        type: "string",
        description: "What actually broke, naming the concrete symbol, file or dependency.",
      },
      affectedAttributeId: {
        type: "string",
        description: "Identifier of the compromised quality attribute.",
        enum: attributeIds,
      },
      whyItMatters: {
        type: "string",
        description:
          "Consequence stated in terms of the quality attribute and the territorial decisions the system supports, not in terms of the stack trace.",
      },
      remediation: {
        type: "string",
        description: "One concrete, actionable step referencing specific files or constants.",
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
  };
}

function buildUserPrompt({ gate, gateSpec, attribute, catalog }) {
  const lines = [];

  lines.push("## Failed quality gate");
  lines.push("");
  lines.push(`- id: ${gate.gateId}`);
  lines.push(`- what it checks: ${gateSpec?.description ?? "(no description available)"}`);
  lines.push(`- status: ${gate.status}`);
  lines.push(`- blocking: ${gate.blocking ? "yes" : "no"}`);
  lines.push(
    `- metrics: ${gate.testsPassed}/${gate.testsRun} test cases passed, ` +
      `${gate.assertions} assertions in scope, ${gate.durationMs} ms`,
  );
  lines.push("");
  lines.push("### Raw log excerpt");
  lines.push("");
  lines.push("```");
  lines.push(gate.logExcerpt || "(empty)");
  lines.push("```");
  lines.push("");

  lines.push(`## Catalog entry for the attribute this gate serves: ${attribute.id}`);
  lines.push("");
  lines.push(`- name: ${attribute.name}`);
  lines.push(`- description: ${attribute.description}`);
  lines.push("- tests required by the catalog:");
  for (const test of attribute.tests) lines.push(`  - ${test}`);
  lines.push("- evidence expected for this attribute to be satisfied:");
  for (const evidence of attribute.expectedEvidence) lines.push(`  - ${evidence}`);
  lines.push("");

  lines.push("## Valid quality attribute identifiers");
  lines.push("");
  lines.push(
    catalog.attributes.map((a) => `${a.id} (${a.name})`).join(", ") + ".",
  );
  lines.push("");
  lines.push(
    "`affectedAttributeId` must be exactly one of those identifiers.",
  );

  return lines.join("\n");
}

/**
 * `complete` is injectable so that the reject-and-retry behaviour can be
 * exercised without depending on the model emitting an invalid identifier,
 * which the response schema is designed to prevent in the first place.
 */
export async function diagnoseGate({
  gate,
  gateSpec,
  attribute,
  catalog,
  apiKey,
  model,
  systemPrompt,
  rawDir,
  complete = completeStructured,
}) {
  const attributeIds = catalog.attributes.map((a) => a.id);
  const schema = buildResponseSchema(attributeIds);
  const basePrompt = buildUserPrompt({ gate, gateSpec, attribute, catalog });
  const retryReasons = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const userPrompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}\n\n## Correction\n\nYour previous answer used an ` +
          `affectedAttributeId that is not in the catalog. Answer again using ` +
          `exactly one of the identifiers listed above.`;

    const outcome = await complete({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      schema,
      schemaName: "gate_diagnostic",
      maxTokens: MAX_TOKENS,
    });

    persistExchange(rawDir, `level1-${gate.gateId}-attempt${attempt}`, outcome);

    if (!outcome.ok) {
      if (attempt === 2) {
        return { error: outcome.error, attempts: attempt, retryReasons };
      }
      // Retrying silently would leave `attempts: 2` in the bundle with nothing
      // explaining it, which is exactly the kind of unexplained number a reader
      // of the paper cannot check.
      console.warn(`[analyze-level1] ${gate.gateId}: attempt ${attempt} failed: ${outcome.error}`);
      retryReasons.push({ attempt, reason: outcome.error });
      continue;
    }

    if (!attributeIds.includes(outcome.data.affectedAttributeId)) {
      console.warn(
        `[analyze-level1] ${gate.gateId}: attempt ${attempt} returned ` +
          `affectedAttributeId '${outcome.data.affectedAttributeId}', which is not in the catalog.`,
      );
      retryReasons.push({
        attempt,
        reason: `affectedAttributeId '${outcome.data.affectedAttributeId}' is not a catalog identifier`,
      });
      if (attempt === 2) {
        return {
          error:
            `model returned an affectedAttributeId outside the catalog ` +
            `('${outcome.data.affectedAttributeId}') on both attempts; diagnostic rejected`,
          attempts: attempt,
          retryReasons,
        };
      }
      continue;
    }

    return {
      ...outcome.data,
      attempts: attempt,
      ...(retryReasons.length > 0 ? { retryReasons } : {}),
      model: outcome.model,
      usage: outcome.usage,
    };
  }

  return { error: "unreachable", attempts: 2, retryReasons };
}

async function main() {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error("[analyze-level1] Usage: analyze-level1.mjs <path to run-*.json>");
    process.exit(1);
  }

  const resolvedBundlePath = path.resolve(bundlePath);
  const bundle = readJsonFile(resolvedBundlePath);
  const catalog = loadCatalog();
  const gates = loadGates();

  const failedGates = bundle.gates.filter((gate) => gate.status === "failed");
  if (failedGates.length === 0) {
    console.log("[analyze-level1] No failed gates; no diagnostic call needed.");
    return;
  }

  const apiKey = resolveApiKey();
  const model = resolveModel();
  if (!apiKey) {
    console.error(
      "[analyze-level1] OPENROUTER_API_KEY is not set. The diagnostic stage cannot run.\n" +
        "[analyze-level1] Recording the gap in the bundle rather than fabricating diagnostics.",
    );
    for (const gate of failedGates) {
      gate.diagnostic = { error: "OPENROUTER_API_KEY not available in this environment" };
    }
    writeFileSync(resolvedBundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    process.exit(1);
  }

  const systemPrompt = readFileSync(
    path.join(QUALITY_DIR, "prompts", "level1-diagnostic.system.md"),
    "utf8",
  );
  const rawDir = path.join(path.dirname(resolvedBundlePath), "raw", String(bundle.runId), "analysis");
  const gateSpecById = new Map(gates.gates.map((gate) => [gate.id, gate]));
  const attributeById = new Map(catalog.attributes.map((a) => [a.id, a]));

  console.log(
    `[analyze-level1] ${failedGates.length} failed gate(s); model ${model}, temperature 0.`,
  );

  for (const gate of failedGates) {
    const gateSpec = gateSpecById.get(gate.gateId);
    const attribute = attributeById.get(gate.attributeId);
    if (!attribute) {
      gate.diagnostic = { error: `gate declares unknown attributeId '${gate.attributeId}'` };
      continue;
    }

    console.log(`[analyze-level1] diagnosing ${gate.gateId} (${attribute.id})...`);
    // eslint-disable-next-line no-await-in-loop -- one call per failed gate, sequential on purpose
    gate.diagnostic = await diagnoseGate({
      gate,
      gateSpec,
      attribute,
      catalog,
      apiKey,
      model,
      systemPrompt,
      rawDir,
    });

    if (gate.diagnostic.error) {
      console.warn(`[analyze-level1]   -> rejected: ${gate.diagnostic.error}`);
    } else {
      console.log(
        `[analyze-level1]   -> ${gate.diagnostic.affectedAttributeId} ` +
          `(confidence ${gate.diagnostic.confidence}, attempt ${gate.diagnostic.attempts})`,
      );
    }
  }

  writeFileSync(resolvedBundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`[analyze-level1] Diagnostics written into ${path.relative(process.cwd(), resolvedBundlePath)}`);
}

if (process.argv[1] && process.argv[1].endsWith("analyze-level1.mjs")) {
  main();
}
