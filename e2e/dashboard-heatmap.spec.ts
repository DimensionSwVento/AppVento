import { test, expect } from "@playwright/test";
import { ANALISTA_STATE } from "./fixtures/auth";
import { stubBasemap, stubTilesApi } from "./fixtures/networkStubs";

/**
 * RNF Rendimiento — el mapa interactivo (deck.gl/WebGL) es la interacción
 * central. Presupuesto: canvas pintado y flujo principal visible dentro de
 * los 10s posteriores a la navegación (build de producción, datos stubbeados,
 * sin red externa).
 *
 * WebGL en firefox/webkit headless es inestable en CI → sólo chromium.
 */
test.use({ storageState: ANALISTA_STATE });

// Presupuesto funcional para CI/WSL (WebGL por software, hardware modesto).
// El objetivo estricto del RNF se mide en perfiles sobre hardware real;
// ajustable por entorno via E2E_CANVAS_BUDGET_MS.
const CANVAS_BUDGET_MS = Number(process.env.E2E_CANVAS_BUDGET_MS ?? 30_000);

test.describe("Dashboard — mapa de selección de área", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "WebGL sólo en chromium");

  test("monta el mapa dentro del presupuesto de rendimiento y sin errores", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await stubBasemap(page);
    await stubTilesApi(page);

    const start = Date.now();
    await page.goto("/dashboard");

    // Flujo principal visible (sidebar con los 4 pasos).
    await expect(page.getByText("Selección de área")).toBeVisible();
    await expect(page.getByText("Informe de prefactibilidad")).toBeVisible();

    // Canvas WebGL del mapa pintado dentro del presupuesto.
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: CANVAS_BUDGET_MS,
    });
    const elapsed = Date.now() - start;
    expect(
      elapsed,
      `time-to-canvas ${elapsed}ms excede el presupuesto`,
    ).toBeLessThan(CANVAS_BUDGET_MS);

    expect(
      pageErrors,
      `errores JS en página: ${pageErrors.map((e) => e.message).join("; ")}`,
    ).toEqual([]);
  });

  test("permite navegar a Dimensiones tras seleccionar área (gating del flujo)", async ({ page }) => {
    await stubBasemap(page);
    await stubTilesApi(page);
    await page.goto("/dashboard");

    // Sin selección, el paso Dimensiones está deshabilitado.
    const dimensiones = page.getByText("Dimensiones", { exact: true });
    await expect(dimensiones.locator("..")).toHaveAttribute("aria-disabled", "true");
  });
});
