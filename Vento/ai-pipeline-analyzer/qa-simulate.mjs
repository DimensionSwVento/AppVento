/**
 * QA Scenario Simulator — mutates quality-evidence/reports/attribute-coverage.json
 * to inject *synthetic* negative scenarios for evaluating the AI Pipeline Analyzer.
 *
 * The analyzer is data-driven: it does not distinguish synthetic from real
 * evidence, so the LLM (or the heuristic fallback) reacts as if the failures
 * were genuine. This lets you exercise rich anomaly detection, suggested
 * tests, and adaptive thresholding without breaking real tests.
 *
 * Usage:
 *   npm run qa:simulate -- <scenario>
 *   npm run qa:simulate -- --list
 *
 * Workflow:
 *   1.  npm run qa:collect                   # build real baseline evidence
 *   2.  npm run qa:simulate -- <name>        # mutate evidence
 *   3.  npm run qa:ai:local                  # let the LLM analyze
 *   4.  npm run qa:gate:local                # see the gate decision
 *   5.  npm run qa:collect                   # reset to real evidence
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const coveragePath = path.join(
  projectRoot,
  "quality-evidence/reports/attribute-coverage.json",
);

function safeRate(num, denom) {
  if (!denom) return 0;
  return Number(((num / denom) * 100).toFixed(2));
}

function findAttr(c, id) {
  const a = c.attributes.find((x) => x.id === id);
  if (!a) throw new Error(`Attribute "${id}" not found in coverage`);
  return a;
}

function injectFailure(c, target, count, syntheticEntries) {
  target.failedAssertions = count;
  target.passedAssertions = Math.max(0, target.totalAssertions - count);
  target.passRate = safeRate(target.passedAssertions, target.totalAssertions);
  target.status = "ATTENTION";
  for (const entry of syntheticEntries) c.failedAssertions.push(entry);
}

// ─── Scenario implementations ────────────────────────────────────────────────

function applyFailingCritical(c) {
  const target = findAttr(c, "processing");
  injectFailure(c, target, 2, [
    {
      attribute_id: "processing",
      suite: "src/app/Components/Map.test.tsx",
      title:
        "Map > [SIMULATED] correctly executes overlay across H3 cells at zoom 6",
      messages: [
        "AssertionError: expected polygon overlay to return 12 cells, got 0 (synthetic)",
      ],
    },
    {
      attribute_id: "processing",
      suite: "src/app/dashboard/page.test.tsx",
      title: "dashboard > [SIMULATED] wizard step advance respects selection rules",
      messages: [
        "AssertionError: expected next step to be 'dimensiones' but flow stalled at 'seleccion-area' (synthetic)",
      ],
    },
  ]);
  c.global.failedTests = 2;
  c.global.passedTests = (c.global.tests || 0) - 2;
  c.global.failedSuites = 1;
  c.global.passedSuites = Math.max(0, (c.global.testSuites || 0) - 1);
}

function applyMissingEvidence(c) {
  const target = findAttr(c, "data_quality");
  target.matchedSuites = 0;
  target.totalAssertions = 0;
  target.passedAssertions = 0;
  target.failedAssertions = 0;
  target.passRate = 0;
  target.status = "ATTENTION";
  target.suiteFiles = [];
}

function applyHighFailureRate(c) {
  const total = c.global.tests || 1;
  const inject = Math.max(1, Math.ceil(total * 0.1));
  c.global.failedTests = inject;
  c.global.passedTests = total - inject;
  c.global.failedSuites = (c.global.failedSuites || 0) + 2;
  c.global.passedSuites = Math.max(0, (c.global.passedSuites || 0) - 2);

  const target = c.attributes.find((a) => a.criticality === 5) || c.attributes[0];
  const entries = Array.from({ length: inject }, (_, i) => ({
    attribute_id: target.id,
    suite: target.suiteFiles[0] || "synthetic.test.ts",
    title: `[SIMULATED ${i + 1}/${inject}] regression on ${target.name}`,
    messages: [
      "AssertionError: synthetic failure injected for high-failure-rate scenario",
    ],
  }));
  injectFailure(c, target, inject, entries);
}

function applyDegradedHighAttr(c) {
  const target = findAttr(c, "usability_geospatial");
  injectFailure(c, target, 1, [
    {
      attribute_id: "usability_geospatial",
      suite: "src/app/Components/Map.test.tsx",
      title: "Map > [SIMULATED] cartographic legend stays legible at scale 1:200k",
      messages: [
        "AssertionError: legend symbology overlap detected (synthetic)",
      ],
    },
  ]);
}

function applyMixed(c) {
  applyFailingCritical(c);
  applyMissingEvidence(c);
  applyDegradedHighAttr(c);
}

function applyWarningOnly(c) {
  applyMissingEvidence(c);
}

// ─── Registry ────────────────────────────────────────────────────────────────

const SCENARIOS = {
  "failing-critical": {
    fn: applyFailingCritical,
    expected: "block",
    description:
      "Inject 2 failed assertions on the `processing` attribute (criticality 5). "
      + "Forces decision=block. Expect rich anomaly detection and suggested tests "
      + "for spatial overlay correctness.",
  },
  "missing-evidence": {
    fn: applyMissingEvidence,
    expected: "warn",
    description:
      "Wipe all matched suites for `data_quality` (criticality 4). Forces "
      + "decision=warn. Expect the LLM to flag the regression in test coverage "
      + "mapping and suggest adding completeness/outlier tests.",
  },
  "high-failure-rate": {
    fn: applyHighFailureRate,
    expected: "block",
    description:
      "Inject failures on ~10% of total tests against the first critical "
      + "attribute. Forces decision=block via the >5% global failure threshold.",
  },
  "mixed-degradation": {
    fn: applyMixed,
    expected: "block",
    description:
      "Combine failing-critical + missing-evidence + a high-criticality "
      + "degradation. Best scenario to see how the LLM prioritizes multiple "
      + "concurrent anomalies and writes blocking_issues vs warnings.",
  },
  "warning-only": {
    fn: applyWarningOnly,
    expected: "warn",
    description:
      "Lighter scenario: only `data_quality` has missing evidence. Forces "
      + "decision=warn. Useful to see how the LLM differentiates warn from block.",
  },
};

// ─── CLI ─────────────────────────────────────────────────────────────────────

const arg = process.argv[2];

function printList() {
  console.log("Available scenarios:\n");
  for (const [name, meta] of Object.entries(SCENARIOS)) {
    console.log(`  ${name.padEnd(20)} → expected decision: ${meta.expected}`);
    console.log(`    ${meta.description}\n`);
  }
  console.log("Workflow:");
  console.log("  1. npm run qa:collect                   # baseline");
  console.log("  2. npm run qa:simulate -- <name>        # inject scenario");
  console.log("  3. npm run qa:ai:local                  # see LLM analysis");
  console.log("  4. npm run qa:gate:local                # see gate decision");
  console.log("  5. npm run qa:collect                   # reset");
}

if (!arg || arg === "--list" || arg === "-l" || arg === "--help" || arg === "-h") {
  printList();
  process.exit(arg ? 0 : 1);
}

if (!SCENARIOS[arg]) {
  console.error(`Unknown scenario: "${arg}"\n`);
  printList();
  process.exit(1);
}

if (!fs.existsSync(coveragePath)) {
  console.error(
    `No baseline evidence found at ${coveragePath}\n` +
      `Run "npm run qa:collect" first to generate the real evidence file.`,
  );
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf-8"));
coverage.failedAssertions = coverage.failedAssertions || [];

SCENARIOS[arg].fn(coverage);

coverage._simulated = {
  scenario: arg,
  expected_decision: SCENARIOS[arg].expected,
  description: SCENARIOS[arg].description,
  injected_at: new Date().toISOString(),
  warning:
    "This evidence was synthetically modified for negative-scenario testing. "
    + "Run `npm run qa:collect` to restore real evidence.",
};

fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2));
console.log(`[simulate] scenario="${arg}" applied (expected gate: ${SCENARIOS[arg].expected})`);
console.log(`[simulate] next:  npm run qa:ai:local && npm run qa:gate:local`);
console.log(`[simulate] reset: npm run qa:collect`);
