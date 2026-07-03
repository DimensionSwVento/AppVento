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

En local la suite corre con **1 worker** (dos dashboards WebGL-por-software en
paralelo dejan sin CPU la hidratación en máquinas modestas); en máquinas
potentes se puede paralelizar con `--workers=4`.

- Specs en `e2e/` — su mapeo a los RNF priorizados está en la sección [Trazabilidad RNF → tests](#trazabilidad-rnf--tests).
- La autenticación usa usuarios reales sembrados en `infra/keycloak/realm-export.json` (SOLO DEV/E2E); el login se hace una vez por rol (`auth.setup.ts`) y se reutiliza vía storageState.
- El backend FastAPI no vive en este repo: los datos se stubbean con `page.route()` (`e2e/fixtures/networkStubs.ts`).

## Trazabilidad RNF → tests

Los RNF priorizados del proyecto (sección 8.2.2 del documento de diseño) y
cómo los cubre la suite de testing del **frontend**. La columna "alcance"
es honesta: parte de cada RNF vive en el backend GIS (FastAPI) y se valida
allá; aquí se documenta sólo lo verificable desde este repo.

### RNF-1 · Disponibilidad
*Capacidad del sistema para acceder a datos espaciales cuando se requieren.*

| Qué se verifica | Tests |
|---|---|
| El mapa monta, pide tiles y pinta datos espaciales dentro de un presupuesto de tiempo (`E2E_CANVAS_BUDGET_MS`) | `e2e/dashboard-heatmap.spec.ts` |
| Degradación elegante cuando los datos NO están disponibles: popup muestra "Sin datos" ante API caída o respuesta `!ok`; selector de variables desaparece sin romper; búsqueda tolera fallos de Nominatim | `HexPopup.test.tsx`, `VariableSelector.test.tsx`, `geocoder.test.ts` |
| El flujo de arranque del heatmap dispara el warmup de datos al montar | `HeatmapDemo.test.tsx` (smoke) |

**Alcance**: la disponibilidad real del servicio de datos (uptime del backend)
no es verificable desde el frontend; aquí se garantiza que la UI consume los
datos cuando existen y no colapsa cuando faltan.

### RNF-2 · Integración / Interoperabilidad
*Combinar datos espaciales heterogéneos de forma coherente; intercambiar y consumir datos y servicios GIS de forma estandarizada.*

| Qué se verifica | Tests |
|---|---|
| Consumo del contrato estándar de tiles `z/x/y` (web mercator) y del shape `TileHex {h,s,t,la,ln,v}` compartido con el backend | `h3TileIndex.test.ts`, fixtures de `e2e/fixtures/networkStubs.ts` usados por `dashboard-heatmap` y `a11y` |
| Indexación H3 estándar con la librería real (`h3-js`): parent/child entre resoluciones, agregación por zoom | `h3TileIndex.test.ts` (sin mocks de h3) |
| Integración con el geocodificador externo (Nominatim/OSM): parseo de su formato, parámetros correctos, manejo de respuestas sin geojson | `geocoder.test.ts`, `MapSearchBox.test.tsx` |
| Interoperabilidad de identidad via OIDC estándar (Keycloak real, no mocks): login, callback, roles en el JWT, logout federado | `e2e/login-flow.spec.ts`, `e2e/auth.setup.ts`, `__tests__/unit/auth.test.ts`, `kc-logout/route.test.ts` |

### RNF-3 · Procesamiento
*Ejecutar correctamente operaciones y flujos GIS.*

| Qué se verifica | Tests |
|---|---|
| Operaciones geoespaciales núcleo: `polygonToCells` sobre la cartografía IGAC, point-in-polygon de Colombia, resolución H3 por zoom | `h3Resolution.test.ts` |
| Cálculo de área de la selección (km² desde celdas H3) | `areaCalc.test.ts`, `AreaDisplay.test.tsx`, `Caracteristicas.test.tsx` (área del proyecto) |
| Agregación de scores por resolución, conteos por tile/bbox y lookups de detalle | `h3TileIndex.test.ts` |
| Clasificación onshore/offshore del emplazamiento desde los hexes seleccionados | `Caracteristicas.test.tsx` |
| Flujo GIS completo del usuario: seleccionar área → dimensiones → características → informe (gating por paso) | `e2e/dashboard-heatmap.spec.ts`, `SideBar.test.tsx`, `NextStepButton.test.tsx`, `dashboard/page.test.tsx` |
| Pesos y agregación de variables para el resultado | `variableWeights.test.ts`, `reportData.test.ts` |

### RNF-4 · Calidad de datos
*Datos espaciales completos, consistentes y adecuados; confiabilidad del resultado GIS para la toma de decisiones.*

| Qué se verifica | Tests |
|---|---|
| Completitud territorial: puntos de control en Caribe, Pacífico, fronteras oriental/sur y archipiélago caen dentro de la malla generada (cartografía oficial IGAC) | `h3Resolution.test.ts` (US-FB2-02) |
| Consistencia de regiones: derivación correcta de departamento/región desde coordenadas | `colombiaRegions.test.ts` |
| Catálogo de variables consistente (ids únicos, dimensiones válidas, obligatorias protegidas) | `variablesCatalog.test.ts`, `VariablesContext.test.tsx` |
| El resultado del informe refleja los datos de entrada (dimensiones, resultado preliminar, región y coordenadas derivadas de la selección) | `Report.test.tsx`, `reportData.test.ts` |
| Valores nulos/ausentes no se presentan como datos válidos (se omiten en el popup; rangos min/max calculados sólo sobre numéricos) | `HexPopup.test.tsx`, `h3TileIndex.test.ts` |

**Alcance**: la calidad del dato fuente (parquet de variables) se valida en el
pipeline del backend; aquí se garantiza que el frontend no la degrada ni
presenta datos incompletos como completos.

### RNF-5 · Usabilidad geoespacial
*Presentar información espacial comprensible, accesible y cognitivamente adecuada.*

| Qué se verifica | Tests |
|---|---|
| Accesibilidad automatizada (axe-core) en landing y dashboard con el mapa activo — sin violaciones critical/serious; el canvas se excluye por no ser contenido evaluable | `e2e/a11y.spec.ts` |
| La leyenda del heatmap comunica los 5 rangos de prefactibilidad con etiquetas legibles | `HeatmapLegend.test.tsx` |
| Información contextual del hexágono bajo el cursor (scores por dimensión, variables informativas limitadas a 4 para no saturar) | `HexValuesTooltip.test.tsx`, `HexPopup.test.tsx` |
| Metadatos de capa comprensibles (resolución, tamaño de celda, conteos) | `LayerInfo.test.tsx` |
| Semántica accesible del buscador de lugares (combobox + listbox ARIA) y de los switches de variables (`role="switch"`, estados aria) | `MapSearchBox.test.tsx`, `VariableSwitch.test.tsx` |
| Guía cognitiva por fase del flujo (hints persistentes/descartables) y explicación de polaridad de variables ("Suma/Resta a prefactibilidad") | `PhaseHintCard.test.tsx`, `VariableTooltip.test.tsx`, `SelectedVariablesChips.test.tsx` |
| La información espacial se presenta en los 3 motores de render (chromium/firefox/webkit) | `e2e/public-landing.spec.ts` y proyectos de `playwright.config.ts` |

## CI (GitHub Actions)

`.github/workflows/frontend-ci.yml` (raíz del repo) corre en PRs y push a main que toquen `Vento/**` o `infra/keycloak/**`:

| Job | Qué hace | Bloqueante |
|---|---|---|
| Lint | `npm run lint` (0 errores, 0 warnings) | Sí |
| Unit tests + coverage | `npm run test:coverage` (resumen de cobertura en el log) | Sí |
| Build | `npm run build` | Sí |
| E2E | Keycloak via docker compose + Playwright chromium | Sí |

No usa secrets del repositorio (restricción: los contribuidores no pueden crearlos) **ni actions de marketplace**: la política de la organización sólo permite actions de repos propios, así que el checkout se hace con `git` + `github.token` y Node sale del tool cache del runner.

**Pendiente para un admin**: (1) permitir "actions created by GitHub" en Settings → Actions → General — habilita `actions/checkout`, cache de npm y la subida de artefactos (`coverage/`, `playwright-report/`); (2) marcar unit/build/e2e como required checks y activar branch protection en `main`.

## Patrones de mocking reutilizables

- **deck.gl / maplibre**: stubs con `<div data-testid>` — ver `src/app/Components/Map.test.tsx`.
- **next-auth + timers falsos**: ver `__tests__/unit/app/Components/SessionGuard.test.tsx`.
- **Contextos (provider + probe component)**: ver `src/app/Utils/AccionPrincipalContext.test.tsx`.
- **fetch**: `globalThis.fetch = vi.fn()` en `beforeEach`, restaurar en `afterEach` — ver `src/app/Utils/geocoder.test.ts`.
