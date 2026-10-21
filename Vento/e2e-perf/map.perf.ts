import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PERF_STATE } from "./state";

/**
 * Performance del MAPA desde el navegador, con datos REALES (sin stubs).
 *
 * Mide lo que siente el usuario y que k6 no ve:
 *   - Tiempo hasta canvas pintado y hasta "mapa listo" (sin peticiones /api en vuelo).
 *   - Web Vitals: LCP y TBT (tiempo de hilo principal bloqueado por tareas largas).
 *   - Fluidez al hacer zoom/paneo: FPS y el peor "salto" entre frames (jank).
 *   - El PATRÓN de peticiones: cuántas, a qué endpoint, cuánto tardan y pesan.
 *     (con esto se calibra el recorrido de k6 en AppVento---Backend/perf).
 *
 * Presupuestos del PRD (AppVento/_bmad-output/planning-artifacts/prd.md):
 *   NFR-P2  carga inicial del mapa < 5 s
 *   NFR-P3  re-render del mapa < 2 s
 * Se usan `expect.soft` → se reportan TODAS las métricas aunque alguna falle.
 */
test.use({ storageState: PERF_STATE });

const NFR_P2_MS = 5_000;
const NFR_P3_MS = 2_000;

type ApiCall = {
  endpoint: string;
  start: number;
  end?: number;
  status?: number;
  bytes?: number;
  failed?: boolean;
  /** Espera al servidor (envío → primer byte). Alto = lento el BFF/backend; bajo = la espera fue en el navegador. */
  ttfb?: number;
};

/** /api/tiles/detail/8a… → "detail"; /api/tiles/6/18/30 → "tile z/x/y". */
function endpointOf(url: string): string {
  const p = new URL(url).pathname.replace(/^\/api\//, "");
  if (/^tiles\/\d+\/\d+\/\d+$/.test(p)) return "tiles z/x/y";
  if (p.startsWith("tiles/detail/")) return "tiles/detail";
  if (p.startsWith("historico/")) return "historico/:id";
  return p;
}

/** Registra cada petición a /api/* con su duración, estado y tamaño. */
function trackApi(page: Page): ApiCall[] {
  const calls: ApiCall[] = [];
  const byReq = new Map<object, ApiCall>();
  page.on("request", (req) => {
    if (!req.url().includes("/api/") || req.url().includes("/api/auth/")) return;
    const call: ApiCall = { endpoint: `${req.method()} ${endpointOf(req.url())}`, start: Date.now() };
    calls.push(call);
    byReq.set(req, call);
  });
  page.on("requestfinished", async (req) => {
    const call = byReq.get(req);
    if (!call) return;
    call.end = Date.now();
    const t = req.timing();
    if (t.responseStart > 0 && t.requestStart >= 0) call.ttfb = Math.round(t.responseStart - t.requestStart);
    call.status = (await req.response())?.status();
    call.bytes = (await req.sizes().catch(() => null))?.responseBodySize;
  });
  page.on("requestfailed", (req) => {
    const call = byReq.get(req);
    if (call) Object.assign(call, { end: Date.now(), failed: true });
  });
  return calls;
}

/** Espera a que no haya peticiones /api en vuelo durante `quietMs`. */
async function waitForApiQuiet(calls: ApiCall[], quietMs = 1_500, timeoutMs = 120_000): Promise<number> {
  const t0 = Date.now();
  for (;;) {
    const inflight = calls.filter((c) => c.end === undefined).length;
    const last = Math.max(0, ...calls.map((c) => c.end ?? Date.now()));
    if (inflight === 0 && Date.now() - last >= quietMs) return last;
    if (Date.now() - t0 > timeoutMs) throw new Error(`/api no se aquietó en ${timeoutMs} ms (${inflight} en vuelo)`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Observadores en la página: LCP, tareas largas y timestamps de cada frame. */
async function installObservers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __perf: { lcp: number; longTasks: number[]; frames: number[] } };
    w.__perf = { lcp: 0, longTasks: [], frames: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__perf.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__perf.longTasks.push(e.duration);
    }).observe({ type: "longtask", buffered: true });
    const tick = (t: number) => {
      w.__perf.frames.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

type PagePerf = { lcp: number; longTasks: number[]; frames: number[]; now: number };
const readPerf = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __perf: Omit<PagePerf, "now"> };
    return { ...w.__perf, now: performance.now() } as PagePerf;
  });

/** FPS y peor salto entre frames dentro de una ventana [from, to] (ms de performance.now). */
function smoothness(frames: number[], from: number, to: number) {
  const f = frames.filter((t) => t >= from && t <= to);
  let worst = 0;
  for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i] - f[i - 1]);
  return { fps: Math.round((f.length / Math.max(1, to - from)) * 1000), worstFrameMs: Math.round(worst) };
}

