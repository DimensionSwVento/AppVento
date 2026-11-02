#!/usr/bin/env node
/**
 * Applies the RQ2 detection rule (DESIGN.md) to the frontend runs and writes:
 *   results/frontend/clean-B.json, clean-P.json, <id>.json   (per defect, both conditions + detection)
 *   results/frontend/summary-frontend.json                    (aggregates)
 *   prints the markdown rows for results/summary.md (appended by --append-summary)
 *
 * Detection rule: a defect is DETECTED in a condition when at least one check (B job step / P gate) or
 * one test (per-test JUnit/JSON) that PASSED in the clean run FAILS (or disappears, i.e. its suite no
 * longer loads) with the defect. B never blocks the deployment (deploy does not depend on CI on develop);
 * P blocks when deployment-decision says BLOCK because of a gate that passed in the clean run.
 *
 *   node rq2-frontend-summarize.mjs <corpus dir> [--append-summary]
 */
import { existsSync, readFileSync, renameSync, writeFileSync as rawWrite } from "node:fs";

// atomic writes: a reader (or a resumed run) never sees a half-written file
function writeFileSync(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  rawWrite(tmp, data);
  renameSync(tmp, file);
}
import path from "node:path";

const corpus = path.resolve(process.argv[2]);
const append = process.argv.includes("--append-summary");
const resDir = path.join(corpus, "results", "frontend");
const runs = path.join(resDir, "runs");
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const manifest = read(path.join(corpus, "manifest.json")).filter((e) => e.unit === "frontend");

const clean = { B: read(path.join(runs, "clean-B.json")), P: read(path.join(runs, "clean-P.json")) };
writeFileSync(path.join(resDir, "clean-B.json"), JSON.stringify(clean.B, null, 2) + "\n");
writeFileSync(path.join(resDir, "clean-P.json"), JSON.stringify(clean.P, null, 2) + "\n");

const B_STRICT_CHECKS = new Set(["lint", "tsc", "build", "audit"]); // what develop's workflows actually execute

function detect(cond, run) {
  const c0 = clean[cond];
  const checkStatus0 = Object.fromEntries(c0.checks.map((c) => [c.id, c.status]));
  const newlyFailingChecks = run.checks
    .filter((c) => checkStatus0[c.id] === "passed" && c.status !== "passed")
    .map((c) => ({ id: c.id, attributeId: c.attributeId ?? null, blocking: c.blocking ?? null }));
  const reportOk = Object.keys(run.tests).length > 0;
  const newlyFailingTests = Object.entries(c0.tests)
    .filter(([k, s]) => s === "passed" && (run.tests[k] === "failed" || (reportOk && run.tests[k] === undefined)))
    .map(([k]) => (run.tests[k] === undefined ? `${k} [missing: suite did not load]` : k));
  const detected = newlyFailingChecks.length > 0 || newlyFailingTests.length > 0;
  return { detected, newlyFailingChecks, newlyFailingTests, durationMs: run.durationMs };
}

const rows = [];
const perDefect = [];
for (const e of manifest) {
  const fB = path.join(runs, `${e.id}-B.json`);
  const fP = path.join(runs, `${e.id}-P.json`);
  if (!existsSync(fB) || !existsSync(fP)) continue;
  const rB = read(fB);
  const rP = read(fP);
  const dB = detect("B", rB);
  const dP = detect("P", rP);
  // B as configured on develop (no unit test step): only lint/tsc/build/audit count.
  const dBstrict = dB.newlyFailingChecks.some((c) => B_STRICT_CHECKS.has(c.id));
  const pGateAttrs = [...new Set(dP.newlyFailingChecks.map((c) => c.attributeId))];
  const pBlocks = rP.deployment?.decision === "block" && dP.newlyFailingChecks.some((c) => c.blocking);
  const attributeMatch = dP.detected ? pGateAttrs.includes(e.targetAttribute) : null;
  const out = {
    id: e.id, family: e.family, unit: "frontend", targetAttribute: e.targetAttribute, patch: e.patch,
    researchCommit: rP.researchCommit, developCommit: rB.developCommit,
    B: { ...dB, detectedAsConfiguredOnDevelop: dBstrict, blocksDeploy: false, checks: rB.checks.map(({ logTail, ...c }) => c) },
    P: {
      ...dP, blocksDeploy: pBlocks, decision: rP.deployment?.decision ?? null,
      failingGateAttributes: pGateAttrs, attributeMatch,
      checks: rP.checks.map(({ logTail, ...c }) => c),
    },
    startedAt: { B: rB.startedAt, P: rP.startedAt },
  };
  writeFileSync(path.join(resDir, `${e.id}.json`), JSON.stringify(out, null, 2) + "\n");
  perDefect.push(out);
  const gates = dP.newlyFailingChecks.map((c) => `${c.id} (${c.attributeId})`).join(", ") || "—";
  const yn = (b) => (b ? "yes" : "no");
  rows.push(
    `| ${e.id} | ${e.family} | ${e.targetAttribute} | ${yn(dB.detected)}${dB.detected && !dBstrict ? "¹" : ""} | no | ${yn(dP.detected)} | ${yn(pBlocks)} | ${gates} | ${attributeMatch === null ? "—" : yn(attributeMatch)} | ${Math.round(dB.durationMs / 1000)} | ${Math.round(dP.durationMs / 1000)} |`,
  );
}

