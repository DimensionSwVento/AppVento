#!/usr/bin/env node
/**
 * RQ2 defect-detection harness, FRONTEND unit (see workspace/evidence/corpus/DESIGN.md).
 *
 * Two conditions over the SAME product code (research HEAD + optional defect patch):
 *   B (baseline)  = the checks of ci.yml + frontend-ci.yml as they exist on origin/develop
 *                   (lint, tsc, build, vitest unit, npm audit --audit-level=high with
 *                   continue-on-error), run with the test files as they are on origin/develop.
 *   P (protocol)  = the gates of quality/gates.json, executed by quality/scripts/collect-evidence.mjs
 *                   (vitest/command/npm-audit gates) plus the two Playwright gates executed
 *                   per gate against `next start` of the build the production-build gate produced,
 *                   then quality/scripts/deployment-decision.mjs on the merged bundle.
 *
 * Usage:
 *   node rq2-frontend.mjs prepare --condition B|P --worktree <dir>
 *   node rq2-frontend.mjs run --condition B|P --worktree <dir> --id <id> [--patch <file>] --out <json> --raw <dir>
 *
 * `prepare` (B only does work): restores every test path from origin/develop, deletes test files that do
 * not exist on develop, keeps the research vitest.config.ts (svg2pdf.js inline fix applies to both
 * conditions) and records the result as a local commit on the DETACHED HEAD of the disposable worktree
 * (no branch is created or moved). `run` resets the worktree to that base, cleans every untracked file
 * except node_modules (cold .next / coverage / tsbuildinfo for every run), applies the patch and runs.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, renameSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(3).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
    return acc;
  }, []),
);
const cmd = process.argv[2];

// Build env of frontend-ci.yml (B) and quality-pipeline.yml (P); NEXT_PUBLIC_* identical in both.
const BUILD_ENV_B = {
  NEXT_PUBLIC_API_URL: "",
  NEXT_PUBLIC_KEYCLOAK_URL: "http://localhost:8080",
  NEXT_PUBLIC_KEYCLOAK_REALM: "vento",
  AUTH_SECRET: "ci-build-only-secret",
  AUTH_TRUST_HOST: "true",
  AUTH_KEYCLOAK_ID: "vento-web",
  AUTH_KEYCLOAK_SECRET: "dev-secret-change-in-production",
  AUTH_KEYCLOAK_ISSUER: "http://localhost:8080/realms/vento",
};
const BUILD_ENV_P = { ...BUILD_ENV_B, AUTH_SECRET: "ci-quality-pipeline-only-secret" };
// playwright.config.ts webServer env (runtime of `next start`).
const START_ENV = { ...BUILD_ENV_B, AUTH_SECRET: "e2e-only-secret-not-for-production" };

function sh(command, cwd, env = {}, { allowFail = true } = {}) {
  const started = Date.now();
  const r = spawnSync(command, {
    cwd,
    shell: "/bin/bash",
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  const res = { exitCode: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? ""), durationMs: Date.now() - started };
  if (!allowFail && res.exitCode !== 0) throw new Error(`${command} failed (${res.exitCode})\n${res.out}`);
  return res;
}
const git = (wt, a) => sh(`git ${a}`, wt, {}, { allowFail: false }).out.trim();
const tail = (s, n = 3000) => (s.length > n ? `[...]\n${s.slice(-n)}` : s);

function listTestFiles(wt, ref) {
  // Test paths: Vento/__tests__/**, Vento/e2e/**, Vento/src/**/*.test.* (and *.spec.*).
  const out = ref
    ? git(wt, `ls-tree -r --name-only ${ref} -- Vento/__tests__ Vento/e2e Vento/src`)
    : git(wt, `ls-files -- Vento/__tests__ Vento/e2e Vento/src`);
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) => f.startsWith("Vento/__tests__/") || f.startsWith("Vento/e2e/") || /\.(test|spec)\.[cm]?[jt]sx?$/.test(f));
}

function prepare() {
  const wt = path.resolve(args.worktree);
  const cond = args.condition;
  const base = git(wt, "rev-parse HEAD");
  let info = { condition: cond, researchCommit: base, base };
  if (cond === "B") {
    const devRef = git(wt, "rev-parse origin/develop");
    const inDev = new Set(listTestFiles(wt, devRef));
    const inHead = listTestFiles(wt, null);
    const removed = inHead.filter((f) => !inDev.has(f));
    for (const f of removed) git(wt, `rm -q -- "${f}"`);
    const restore = [...inDev];
    // checkout in chunks to keep the command line short
    for (let i = 0; i < restore.length; i += 50) {
      git(wt, `checkout ${devRef} -- ${restore.slice(i, i + 50).map((f) => `"${f}"`).join(" ")}`);
    }
    const changed = git(wt, "diff --cached --name-status");
    git(wt, `-c user.name=rq2-harness -c user.email=rq2@localhost commit -q -m "rq2: baseline test files from origin/develop ${devRef.slice(0, 7)} (detached, disposable)"`);
    info = { ...info, developCommit: devRef, base: git(wt, "rev-parse HEAD"), removedTestFiles: removed, testDiff: changed.split("\n") };
  }
  writeFileSync(path.join(wt, ".rq2-base.json"), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));
}

