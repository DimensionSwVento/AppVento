import path from "node:path";

/**
 * Configuración de la suite de performance del frontend.
 *
 * Local (por defecto) levanta el build de producción en :3000.
 * Test/prod: apunta a la URL desplegada con PERF_BASE_URL y NO levanta Next.
 *
 *   PERF_BASE_URL=https://test.…  PERF_ENV=test  PERF_USER=…  PERF_PASSWORD=…
 *   PERF_CPU_THROTTLE=4           (opcional: emula un portátil modesto)
 *   PERF_NETWORK=fast3g           (opcional: emula red móvil)
 *   PERF_RESULTS_DIR=perf-results
 */

export const BASE_URL = (process.env.PERF_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
export const IS_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE_URL);
export const ENV_NAME =
  process.env.PERF_ENV || (IS_LOCAL ? "local" : /proyectovento\.com/i.test(BASE_URL) ? "prod" : "test");

export const USER = process.env.PERF_USER || "e2e-admin";
export const PASSWORD = process.env.PERF_PASSWORD || "e2e-admin-password";

export const CPU_THROTTLE = Math.max(1, Number(process.env.PERF_CPU_THROTTLE || "1"));
export const NETWORK_PROFILE = process.env.PERF_NETWORK || "";

// Bypass TLS SOLO para entornos de test cuyo certificado está vencido/mal
// configurado. Nunca se permite contra producción.
export const IGNORE_HTTPS = process.env.PERF_IGNORE_HTTPS === "1";
if (IGNORE_HTTPS && ENV_NAME === "prod") {
  throw new Error("PERF_IGNORE_HTTPS=1 no está permitido contra producción.");
}

export const RESULTS_DIR = path.join(process.cwd(), process.env.PERF_RESULTS_DIR || "perf-results");
export const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

export const PERF_STATE = "e2e/.auth/perf.json";
export const PERF_COOKIE = "e2e/.auth/perf.cookie";

/** Presupuestos del PRD y propuestas de ingeniería (ms). */
export const BUDGETS = {
  nfrP2MapaListo: 5000, // NFR-P2: carga inicial del mapa < 5 s
  nfrP3ReRender: 2000, // NFR-P3: re-render al cambiar variable/filtro < 2 s
  nfrP4Tti: 3000, // NFR-P4: TTI tras login < 3 s
  lcp: 2500, // Core Web Vitals "good" (propuesta)
  tbt: 300, // TBT "good" (propuesta)
  cls: 0.1, // CLS "good"
  inp: 200, // INP "good"
  jsKb: 1800, // JS comprimido en la primera carga (propuesta; medir y ajustar)
  apiJsonKb: 10 * 1024, // NFR-P5: JSON geoespacial < 10 MB
  secondVisitRatio: 0.2, // NFR-P6: segunda visita descarga < 20 % de la primera
};

export function targetInfo() {
  return {
    baseURL: BASE_URL,
    env: ENV_NAME,
    commit: process.env.PERF_COMMIT || process.env.GITHUB_SHA || "",
    cpuThrottle: CPU_THROTTLE,
    network: NETWORK_PROFILE || "sin throttling",
    ignoreHTTPS: IGNORE_HTTPS,
  };
}
