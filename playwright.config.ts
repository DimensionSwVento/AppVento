import { defineConfig, devices } from "@playwright/test";

/**
 * Suite e2e del frontend Vento.
 *
 * Requiere Keycloak local corriendo (infra/keycloak):
 *   docker compose -f ../infra/keycloak/docker-compose.yml up -d
 *
 * El webServer compila y sirve el build de producción (next build + start)
 * para que las mediciones de rendimiento reflejen el bundle real (RNF-01).
 * Credenciales: SOLO-DEV, viven en infra/keycloak/realm-export.json.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Local: 1 worker — dos dashboards WebGL-por-software en paralelo se
  // matan de hambre de CPU en máquinas modestas y la página nunca hidrata
  // (override: --workers=N). En CI los runners aguantan el default.
  workers: process.env.CI ? undefined : 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Login real una vez por rol → storageState reutilizado por los specs.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      // Same-origin: cualquier fetch de datos es interceptable con page.route().
      NEXT_PUBLIC_API_URL: "",
      AUTH_SECRET: "e2e-only-secret-not-for-production",
      AUTH_TRUST_HOST: "true",
      AUTH_KEYCLOAK_ID: "vento-web",
      // Secret de desarrollo ya commiteado en infra/keycloak/realm-export.json.
      AUTH_KEYCLOAK_SECRET: "dev-secret-change-in-production",
      AUTH_KEYCLOAK_ISSUER: "http://localhost:8080/realms/vento",
      NEXT_PUBLIC_KEYCLOAK_URL: "http://localhost:8080",
      NEXT_PUBLIC_KEYCLOAK_REALM: "vento",
    },
  },
});
