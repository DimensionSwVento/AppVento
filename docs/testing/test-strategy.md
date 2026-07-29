---
version: 1.0
date: 2026-04-20
author: mavalan Software
scope: estrategia de testing unitario del frontend Vento
---

# Estrategia de Testing — Proyecto Vento

Documento que responde al feedback cliente item #7: **qué pruebas se hicieron, dónde viven, qué verifican y qué devuelven**.

---

## 1. Resumen ejecutivo

- **21 archivos de test** cubriendo autenticación, navegación, componentes UI, rutas API, middleware, utilidades geoespaciales y módulos del feedback-sprint
- **Framework**: Vitest + React Testing Library + jsdom
- **Ubicación doble** (por convención, ambas válidas):
  - `Vento/__tests__/unit/**` — tests fuera del árbol de código (pattern de tests centralizados)
  - `Vento/src/**/*.test.{ts,tsx}` — tests co-localizados con el código que prueban
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

## 3. Inventario completo de tests (17 archivos)

### 3.1 Autenticación y seguridad

| Archivo | Qué prueba | Qué devuelve / valida |
|---------|------------|----------------------|
| [__tests__/unit/auth.test.ts](../../Vento/__tests__/unit/auth.test.ts) | Configuración NextAuth: callbacks `jwt` y `session`, extracción de roles desde access_token Keycloak, refresh de tokens | Valida que `roles` se extraen de `realm_access.roles`, que `session` no expone `refreshToken`, que refresh falla gracefully con `RefreshTokenError` |
| [__tests__/unit/middleware.test.ts](../../Vento/__tests__/unit/middleware.test.ts) | Middleware de rutas protegidas (`/dashboard`, `/admin`, `/dimensions`) | Valida: redirige a `/` sin sesión; redirige a `/not-authorized` si `/admin/*` sin rol admin; permite paso con sesión válida |
| [__tests__/unit/app/api/auth/[...nextauth]/route.test.ts](../../Vento/__tests__/unit/app/api/auth/%5B...nextauth%5D/route.test.ts) | Handler NextAuth expone GET/POST | Valida que los handlers están exportados correctamente y responden al schema esperado |

### 3.2 Administración de usuarios

| Archivo | Qué prueba | Qué devuelve / valida |
|---------|------------|----------------------|
| [__tests__/unit/app/Utils/keycloakAdmin.test.ts](../../Vento/__tests__/unit/app/Utils/keycloakAdmin.test.ts) | Cliente Keycloak Admin API — `getUsers`, `createUser`, `assignRealmRole`, `resetUserPassword` | Valida: construcción correcta de URLs del admin API, manejo de `401` (token expirado) con re-fetch, parseo de `Location` header tras `createUser`, propagación de `KeycloakAdminError` con status HTTP |
| [__tests__/unit/app/Utils/keycloakLogout.test.ts](../../Vento/__tests__/unit/app/Utils/keycloakLogout.test.ts) | (Histórico) Utility de logout federado — **puede estar obsoleto tras refactor a `/api/auth/kc-logout`** | — |
| [__tests__/unit/app/api/users/route.test.ts](../../Vento/__tests__/unit/app/api/users/route.test.ts) | Route handler `/api/admin/users` GET/POST | Valida: 403 sin rol admin, 400 en payload incompleto, 201 con usuario creado, propagación de errores Keycloak con status HTTP correcto |
| [__tests__/unit/app/Components/Admin/UsersTable.test.tsx](../../Vento/__tests__/unit/app/Components/Admin/UsersTable.test.tsx) | Componente de tabla de usuarios — render, selección, edición inline, paginación | Valida: renderiza N filas, `onEdit`/`onDelete`/`onActivate` se llaman con el usuario correcto, selección de fila carga roles via API |

### 3.3 Navegación y UI

| Archivo | Qué prueba | Qué devuelve / valida |
|---------|------------|----------------------|
| [__tests__/unit/app/Components/SideBar.test.tsx](../../Vento/__tests__/unit/app/Components/SideBar.test.tsx) | SideBar — render, role-based visibility del link admin, logout, botón hamburguesa mobile | Valida: link "Gestión de usuarios" solo visible con rol admin, click en logout redirige a `/api/auth/kc-logout`, mobile overlay abre/cierra |
| [src/app/Components/SideBar.test.tsx](../../Vento/src/app/Components/SideBar.test.tsx) | (Duplicado o variante co-localizada) | Consolidar con el anterior en próxima refactor |
| [src/app/Components/NextStepButton.test.tsx](../../Vento/src/app/Components/NextStepButton.test.tsx) | Botón "Siguiente paso" del flujo de selección | Valida: habilitado solo si hay hexágonos seleccionados, avanza `accion` en el context al paso siguiente |
| [__tests__/unit/app/Components/SignInButton.test.tsx](../../Vento/__tests__/unit/app/Components/SignInButton.test.tsx) | Botón de login | Valida: llama a `signIn("keycloak")` al click, muestra spinner durante loading |
| [__tests__/unit/app/Providers.test.tsx](../../Vento/__tests__/unit/app/Providers.test.tsx) | Providers wrapper (SessionProvider + AprincipalProvider) | Valida: children reciben ambos contexts |

### 3.4 Contexto de negocio y flujo

