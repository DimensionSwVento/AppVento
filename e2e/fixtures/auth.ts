import { expect, type Page } from "@playwright/test";

/**
 * Helpers de autenticación e2e. Usuarios sembrados en
 * infra/keycloak/realm-export.json (SOLO DEV/E2E).
 */

export const ANALISTA_STATE = "e2e/.auth/analista.json";
export const ADMIN_STATE = "e2e/.auth/admin.json";

export const ANALISTA = {
  username: "e2e-analista",
  password: "e2e-analista-password",
  email: "e2e-analista@vento.test",
};

export const ADMIN = {
  username: "e2e-admin",
  password: "e2e-admin-password",
  email: "e2e-admin@vento.test",
};

/** Login real vía formulario de Keycloak (tema keycloakify, ids estándar). */
export async function loginViaKeycloak(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await page.waitForURL(/localhost:8080/);
  await page.locator("#username, input[name='username']").first().fill(username);
  await page.locator("#password, input[name='password']").first().fill(password);
  await page
    .locator("#kc-login, button[type='submit'], input[name='login']")
    .first()
    .click();

  // De vuelta en la app, autenticado. waitUntil:"commit" — el evento load
  // puede tardar (basemap externo del mapa) y aquí sólo importa la sesión.
  await page.waitForURL("**/dashboard", { waitUntil: "commit" });
  await expect(
    page.getByRole("button", { name: "Selección de área" }),
  ).toBeVisible({ timeout: 15_000 });
}
