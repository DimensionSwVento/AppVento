import { test, expect } from "@playwright/test";

/**
 * RNF Usabilidad / Compatibilidad — la landing pública renderiza en los 3
 * motores (chromium, firefox, webkit) sin autenticación.
 */
test.describe("Landing pública", () => {
  test("renderiza título, logo y acciones de acceso", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Plataforma de Viabilidad Eólica" }),
    ).toBeVisible();
    await expect(page.getByAltText("Vento")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
  });

  test("muestra aviso de sesión expirada con ?expired=true", async ({ page }) => {
    await page.goto("/?expired=true");
    await expect(page.getByText(/Tu sesión ha expirado/)).toBeVisible();
  });

  test("la página de acceso denegado es pública y renderiza", async ({ page }) => {
    await page.goto("/not-authorized");
    await expect(
      page.getByRole("heading", { name: "Acceso denegado" }),
    ).toBeVisible();
  });
});
