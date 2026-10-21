import { test as setup } from "@playwright/test";
import { ADMIN, loginViaKeycloak } from "../e2e/fixtures/auth";
import { PERF_STATE } from "./state";

/**
 * Login real contra el Keycloak local, una sola vez. Usuario configurable con
 * PERF_USER / PERF_PASSWORD (por defecto el admin sembrado para e2e).
 */
setup("login para performance", async ({ page }) => {
  await loginViaKeycloak(
    page,
    process.env.PERF_USER ?? ADMIN.username,
    process.env.PERF_PASSWORD ?? ADMIN.password,
  );
  await page.context().storageState({ path: PERF_STATE });
});
