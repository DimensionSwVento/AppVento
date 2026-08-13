import { test, expect } from "@playwright/test";

/**
 * RNF Seguridad — el middleware protege /dashboard, /dimensions y /admin:
 * cualquier visitante anónimo vuelve a la landing.
 */
test.describe("Redirecciones de rutas protegidas (anónimo)", () => {
  for (const route of ["/dashboard", "/dimensions", "/admin/users"]) {
    test(`anónimo en ${route} es redirigido a la landing`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL((url) => url.pathname === "/");
      await expect(
        page.getByRole("heading", { name: "Plataforma de idoneidad Eólica" }),
      ).toBeVisible();
    });
  }
});
