---
version: 1.0
date: 2026-04-20
author: Mavalan Software
scope: estrategia de testing unitario del frontend Vento
---

# Estrategia de Testing — Proyecto Vento

Documento que responde al feedback cliente item #7: **qué pruebas se hicieron, dónde viven, qué verifican y qué devuelven**.

---

## 1. Resumen ejecutivo

- **57 archivos de test** cubriendo autenticación, navegación/UI, admin, mapa/selección, dimensiones/variables, características, reportes, utilidades geoespaciales y páginas/rutas
- **Framework**: Vitest + React Testing Library + jsdom
- **Ubicación**: todos centralizados en `Vento/__tests__/unit/**` (espejo de `src/app/**`). Tras el refactor ya **no** hay tests co-localizados en `src/`
- **Ejecución**:
  - Local: `npm run test` (watch mode) o `npm run test:run` (one-shot)
  - CI: `npm run test:ci` en GitHub Actions (pipeline falla si algún test falla)

---

## 2. Stack de testing

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| [Vitest](https://vitest.dev) | ~3.x | Test runner + assertions + mocking |
| [@testing-library/react](https://testing-library.com) | — | Renderizado + queries centradas en usuario |
| jsdom | — | Simular DOM en entorno Node |
| @vitejs/plugin-react | — | Transforma JSX para Vitest |
| gitleaks | — | (CI) Escaneo de secrets antes de correr tests |

**Configuración**: [Vento/vitest.config.ts](../../Vento/vitest.config.ts)
- Project name: `unit`
- Entorno: `jsdom`
- Globals activos (`describe`/`it`/`expect` sin import)
- Setup: `./vitest.setup.ts` (mocks globales de ResizeObserver, WebGL, etc.)
- `isolate: false` y `fileParallelism: false` — tests corren secuencialmente para evitar race conditions con mocks globales

**Patrones incluidos**:
```
__tests__/unit/**/*.{test,spec}.{ts,tsx}
src/**/*.test.{ts,tsx}
```

---

## 3. Inventario completo de tests (57 archivos)

> Todas las rutas cuelgan de `Vento/__tests__/unit/`. Agrupados por módulo/dominio.

### 3.1 Autenticación y seguridad (11)

| Archivo | Qué valida |
|---------|------------|
| [auth.test.ts](../../Vento/__tests__/unit/auth.test.ts) | NextAuth: callbacks `jwt`/`session`, roles desde `realm_access.roles`, refresh de tokens, `session` no expone `refreshToken` |
| [middleware.test.ts](../../Vento/__tests__/unit/middleware.test.ts) | Rutas protegidas: redirige a `/` sin sesión, a `/not-authorized` sin rol admin |
| [app/api/auth/[...nextauth]/route.test.ts](../../Vento/__tests__/unit/app/api/auth/%5B...nextauth%5D/route.test.ts) | Handler NextAuth expone GET/POST |
| [app/api/auth/kc-logout/route.test.ts](../../Vento/__tests__/unit/app/api/auth/kc-logout/route.test.ts) | Logout federado server-side hacia Keycloak |
| [app/api/auth/register/route.test.ts](../../Vento/__tests__/unit/app/api/auth/register/route.test.ts) | Endpoint de registro |
| [app/api/auth/register/callback/route.test.ts](../../Vento/__tests__/unit/app/api/auth/register/callback/route.test.ts) | Callback post-registro (confirmación app-side, ADR-012) |
| [app/Components/SessionGuard.test.tsx](../../Vento/__tests__/unit/app/Components/SessionGuard.test.tsx) | Expiración de sesión y guardia de cliente |
| [app/Components/SignInButton.test.tsx](../../Vento/__tests__/unit/app/Components/SignInButton.test.tsx) | Botón login → `signIn("keycloak")` |
| [app/Components/SignUpButton.test.tsx](../../Vento/__tests__/unit/app/Components/SignUpButton.test.tsx) | Botón registro |
| [app/Utils/keycloakAdmin.test.ts](../../Vento/__tests__/unit/app/Utils/keycloakAdmin.test.ts) | Admin API: URLs, `401`+re-fetch, `Location` tras `createUser`, `KeycloakAdminError` |
| [app/Utils/keycloakLogout.test.ts](../../Vento/__tests__/unit/app/Utils/keycloakLogout.test.ts) | Utility de logout federado |

### 3.2 Administración de usuarios (1)

| Archivo | Qué valida |
|---------|------------|
| [app/Components/Admin/UsersTable.test.tsx](../../Vento/__tests__/unit/app/Components/Admin/UsersTable.test.tsx) | Tabla de usuarios: render, `onEdit`/`onDelete`/`onActivate`, carga de roles |

### 3.3 Navegación, layout y UI (5)

| Archivo | Qué valida |
|---------|------------|
| [app/Components/SideBar.test.tsx](../../Vento/__tests__/unit/app/Components/SideBar.test.tsx) | Render, logout, overlay mobile, retroceso libre a fases previas |
| [app/Components/SideBar.admin-nav.test.tsx](../../Vento/__tests__/unit/app/Components/SideBar.admin-nav.test.tsx) | Link "Gestión de usuarios" solo visible con rol admin |
| [app/Components/ui/Card.test.tsx](../../Vento/__tests__/unit/app/Components/ui/Card.test.tsx) | Componente Card base |
| [app/Components/ui/NextStepButton.test.tsx](../../Vento/__tests__/unit/app/Components/ui/NextStepButton.test.tsx) | Habilitado solo con selección; avanza `accion` al siguiente paso |
| [app/Providers.test.tsx](../../Vento/__tests__/unit/app/Providers.test.tsx) | Wrapper de contexts (Session + Aprincipal + …) |

### 3.4 Mapa y selección — US03 (13)

| Archivo | Qué valida |
|---------|------------|
| [app/Components/map/Map.test.tsx](../../Vento/__tests__/unit/app/Components/map/Map.test.tsx) | Click añade/quita `h3Index`; `polygonToCells` con resolución según zoom |
| [app/Components/map/AreaDisplay.test.tsx](../../Vento/__tests__/unit/app/Components/map/AreaDisplay.test.tsx) | Área total de la selección en km² |
| [app/Components/map/MapSearchBox.test.tsx](../../Vento/__tests__/unit/app/Components/map/MapSearchBox.test.tsx) | Búsqueda de lugar, dropdown, autoselección/exploración |
| [app/Components/map/HeatmapDimensionSwitches.test.tsx](../../Vento/__tests__/unit/app/Components/map/HeatmapDimensionSwitches.test.tsx) | Selector de dimensión del heatmap |
| [app/Components/map/HeatmapLegend.test.tsx](../../Vento/__tests__/unit/app/Components/map/HeatmapLegend.test.tsx) | Leyenda Viridis |
| [app/Components/map/HexPopup.test.tsx](../../Vento/__tests__/unit/app/Components/map/HexPopup.test.tsx) | Popup por hexágono |
| [app/Components/map/HexValuesTooltip.test.tsx](../../Vento/__tests__/unit/app/Components/map/HexValuesTooltip.test.tsx) | Tooltip de valores por hex |
| [app/Components/map/InformativeVariablesList.test.tsx](../../Vento/__tests__/unit/app/Components/map/InformativeVariablesList.test.tsx) | Lista de variables informativas |
| [app/Components/map/LayerInfo.test.tsx](../../Vento/__tests__/unit/app/Components/map/LayerInfo.test.tsx) | Info de capa del heatmap |
| [app/Components/map/VariableSelector.test.tsx](../../Vento/__tests__/unit/app/Components/map/VariableSelector.test.tsx) | Selector de variable del heat |
| [app/Components/map/NextStepFloatingCard.test.tsx](../../Vento/__tests__/unit/app/Components/map/NextStepFloatingCard.test.tsx) | Card flotante de próximo paso |
| [app/Components/map/PhaseHintCard.test.tsx](../../Vento/__tests__/unit/app/Components/map/PhaseHintCard.test.tsx) | Hint por fase del flujo |
| [app/Utils/AccionPrincipalContext.test.tsx](../../Vento/__tests__/unit/app/Utils/AccionPrincipalContext.test.tsx) | Flujo `seleccion-area → dimensiones → caracteristicas → informe`; `selectedHexes` persiste |

### 3.5 Dimensiones y variables — US04 (10)

| Archivo | Qué valida |
|---------|------------|
| [app/Components/dimensions/Dimensions.test.tsx](../../Vento/__tests__/unit/app/Components/dimensions/Dimensions.test.tsx) | Subpágina de dimensiones |
| [app/Components/dimensions/DimensionCard.test.tsx](../../Vento/__tests__/unit/app/Components/dimensions/DimensionCard.test.tsx) | Card colapsable de dimensión |
| [app/Components/dimensions/VariableSwitch.test.tsx](../../Vento/__tests__/unit/app/Components/dimensions/VariableSwitch.test.tsx) | Switch de variable |
| [app/Components/dimensions/VariableTooltip.test.tsx](../../Vento/__tests__/unit/app/Components/dimensions/VariableTooltip.test.tsx) | Tooltip con definición de variable |
| [app/Components/dimensions/SelectedVariablesChips.test.tsx](../../Vento/__tests__/unit/app/Components/dimensions/SelectedVariablesChips.test.tsx) | Chips de variables seleccionadas |
| [app/Utils/VariablesContext.test.tsx](../../Vento/__tests__/unit/app/Utils/VariablesContext.test.tsx) | Estado de variables activas |
| [app/Utils/variablesCatalog.test.ts](../../Vento/__tests__/unit/app/Utils/variablesCatalog.test.ts) | Catálogo de variables/dimensiones |
| [app/Utils/variableWeights.test.ts](../../Vento/__tests__/unit/app/Utils/variableWeights.test.ts) | Pesos signados WLC (Regulatoria fuera del score) |
| [app/Utils/dimensionColors.test.ts](../../Vento/__tests__/unit/app/Utils/dimensionColors.test.ts) | Colores por dimensión |
| [app/Utils/HeatmapDimensionContext.test.tsx](../../Vento/__tests__/unit/app/Utils/HeatmapDimensionContext.test.tsx) | Dimensión activa del heatmap |

### 3.6 Características del proyecto — US05 (3)

| Archivo | Qué valida |
|---------|------------|
| [app/Components/caracteristicas/Caracteristicas.test.tsx](../../Vento/__tests__/unit/app/Components/caracteristicas/Caracteristicas.test.tsx) | Emplazamiento, capacidad, categoría; Nº aerogeneradores calculado |
| [app/Components/caracteristicas/MWPicker.test.tsx](../../Vento/__tests__/unit/app/Components/caracteristicas/MWPicker.test.tsx) | Picker de capacidad nominal + categoría derivada |
| [app/Utils/CaracteristicasContext.test.tsx](../../Vento/__tests__/unit/app/Utils/CaracteristicasContext.test.tsx) | Estado de características del proyecto |

### 3.7 Reportes — US06 (2)

| Archivo | Qué valida |
|---------|------------|
| [app/Components/report/Report.test.tsx](../../Vento/__tests__/unit/app/Components/report/Report.test.tsx) | Previsualización + radar + descarga PDF (`generateReportPdf`) |
| [app/Utils/reportData.test.ts](../../Vento/__tests__/unit/app/Utils/reportData.test.ts) | Armado de datos del informe |

### 3.8 Utilidades geoespaciales y de datos (8)

| Archivo | Qué valida |
|---------|------------|
| [app/Utils/h3Resolution.test.ts](../../Vento/__tests__/unit/app/Utils/h3Resolution.test.ts) | Polígonos IGAC, mar/tierra, `isPointInColombia` |
| [app/Utils/h3TileIndex.test.ts](../../Vento/__tests__/unit/app/Utils/h3TileIndex.test.ts) | Índice por tile, scores placeholder, `zoomToH3Res` |
| [app/Utils/h3DataCache.test.ts](../../Vento/__tests__/unit/app/Utils/h3DataCache.test.ts) | Cache de datos H3 por tile |
| [app/Utils/geocoder.test.ts](../../Vento/__tests__/unit/app/Utils/geocoder.test.ts) | Geocoding Nominatim + polígonos |
| [app/Utils/areaCalc.test.ts](../../Vento/__tests__/unit/app/Utils/areaCalc.test.ts) | Cálculo de área en km² |
| [app/Utils/colombiaRegions.test.ts](../../Vento/__tests__/unit/app/Utils/colombiaRegions.test.ts) | Regiones de Colombia (usado por reportes) |
| [app/Utils/apiUrl.test.ts](../../Vento/__tests__/unit/app/Utils/apiUrl.test.ts) | Resolución de URL base del backend |
| [app/Utils/customIcons.test.tsx](../../Vento/__tests__/unit/app/Utils/customIcons.test.tsx) | Íconos SVG custom |

### 3.9 Páginas y rutas (4)

| Archivo | Qué valida |
|---------|------------|
| [app/page.test.tsx](../../Vento/__tests__/unit/app/page.test.tsx) | Landing `/`: SignInButton sin sesión, redirige a `/dashboard` si autenticado |
| [app/dashboard/page.test.tsx](../../Vento/__tests__/unit/app/dashboard/page.test.tsx) | Dashboard: Map + subpágina según `accion` |
| [app/registration-success/page.test.tsx](../../Vento/__tests__/unit/app/registration-success/page.test.tsx) | Pantalla de confirmación post-registro |
| [app/api/health/route.test.ts](../../Vento/__tests__/unit/app/api/health/route.test.ts) | Healthcheck → 200 `{ status: "ok" }` |

---

## 4. Qué NO está cubierto aún

| Área | Estado | Prioridad |
|------|--------|-----------|
| Cambios recientes de cookie reduction en `auth.ts` (idToken fuera de JWT) | ❌ Sin test nuevo | Alta — agregar en Sprint estabilización |
| Ruta `/api/auth/kc-logout` | ✅ **Añadido** — `__tests__/unit/app/api/auth/kc-logout/route.test.ts` | — |
| Navegación SideBar desde `/admin/*` → `/dashboard` | ✅ Cubierto — `SideBar.admin-nav.test.tsx` | — |
| Territorio archipiélago (`COLOMBIA_POLYGONS`) | ✅ Cubierto — `h3Resolution.test.ts` (US-FB-04 entregada) | — |
| `SessionGuard` con `RefreshTokenError`/`NoRefreshToken` | ✅ **Añadido** — `__tests__/unit/app/Components/SessionGuard.test.tsx` | — |
| Tests E2E (Playwright) | ✅ Implementado — ver [frontend-testing.md](frontend-testing.md) | — |
| Tests del backend FastAPI | — | Fuera de alcance de este doc (repo separado) |

### Tests añadidos en esta iteración
- [kc-logout/route.test.ts](../../Vento/__tests__/unit/app/api/auth/kc-logout/route.test.ts) — 4 casos: build URL Keycloak; AUTH_URL > x-forwarded-* > nextUrl.origin; faltan env vars críticas
- [SessionGuard.test.tsx](../../Vento/__tests__/unit/app/Components/SessionGuard.test.tsx) — 5 casos: sin error no muestra modal, RefreshTokenError abre modal inmediato, tras 3s dispara sign-out + redirect a `/?expired=true`, también reacciona a `NoRefreshToken`, children siempre se renderizan (US-FB-03 AC2-AC4)
- [h3Resolution.test.ts](../../Vento/__tests__/unit/app/Utils/h3Resolution.test.ts) — 4 casos: COLOMBIA_POLYGON cerrado, ARCHIPELAGO_POLYGON cubre San Andrés + Providencia, COLOMBIA_POLYGONS incluye ambos, MAX_BOUNDS cubre archipiélago (US-FB-04 AC3-AC4-AC6)
- [SideBar.admin-nav.test.tsx](../../Vento/__tests__/unit/app/Components/SideBar.admin-nav.test.tsx) — 5 casos: click en 'Selección de área' desde admin → `router.push("/dashboard")`, pasos bloqueados no navegan, paso habilitado sí navega, highlights no aplican en admin, en dashboard sí aplican
- [UsersTable.test.tsx](../../Vento/__tests__/unit/app/Components/Admin/UsersTable.test.tsx) — ampliado con 4 casos sobre role badge: prefetch dispara 1 fetch/usuario, badge "Analista" cuando roles=["analista"], badge "Administrador" cuando roles=["admin"], cache se invalida al cambiar users ref (US-FB-05 AC1-AC4)

---

## 5. Cómo ejecutar los tests

### Local
```bash
cd Vento
npm install
npm run test        # watch mode (re-ejecuta al cambiar archivos)
npm run test:run    # una sola corrida, falla con exit code 1 si algo falla
```

### CI (GitHub Actions)
```yaml
- name: Run unit tests
  run: npm run test:ci
  working-directory: Vento
```
Ver [.github/workflows/ci.yml](../.github/workflows/ci.yml) — pipeline completo: `lint → typecheck → test → build`.

### Coverage (opcional, no en CI aún)
```bash
npm run test:run -- --coverage
```
Reporta % de líneas/branches/functions cubiertos. Meta propuesta: **>70% en código de negocio** (auth, middleware, routes admin).

---

## 6. Qué debería devolver cada test (criterios generales)

| Tipo de test | Debe validar | NO debe | Ejemplo |
|--------------|--------------|---------|---------|
| **Route handler** (`/api/**`) | Status HTTP correcto, body JSON, headers relevantes, side effects mockeados (Keycloak API llamada con params correctos) | Lógica de UI | `expect(res.status).toBe(403)` |
| **Componente UI** | Lo que el usuario ve/hace (texto en pantalla, clicks, forms, accesibilidad) | Detalles internos (state, props privadas) | `expect(screen.getByRole("button", { name: /crear/i })).toBeEnabled()` |
| **Middleware** | Decisiones de redirect con mocks de `req.auth` y `req.nextUrl` | Implementación de NextAuth | `expect(Response.redirect).toHaveBeenCalledWith(new URL("/", baseUrl))` |
| **Utility / Context** | Entradas → salidas deterministas, estados intermedios | Integración con UI | `expect(result.current.accion).toBe("dimensiones")` |

### Estándar de assertion
Preferir **queries de testing-library centradas en usuario** (`getByRole`, `getByText`, `getByLabelText`) sobre `getByTestId`. Los `data-testid` se usan solo cuando no hay manera semántica de localizar el elemento.

### Mocking
- **NextAuth**: mockear `auth()` y `useSession()` con sesión fake
- **Keycloak Admin API**: mockear `fetch` global con `vi.fn()` retornando respuestas típicas
- **Next Navigation** (`useRouter`, `usePathname`): `vi.mock("next/navigation")` con funciones vacías
- **DeckGL / MapLibre**: mocks de ResizeObserver + WebGL context en `vitest.setup.ts` (son libs del lado cliente con side effects en render)

---

## 7. Criterio de "done" para un test

Un test se considera bien hecho cuando:

1. **Pasa** en local y CI.
2. **Es legible en 30s**: un lector entiende qué espera y por qué sin bajar a implementación.
3. **Falla por la razón correcta**: si borras la feature que prueba, debe fallar. Si cambias un detalle interno irrelevante, NO debe fallar.
4. **No usa `sleep`, `setTimeout`, ni esperas arbitrarias**: usar `waitFor` de testing-library o `vi.useFakeTimers`.
5. **No depende del orden**: puede correrse aislado sin que se rompa.

---

## 8. Flujo al añadir un test nuevo

```
1. Ubicación: en `__tests__/unit/**` espejando la ruta del código en `src/app/**`
   (p. ej. `src/app/Components/map/Map.tsx` → `__tests__/unit/app/Components/map/Map.test.tsx`)
2. Crear archivo con nombre terminando en .test.ts o .test.tsx
3. Escribir describe/it centrado en comportamiento, no implementación
4. Correr local: npm run test
5. Al verde, commit → push → CI valida en pipeline
6. PR NO se mergea si el test no pasa en CI
```

---

## 9. Convenciones y anti-patrones

### Hacer
- Tests pequeños (1 `it` = 1 comportamiento)
- `beforeEach` para resetear mocks (`vi.clearAllMocks()`)
- Datos de prueba en constantes al top del archivo
- Nombres descriptivos: `it("redirects to /not-authorized when non-admin accesses /admin")`

### Evitar
- Tests que prueban > 1 cosa en un solo `it`
- Snapshot testing masivo — solo para outputs estables (ej. emails renderizados), no para UI en evolución
- Mockear lo que se quiere probar (si pruebas `auth.ts`, no mockees `auth.ts`, mockea `fetch`)
- Hardcodear URLs de producción en tests

---

## 10. Referencias cruzadas

- Historia origen del requerimiento: **US-DOC-01 AC2** en [feedback-cliente-v1.md](../stories/feedback-cliente-v1.md)
- Estrategia de auth que estos tests validan: [auth-strategy.md](../security/auth-strategy.md)
- Stack general: [tech-stack-validation.md](../architecture/tech-stack-validation.md)
- **Guía del frontend (cómo correr, E2E Playwright, trazabilidad RNF→tests):** [frontend-testing.md](frontend-testing.md)
- CI pipeline: [.github/workflows/ci.yml](../.github/workflows/ci.yml)

---

## 11. Roadmap de testing

| Sprint | Objetivo |
|--------|----------|
| **Actual (estabilización)** | Cubrir cambios recientes: `kc-logout` route, SideBar admin nav, SessionGuard expiración |
| **v1.0** | Añadir coverage reporter a CI con umbral mínimo 70% |
| **v1.1** | ✅ Tests E2E con Playwright (login + selección + logout) — ver [frontend-testing.md](frontend-testing.md) |
| **v1.2** | Tests de performance (render >10K hexágonos sin jank) |