function resetWorktree(wt, base) {
  git(wt, `reset -q --hard ${base}`);
  git(wt, "clean -qfdx -e node_modules -e .rq2-base.json");
}

/** Parses a vitest JUnit XML into { "<file> > <name>": "passed"|"failed"|"skipped" }. */
function parseJunit(xml) {
  const tests = {};
  const suiteFailures = [];
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const cls = (attrs.match(/classname="([^"]*)"/) || [])[1] ?? "";
    const name = (attrs.match(/\bname="([^"]*)"/) || [])[1] ?? "";
    const body = m[3] ?? "";
    const status = /<(failure|error)\b/.test(body) ? "failed" : /<skipped\b/.test(body) ? "skipped" : "passed";
    tests[`${cls} > ${name}`] = status;
  }
  for (const s of xml.matchAll(/<testsuite\b[^>]*name="([^"]*)"[^>]*tests="0"[^>]*failures="([1-9]\d*)"/g)) suiteFailures.push(s[1]);
  return { tests, suiteFailures };
}

/** Same per-test key from vitest's JSON reporter (used by collect-evidence in P). */
function parseVitestJson(file, frontendDir) {
  const tests = {};
  const suiteFailures = [];
  if (!existsSync(file)) return { tests, suiteFailures, missing: true };
  const rep = JSON.parse(readFileSync(file, "utf8"));
  for (const f of rep.testResults ?? []) {
    const rel = path.relative(frontendDir, f.name).split(path.sep).join("/");
    if ((f.assertionResults ?? []).length === 0 && f.status === "failed") suiteFailures.push(rel);
    for (const a of f.assertionResults ?? []) {
      tests[`${rel} > ${a.fullName}`] = a.status === "passed" ? "passed" : a.status === "failed" ? "failed" : "skipped";
    }
  }
  return { tests, suiteFailures };
}

function runB(wt, raw) {
  const fe = path.join(wt, "Vento");
  const checks = [];
  const add = (id, workflowJob, r, extra = {}) => {
    writeFileSync(path.join(raw, `${id}.log`), r.out);
    checks.push({ id, workflowJob, status: r.exitCode === 0 ? "passed" : "failed", exitCode: r.exitCode, durationMs: r.durationMs, logTail: r.exitCode === 0 ? "" : tail(r.out), ...extra });
  };
  add("lint", "ci.yml:quality + frontend-ci.yml:lint", sh("npm run lint", fe));
  add("tsc", "ci.yml:quality", sh("npx tsc --noEmit", fe));
  add("build", "ci.yml:build + frontend-ci.yml:build", sh("npm run build", fe, BUILD_ENV_B));
  const junit = path.join(raw, "vitest-junit.xml");
  const u = sh(`npx vitest run --project unit --reporter=junit --outputFile=${JSON.stringify(junit)}`, fe, { CI: "true" });
  const parsed = existsSync(junit) ? parseJunit(readFileSync(junit, "utf8")) : { tests: {}, suiteFailures: [], missing: true };
  add("unit", "frontend-ci.yml:unit (NO test step on develop; see notes)", u, {
    testsRun: Object.keys(parsed.tests).length,
    testsFailed: Object.values(parsed.tests).filter((s) => s === "failed").length,
    reportMissing: Boolean(parsed.missing),
  });
  const a = sh("npm audit --audit-level=high", fe);
  writeFileSync(path.join(raw, "audit.log"), a.out);
  checks.push({ id: "audit", workflowJob: "ci.yml:security (continue-on-error: true)", status: "passed", exitCode: a.exitCode, rawStatus: a.exitCode === 0 ? "passed" : "failed", durationMs: a.durationMs, note: "continue-on-error: a non-zero exit never fails the job" });
  return { checks, tests: parsed.tests, suiteFailures: parsed.suiteFailures };
}

async function waitHttp(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status > 0) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function runPlaywrightGates(wt, raw, gates, buildOk) {
  const fe = path.join(wt, "Vento");
  const results = [];
  let server = null;
  let serverUp = false;
  if (buildOk) {
    const env = { ...process.env, ...START_ENV };
    delete env.CI; // reuseExistingServer = !CI → the gate reuses this server instead of rebuilding
    server = spawn("npx", ["next", "start", "-p", "3000"], { cwd: fe, env, detached: true, stdio: "ignore" });
    serverUp = await waitHttp("http://localhost:3000/", 90_000);
  }
  for (const gate of gates) {
    const started = Date.now();
    let r;
    if (!buildOk || !serverUp) {
      r = { exitCode: 1, out: buildOk ? "next start did not answer" : "production build failed: webServer (`npm run build && npm run start`) cannot start", durationMs: 0 };
    } else {
      rmSync(path.join(fe, "e2e", ".auth"), { recursive: true, force: true });
      const env = { ...START_ENV };
      r = sh(`env -u CI npx --no-install playwright test --retries=2 --project=${gate.source.project} ${gate.source.include.join(" ")}`, fe, env);
    }
    writeFileSync(path.join(raw, `${gate.id}.log`), r.out);
    const passed = Number((r.out.match(/(\d+) passed/) || [])[1] ?? 0);
    const failed = Number((r.out.match(/(\d+) failed/) || [])[1] ?? 0);
    results.push({
      gateId: gate.id, attributeId: gate.attributeId, blocking: gate.blocking,
      status: r.exitCode === 0 ? "passed" : "failed", testsRun: passed + failed, testsPassed: passed,
      assertions: 0, durationMs: Date.now() - started,
      logExcerpt: r.exitCode === 0 ? `${passed} Playwright test(s) passed.` : tail(r.out, 4000), artifacts: [],
    });
  }
  if (server) {
    try { process.kill(-server.pid, "SIGTERM"); } catch {}
    await new Promise((r) => setTimeout(r, 2000));
    try { process.kill(-server.pid, "SIGKILL"); } catch {}
  }
  return results;
}

