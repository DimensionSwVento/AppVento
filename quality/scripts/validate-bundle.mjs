#!/usr/bin/env node
/**
 * Validates an evidence bundle against quality/evidence-bundle.schema.json.
 *
 * The bundle is the contract between the collection stage, the analysis stage
 * and the results reported in the paper. Validating it in the pipeline is what
 * makes "fields may be added, never renamed or removed" enforceable rather than
 * a convention.
 *
 * Also cross-checks the bundle against the quality model: every gateId and
 * attributeId in the bundle must exist in gates.json and the catalog.
 *
 * Usage:  node quality/scripts/validate-bundle.mjs quality/evidence/run-<id>.json
 */

import { createRequire } from "node:module";
import path from "node:path";

import { QUALITY_DIR, REPO_ROOT, loadCatalog, loadGates, readJsonFile } from "./lib/model.mjs";

function loadAjv() {
  const requireFromFrontend = createRequire(path.join(REPO_ROOT, "Vento", "package.json"));
  try {
    return requireFromFrontend("ajv");
  } catch {
    console.error("[validate-bundle] Could not resolve 'ajv'. Run `npm ci` inside Vento/ first.");
    process.exit(1);
  }
}

function main() {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error("[validate-bundle] Usage: validate-bundle.mjs <path to run-*.json>");
    process.exit(1);
  }

  const Ajv = loadAjv();
  const bundle = readJsonFile(path.resolve(bundlePath));
  const catalog = loadCatalog();
  const gates = loadGates();
  const errors = [];

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(
    readJsonFile(path.join(QUALITY_DIR, "evidence-bundle.schema.json")),
  );
  if (!validate(bundle)) {
    for (const error of validate.errors) {
      errors.push(`schema: ${error.instancePath || "(root)"} ${error.message}`);
    }
  }

  const knownGateIds = new Set(gates.gates.map((gate) => gate.id));
  const knownAttributeIds = new Set(catalog.attributes.map((attribute) => attribute.id));

  for (const gate of bundle.gates ?? []) {
    if (!knownGateIds.has(gate.gateId)) {
      errors.push(`bundle reports unknown gateId '${gate.gateId}'`);
    }
    if (!knownAttributeIds.has(gate.attributeId)) {
      errors.push(`gate '${gate.gateId}' reports unknown attributeId '${gate.attributeId}'`);
    }
    if (gate.testsPassed > gate.testsRun) {
      errors.push(
        `gate '${gate.gateId}' reports testsPassed (${gate.testsPassed}) > testsRun (${gate.testsRun})`,
      );
    }
  }

  const coverage = bundle.attributeCoverage ?? {};
  const partition = [...(coverage.covered ?? []), ...(coverage.uncovered ?? [])];
  if (partition.length !== knownAttributeIds.size) {
    errors.push(
      `attributeCoverage.covered + uncovered has ${partition.length} entries, ` +
        `expected ${knownAttributeIds.size} (they must partition the catalog)`,
    );
  }
  for (const id of partition) {
    if (!knownAttributeIds.has(id)) {
      errors.push(`attributeCoverage references unknown attribute '${id}'`);
    }
  }

  if (errors.length > 0) {
    console.error(`[validate-bundle] ${bundlePath} is INVALID:`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  const passed = bundle.gates.filter((g) => g.status === "passed").length;
  const failed = bundle.gates.filter((g) => g.status === "failed").length;
  const skipped = bundle.gates.filter((g) => g.status === "skipped").length;
  console.log(
    `[validate-bundle] OK - run ${bundle.runId}: ${bundle.gates.length} gates ` +
      `(${passed} passed, ${failed} failed, ${skipped} skipped), ` +
      `${coverage.covered.length}/${coverage.totalAttributes} attributes with a gate`,
  );
}

main();
