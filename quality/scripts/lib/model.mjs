/**
 * Shared loader for the quality model: the catalog of quality attributes and the
 * inventory of quality gates that cover them.
 *
 * Everything downstream (validation, coverage inventory, evidence bundle,
 * analyzer prompts) reads the model through this module, so there is exactly one
 * definition of what an attribute is, what a gate is, and how coverage is
 * computed. No coverage figure is ever written down by hand.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(scriptDir, "..", "..", "..");
export const QUALITY_DIR = path.join(REPO_ROOT, "quality");
export const FRONTEND_DIR = path.join(REPO_ROOT, "Vento");

export const CATALOG_PATH = path.join(QUALITY_DIR, "quality-attributes.json");
export const CATALOG_SCHEMA_PATH = path.join(QUALITY_DIR, "quality-attributes.schema.json");
export const GATES_PATH = path.join(QUALITY_DIR, "gates.json");
export const GATES_SCHEMA_PATH = path.join(QUALITY_DIR, "gates.schema.json");

/** Directories that never contain project test files. */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "playwright-report",
  "test-results",
  "public",
]);

export function readJsonFile(filePath) {
  const raw = readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${filePath} is not valid JSON: ${error.message}`);
  }
}

export function loadCatalog() {
  return readJsonFile(CATALOG_PATH);
}

export function loadGates() {
  return readJsonFile(GATES_PATH);
}

/**
 * Minimal glob matcher for the patterns used in gates.json.
 * Supports `**` (any number of path segments) and `*` (within one segment).
 * A dependency-free matcher is enough here and keeps the model readable.
 */
export function globToRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          source += "(?:[^/]+/)*";
          i += 2;
        } else {
          source += ".*";
          i += 1;
        }
      } else {
        source += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }
  return new RegExp(`^${source}$`);
}

export function matchesAnyGlob(relativePath, globs) {
  return globs.some((glob) => globToRegExp(glob).test(relativePath));
}

/** Recursively lists files under `dir`, returned as paths relative to `dir`. */
export function listFilesRelative(dir, relativeTo = dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      listFilesRelative(full, relativeTo, out);
    } else {
      out.push(path.relative(relativeTo, full).split(path.sep).join("/"));
    }
  }
  return out;
}

/** Unit test files as vitest.config.ts includes them. */
export function listUnitTestFiles() {
  const includes = ["__tests__/unit/**/*.test.ts", "__tests__/unit/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"];
  return listFilesRelative(FRONTEND_DIR)
    .filter((file) => matchesAnyGlob(file, includes))
    .sort();
}

export function enabledGates(gates) {
  return gates.gates.filter((gate) => gate.enabled);
}

export function gatesOfKind(gates, kind) {
  return enabledGates(gates).filter((gate) => gate.source.kind === kind);
}

/**
 * Computes, for each catalog attribute, which gates cover it and how much of the
 * attribute's declared catalog tests those gates actually implement.
 *
 * This is the single source of the "X of 13" figure. It is derived from the
 * catalog and the gate inventory every time it is needed.
 */
export function computeAttributeCoverage(catalog, gates) {
  const threshold = gates.coveragePolicy.strongCoverageMinRatio;
  const active = enabledGates(gates);

  const attributes = catalog.attributes.map((attribute) => {
    const covering = active.filter((gate) => gate.attributeId === attribute.id);
    const implementedTests = [
      ...new Set(covering.flatMap((gate) => gate.catalogTests)),
    ].sort();
    const missingTests = attribute.tests.filter(
      (test) => !implementedTests.includes(test),
    );
    const ratio =
      attribute.tests.length === 0 ? 0 : implementedTests.length / attribute.tests.length;

    let status;
    if (covering.length === 0) {
      status = "uncovered";
    } else if (ratio >= threshold) {
      status = "covered";
    } else {
      status = "weak";
    }

    return {
      attributeId: attribute.id,
      name: attribute.name,
      status,
      gateIds: covering.map((gate) => gate.id),
      implementedTests,
      missingTests,
      catalogTestCount: attribute.tests.length,
      implementedTestRatio: Number(ratio.toFixed(4)),
    };
  });

  const byStatus = (status) =>
    attributes.filter((a) => a.status === status).map((a) => a.attributeId);

  return {
    strongCoverageMinRatio: threshold,
    totalAttributes: attributes.length,
    attributes,
    covered: byStatus("covered"),
    weak: byStatus("weak"),
    uncovered: byStatus("uncovered"),
    /** Attributes with at least one gate, whether strongly or weakly covered. */
    withAtLeastOneGate: attributes
      .filter((a) => a.status !== "uncovered")
      .map((a) => a.attributeId),
  };
}
