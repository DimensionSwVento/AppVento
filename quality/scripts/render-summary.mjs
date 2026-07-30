#!/usr/bin/env node
/**
 * Renders an evidence bundle as Markdown for the GitHub Actions job summary,
 * which is the delivery surface of this pipeline.
 *
 * Usage:  node quality/scripts/render-summary.mjs quality/evidence/run-<id>.json
 */

import path from "node:path";

import { loadCatalog, readJsonFile } from "./lib/model.mjs";

const STATUS_ICON = { passed: "✅", failed: "❌", skipped: "⏭️" };

function escapePipes(text) {
  return String(text ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

function renderGateTable(bundle, attributeNames) {
  const lines = [];
  lines.push("| Gate | Attribute | Status | Tests | Assertions | Duration |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const gate of bundle.gates) {
    lines.push(
      `| \`${gate.gateId}\` | ${attributeNames.get(gate.attributeId) ?? gate.attributeId} | ` +
        `${STATUS_ICON[gate.status] ?? ""} ${gate.status} | ` +
        `${gate.testsPassed}/${gate.testsRun} | ${gate.assertions} | ${gate.durationMs} ms |`,
    );
  }
  return lines.join("\n");
}

function renderDiagnostics(bundle, attributeNames) {
  const failed = bundle.gates.filter((gate) => gate.status === "failed");
  if (failed.length === 0) return null;

  const lines = [];
  lines.push("## Diagnostics (level 1)");
  lines.push("");

  for (const gate of failed) {
    const diagnostic = gate.diagnostic;
    lines.push(`### ❌ \`${gate.gateId}\``);
    lines.push("");

    if (!diagnostic) {
      lines.push("_No diagnostic was produced for this gate._");
      lines.push("");
      continue;
    }
    if (diagnostic.error) {
      lines.push(`> Diagnostic unavailable: ${diagnostic.error}`);
      lines.push("");
      continue;
    }

    const attributeName =
      attributeNames.get(diagnostic.affectedAttributeId) ?? diagnostic.affectedAttributeId;
    lines.push(
      `**Compromised attribute:** ${attributeName} (\`${diagnostic.affectedAttributeId}\`) — ` +
        `confidence ${diagnostic.confidence}`,
    );
    lines.push("");
    lines.push(`**Root cause.** ${diagnostic.rootCause}`);
    lines.push("");
    lines.push(`**Why it matters.** ${diagnostic.whyItMatters}`);
    lines.push("");
    lines.push(`**Remediation.** ${diagnostic.remediation}`);
    lines.push("");
    lines.push("<details><summary>Log excerpt</summary>");
    lines.push("");
    lines.push("```");
    lines.push(gate.logExcerpt);
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error("[render-summary] Usage: render-summary.mjs <path to run-*.json>");
    process.exit(1);
  }

  const bundle = readJsonFile(path.resolve(bundlePath));
  const catalog = loadCatalog();
  const attributeNames = new Map(catalog.attributes.map((a) => [a.id, a.name]));

  const passed = bundle.gates.filter((g) => g.status === "passed").length;
  const failed = bundle.gates.filter((g) => g.status === "failed").length;
  const skipped = bundle.gates.filter((g) => g.status === "skipped").length;
  const coverage = bundle.attributeCoverage;

  const out = [];
  out.push("# Quality attributes pipeline");
  out.push("");
  out.push(
    `Run \`${bundle.runId}\` · commit \`${bundle.commit.slice(0, 8)}\` · ` +
      `catalog v${bundle.catalogVersion} · gates v${bundle.gatesVersion} · ` +
      `${Math.round(bundle.workflowDurationMs / 1000)} s`,
  );
  out.push("");
  out.push(
    `**${passed} passed · ${failed} failed · ${skipped} skipped.** ` +
      `Coverage: ${bundle.coverage.lines}% lines, ${bundle.coverage.branches}% branches. ` +
      `npm audit: ${bundle.audit.critical} critical, ${bundle.audit.high} high, ` +
      `${bundle.audit.moderate} moderate, ${bundle.audit.low} low.`,
  );
  out.push("");
  out.push(
    `**Attribute coverage: ${coverage.covered.length} of ${coverage.totalAttributes}** ` +
      `attributes have at least one gate ` +
      `(${coverage.stronglyCovered.length} covered, ${coverage.weaklyCovered.length} weakly covered).`,
  );
  out.push("");
  out.push("## Quality gates");
  out.push("");
  out.push(renderGateTable(bundle, attributeNames));
  out.push("");

  const diagnostics = renderDiagnostics(bundle, attributeNames);
  if (diagnostics) {
    out.push(diagnostics);
  }

  console.log(out.join("\n"));
}

main();
