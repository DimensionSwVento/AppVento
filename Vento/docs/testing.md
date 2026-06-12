# Guía de testing — Vento Frontend

## Stack

- **Vitest 4** (runner, entorno `jsdom`) + **React Testing Library** + **@testing-library/user-event**.
- Configuración: `vitest.config.ts` (proyecto `unit`), setup global en `vitest.setup.ts` (cleanup, `vi.clearAllMocks()`, stubs de `matchMedia` y `ResizeObserver`).
- `isolate: true` y `fileParallelism: false` son **requeridos**: varios archivos mockean los mismos módulos (`next-auth/react`, `next/navigation`, contextos) con factories distintas. No cambiarlos.

## Cómo correr los tests

```bash
npm test               # modo watch
npm run test:run       # una sola corrida (local)
npm run test:ci        # corrida para CI
npm run test:coverage  # corrida + reporte de cobertura (coverage/index.html)
```

## Cobertura

- Provider: `@vitest/coverage-v8`; reportes `text` + `lcov` + `html` en `coverage/` (gitignored).
- Umbrales en `vitest.config.ts`, fijados ~5 puntos por debajo de la medición vigente.
- **Política ratchet**: cuando la cobertura real sube de forma estable, sube los umbrales en el mismo PR. Nunca los bajes para "arreglar" CI — agrega tests o ajusta el `exclude` con justificación.

## Convención de ubicación

| Tipo de test | Ubicación | Ejemplo |
|---|---|---|
| Componentes y utils (unit) | **Co-locado** junto al fuente: `src/**/Foo.test.tsx` | `src/app/Components/Report.test.tsx` |
| Route handlers, middleware, auth | `__tests__/unit/` espejando `src/app/` | `__tests__/unit/app/api/users/route.test.ts` |

Regla práctica: si el test importa un componente/función de UI o lógica pura, va co-locado. Si prueba infraestructura de Next (rutas API, middleware, configuración de auth), va en `__tests__/unit/`. No duplicar tests del mismo módulo en ambos lugares.

## E2E (Playwright)

```bash
# 1. Keycloak local con el realm vento y los usuarios e2e:
docker compose -f ../infra/keycloak/docker-compose.yml up -d
#    (si el realm ya existía: down -v && up -d para re-importar)

# 2. Suite (compila y sirve el build de producción automáticamente):
npm run e2e                              # 3 navegadores (si están instalados)
npx playwright test --project=chromium   # sólo chromium (lo que corre CI)
npm run e2e:ui                           # modo interactivo
```

- Specs en `e2e/`, mapeados a los RNF: seguridad (`auth-redirects`, `login-flow`, `admin-gating`), rendimiento (`dashboard-heatmap`, presupuesto ajustable con `E2E_CANVAS_BUDGET_MS`), usabilidad (`a11y` con axe-core), compatibilidad (chromium/firefox/webkit).
- La autenticación usa usuarios reales sembrados en `infra/keycloak/realm-export.json` (SOLO DEV/E2E); el login se hace una vez por rol (`auth.setup.ts`) y se reutiliza vía storageState.
- El backend FastAPI no vive en este repo: los datos se stubbean con `page.route()` (`e2e/fixtures/networkStubs.ts`).

## CI (GitHub Actions)

`.github/workflows/frontend-ci.yml` (raíz del repo) corre en PRs y push a main que toquen `Vento/**` o `infra/keycloak/**`:

| Job | Qué hace | Bloqueante |
|---|---|---|
| Lint | `npm run lint` | No (errores pre-existentes; ver TODO en el workflow) |
| Unit tests + coverage | `npm run test:coverage` + artefacto `coverage/` | Sí |
| Build | `npm run build` | Sí |
| E2E | Keycloak via docker compose + Playwright chromium + artefacto `playwright-report/` | Sí |

No usa secrets del repositorio (restricción: los contribuidores no pueden crearlos). **Pendiente para un admin**: marcar unit/build/e2e como required checks y activar branch protection en `main`.

## Patrones de mocking reutilizables

- **deck.gl / maplibre**: stubs con `<div data-testid>` — ver `src/app/Components/Map.test.tsx`.
- **next-auth + timers falsos**: ver `__tests__/unit/app/Components/SessionGuard.test.tsx`.
- **Contextos (provider + probe component)**: ver `src/app/Utils/AccionPrincipalContext.test.tsx`.
- **fetch**: `globalThis.fetch = vi.fn()` en `beforeEach`, restaurar en `afterEach` — ver `src/app/Utils/geocoder.test.ts`.