function rate(list, f) {
  return list.length ? { n: list.length, k: list.filter(f).length, pct: Math.round((1000 * list.filter(f).length) / list.length) / 10 } : { n: 0, k: 0, pct: null };
}
const fam = (f) => perDefect.filter((d) => !f || d.family === f);
const agg = {};
for (const [name, list] of [["S", fam("S")], ["R", fam("R")], ["total", fam(null)]]) {
  agg[name] = {
    B: rate(list, (d) => d.B.detected),
    B_asConfiguredOnDevelop: rate(list, (d) => d.B.detectedAsConfiguredOnDevelop),
    P: rate(list, (d) => d.P.detected),
    P_blocks: rate(list, (d) => d.P.blocksDeploy),
    P_attributeMatch_amongDetected: rate(list.filter((d) => d.P.detected), (d) => d.P.attributeMatch),
    meanDurationS: {
      B: list.length ? Math.round(list.reduce((s, d) => s + d.B.durationMs, 0) / list.length / 1000) : null,
      P: list.length ? Math.round(list.reduce((s, d) => s + d.P.durationMs, 0) / list.length / 1000) : null,
    },
    detectedByNeither: list.filter((d) => !d.B.detected && !d.P.detected).map((d) => d.id),
    onlyB: list.filter((d) => d.B.detected && !d.P.detected).map((d) => d.id),
    onlyP: list.filter((d) => !d.B.detected && d.P.detected).map((d) => d.id),
  };
}
const byAttribute = {};
for (const d of perDefect) {
  const a = (byAttribute[d.targetAttribute] ??= { n: 0, B: 0, P: 0 });
  a.n += 1; a.B += d.B.detected ? 1 : 0; a.P += d.P.detected ? 1 : 0;
}
const summary = {
  generatedAt: new Date().toISOString(), researchCommit: clean.P.researchCommit, developCommit: clean.B.developCommit,
  clean: {
    B: { durationMs: clean.B.durationMs, checks: clean.B.checks.map((c) => ({ id: c.id, status: c.status, exitCode: c.exitCode })), testsFailed: Object.values(clean.B.tests).filter((s) => s === "failed").length, testsTotal: Object.keys(clean.B.tests).length },
    P: { durationMs: clean.P.durationMs, decision: clean.P.deployment?.decision, failingGates: clean.P.checks.filter((c) => c.status !== "passed").map((c) => c.id), testsTotal: Object.keys(clean.P.tests).length },
  },
  aggregates: agg, byAttribute, perDefect: perDefect.map((d) => ({ id: d.id, family: d.family, target: d.targetAttribute, B: d.B.detected, Bdev: d.B.detectedAsConfiguredOnDevelop, P: d.P.detected, Pblocks: d.P.blocksDeploy, Pattrs: d.P.failingGateAttributes, match: d.P.attributeMatch })),
};
writeFileSync(path.join(resDir, "summary-frontend.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(agg, null, 2));
console.log(rows.join("\n"));

if (append) {
  const sumPath = path.join(corpus, "results", "summary.md");
  let md = existsSync(sumPath) ? readFileSync(sumPath, "utf8") : "";
  // idempotent: drop previous frontend rows/section, keep everything else (the backend agent writes too)
  md = md.replace(/\n?<!-- rq2-frontend:start -->[\s\S]*?<!-- rq2-frontend:end -->\n?/g, "\n");
  const header = "| id | family | target attribute | B detected | B blocks deploy | P detected | P blocks | P failing gates (attribute) | attribute match | B s | P s |\n|---|---|---|---|---|---|---|---|---|---:|---:|";
  const a = agg;
  const block = [
    "<!-- rq2-frontend:start -->",
    "## Frontend (AppVento)",
    "",
    `Research commit (product code + P gates): \`${clean.P.researchCommit.slice(0, 7)}\`; B tests from origin/develop \`${(clean.B.developCommit ?? "").slice(0, 7)}\`; run ${summary.generatedAt.slice(0, 10)}.`,
    `Clean: B ${Math.round(clean.B.durationMs / 1000)} s (${summary.clean.B.checks.map((c) => `${c.id}=${c.status}`).join(", ")}; ${summary.clean.B.testsFailed}/${summary.clean.B.testsTotal} tests failing) · P ${Math.round(clean.P.durationMs / 1000)} s (decision ${summary.clean.P.decision}; failing gates: ${summary.clean.P.failingGates.join(", ") || "none"}).`,
    "",
    header,
    ...rows,
    "",
    "¹ detected only by the vitest unit step, which develop's `frontend-ci.yml` no longer executes (its `unit` job only runs `npm ci`); with the workflows exactly as configured on develop this defect is NOT detected.",
    "",
    `Detection (frontend): S — B ${a.S.B.k}/${a.S.B.n}, P ${a.S.P.k}/${a.S.P.n}; R — B ${a.R.B.k}/${a.R.B.n}, P ${a.R.P.k}/${a.R.P.n}; total — B ${a.total.B.k}/${a.total.B.n} (${a.total.B.pct}%), P ${a.total.P.k}/${a.total.P.n} (${a.total.P.pct}%); B as configured on develop ${a.total.B_asConfiguredOnDevelop.k}/${a.total.B_asConfiguredOnDevelop.n}. P attribute match ${a.total.P_attributeMatch_amongDetected.k}/${a.total.P_attributeMatch_amongDetected.n}. Mean duration B ${a.total.meanDurationS.B} s, P ${a.total.meanDurationS.P} s.`,
    "<!-- rq2-frontend:end -->",
    "",
  ].join("\n");
  md = md.replace(/\s*$/, "\n\n") + block;
  writeFileSync(sumPath, md);
  console.log(`appended frontend section to ${sumPath}`);
}
