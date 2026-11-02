#!/usr/bin/env node
/**
 * Produces the quantitative material for the paper from one or two evidence
 * bundles, as a single Markdown document.
 *
 * Every number here is read from a bundle produced by a pipeline run. Nothing is
 * transcribed by hand, so the tables in the paper can be regenerated from the
 * committed bundles at any time.
 *
 * Usage:
 *   node quality/scripts/paper-report.mjs \
 *     --green quality/evidence/run-<id>.json \
 *     [--failure quality/evidence/run-<id>.json] \
 *     [--out quality/reports/paper-material.md]
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  QUALITY_DIR,
  computeAttributeCoverage,
  loadCatalog,
  loadGates,
  readJsonFile,
} from "./lib/model.mjs";

function parseArgs(argv) {
  const options = { green: null, failure: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--green") options.green = argv[++i];
    else if (argv[i] === "--failure") options.failure = argv[++i];
    else if (argv[i] === "--out") options.out = argv[++i];
  }
  return options;
}

function loadTimings(bundlePath, runId) {
  const candidate = path.join(path.dirname(bundlePath), `timings-${runId}.json`);
  return existsSync(candidate) ? readJsonFile(candidate) : null;
}

function seconds(ms) {
  return `${(ms / 1000).toFixed(1)} s`;
}

/** Aggregates gate results by the attribute each gate serves. */
function aggregateByAttribute(bundle, catalog, coverage) {
  const coverageById = new Map(coverage.attributes.map((a) => [a.attributeId, a]));

  return catalog.attributes.map((attribute) => {
    const gates = bundle.gates.filter((gate) => gate.attributeId === attribute.id);
    const model = coverageById.get(attribute.id);
    return {
      id: attribute.id,
      name: attribute.name,
      status: model.status,
      gateIds: gates.map((g) => g.gateId),
      implemented: model.implementedTests.length,
      catalogTests: model.catalogTestCount,
      testsRun: gates.reduce((sum, g) => sum + g.testsRun, 0),
      testsPassed: gates.reduce((sum, g) => sum + g.testsPassed, 0),
      assertions: gates.reduce((sum, g) => sum + g.assertions, 0),
      durationMs: gates.reduce((sum, g) => sum + g.durationMs, 0),
    };
  });
}

