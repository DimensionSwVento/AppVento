import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ANALISTA_STATE } from "./fixtures/auth";
import { stubBasemap, stubTilesApi } from "./fixtures/networkStubs";

/**
 * RNF Usabilidad — chequeo axe-core sobre las pantallas principales.
 * Falla sólo con violaciones critical/serious (ratchet: endurecer luego).
 */
async function expectNoSeriousViolations(
  results: Awaited<ReturnType<AxeBuilder["analyze"]>>,
) {
  const serious = results.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact ?? ""),
  );
  expect(
    serious.map(
      (v) =>
        `${v.impact}: ${v.id} — ${v.help} → ${v.nodes
          .map((n) => n.target.join(" "))
          .join(" | ")}`,
    ),
  ).toEqual([]);
}

test.describe("Accesibilidad (axe-core)", () => {
  test("landing pública sin violaciones serias", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    await expectNoSeriousViolations(results);
  });

  test.describe("dashboard autenticado", () => {
    test.use({ storageState: ANALISTA_STATE });

    test("sin violaciones serias", async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "WebGL sólo en chromium");
      // axe corre en el main thread de la página, que compite con el render
      // continuo de deck.gl (WebGL por software en máquinas sin GPU) —
      // triplicar el timeout evita falsos timeouts bajo contención.
      test.slow();
      await stubBasemap(page);
      await stubTilesApi(page);
      await page.goto("/dashboard");
      await expect(page.getByText("Selección de área")).toBeVisible();
      const results = await new AxeBuilder({ page })
        // El canvas del mapa no es contenido accesible evaluable.
        .exclude("canvas")
        .analyze();
      await expectNoSeriousViolations(results);
    });
  });
});
