import { test, expect, type Page } from "@playwright/test";
import { PERF_STATE } from "./state";
import { BUDGETS } from "./lib/config";
import {
  applyThrottling,
  fillBytes,
  installObservers,
  readPerf,
  skipOnboarding,
  resourceSummary,
  smoothness,
  summarize,
  tbt,
  trackApi,
  waitForApiQuiet,
  writeResult,
} from "./lib/metrics";

/**
 * Flujo de producto completo, con backend real:
 *   seleccionar área → Características → Dimensiones (carga capas) → Informe.
 *
 * El polígono se define por coordenadas (sin depender de Nominatim) para que la
 * medición sea determinista y no sume la latencia de un servicio externo.
 */
test.use({ storageState: PERF_STATE });

async function selectSmallArea(page: Page): Promise<void> {
  await page.getByRole("button", { name: /seleccionar por coordenadas/i }).click();
  const input = page.getByLabel("Latitud, longitud");
  const add = page.getByRole("button", { name: "Añadir", exact: true }).first();
  // Polígono pequeño alrededor de Bogotá (~5×5 km): suficientes hexágonos para
  // que Dimensiones/Informe tengan datos, sin convertir la prueba en un estrés.
  for (const point of ["4.6600, -74.1000", "4.6600, -74.0600", "4.6250, -74.0800"]) {
    await input.fill(point);
    await add.click();
    await page.waitForTimeout(250);
  }
  await page.getByRole("button", { name: /Seleccionar área \(3\)/i }).click();
  await expect(page.getByText(/hexágonos seleccionados/i).first()).toBeVisible({ timeout: 20_000 });
}

test.describe("Flujo — selección, dimensiones e informe", () => {
  test("@flow 1. seleccionar área → Características → Dimensiones → Informe", async ({ page }) => {
    const startedAt = new Date().toISOString();
    await applyThrottling(page);
    await installObservers(page);
    const { calls, pending } = trackApi(page);
    await skipOnboarding(page);
    await page.goto("/dashboard");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
    await waitForApiQuiet(calls, pending);

    const steps: Array<Record<string, unknown>> = [];

    // 1) Selección por coordenadas (client-side; solo el fly del mapa).
    let t0 = Date.now();
    await selectSmallArea(page);
    steps.push({ paso: "seleccionar área", listoMs: Date.now() - t0, peticiones: 0 });

    // 2) Características: paso intermedio del flujo (no dispara capas del mapa).
    let before = calls.length;
    let start = (await readPerf(page)).now;
    t0 = Date.now();
    const chars = page.getByRole("button", { name: /Características del proyecto/i }).first();
    await expect(chars).toHaveAttribute("aria-disabled", "false");
    await chars.click();
    await expect(page.getByRole("heading", { name: /Características del proyecto/i })).toBeVisible({ timeout: 30_000 });
    const cargarCaracteristicasMs = Date.now() - t0;
    // El flujo exige una capacidad nominal > 0 para habilitar "Siguiente paso".
    // MWPicker usa inputs de un dígito y avanza el foco con cada tecla.
    const tens = page.getByRole("textbox", { name: "Decenas" });
    await tens.click();
    await tens.press("1");
    await page.getByRole("textbox", { name: "Unidades" }).press("0");
    await expect(page.getByText(/Valor:\s*10\.00\s*MW/i)).toBeVisible({ timeout: 5_000 });
    // Emplazamiento (se autodetecta, pero el botón asegura el estado) y perfil
    // de aerogenerador: ambos son obligatorios para habilitar el paso.
    await page.getByRole("button", { name: /Onshore \(tierra\)/i }).click();
    await page.getByRole("button", { name: /Turbina mediana/i }).click();
    const nextDims = page.getByRole("button", { name: /Siguiente paso: Dimensiones/i });
    await expect(nextDims).toBeEnabled({ timeout: 10_000 });
    if (calls.length > before) await waitForApiQuiet(calls, pending);
    let end = (await readPerf(page)).now;
    let perf = await readPerf(page);
    steps.push({
      paso: "Características",
      listoMs: cargarCaracteristicasMs,
      peticiones: calls.length - before,
      ...smoothness(perf.frames, start, end),
    });

    // 3) Dimensiones: hidrata catálogo/normas y pide capas del viewport.
    before = calls.length;
    start = (await readPerf(page)).now;
    t0 = Date.now();
    await page.getByRole("button", { name: /Siguiente paso: Dimensiones/i }).first().click();
    await expect(page.getByRole("heading", { name: /Configura las variables de interés/i })).toBeVisible({ timeout: 30_000 });
    if (calls.length > before) await waitForApiQuiet(calls, pending);
    end = (await readPerf(page)).now;
    perf = await readPerf(page);
    steps.push({
      paso: "Dimensiones",
      listoMs: Date.now() - t0,
      peticiones: calls.length - before,
      ...smoothness(perf.frames, start, end),
    });

    // 4) Informe: el botón "Siguiente paso" avanza y dispara /area.
    // `PERF_FLOW_REPORT=0` permite validar el flujo hasta Dimensiones en una
    // máquina modesta (el informe completo con PDF es lo más pesado).
    if (process.env.PERF_FLOW_REPORT !== "0") {
      before = calls.length;
      start = (await readPerf(page)).now;
      t0 = Date.now();
      await page.getByRole("button", { name: /Siguiente paso: Informe/i }).first().click();
      await expect(page.getByText(/Informe de viabilidad/i).first()).toBeVisible({ timeout: 60_000 });
      if (calls.length > before) await waitForApiQuiet(calls, pending);
      end = (await readPerf(page)).now;
      perf = await readPerf(page);
      steps.push({
        paso: "Informe",
        listoMs: Date.now() - t0,
        peticiones: calls.length - before,
        ...smoothness(perf.frames, start, end),
      });
    }

    const resources = await resourceSummary(page);
    fillBytes(calls, resources);
    const requests = summarize(calls);
    const metrics = {
      pasos: steps,
      tbtMs: tbt(perf.longTasks),
      jsKb: resources.jsEncodedKb,
      apiJsonKb: resources.apiJsonEncodedKb,
    };
    writeResult("flujo-seleccion-informe", startedAt, { metrics, requests, resources });

    console.log("\n── Flujo: selección → Características → Dimensiones → Informe ──");
    console.table(steps);
    console.table(requests);

    for (const s of steps) {
      const budget =
        s.paso === "Informe" ? BUDGETS.nfrP2MapaListo : BUDGETS.nfrP3ReRender;
      expect.soft(Number(s.listoMs), `"${String(s.paso)}" listo en ${String(s.listoMs)} ms (presupuesto ${budget})`).toBeLessThan(budget);
    }
  });
});
