#!/usr/bin/env node
/**
 * Prints the attribute coverage inventory: for each of the catalog's quality
 * attributes, which gates cover it (possibly none), which of its catalog tests
 * those gates implement, and which are still missing.
 *
 * Every figure here is derived from quality-attributes.json and gates.json at
 * run time. Nothing about coverage is hardcoded: change a gate's attributeId and
 * the numbers move.
 *
 * Usage:
 *   node quality/scripts/coverage-inventory.mjs
 *   node quality/scripts/coverage-inventory.mjs --json <path>    also write JSON
 *   node quality/scripts/coverage-inventory.mjs --markdown       emit Markdown
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  computeAttributeCoverage,
  enabledGates,
  loadCatalog,
  loadGates,
} from "./lib/model.mjs";

function parseArgs(argv) {
  const options = { json: null, markdown: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--json") {
      options.json = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--markdown") {
      options.markdown = true;
    }
  }
  return options;
}

const STATUS_LABEL = {
  covered: "COVERED",
  weak: "WEAK",
  uncovered: "UNCOVERED",
};

function renderText(coverage, gates) {
  const lines = [];
  const active = enabledGates(gates);

  lines.push("Attribute coverage inventory");
  lines.push("=".repeat(78));
  lines.push(
    `Gates declared: ${gates.gates.length} (${active.length} enabled). ` +
      `An attribute counts as COVERED when its gates implement at least ` +
      `${Math.round(coverage.strongCoverageMinRatio * 100)}% of its catalog tests.`,
  );
  lines.push("");

  for (const attribute of coverage.attributes) {
    lines.push(
      `${STATUS_LABEL[attribute.status].padEnd(10)} ${attribute.attributeId}  (${attribute.name})`,
    );
    lines.push(
      `           catalog tests implemented: ${attribute.implementedTests.length}/${attribute.catalogTestCount}`,
    );
    if (attribute.gateIds.length > 0) {
      lines.push(`           gates: ${attribute.gateIds.join(", ")}`);
    } else {
      lines.push("           gates: (none)");
    }
    for (const test of attribute.implementedTests) {
      lines.push(`             + ${test}`);
    }
    for (const test of attribute.missingTests) {
      lines.push(`             - ${test}`);
    }
    lines.push("");
  }

  lines.push("-".repeat(78));
  lines.push(
    `Attributes with at least one gate: ${coverage.withAtLeastOneGate.length} of ${coverage.totalAttributes}`,
  );
  lines.push(`  covered   (${coverage.covered.length}): ${coverage.covered.join(", ") || "-"}`);
  lines.push(`  weak      (${coverage.weak.length}): ${coverage.weak.join(", ") || "-"}`);
  lines.push(`  uncovered (${coverage.uncovered.length}): ${coverage.uncovered.join(", ") || "-"}`);

  return lines.join("\n");
}

function renderMarkdown(coverage, gates) {
  const lines = [];
  lines.push("### Attribute coverage inventory");
  lines.push("");
  lines.push(
    `**${coverage.withAtLeastOneGate.length} of ${coverage.totalAttributes}** quality attributes have at least one gate ` +
      `(${coverage.covered.length} covered, ${coverage.weak.length} weakly covered, ${coverage.uncovered.length} uncovered). ` +
      `${enabledGates(gates).length} gates enabled.`,
  );
  lines.push("");
  lines.push("| Attribute | Status | Catalog tests | Gates |");
  lines.push("| --- | --- | --- | --- |");
  for (const attribute of coverage.attributes) {
    lines.push(
      `| ${attribute.name} | ${STATUS_LABEL[attribute.status]} | ` +
        `${attribute.implementedTests.length}/${attribute.catalogTestCount} | ` +
        `${attribute.gateIds.join(", ") || "—"} |`,
    );
  }
  return lines.join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const catalog = loadCatalog();
  const gates = loadGates();
  const coverage = computeAttributeCoverage(catalog, gates);

  console.log(options.markdown ? renderMarkdown(coverage, gates) : renderText(coverage, gates));

  if (options.json) {
    mkdirSync(path.dirname(options.json), { recursive: true });
    writeFileSync(options.json, `${JSON.stringify(coverage, null, 2)}\n`);
    console.log(`\n[coverage-inventory] JSON written to ${options.json}`);
  }
}

main();
