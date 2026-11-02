import fs from "node:fs";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { BASE_URL, PASSWORD, PERF_COOKIE, PERF_STATE, USER } from "./lib/config";

/**
 * Login real contra Keycloak, una sola vez, y exporta DOS artefactos:
 *  - e2e/.auth/perf.json   → storageState para Playwright.
 *  - e2e/.auth/perf.cookie → header "Cookie" para k6 (MODE=bff), sin copiar a mano.
 *
 * Funciona igual en local y contra un entorno desplegado (PERF_BASE_URL).
 * Usuario configurable con PERF_USER / PERF_PASSWORD.
 */
setup("login para performance", async ({ page }) => {
  setup.setTimeout(120_000);

  await page.goto("/");

  // Si ya había sesión, no repetir el flujo de Keycloak.
  if (!page.url().includes("/dashboard")) {
    const login = page.getByRole("button", { name: /iniciar sesión|ingresar|sign in/i }).first();
    await expect(login).toBeVisible({ timeout: 30_000 });
    await login.click();

    // No asumimos localhost: el realm puede estar en otro host o bajo un path.
    const username = page.locator("#username, input[name='username']").first();
    await expect(username).toBeVisible({ timeout: 60_000 });
    await username.fill(USER);
    await page.locator("#password, input[name='password']").first().fill(PASSWORD);
    await page.locator("#kc-login, button[type='submit'], input[name='login']").first().click();
  }

  await page.waitForURL("**/dashboard", { waitUntil: "commit", timeout: 120_000 });
  await expect(page.getByRole("button", { name: /selección de área/i })).toBeVisible({
    timeout: 30_000,
  });

  fs.mkdirSync(path.dirname(PERF_STATE), { recursive: true });
  const state = await page.context().storageState({ path: PERF_STATE });

  // Header Cookie listo para k6. Filtra por el host del entorno bajo prueba.
  const host = new URL(BASE_URL).hostname;
  const cookie = state.cookies
    .filter((c) => {
      const domain = c.domain.replace(/^\./, "");
      return host === domain || host.endsWith(`.${domain}`);
    })
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  fs.mkdirSync(path.dirname(PERF_COOKIE), { recursive: true });
  fs.writeFileSync(PERF_COOKIE, cookie);
  console.log(`Sesión exportada → ${PERF_STATE} + ${PERF_COOKIE} (${state.cookies.length} cookies)`);
});
