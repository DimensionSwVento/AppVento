import { test, expect } from "@playwright/test";
import { ANALISTA_STATE, ADMIN_STATE } from "./fixtures/auth";

/**
 * RNF Seguridad — RBAC del middleware: /admin/* exige rol `admin`.
 *
 * Nota: se valida el ACCESO a la página, no el contenido de la tabla — la
 * Admin REST API de Keycloak requiere service accounts que el realm dev no
 * habilita (ver README de la app, sección Keycloak).
 */
test.describe("Gating de /admin/users por rol", () => {
  test.describe("como analista", () => {
    test.use({ storageState: ANALISTA_STATE });

    test("es redirigido a /not-authorized", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForURL("**/not-authorized");
      await expect(
        page.getByRole("heading", { name: "Acceso denegado" }),
      ).toBeVisible();
    });
  });

  test.describe("como admin", () => {
    test.use({ storageState: ADMIN_STATE });

    test("accede al panel de administración", async ({ page }) => {
      await page.goto("/admin/users");
      await expect(
        page.getByRole("heading", { name: "Administrar usuarios" }),
      ).toBeVisible();
    });
  });
});
