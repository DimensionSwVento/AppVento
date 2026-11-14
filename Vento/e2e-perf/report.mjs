#!/usr/bin/env node
/**
 * Agrega los JSON de `perf-results/` en una tabla Markdown con MEDIANAS.
 *
 *   npm run perf:report
 *   npm run perf:report -- --dir perf-results --last 5
 *
 * Una sola corrida varía ±30 %; para comparar antes/después hay que repetir
 * (`npx playwright test ... --repeat-each=5`) y mirar medianas, no un run suelto.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dir = path.resolve(getArg("--dir", "perf-results"));
const out = path.resolve(getArg("--out", path.join(dir, "summary.md")));
const last = Number(getArg("--last", "0")) || 0;

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const fmt = (v) => (v == null || Number.isNaN(v) ? "—" : Math.round(v * 10) / 10);

if (!fs.existsSync(dir)) {
  console.error(`No existe ${dir}. Corre la suite primero: npm run perf:e2e`);
  process.exit(1);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "playwright.json")
  .map((f) => path.join(dir, f))
  .map((f) => ({ f, mtime: fs.statSync(f).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, last > 0 ? last : undefined);

if (!files.length) {
  console.error(`No hay resultados en ${dir}.`);
  process.exit(1);
}

const runs = files
  .map(({ f }) => {
    try {
      return { file: path.basename(f), ...JSON.parse(fs.readFileSync(f, "utf8")) };
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const byTest = new Map();
for (const r of runs) {
  const key = r.test || "sin-test";
  if (!byTest.has(key)) byTest.set(key, []);
  byTest.get(key).push(r);
}

const lines = ["# Resumen de performance", ""];
lines.push(`- Corridas: ${runs.length} (${runs[0]?.finishedAt ?? "—"} … ${runs.at(-1)?.finishedAt ?? "—"})`);
const targets = [...new Set(runs.map((r) => `${r.target?.env} ${r.target?.baseURL}`))];
lines.push(`- Entorno: ${targets.join(" · ")}`);
lines.push("");

for (const [test, rs] of [...byTest].sort()) {
  lines.push(`## ${test}`, "");
  lines.push(`- Corridas: ${rs.length}`);
  const commits = [...new Set(rs.map((r) => r.target?.commit).filter(Boolean))];
  if (commits.length) lines.push(`- Commit: ${commits.join(", ")}`);

  // Métricas planas (excluye arrays de pasos).
  const flat = new Map();
  for (const r of rs) {
    const metrics =
      r.metrics ??
      Object.fromEntries(
        Object.entries(r).filter(([, v]) => typeof v === "number"),
      );
    for (const [k, v] of Object.entries(metrics)) {
      if (typeof v === "number") {
        if (!flat.has(k)) flat.set(k, []);
        flat.get(k).push(v);
      }
    }
  }
  if (flat.size) {
    lines.push("", "| Métrica | mediana | n |", "|---|---|---|");
    for (const [k, vs] of [...flat].sort()) lines.push(`| ${k} | ${fmt(median(vs))} | ${vs.length} |`);
  }

  // Pasos con nombre (`paso` o `accion`): se agrupan y se reporta la mediana.
  const steps = new Map();
  for (const r of rs) {
    for (const s of r.metrics?.pasos ?? []) {
      const key = s.paso ?? s.accion;
      if (!key) continue;
      if (!steps.has(key)) steps.set(key, []);
      steps.get(key).push(s);
    }
  }
  if (steps.size) {
    lines.push("", "| Paso | listoMs | fps | worstFrameMs | peticiones |", "|---|---|---|---|---|");
    for (const [k, ss] of steps)
      lines.push(
        `| ${k} | ${fmt(median(ss.map((s) => s.listoMs)))} | ${fmt(median(ss.map((s) => s.fps)))} | ${fmt(median(ss.map((s) => s.worstFrameMs)))} | ${fmt(median(ss.map((s) => s.peticiones)))} |`,
      );
  }

  // Peticiones /api: mediana de p95 y máximo por endpoint.
  const reqs = new Map();
  for (const r of rs) {
    for (const q of r.requests ?? []) {
      if (!q.endpoint) continue;
      if (!reqs.has(q.endpoint)) reqs.set(q.endpoint, []);
      reqs.get(q.endpoint).push(q);
    }
  }
  if (reqs.size) {
    lines.push("", "| Endpoint | n (mediana) | p95 ms (mediana) | máx ms (mediana) | KB (mediana) |", "|---|---|---|---|---|");
    for (const [k, qs] of [...reqs].sort())
      lines.push(
        `| ${k} | ${fmt(median(qs.map((q) => q.n)))} | ${fmt(median(qs.map((q) => q.p95ms)))} | ${fmt(median(qs.map((q) => q.maxMs)))} | ${fmt(median(qs.map((q) => q.kb)))} |`,
      );
  }
  lines.push("");
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join("\n"));
console.log(lines.join("\n"));
console.log(`\nResumen → ${out}`);