| Archivo | Qué prueba | Qué devuelve / valida |
|---------|------------|----------------------|
| [src/app/Utils/AccionPrincipalContext.test.tsx](../../Vento/src/app/Utils/AccionPrincipalContext.test.tsx) | Context del flujo principal (seleccion-area → dimensiones → caracteristicas → informe) | Valida: estado inicial `seleccion-area`, `setAccion` dispara re-renders, `selectedHexes` Set persiste entre cambios de paso |

### 3.5 Mapa y selección

| Archivo | Qué prueba | Qué devuelve / valida |
|---------|------------|----------------------|
| [src/app/Components/Map.test.tsx](../../Vento/src/app/Components/Map.test.tsx) | Componente Map — render, click en hexágono, selección/deselección | Valida: click añade `h3Index` al set de seleccionados, re-click lo quita, `polygonToCells` se llama con resolución correcta según zoom |

### 3.6 Páginas y rutas

| Archivo | Qué prueba | Qué devuelve / valida |
|---------|------------|----------------------|
| [__tests__/unit/app/page.test.tsx](../../Vento/__tests__/unit/app/page.test.tsx) | Landing page `/` | Valida: muestra SignInButton si no hay sesión, redirige a `/dashboard` si autenticado |
| [src/app/dashboard/page.test.tsx](../../Vento/src/app/dashboard/page.test.tsx) | Dashboard — renderiza Map + subpage según `accion` | Valida: `accion === "dimensiones"` renderiza `<Dimensions/>`, `accion === "informe"` renderiza `<Report/>` |
| [__tests__/unit/app/api/health/route.test.ts](../../Vento/__tests__/unit/app/api/health/route.test.ts) | Healthcheck endpoint | Valida: retorna 200 + JSON `{ status: "ok" }` |

---

## 4. Qué NO está cubierto aún

| Área | Estado | Prioridad |
|------|--------|-----------|
| Cambios recientes de cookie reduction en `auth.ts` (idToken fuera de JWT) | ❌ Sin test nuevo | Alta — agregar en Sprint estabilización |
| Ruta `/api/auth/kc-logout` | ✅ **Añadido** — `__tests__/unit/app/api/auth/kc-logout/route.test.ts` | — |
| Navegación SideBar desde `/admin/*` → `/dashboard` (fix reciente) | ❌ Sin test | Media |
| Extensión `COLOMBIA_POLYGON` para archipiélago | ❌ Pendiente US-FB-04 | Media (cuando se implemente) |
| `SessionGuard` con `RefreshTokenError`/`NoRefreshToken` | ✅ **Añadido** — `__tests__/unit/app/Components/SessionGuard.test.tsx` | — |
| `HeatmapDemo.tsx` (referencia, no contractual) | ❌ Sin test | Baja |
| Tests E2E (Playwright/Cypress) | ❌ No implementado | Futuro (v1.1) |
| Tests del backend FastAPI | — | Fuera de alcance de este doc (repo separado) |

### Tests añadidos en esta iteración
- [kc-logout/route.test.ts](../../Vento/__tests__/unit/app/api/auth/kc-logout/route.test.ts) — 4 casos: build URL Keycloak; AUTH_URL > x-forwarded-* > nextUrl.origin; faltan env vars críticas
- [SessionGuard.test.tsx](../../Vento/__tests__/unit/app/Components/SessionGuard.test.tsx) — 5 casos: sin error no muestra modal, RefreshTokenError abre modal inmediato, tras 3s dispara sign-out + redirect a `/?expired=true`, también reacciona a `NoRefreshToken`, children siempre se renderizan (US-FB-03 AC2-AC4)
- [h3Resolution.test.ts](../../Vento/src/app/Utils/h3Resolution.test.ts) — 4 casos: COLOMBIA_POLYGON cerrado, ARCHIPELAGO_POLYGON cubre San Andrés + Providencia, COLOMBIA_POLYGONS incluye ambos, MAX_BOUNDS cubre archipiélago (US-FB-04 AC3-AC4-AC6)
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
Ver [.github/workflows/ci.yml](../../.github/workflows/ci.yml) — pipeline completo: `lint → typecheck → test → build`.

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
1. Identificar qué archivo de código prueba → decidir ubicación:
   - Si es UI + quieres co-localizar → src/**/*.test.tsx
   - Si es infra/route/middleware → __tests__/unit/**
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

- Historia origen del requerimiento: **US-DOC-01 AC2** en [feedback-cliente-v1.md](../spec/stories/feedback-cliente-v1.md)
- Estrategia de auth que estos tests validan: [auth-strategy.md](../security/auth-strategy.md)
- Stack general: [tech-stack-validation.md](../architecture/tech-stack-validation.md)
- CI pipeline: [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

---

## 11. Roadmap de testing

| Sprint | Objetivo |
|--------|----------|
| **Actual (estabilización)** | Cubrir cambios recientes: `kc-logout` route, SideBar admin nav, SessionGuard expiración |
| **v1.0** | Añadir coverage reporter a CI con umbral mínimo 70% |
| **v1.1** | Tests E2E críticos (login + selección hex + logout) con Playwright |
| **v1.2** | Tests de performance (render >10K hexágonos sin jank) |
