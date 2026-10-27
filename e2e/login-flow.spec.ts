import { test, expect, type Page } from "@playwright/test";
import { ANALISTA, loginViaKeycloak } from "./fixtures/auth";

/**
 * RNF Seguridad — flujo OIDC completo contra Keycloak real: formulario de
 * login, establecimiento de sesión NextAuth y logout con limpieza de sesión.
 * (A diferencia de los demás specs, NO reutiliza storageState.)
 */
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * El email del usuario sólo aparece cuando React hidrató y useSession
 * resolvió — sirve como barrera de hidratación antes de interactuar con
 * los handlers del sidebar (en máquinas lentas tarda varios segundos).
 */
async function waitForSessionUi(page: Page): Promise<void> {
  await expect(page.getByTitle(ANALISTA.email)).toBeVisible({ timeout: 30_000 });
}

test.describe("Flujo de autenticación completo", () => {
  test("login con Keycloak aterriza en /dashboard con sesión activa", async ({ page }) => {
    await loginViaKeycloak(page, ANALISTA.username, ANALISTA.password);
    // El sidebar trunca el texto del correo — el valor completo va en title.
    await waitForSessionUi(page);
  });

  test("logout limpia la sesión y las rutas protegidas vuelven a bloquearse", async ({ page }) => {
    await loginViaKeycloak(page, ANALISTA.username, ANALISTA.password);
    await waitForSessionUi(page);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    // signOut → /api/auth/kc-logout → Keycloak end-session. Sin id_token_hint
    // Keycloak puede pedir confirmación antes de redirigir a la landing.
    await page.waitForURL(
      (url) => url.pathname === "/" || url.pathname.includes("/protocol/openid-connect/logout"),
      { timeout: 30_000 },
    );
    if (new URL(page.url()).pathname.includes("/protocol/openid-connect/logout")) {
      await page
        .locator("#kc-logout, input[type='submit'], button[type='submit']")
        .first()
        .click();
    }
    await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });

    // La sesión quedó invalidada: /dashboard redirige a la landing.
    await page.goto("/dashboard");
    await page.waitForURL((url) => url.pathname === "/");
    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
  });
});
