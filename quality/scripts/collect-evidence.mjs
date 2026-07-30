#!/usr/bin/env node
/**
 * Runs the enabled quality gates and emits ONE normalized evidence bundle per
 * run: quality/evidence/run-<id>.json
 *
 * The heterogeneous outputs of the pipeline (Vitest's JSON reporter, tsc's
 * diagnostics, npm audit's JSON, the Next.js build log, Playwright's reporter)
 * are collected here and reduced to a single shape. Everything downstream reads
 * that shape and nothing else: the analyzer is prompted from it, and the
 * quantitative table of the paper is produced from it.
 *
 * The bundle is always written and is always valid JSON, including when gates
 * fail or when the collector itself cannot run a gate.
 *
 * Usage:
 *   node quality/scripts/collect-evidence.mjs
 *   node quality/scripts/collect-evidence.mjs --skip production-build,accessibility-tests
 *   node quality/scripts/collect-evidence.mjs --run-id local-green
 *
 * Notes on two metrics that are easy to misread:
 *   - `testsRun` / `testsPassed` count test cases (Vitest `it()` blocks).
 *   - `assertions` counts `expect(` calls statically in the gate's test files.
 *     Vitest does not report per-test expect counts, so this is a static count;
 *     `assertionCountMethod` in the bundle records that explicitly.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  FRONTEND_DIR,
  QUALITY_DIR,
  computeAttributeCoverage,
  enabledGates,
  loadCatalog,
  loadGates,
  matchesAnyGlob,
  readJsonFile,
} from "./lib/model.mjs";

const LOG_EXCERPT_LIMIT = 4000;

function parseArgs(argv) {
  const options = { skip: new Set(), runId: null, outDir: path.join(QUALITY_DIR, "evidence") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--skip") {
      for (const id of (argv[i + 1] ?? "").split(",").filter(Boolean)) options.skip.add(id.trim());
      i += 1;
    } else if (argv[i] === "--run-id") {
      options.runId = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--out-dir") {
      options.outDir = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return options;
}

function truncate(text, limit = LOG_EXCERPT_LIMIT) {
  const clean = (text ?? "").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)}\n[...truncated, ${clean.length - limit} more characters]`;
}

/** Runs a shell command, never throwing: the exit code is part of the evidence. */
function run(command, cwd, extraEnv = {}) {
  const started = Date.now();
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...extraEnv },
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    durationMs: Date.now() - started,
  };
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/** Static count of `expect(` calls in a set of test files. */
function countAssertions(relativeFiles) {
  let total = 0;
  for (const file of relativeFiles) {
    const full = path.join(FRONTEND_DIR, file);
    if (!existsSync(full)) continue;
    total += (readFileSync(full, "utf8").match(/\bexpect\s*\(/g) ?? []).length;
  }
  return total;
}

/**
 * Runs the whole unit suite once with coverage. Individual vitest gates are
 * partitions of this single run, so tests are never executed twice and never
 * counted twice.
 */
function runVitestOnce(rawDir) {
  const reportPath = path.join(rawDir, "vitest-results.json");
  const command =
    "npx --no-install vitest run --project unit " +
    "--coverage --coverage.reporter=json-summary --coverage.reporter=text " +
    `--reporter=json --outputFile=${JSON.stringify(reportPath)}`;

  const result = run(command, FRONTEND_DIR, { CI: "true" });
  writeFileSync(path.join(rawDir, "vitest.log"), result.stdout + result.stderr);

  let report = null;
  if (existsSync(reportPath)) {
    try {
      report = readJsonFile(reportPath);
    } catch {
      report = null;
    }
  }

  let coverage = { lines: null, branches: null };
  const summaryPath = path.join(FRONTEND_DIR, "coverage", "coverage-summary.json");
  if (existsSync(summaryPath)) {
    try {
      const total = readJsonFile(summaryPath).total;
      coverage = { lines: total.lines.pct, branches: total.branches.pct };
    } catch {
      /* coverage stays null; the bundle records the gap rather than guessing */
    }
  }

  return { result, report, coverage, reportPath };
}

/** Per-file results of the single vitest run, keyed by path relative to Vento/. */
function indexVitestByFile(report) {
  const byFile = new Map();
  if (!report?.testResults) return byFile;
  for (const fileResult of report.testResults) {
    const relative = path
      .relative(FRONTEND_DIR, fileResult.name)
      .split(path.sep)
      .join("/");
    byFile.set(relative, fileResult);
  }
  return byFile;
}

function evaluateVitestGate(gate, vitest, byFile) {
  const files = [...byFile.keys()].filter((file) =>
    matchesAnyGlob(file, gate.source.include),
  );

  let testsRun = 0;
  let testsPassed = 0;
  let durationMs = 0;
  const failureMessages = [];

  for (const file of files) {
    const fileResult = byFile.get(file);
    durationMs += (fileResult.endTime ?? 0) - (fileResult.startTime ?? 0);
    for (const assertion of fileResult.assertionResults ?? []) {
      testsRun += 1;
      if (assertion.status === "passed") testsPassed += 1;
      else if (assertion.status === "failed") {
        failureMessages.push(
          `${file} > ${assertion.fullName}\n${(assertion.failureMessages ?? []).join("\n")}`,
        );
      }
    }
  }

  // A gate whose files did not run at all (suite-level crash) is a failure, not
  // a pass by absence of evidence.
  const ranNothing = files.length === 0 || (testsRun === 0 && gate.source.include.length > 0);
  const status = failureMessages.length === 0 && !ranNothing ? "passed" : "failed";

  const logExcerpt =
    failureMessages.length > 0
      ? truncate(failureMessages.join("\n\n"))
      : ranNothing
        ? truncate(
            `No test case of gate '${gate.id}' was executed. Vitest exited with ` +
              `code ${vitest.result.exitCode}.\n${vitest.result.stderr || vitest.result.stdout}`,
          )
        : `${testsPassed}/${testsRun} test cases passed across ${files.length} file(s).`;

  return {
    status,
    testsRun,
    testsPassed,
    assertions: countAssertions(files),
    durationMs: Math.round(durationMs),
    logExcerpt,
    artifacts: [path.relative(process.cwd(), vitest.reportPath).split(path.sep).join("/")],
  };
}

function evaluateCommandGate(gate, rawDir) {
  const cwd = path.join(FRONTEND_DIR, "..", gate.source.workingDirectory ?? "Vento");
  const result = run(gate.source.command, path.resolve(cwd));
  const logPath = path.join(rawDir, `${gate.id}.log`);
  writeFileSync(logPath, result.stdout + result.stderr);

  const output = result.stdout + result.stderr;
  return {
    status: result.exitCode === 0 ? "passed" : "failed",
    testsRun: 1,
    testsPassed: result.exitCode === 0 ? 1 : 0,
    assertions: 0,
    durationMs: result.durationMs,
    logExcerpt:
      result.exitCode === 0
        ? `Command '${gate.source.command}' exited 0.`
        : truncate(`Command '${gate.source.command}' exited ${result.exitCode}.\n${output}`),
    artifacts: [path.relative(process.cwd(), logPath).split(path.sep).join("/")],
  };
}

function evaluateAuditGate(gate, rawDir) {
  const cwd = path.resolve(path.join(FRONTEND_DIR, "..", gate.source.workingDirectory ?? "Vento"));
  // npm audit exits non-zero when advisories exist; that is data, not an error.
  const result = run("npm audit --json", cwd);
  const jsonPath = path.join(rawDir, "npm-audit.json");
  writeFileSync(jsonPath, result.stdout || result.stderr);

  let severities = { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 };
  let parsed = true;
  try {
    const audit = JSON.parse(result.stdout);
    severities = { ...severities, ...audit.metadata.vulnerabilities };
  } catch {
    parsed = false;
  }

  return {
    severities,
    parsed,
    gateResult: {
      // Declared non-blocking in gates.json: the counts are the evidence, the
      // presence of advisories does not fail the gate.
      status: parsed ? "passed" : "failed",
      testsRun: 1,
      testsPassed: parsed ? 1 : 0,
      assertions: 0,
      durationMs: result.durationMs,
      logExcerpt: parsed
        ? `npm audit: ${severities.critical} critical, ${severities.high} high, ` +
          `${severities.moderate} moderate, ${severities.low} low ` +
          `(${severities.total} total advisories).`
        : truncate(`npm audit did not return parseable JSON.\n${result.stdout}${result.stderr}`),
      artifacts: [path.relative(process.cwd(), jsonPath).split(path.sep).join("/")],
    },
  };
}

function evaluatePlaywrightGate(gate, rawDir) {
  const cwd = path.resolve(path.join(FRONTEND_DIR, "..", gate.source.workingDirectory ?? "Vento"));
  const specs = gate.source.include.map((spec) => JSON.stringify(spec)).join(" ");
  const project = gate.source.project ? `--project=${gate.source.project}` : "";
  const result = run(`npx --no-install playwright test ${project} ${specs}`, cwd);
  const logPath = path.join(rawDir, `${gate.id}.log`);
  writeFileSync(logPath, result.stdout + result.stderr);

  const output = result.stdout + result.stderr;
  const passedMatch = output.match(/(\d+) passed/);
  const failedMatch = output.match(/(\d+) failed/);
  const testsPassed = passedMatch ? Number(passedMatch[1]) : 0;
  const testsFailed = failedMatch ? Number(failedMatch[1]) : 0;

  return {
    status: result.exitCode === 0 ? "passed" : "failed",
    testsRun: testsPassed + testsFailed,
    testsPassed,
    assertions: countAssertions(gate.source.include),
    durationMs: result.durationMs,
    logExcerpt:
      result.exitCode === 0
        ? `${testsPassed} Playwright test(s) passed.`
        : truncate(`Playwright exited ${result.exitCode}.\n${output}`),
    artifacts: [path.relative(process.cwd(), logPath).split(path.sep).join("/")],
  };
}

function skippedGate(reason) {
  return {
    status: "skipped",
    testsRun: 0,
    testsPassed: 0,
    assertions: 0,
    durationMs: 0,
    logExcerpt: reason,
    artifacts: [],
  };
}

function main() {
  const startedAt = Date.now();
  const options = parseArgs(process.argv.slice(2));

  const catalog = loadCatalog();
  const gates = loadGates();
  const active = enabledGates(gates);

  const runId = options.runId ?? process.env.GITHUB_RUN_ID ?? `local-${Date.now()}`;
  const rawDir = path.join(options.outDir, "raw", String(runId));
  mkdirSync(rawDir, { recursive: true });

  const vitestGates = active.filter(
    (gate) => gate.source.kind === "vitest" && !options.skip.has(gate.id),
  );

  let vitest = null;
  let byFile = new Map();
  if (vitestGates.length > 0) {
    console.log("[collect-evidence] Running the unit suite once with coverage...");
    vitest = runVitestOnce(rawDir);
    byFile = indexVitestByFile(vitest.report);
  }

  const gateResults = [];
  let audit = { critical: 0, high: 0, moderate: 0, low: 0 };

  for (const gate of active) {
    if (options.skip.has(gate.id)) {
      console.log(`[collect-evidence] ${gate.id}: skipped by --skip`);
      gateResults.push({ gateId: gate.id, attributeId: gate.attributeId, blocking: gate.blocking, ...skippedGate("Skipped explicitly via --skip for this run.") });
      continue;
    }

    console.log(`[collect-evidence] ${gate.id} (${gate.source.kind})...`);
    let result;
    if (gate.source.kind === "vitest") {
      result = vitest?.report
        ? evaluateVitestGate(gate, vitest, byFile)
        : skippedGate("The unit suite produced no JSON report; gate could not be evaluated.");
    } else if (gate.source.kind === "command") {
      result = evaluateCommandGate(gate, rawDir);
    } else if (gate.source.kind === "npm-audit") {
      const auditOutcome = evaluateAuditGate(gate, rawDir);
      const { critical, high, moderate, low } = auditOutcome.severities;
      audit = { critical, high, moderate, low };
      result = auditOutcome.gateResult;
    } else if (gate.source.kind === "playwright") {
      result = evaluatePlaywrightGate(gate, rawDir);
    } else {
      result = skippedGate(`Unsupported gate kind '${gate.source.kind}'.`);
    }

    gateResults.push({
      gateId: gate.id,
      attributeId: gate.attributeId,
      blocking: gate.blocking,
      ...result,
    });
    console.log(`[collect-evidence]   -> ${result.status}`);
  }

  const coverageModel = computeAttributeCoverage(catalog, gates);

  const bundle = {
    runId: String(runId),
    commit: gitCommit(),
    timestamp: new Date().toISOString(),
    workflowDurationMs: Date.now() - startedAt,
    catalogVersion: catalog.catalogVersion,
    gatesVersion: gates.gatesVersion,
    assertionCountMethod: "static-expect-calls",
    environment: {
      ci: Boolean(process.env.GITHUB_ACTIONS),
      workflow: process.env.GITHUB_WORKFLOW ?? null,
      ref: process.env.GITHUB_REF ?? null,
      node: process.version,
    },
    gates: gateResults,
    coverage: vitest?.coverage ?? { lines: null, branches: null },
    audit,
    attributeCoverage: {
      totalAttributes: coverageModel.totalAttributes,
      strongCoverageMinRatio: coverageModel.strongCoverageMinRatio,
      covered: coverageModel.withAtLeastOneGate,
      uncovered: coverageModel.uncovered,
      stronglyCovered: coverageModel.covered,
      weaklyCovered: coverageModel.weak,
      perAttribute: coverageModel.attributes,
    },
    analysis: null,
  };

  const bundlePath = path.join(options.outDir, `run-${runId}.json`);
  mkdirSync(options.outDir, { recursive: true });
  writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

  const failed = gateResults.filter((g) => g.status === "failed");
  console.log(
    `\n[collect-evidence] Bundle written to ${path.relative(process.cwd(), bundlePath)}\n` +
      `[collect-evidence] ${gateResults.filter((g) => g.status === "passed").length} passed, ` +
      `${failed.length} failed, ` +
      `${gateResults.filter((g) => g.status === "skipped").length} skipped | ` +
      `coverage lines ${bundle.coverage.lines}% branches ${bundle.coverage.branches}% | ` +
      `attributes with a gate: ${coverageModel.withAtLeastOneGate.length}/${coverageModel.totalAttributes}`,
  );

  // The collector always succeeds: producing the bundle is its job. Deciding
  // whether the run may deploy belongs to the gate-decision step.
  process.exit(0);
}

main();