/** Resumen por endpoint: n, p50/máx en ms, KB totales, fallos. */
function summarize(calls: ApiCall[]) {
  const by = new Map<string, ApiCall[]>();
  for (const c of calls) by.set(c.endpoint, [...(by.get(c.endpoint) ?? []), c]);
  return [...by].map(([endpoint, cs]) => {
    const d = cs.filter((c) => c.end).map((c) => c.end! - c.start).sort((a, b) => a - b);
    return {
      endpoint,
      n: cs.length,
      p50ms: d[Math.floor(d.length / 2)] ?? null,
      maxMs: d.at(-1) ?? null,
      ttfbMs: Math.max(0, ...cs.map((c) => c.ttfb ?? 0)),
      kb: Math.round(cs.reduce((s, c) => s + (c.bytes ?? 0), 0) / 1024),
      fallos: cs.filter((c) => c.failed || (c.status ?? 200) >= 400).length,
    };
  });
}

const results: Record<string, unknown> = {};

/** Renderer WebGL real. Con SwiftShader (software) las métricas del navegador NO sirven. */
async function webglRenderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "sin WebGL";
  });
}

test.afterAll(() => {
  const dir = path.join(process.cwd(), "perf-results");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}_map.json`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2));
  console.log(`\nResultados → ${file}`);
});

test.describe("Mapa — performance con datos reales", () => {
  test("1. abrir mapa (NFR-P2: < 5 s)", async ({ page }) => {
    await installObservers(page);
    const calls = trackApi(page);

    const t0 = Date.now();
    await page.goto("/dashboard");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
    const tCanvas = Date.now() - t0;
    const tReady = (await waitForApiQuiet(calls)) - t0;

    const renderer = await webglRenderer(page);
    results["renderer"] = renderer;
    if (/SwiftShader|llvmpipe/i.test(renderer)) {
      console.warn(`⚠️  WebGL por SOFTWARE (${renderer}): FPS/TBT no son representativos.`);
    }

    const perf = await readPerf(page);
    const tbt = Math.round(perf.longTasks.reduce((s, d) => s + Math.max(0, d - 50), 0));
    const m = {
      canvasMs: tCanvas,
      mapaListoMs: tReady,
      lcpMs: Math.round(perf.lcp),
      tbtMs: tbt,
      tareasLargas: perf.longTasks.length,
      peticiones: summarize(calls),
    };
    results["abrir mapa"] = m;
    console.log(`\n── 1. Abrir mapa ── (renderer: ${renderer})`);
    console.table({ canvasMs: m.canvasMs, mapaListoMs: m.mapaListoMs, lcpMs: m.lcpMs, tbtMs: m.tbtMs, tareasLargas: m.tareasLargas });
    console.table(m.peticiones);

    expect.soft(tReady, `mapa listo en ${tReady} ms (NFR-P2 < ${NFR_P2_MS})`).toBeLessThan(NFR_P2_MS);
  });

  test("2. explorar: zoom y paneo (NFR-P3: < 2 s)", async ({ page }) => {
    await installObservers(page);
    const calls = trackApi(page);
    await page.goto("/dashboard");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
    await waitForApiQuiet(calls);

    const box = (await page.locator("canvas").first().boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const actions: [string, () => Promise<void>][] = [
      ["zoom in ×2", async () => { await page.mouse.move(cx, cy); for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, -500); await page.waitForTimeout(150); } }],
      ["zoom in ×2 (otra vez)", async () => { for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, -500); await page.waitForTimeout(150); } }],
      ["paneo", async () => { await page.mouse.down(); await page.mouse.move(cx - 400, cy - 200, { steps: 20 }); await page.mouse.up(); }],
      ["zoom out ×3", async () => { for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(150); } }],
    ];

    const steps = [];
    for (const [name, act] of actions) {
      const before = calls.length;
      const pStart = (await readPerf(page)).now;
      const t0 = Date.now();
      await act();
      const settled = calls.length > before ? await waitForApiQuiet(calls) : Date.now();
      const pEnd = (await readPerf(page)).now;
      const perf = await readPerf(page);
      steps.push({
        accion: name,
        listoMs: settled - t0,
        peticiones: calls.length - before,
        ...smoothness(perf.frames, pStart, pEnd),
      });
    }
    results["explorar"] = { pasos: steps, peticiones: summarize(calls) };
    console.log("\n── 2. Explorar ──");
    console.table(steps);
    console.table(summarize(calls));

    for (const s of steps) {
      expect.soft(s.listoMs, `"${s.accion}" listo en ${s.listoMs} ms (NFR-P3 < ${NFR_P3_MS})`).toBeLessThan(NFR_P3_MS);
    }
  });
});
