import { test as setup } from "@playwright/test";
import {
  ADMIN,
  ADMIN_STATE,
  ANALISTA,
  ANALISTA_STATE,
  loginViaKeycloak,
} from "./fixtures/auth";

/**
 * Login real contra Keycloak una vez por rol. El storageState resultante lo
 * reutilizan los specs autenticados — así cada spec no repite el flujo OIDC.
 */

setup("authenticate as analista", async ({ page }) => {
  await loginViaKeycloak(page, ANALISTA.username, ANALISTA.password);
  await page.context().storageState({ path: ANALISTA_STATE });
});

setup("authenticate as admin", async ({ page }) => {
  await loginViaKeycloak(page, ADMIN.username, ADMIN.password);
  await page.context().storageState({ path: ADMIN_STATE });
});
