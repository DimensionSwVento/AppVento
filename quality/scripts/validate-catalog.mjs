#!/usr/bin/env node
/**
 * Validates quality/quality-attributes.json against quality/quality-attributes.schema.json.
 *
 * The catalog is the reference model of the whole approach: quality gates declare
 * which attribute they cover, and the generative analysis stage receives catalog
 * entries as grounding context. A malformed catalog would silently corrupt both,
 * so this script is a blocking step of the quality pipeline.
 *
 * Beyond the JSON Schema it enforces two invariants that JSON Schema cannot express:
 *   - attribute ids are unique (gates and analyzer output reference them as keys);
 *   - attribute names are unique (they are used verbatim in the paper's tables).
 *
 * Usage:  node quality/scripts/validate-catalog.mjs
 * Exit code 0 when the catalog is valid, 1 otherwise.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const catalogPath = path.join(repoRoot, "quality", "quality-attributes.json");
const schemaPath = path.join(repoRoot, "quality", "quality-attributes.schema.json");

// ajv is declared as a devDependency of the frontend package; the quality
// pipeline installs it with `npm ci` in Vento/ before running this script.
function loadAjv() {
  const requireFromFrontend = createRequire(path.join(repoRoot, "Vento", "package.json"));
  try {
    return requireFromFrontend("ajv");
  } catch {
    console.error(
      "[validate-catalog] Could not resolve 'ajv'. Run `npm ci` inside Vento/ first.",
    );
    process.exit(1);
  }
}

function readJson(filePath) {
  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    console.error(`[validate-catalog] Cannot read ${filePath}: ${error.message}`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[validate-catalog] ${filePath} is not valid JSON: ${error.message}`);
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
  const schema = readJson(schemaPath);
  const catalog = readJson(catalogPath);

  // The catalog carries a "$schema" pointer for editor tooling; ajv would try to
  // resolve it as a meta-schema reference, so the schema declares it explicitly
  // as an allowed property and we validate against the schema we just loaded.
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const errors = [];

  if (!validate(catalog)) {
    for (const error of validate.errors) {
      const where = error.instancePath || "(root)";
      errors.push(`schema: ${where} ${error.message}`);
    }
  }

  const attributes = Array.isArray(catalog.attributes) ? catalog.attributes : [];

  const duplicateIds = findDuplicates(attributes.map((a) => a.id));
  if (duplicateIds.length > 0) {
    errors.push(`duplicate attribute ids: ${duplicateIds.join(", ")}`);
  }

  const duplicateNames = findDuplicates(attributes.map((a) => a.name));
  if (duplicateNames.length > 0) {
    errors.push(`duplicate attribute names: ${duplicateNames.join(", ")}`);
  }

  if (errors.length > 0) {
    console.error("[validate-catalog] Catalog is INVALID:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(
    `[validate-catalog] OK - catalog v${catalog.catalogVersion}, ` +
      `${attributes.length} attributes, ids: ${attributes.map((a) => a.id).join(", ")}`,
  );
}

main();
