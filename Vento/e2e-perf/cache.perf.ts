import { test, expect } from "@playwright/test";
import { PERF_STATE } from "./state";
import { BUDGETS } from "./lib/config";
import {
  applyThrottling,
  installObservers,
  readPerf,
  skipOnboarding,
  fillBytes,
  resourceSummary,
  tbt,
  trackApi,
  waitForApiQuiet,
  writeResult,
} from "./lib/metrics";

/**
 * Peso de la primera carga y caché de la segunda visita (NFR-P5/NFR-P6).
 *
 * NFR-P5: JSON geoespacial < 10 MB.
 * NFR-P6: la segunda visita no debería volver a descargar los assets estáticos
 *         (Next los sirve con `Cache-Control: immutable`). Los endpoints /api
 *         solo pueden cachearse si el BFF reenvía `Cache-Control`; se reporta
 *         aparte para no confundir "no cacheado" con "roto".
 */
test.use({ storageState: PERF_STATE });

test.describe("Carga y caché", () => {
  test("@bundle @cache 1. primera vs segunda visita (NFR-P5/NFR-P6)", async ({ page }) => {
    const startedAt = new Date().toISOString();
    await applyThrottling(page);
    await installObservers(page);

    const first = trackApi(page);
    await skipOnboarding(page);
    await page.goto("/dashboard");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
    await waitForApiQuiet(first.calls, first.pending);
    const perf1 = await readPerf(page);
    const resources1 = await resourceSummary(page);
    fillBytes(first.calls, resources1);

    const second = trackApi(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
    await waitForApiQuiet(second.calls, second.pending);
    const perf2 = await readPerf(page);
    const resources2 = await resourceSummary(page);
    fillBytes(second.calls, resources2);

    const ratio = (a: number, b: number) => (b > 0 ? Number((a / b).toFixed(3)) : 0);
    const m = {
      primera: {
        totalKb: resources1.totalTransferKb,
        jsKb: resources1.jsTransferKb,
        cssKb: resources1.cssTransferKb,
        fontKb: resources1.fontKb,
        apiJsonKb: resources1.apiJsonTransferKb,
        jsEncodedKb: resources1.jsEncodedKb,
        jsDecodedKb: resources1.jsKb,
        apiJsonDecodedKb: resources1.apiJsonKb,
        peticionesApi: first.calls.length,
        peticionMasLentaMs: Math.max(0, ...first.calls.map((c) => (c.end ? c.end - c.start : 0))),
        tbtMs: tbt(perf1.longTasks),
      },
      segunda: {
        totalKb: resources2.totalTransferKb,
        jsKb: resources2.jsTransferKb,
        cssKb: resources2.cssTransferKb,
        apiJsonKb: resources2.apiJsonTransferKb,
        jsEncodedKb: resources2.jsEncodedKb,
        jsDecodedKb: resources2.jsKb,
        apiJsonDecodedKb: resources2.apiJsonKb,
        peticionesApi: second.calls.length,
        tbtMs: tbt(perf2.longTasks),
      },
      ratios: {
        js: ratio(resources2.jsTransferKb, resources1.jsTransferKb),
        css: ratio(resources2.cssTransferKb, resources1.cssTransferKb),
        total: ratio(resources2.totalTransferKb, resources1.totalTransferKb),
      },
    };

    writeResult("carga-cache", startedAt, {
      metrics: m,
      resources: { primera: resources1, segunda: resources2 },
      requests: {
        primera: first.calls.map((c) => ({ endpoint: c.endpoint, ms: c.end ? c.end - c.start : null })),
        segunda: second.calls.map((c) => ({ endpoint: c.endpoint, ms: c.end ? c.end - c.start : null })),
      },
    });

    console.log("\n── Primera vs segunda visita ──");
    console.table([m.primera, m.segunda, { ...m.ratios, js: m.ratios.js, css: m.ratios.css, total: m.ratios.total }]);
    console.table(resources1.byInitiator);

    expect.soft(m.primera.jsKb, `JS primera carga ${m.primera.jsKb} KB (propuesta < ${BUDGETS.jsKb})`).toBeLessThan(BUDGETS.jsKb);
    expect.soft(m.primera.apiJsonKb, `JSON de API ${m.primera.apiJsonKb} KB (NFR-P5 < ${BUDGETS.apiJsonKb})`).toBeLessThan(BUDGETS.apiJsonKb);
    expect.soft(m.ratios.js, `segunda visita descargó ${(m.ratios.js * 100).toFixed(0)} % del JS (NFR-P6 < ${BUDGETS.secondVisitRatio * 100} %)`).toBeLessThan(BUDGETS.secondVisitRatio);
    expect.soft(m.ratios.css, `segunda visita descargó ${(m.ratios.css * 100).toFixed(0)} % del CSS (NFR-P6 < ${BUDGETS.secondVisitRatio * 100} %)`).toBeLessThan(BUDGETS.secondVisitRatio);
  });
});