function renderRunSection(title, bundle, catalog, coverage, timings) {
  const lines = [];
  const rows = aggregateByAttribute(bundle, catalog, coverage);
  const passed = bundle.gates.filter((g) => g.status === "passed").length;
  const failed = bundle.gates.filter((g) => g.status === "failed").length;
  const skipped = bundle.gates.filter((g) => g.status === "skipped").length;

  lines.push(`## ${title}`);
  lines.push("");
  lines.push("| Property | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Run id | \`${bundle.runId}\` |`);
  lines.push(`| Commit | \`${bundle.commit}\` |`);
  lines.push(`| Timestamp (UTC) | ${bundle.timestamp} |`);
  lines.push(`| Catalog version | ${bundle.catalogVersion} |`);
  lines.push(`| Gate inventory version | ${bundle.gatesVersion} |`);
  lines.push(`| Environment | ${bundle.environment.ci ? "GitHub Actions" : "local"}, Node ${bundle.environment.node} |`);
  lines.push(`| Evidence collection time | ${seconds(bundle.workflowDurationMs)} |`);
  if (timings) {
    for (const job of timings.jobs) {
      lines.push(`| Job \`${job.name}\` (platform-reported) | ${seconds(job.durationMs)} |`);
    }
  }
  lines.push(`| Gates | ${passed} passed, ${failed} failed, ${skipped} skipped |`);
  if (bundle.deployment) {
    lines.push(
      `| Deployment decision | **${bundle.deployment.decision.toUpperCase()}** — ${bundle.deployment.reason} |`,
    );
  }
  lines.push(`| Code coverage | ${bundle.coverage.lines}% lines, ${bundle.coverage.branches}% branches |`);
  lines.push(
    `| Dependency audit | ${bundle.audit.critical} critical, ${bundle.audit.high} high, ` +
      `${bundle.audit.moderate} moderate, ${bundle.audit.low} low |`,
  );
  lines.push("");

  lines.push("### Tests and assertions per quality attribute");
  lines.push("");
  lines.push(
    "| Quality attribute | Coverage status | Catalog tests implemented | Gates | Test cases run | Passed | Assertions | Duration |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of rows) {
    lines.push(
      `| ${row.name} | ${row.status} | ${row.implemented}/${row.catalogTests} | ` +
        `${row.gateIds.length} | ${row.testsRun} | ${row.testsPassed} | ${row.assertions} | ` +
        `${row.durationMs > 0 ? seconds(row.durationMs) : "—"} |`,
    );
  }
  const totals = rows.reduce(
    (acc, row) => ({
      testsRun: acc.testsRun + row.testsRun,
      testsPassed: acc.testsPassed + row.testsPassed,
      assertions: acc.assertions + row.assertions,
      durationMs: acc.durationMs + row.durationMs,
    }),
    { testsRun: 0, testsPassed: 0, assertions: 0, durationMs: 0 },
  );
  lines.push(
    `| **Total** | | | ${bundle.gates.length} | **${totals.testsRun}** | ` +
      `**${totals.testsPassed}** | **${totals.assertions}** | ${seconds(totals.durationMs)} |`,
  );
  lines.push("");

  lines.push("### Result per quality gate");
  lines.push("");
  lines.push("| Gate | Attribute served | Status | Test cases | Assertions | Duration | Blocking |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  const attributeNames = new Map(catalog.attributes.map((a) => [a.id, a.name]));
  for (const gate of bundle.gates) {
    lines.push(
      `| \`${gate.gateId}\` | ${attributeNames.get(gate.attributeId)} | ${gate.status} | ` +
        `${gate.testsPassed}/${gate.testsRun} | ${gate.assertions} | ${seconds(gate.durationMs)} | ` +
        `${gate.blocking ? "yes" : "no"} |`,
    );
  }
  lines.push("");

  if (bundle.deployment) {
    lines.push("### Deployment decision");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(bundle.deployment, null, 2));
    lines.push("```");
    lines.push("");
  }

  if (timings) {
    lines.push("### Pipeline step durations (platform-reported)");
    lines.push("");
    lines.push("| Step | Outcome | Duration |");
    lines.push("| --- | --- | --- |");
    for (const job of timings.jobs) {
      for (const step of job.steps) {
        lines.push(`| ${step.name} | ${step.conclusion} | ${seconds(step.durationMs)} |`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderLevel1(bundle) {
  const failed = bundle.gates.filter((gate) => gate.status === "failed");
  if (failed.length === 0) {
    return "_No gate failed in this run, so the diagnostic stage made no call._\n";
  }

  const lines = [];
  for (const gate of failed) {
    lines.push(`#### Gate \`${gate.gateId}\``);
    lines.push("");
    lines.push("Log excerpt given to the model:");
    lines.push("");
    lines.push("```");
    lines.push(gate.logExcerpt);
    lines.push("```");
    lines.push("");
    lines.push("Verbatim output:");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(gate.diagnostic, null, 2));
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

function renderLevel2(bundle) {
  if (!bundle.analysis) return "_The coverage recommendation stage did not run._\n";
  return ["```json", JSON.stringify(bundle.analysis, null, 2), "```", ""].join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.green) {
    console.error(
      "[paper-report] Usage: paper-report.mjs --green <bundle> [--failure <bundle>] [--out <file>]",
    );
    process.exit(1);
  }

  const catalog = loadCatalog();
  const gates = loadGates();
  const coverage = computeAttributeCoverage(catalog, gates);

  const greenPath = path.resolve(options.green);
  const green = readJsonFile(greenPath);
  const greenTimings = loadTimings(greenPath, green.runId);

  const out = [];
  out.push("# Quality attributes pipeline — material for the paper");
  out.push("");
  out.push(
    `Generated from committed evidence bundles. Catalog v${catalog.catalogVersion}, ` +
      `gate inventory v${gates.gatesVersion}.`,
  );
  out.push("");

  out.push("## Attribute coverage of the approach");
  out.push("");
  out.push(
    `**${coverage.withAtLeastOneGate.length} of ${coverage.totalAttributes}** quality attributes ` +
      `have at least one quality gate in the repository: ` +
      `${coverage.covered.length} covered and ${coverage.weak.length} weakly covered ` +
      `(threshold: a gate set must implement at least ` +
      `${Math.round(coverage.strongCoverageMinRatio * 100)}% of the attribute's catalog tests ` +
      `to count as covered). ${coverage.uncovered.length} attributes have no gate.`,
  );
  out.push("");
  out.push(`- Covered: ${coverage.covered.join(", ")}`);
  out.push(`- Weakly covered: ${coverage.weak.join(", ")}`);
  out.push(`- Uncovered: ${coverage.uncovered.join(", ")}`);
  out.push("");
  out.push(
    "This figure is computed from `quality/quality-attributes.json` and " +
      "`quality/gates.json` on every run; it is not recorded anywhere as a constant.",
  );
  out.push("");

  out.push(renderRunSection("Run A — all gates green", green, catalog, coverage, greenTimings));

  out.push("## Generative analysis, level 2: coverage recommendation (run A)");
  out.push("");
  out.push(renderLevel2(green));

  if (options.failure) {
    const failurePath = path.resolve(options.failure);
    const failure = readJsonFile(failurePath);
    const failureTimings = loadTimings(failurePath, failure.runId);
    out.push(
      renderRunSection("Run B — with an injected defect", failure, catalog, coverage, failureTimings),
    );
    out.push("## Generative analysis, level 1: diagnostic (run B)");
    out.push("");
    out.push(renderLevel1(failure));
    out.push("## Generative analysis, level 2: coverage recommendation (run B)");
    out.push("");
    out.push(renderLevel2(failure));
  } else {
    out.push("## Run B — with an injected defect");
    out.push("");
    out.push("_Not yet captured. Rerun this script with `--failure <bundle>` once available._");
    out.push("");
  }

  const markdown = out.join("\n");
  const outPath = options.out
    ? path.resolve(options.out)
    : path.join(QUALITY_DIR, "reports", "paper-material.md");
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${markdown}\n`);
  console.log(`[paper-report] Written to ${path.relative(process.cwd(), outPath)}`);
}

main();
