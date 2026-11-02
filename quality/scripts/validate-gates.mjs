#!/usr/bin/env node
/**
 * Validates quality/gates.json against its schema and cross-checks it against
 * the quality attributes catalog.
 *
 * The cross-checks are the point of this script. A gate that names an attribute
 * that does not exist, or claims to implement a test that is not in that
 * attribute's catalog entry, would silently corrupt the coverage inventory and,
 * through it, the figures reported in the paper. The same applies to a unit test
 * file that no gate claims: it would run in CI and count towards nothing.
 *
 * Checks performed:
 *   1. JSON Schema conformance.
 *   2. Gate ids are unique.
 *   3. Every attributeId exists in the catalog.
 *   4. Every entry of catalogTests is verbatim one of that attribute's tests.
 *   5. Vitest gates partition the unit suite: every unit test file on disk is
 *      claimed by exactly one gate, and no file is claimed by two.
 *
 * Usage:  node quality/scripts/validate-gates.mjs
 */

import { createRequire } from "node:module";
import path from "node:path";

import {
  GATES_SCHEMA_PATH,
  REPO_ROOT,
  gatesOfKind,
  listUnitTestFiles,
  loadCatalog,
  loadGates,
  matchesAnyGlob,
  readJsonFile,
} from "./lib/model.mjs";

function loadAjv() {
  const requireFromFrontend = createRequire(path.join(REPO_ROOT, "Vento", "package.json"));
  try {
    return requireFromFrontend("ajv");
  } catch {
    console.error("[validate-gates] Could not resolve 'ajv'. Run `npm ci` inside Vento/ first.");
    process.exit(1);
  }
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function main() {
  const Ajv = loadAjv();
  const catalog = loadCatalog();
  const gates = loadGates();
  const errors = [];

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(readJsonFile(GATES_SCHEMA_PATH));
  if (!validate(gates)) {
    for (const error of validate.errors) {
      errors.push(`schema: ${error.instancePath || "(root)"} ${error.message}`);
    }
  }

  const allGates = Array.isArray(gates.gates) ? gates.gates : [];

  const duplicateIds = findDuplicates(allGates.map((gate) => gate.id));
  if (duplicateIds.length > 0) {
    errors.push(`duplicate gate ids: ${duplicateIds.join(", ")}`);
  }

  const attributesById = new Map(catalog.attributes.map((a) => [a.id, a]));

  for (const gate of allGates) {
    const attribute = attributesById.get(gate.attributeId);
    if (!attribute) {
      errors.push(
        `gate '${gate.id}' declares unknown attributeId '${gate.attributeId}'`,
      );
      continue;
    }
    for (const test of gate.catalogTests ?? []) {
      if (!attribute.tests.includes(test)) {
        errors.push(
          `gate '${gate.id}' claims catalog test '${test}', which is not one of the ` +
            `tests declared for attribute '${attribute.id}'`,
        );
      }
    }
  }

  // Vitest gates must partition the unit suite exactly.
  const vitestGates = gatesOfKind(gates, "vitest");
  const unitTestFiles = listUnitTestFiles();

  for (const file of unitTestFiles) {
    const claiming = vitestGates.filter((gate) =>
      matchesAnyGlob(file, gate.source.include),
    );
    if (claiming.length === 0) {
      errors.push(`unit test file claimed by no gate: ${file}`);
    } else if (claiming.length > 1) {
      errors.push(
        `unit test file claimed by ${claiming.length} gates ` +
          `(${claiming.map((g) => g.id).join(", ")}): ${file}`,
      );
    }
  }

  for (const gate of vitestGates) {
    for (const glob of gate.source.include) {
      if (!unitTestFiles.some((file) => matchesAnyGlob(file, [glob]))) {
        errors.push(`gate '${gate.id}' includes a pattern matching no file: ${glob}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("[validate-gates] Gate inventory is INVALID:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(
    `[validate-gates] OK - ${allGates.length} gates (${vitestGates.length} vitest), ` +
      `${unitTestFiles.length} unit test files each claimed exactly once`,
  );
}

main();