async function runP(wt, raw, id) {
  const gatesDoc = JSON.parse(readFileSync(path.join(wt, "quality", "gates.json"), "utf8"));
  const pw = gatesDoc.gates.filter((g) => g.enabled && g.source.kind === "playwright");
  const runId = `rq2-${id}`;
  const c = sh(`node quality/scripts/collect-evidence.mjs --run-id ${runId} --out-dir ${JSON.stringify(raw)} --skip ${pw.map((g) => g.id).join(",")}`, wt, BUILD_ENV_P);
  writeFileSync(path.join(raw, "collect-evidence.log"), c.out);
  const bundlePath = path.join(raw, `run-${runId}.json`);
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  const buildGate = bundle.gates.find((g) => g.gateId === "production-build");
  const pwResults = await runPlaywrightGates(wt, raw, pw, buildGate?.status === "passed");
  bundle.gates = bundle.gates.map((g) => pwResults.find((p) => p.gateId === g.gateId) ?? g);
  writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
  const d = sh(`node quality/scripts/deployment-decision.mjs ${JSON.stringify(bundlePath)}`, wt, { GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" });
  const decided = JSON.parse(readFileSync(bundlePath, "utf8"));
  const parsed = parseVitestJson(path.join(raw, "raw", runId, "vitest-results.json"), path.join(wt, "Vento"));
  const checks = decided.gates.map((g) => ({
    id: g.gateId, attributeId: g.attributeId, blocking: g.blocking, status: g.status,
    testsRun: g.testsRun, testsPassed: g.testsPassed, durationMs: g.durationMs,
    logTail: g.status === "passed" ? "" : String(g.logExcerpt ?? "").slice(0, 3000),
  }));
  return {
    checks, tests: parsed.tests, suiteFailures: parsed.suiteFailures,
    deployment: decided.deployment, coverage: decided.coverage, decisionLog: d.out.trim(),
  };
}

async function run() {
  const wt = path.resolve(args.worktree);
  const cond = args.condition;
  const info = JSON.parse(readFileSync(path.join(wt, ".rq2-base.json"), "utf8"));
  const raw = path.resolve(args.raw);
  rmSync(raw, { recursive: true, force: true });
  mkdirSync(raw, { recursive: true });
  resetWorktree(wt, info.base); // also recovers a worktree left dirty by an interrupted run
  if (cond === "P") sh("fuser -k 3000/tcp >/dev/null 2>&1 || true", wt);
  let patchApplied = null;
  if (args.patch) {
    const p = path.resolve(args.patch);
    const ap = sh(`git apply --whitespace=nowarn ${JSON.stringify(p)}`, wt);
    if (ap.exitCode !== 0) throw new Error(`patch does not apply: ${ap.out}`);
    patchApplied = { patch: p, files: git(wt, "diff --name-only").split("\n").filter(Boolean) };
  }
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const r = cond === "B" ? runB(wt, raw) : await runP(wt, raw, args.id);
  const durationMs = Date.now() - t0;
  const result = {
    id: args.id, condition: cond, startedAt, durationMs,
    researchCommit: info.researchCommit, developCommit: info.developCommit ?? null, worktreeBase: info.base,
    patch: patchApplied, node: process.version, ...r,
  };
  mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  // atomic: a run interrupted mid-write never leaves a truncated (but "existing") result file
  const tmpOut = `${path.resolve(args.out)}.tmp-${process.pid}`;
  writeFileSync(tmpOut, JSON.stringify(result, null, 2) + "\n");
  renameSync(tmpOut, path.resolve(args.out));
  resetWorktree(wt, info.base);
  const failing = r.checks.filter((c) => c.status !== "passed").map((c) => c.id);
  console.log(`[rq2] ${cond} ${args.id}: ${Math.round(durationMs / 1000)} s; failing checks: ${failing.join(",") || "none"}`);
}

if (cmd === "prepare") prepare();
else if (cmd === "run") await run();
else {
  console.error("usage: rq2-frontend.mjs prepare|run ...");
  process.exit(2);
}
