#!/usr/bin/env node
/**
 * Deployment decision: the deterministic gate at the end of the pipeline.
 *
 * This stage decides whether the change may be deployed. The decision is a pure
 * function of the collected evidence and of the `blocking` flag each gate
 * declares in quality/gates.json. The generative analysis is NOT part of the
 * decision: the diagnostics explain a block, they never cause or lift one.
 *
 * That separation is deliberate. The closed question — is the expected evidence
 * present? — is answered by rules, and rules are what may stop a deployment. An
 * LLM in this path would make the outcome of a pipeline run non-reproducible and
 * would put an unverifiable judgement in a position of authority over the
 * repository.
 *
 * Rules, applied in order:
 *   1. A blocking gate that FAILED blocks the deployment.
 *   2. A blocking gate that was SKIPPED blocks it as well: a gate that produced
 *      no evidence cannot be treated as having passed.
 *   3. A failing NON-blocking gate is recorded as a warning and does not block.
 *   4. Otherwise the deployment is allowed.
 *
 * Dependency advisories are reported as warnings, never as blockers: the
 * dependency-audit gate is declared non-blocking in the inventory.
 *
 * Writes the decision into the bundle under `deployment` and, when running in
 * GitHub Actions, into $GITHUB_OUTPUT so the deployment-gate job can enforce it.
 *
 * Usage:
 *   node quality/scripts/deployment-decision.mjs quality/evidence/run-<id>.json
 */

import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { loadCatalog, readJsonFile } from "./lib/model.mjs";

function decide(bundle) {
  const blockingFailures = [];
  const warnings = [];

  for (const gate of bundle.gates) {
    if (gate.blocking && gate.status === "failed") {
      blockingFailures.push({
        gateId: gate.gateId,
        attributeId: gate.attributeId,
        reason: `blocking gate failed (${gate.testsPassed}/${gate.testsRun} test cases passed)`,
      });
    } else if (gate.blocking && gate.status === "skipped") {
      blockingFailures.push({
        gateId: gate.gateId,
        attributeId: gate.attributeId,
        reason: "blocking gate produced no evidence (skipped)",
      });
    } else if (!gate.blocking && gate.status === "failed") {
      warnings.push({
        gateId: gate.gateId,
        attributeId: gate.attributeId,
        reason: "non-blocking gate failed",
      });
    }
  }

  const { critical, high } = bundle.audit;
  if (critical > 0 || high > 0) {
    warnings.push({
      gateId: "dependency-audit",
      attributeId: "security",
      reason:
        `dependency advisories present (${critical} critical, ${high} high); ` +
        "the gate is declared non-blocking, so this does not stop the deployment",
    });
  }

  const allowed = blockingFailures.length === 0;
  return {
    decision: allowed ? "allow" : "block",
    reason: allowed
      ? "Every blocking quality gate produced evidence and passed."
      : `${blockingFailures.length} blocking quality gate(s) did not pass.`,
    blockingFailures,
    warnings,
    evaluatedAt: new Date().toISOString(),
    rule: "deterministic; the generative analysis explains a block but never causes or lifts one",
  };
}

function renderMarkdown(deployment, bundle, attributeNames) {
  const lines = [];
  lines.push("## Deployment decision");
  lines.push("");
  lines.push(
    deployment.decision === "allow"
      ? `### ✅ ALLOW\n\n${deployment.reason}`
      : `### ⛔ BLOCK\n\n${deployment.reason}`,
  );
  lines.push("");

  if (deployment.blockingFailures.length > 0) {
    lines.push("| Blocking gate | Attribute | Reason |");
    lines.push("| --- | --- | --- |");
    for (const failure of deployment.blockingFailures) {
      lines.push(
        `| \`${failure.gateId}\` | ${attributeNames.get(failure.attributeId) ?? failure.attributeId} | ${failure.reason} |`,
      );
    }
    lines.push("");

    // The diagnostic explains the block; it did not produce it.
    for (const failure of deployment.blockingFailures) {
      const gate = bundle.gates.find((g) => g.gateId === failure.gateId);
      const diagnostic = gate?.diagnostic;
      if (diagnostic && !diagnostic.error) {
        lines.push(
          `**\`${failure.gateId}\` — diagnosed as compromising ` +
            `${attributeNames.get(diagnostic.affectedAttributeId) ?? diagnostic.affectedAttributeId}.** ` +
            diagnostic.whyItMatters,
        );
        lines.push("");
      }
    }
  }

  if (deployment.warnings.length > 0) {
    lines.push("**Warnings (do not block):**");
    lines.push("");
    for (const warning of deployment.warnings) {
      lines.push(`- \`${warning.gateId}\`: ${warning.reason}`);
    }
    lines.push("");
  }

  lines.push(
    "_The decision is a deterministic function of the collected evidence and of " +
      "the `blocking` flag each gate declares in the inventory._",
  );
  return lines.join("\n");
}

function main() {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error("[deployment-decision] Usage: deployment-decision.mjs <path to run-*.json>");
    process.exit(1);
  }

  const resolvedBundlePath = path.resolve(bundlePath);
  const bundle = readJsonFile(resolvedBundlePath);
  const catalog = loadCatalog();
  const attributeNames = new Map(catalog.attributes.map((a) => [a.id, a.name]));

  const deployment = decide(bundle);
  bundle.deployment = deployment;
  writeFileSync(resolvedBundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

  console.log(`[deployment-decision] ${deployment.decision.toUpperCase()}: ${deployment.reason}`);
  for (const failure of deployment.blockingFailures) {
    console.log(`[deployment-decision]   blocking: ${failure.gateId} — ${failure.reason}`);
  }
  for (const warning of deployment.warnings) {
    console.log(`[deployment-decision]   warning: ${warning.gateId} — ${warning.reason}`);
  }

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `decision=${deployment.decision}\n` +
        `deploy_allowed=${deployment.decision === "allow"}\n` +
        `reason=${deployment.reason}\n` +
        `blocking_gates=${deployment.blockingFailures.map((f) => f.gateId).join(",")}\n`,
    );
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n${renderMarkdown(deployment, bundle, attributeNames)}\n`,
    );
  }

  // Producing the decision is this script's job; enforcing it belongs to the
  // deployment-gate job, so this always exits 0.
  process.exit(0);
}

main();
