import { test, expect, type Page } from "@playwright/test";
import { PERF_STATE } from "./state";
import { BUDGETS } from "./lib/config";
import {
  applyThrottling,
  installObservers,
  inp,
  readPerf,
  skipOnboarding,
  fillBytes,
  resourceSummary,
  smoothness,
  summarize,
  tbt,
  trackApi,
  waitForApiQuiet,
  webglRenderer,
  writeResult,
} from "./lib/metrics";

/**
 * Performance del MAPA desde el navegador, con datos REALES (sin stubs).
 *
 * Mide lo que siente el usuario y que k6 no ve:
 *   - Tiempo hasta canvas pintado y hasta "mapa listo" (sin peticiones /api en vuelo).
 *   - Web Vitals: LCP, TBT, CLS, INP.
 *   - Fluidez al hacer zoom/paneo: FPS y el peor "salto" entre frames (jank).
 *   - El PATRÓN de peticiones y los BYTES reales de JS/JSON.
 *     (con esto se calibra el recorrido de k6 en AppVento---Backend/perf).
 *
 * Presupuestos: ver `lib/config.ts` (NFR-P2/NFR-P3 del PRD + propuestas).
 * Se usan `expect.soft` → se reportan TODAS las métricas aunque alguna falle.
 */
test.use({ storageState: PERF_STATE });

function pageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  return errors;
}

test.describe("Mapa — performance con datos reales", () => {
  test("@smoke 1. abrir mapa (NFR-P2: < 5 s)", async ({ page }) => {
    const startedAt = new Date().toISOString();
    const errors = pageErrors(page);
    await applyThrottling(page);
    await installObservers(page);
    const { calls, pending } = trackApi(page);

    const t0 = Date.now();
    await skipOnboarding(page);
    await page.goto("/dashboard");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
    const tCanvas = Date.now() - t0;
    const tReady = (await waitForApiQuiet(calls, pending)) - t0;

    const renderer = await webglRenderer(page);
    if (/SwiftShader|llvmpipe/i.test(renderer)) {
      console.warn(`⚠️  WebGL por SOFTWARE (${renderer}): FPS/TBT no son representativos.`);
    }

    const perf = await readPerf(page);
    const resources = await resourceSummary(page);
    fillBytes(calls, resources);
    const m = {
      canvasMs: tCanvas,
      mapaListoMs: tReady,
      lcpMs: Math.round(perf.lcp),
      tbtMs: tbt(perf.longTasks),
      cls: Number(perf.cls.toFixed(4)),
      inpMs: inp(perf.events),
      tareasLargas: perf.longTasks.length,
      frames: perf.frames.length,
      renderer,
      jsKb: resources.jsTransferKb,
      jsEncodedKb: resources.jsEncodedKb,
      jsDecodedKb: resources.jsKb,
      totalKb: resources.totalTransferKb,
      totalEncodedKb: resources.totalEncodedKb,
      totalDecodedKb: resources.totalKb,
      apiJsonKb: resources.apiJsonTransferKb,
      apiJsonEncodedKb: resources.apiJsonEncodedKb,
      apiJsonDecodedKb: resources.apiJsonKb,
    };
    const requests = summarize(calls);
    writeResult("mapa-abrir", startedAt, { metrics: m, requests, resources });

    console.log(`\n── 1. Abrir mapa ── (renderer: ${renderer})`);
    console.table({
      canvasMs: m.canvasMs,
      mapaListoMs: m.mapaListoMs,
      lcpMs: m.lcpMs,
      tbtMs: m.tbtMs,
      cls: m.cls,
      inpMs: m.inpMs,
      tareasLargas: m.tareasLargas,
    });
    console.table(requests);
    console.table([{ jsKb: m.jsKb, totalKb: m.totalKb, apiJsonKb: m.apiJsonKb }]);

    expect.soft(m.mapaListoMs, `mapa listo en ${m.mapaListoMs} ms (NFR-P2 < ${BUDGETS.nfrP2MapaListo})`).toBeLessThan(BUDGETS.nfrP2MapaListo);
    expect.soft(m.lcpMs, `LCP ${m.lcpMs} ms (propuesta < ${BUDGETS.lcp})`).toBeLessThan(BUDGETS.lcp);
    expect.soft(m.tbtMs, `TBT ${m.tbtMs} ms (propuesta < ${BUDGETS.tbt})`).toBeLessThan(BUDGETS.tbt);
    expect.soft(m.cls, `CLS ${m.cls} (propuesta < ${BUDGETS.cls})`).toBeLessThan(BUDGETS.cls);
    expect.soft(m.jsKb, `JS ${m.jsKb} KB (propuesta < ${BUDGETS.jsKb})`).toBeLessThan(BUDGETS.jsKb);
    expect.soft(m.apiJsonKb, `JSON de API ${m.apiJsonKb} KB (NFR-P5 < ${BUDGETS.apiJsonKb})`).toBeLessThan(BUDGETS.apiJsonKb);
    expect(errors, `errores JS en página: ${errors.map((e) => e.message).join("; ")}`).toEqual([]);
  });

  test("@interaction 2. explorar: zoom y paneo (NFR-P3: < 2 s)", async ({ page }) => {
    const startedAt = new Date().toISOString();
    const errors = pageErrors(page);
    await applyThrottling(page);
    await installObservers(page);
    const { calls, pending } = trackApi(page);
    await skipOnboarding(page);
    await page.goto("/dashboard");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
    await waitForApiQuiet(calls, pending);

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
      const settled = calls.length > before ? await waitForApiQuiet(calls, pending) : Date.now();
      const pEnd = (await readPerf(page)).now;
      const perf = await readPerf(page);
      steps.push({
        accion: name,
        listoMs: settled - t0,
        peticiones: calls.length - before,
        ...smoothness(perf.frames, pStart, pEnd),
      });
    }

    const resources = await resourceSummary(page);
    fillBytes(calls, resources);
    const requests = summarize(calls);
    const m = {
      pasos: steps,
      jsKb: resources.jsTransferKb,
      jsEncodedKb: resources.jsEncodedKb,
      apiJsonKb: resources.apiJsonTransferKb,
      apiJsonEncodedKb: resources.apiJsonEncodedKb,
    };
    writeResult("mapa-explorar", startedAt, { metrics: m, requests, resources });

    console.log("\n── 2. Explorar ──");
    console.table(steps);
    console.table(requests);

    for (const s of steps) {
      expect.soft(s.listoMs, `"${s.accion}" listo en ${s.listoMs} ms (NFR-P3 < ${BUDGETS.nfrP3ReRender})`).toBeLessThan(BUDGETS.nfrP3ReRender);
    }
    expect(errors, `errores JS en página: ${errors.map((e) => e.message).join("; ")}`).toEqual([]);
  });
});
