import { defineConfig, devices } from "@playwright/test";

/**
 * Suite de PERFORMANCE del frontend (aparte de la e2e funcional).
 *
 * A diferencia de `playwright.config.ts`, aquí NO se stubbea el backend: el mapa
 * pide datos REALES al FastAPI (vía el BFF) para medir lo que siente el usuario.
 *
 * Requiere:
 *   - Keycloak local:   docker compose -f ../infra/keycloak/docker-compose.yml up -d
 *   - Backend local con datos (AppVento---Backend: docker compose up -d db app)
 *   - INTERNAL_API_SECRET igual al del .env del backend.
 *
 *   INTERNAL_API_SECRET=… npm run perf:e2e
 *
 * Resultados: perf-results/<fecha>.json + tabla en consola.
 */
export default defineConfig({
  testDir: "./e2e-perf",
  // Mediciones: 1 worker, sin reintentos (un reintento escondería el problema).
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 }, // mismo viewport que modela k6 (perf/k6/lib/geo.js)
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "perf",
      testMatch: /.*\.perf\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // GPU real (en WSL vía WSLg/D3D12). Sin esto Chromium headless dibuja WebGL
        // por SOFTWARE (SwiftShader): FPS/TBT salen falsamente malos y el CPU que
        // consume frena al server Next. La prueba reporta el renderer usado.
        launchOptions: { args: ["--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist"] },
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // Build de PRODUCCIÓN: en `next dev` todo es mucho más lento y los números no sirven.
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_USE_BACKEND: "true",
      BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:8000",
      INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET ?? "",
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
