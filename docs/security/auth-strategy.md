---
version: 1.0
date: 2026-04-20
author: Mavalan Software
scope: protección de rutas autenticadas frontend + backend
---

# Estrategia de Autenticación y Protección de Rutas — Vento

Documento que responde al feedback cliente item #6: **¿qué estrategia se usa para proteger rutas autenticadas?**

---

## 1. Resumen ejecutivo

| Capa | Mecanismo | Ubicación |
|------|-----------|-----------|
| IdP (fuente de verdad) | Keycloak OIDC + OAuth2 | Realm `vento` — contenedor Docker |
| Bridge Next.js ↔ Keycloak | NextAuth v5 (beta) | [Vento/src/auth.ts](../../Vento/src/auth.ts) |
| Rutas protegidas (edge) | `middleware.ts` de Next.js | [Vento/src/middleware.ts](../../Vento/src/middleware.ts) |
| Rutas protegidas (SSR) | Server Component layout guards | [Vento/src/app/admin/layout.tsx](../../Vento/src/app/admin/layout.tsx) |
| Rutas protegidas (API) | `requireAdmin()` helper | [Vento/src/app/api/admin/users/route.ts](../../Vento/src/app/api/admin/users/route.ts) |
| UI condicionada por rol | `useSession()` + `session.roles` | [Vento/src/app/Components/layout/SideBar.tsx](../../Vento/src/app/Components/layout/SideBar.tsx) |
| Sesión expirada | `SessionGuard` detecta `RefreshTokenError` | [Vento/src/app/Components/auth/SessionGuard.tsx](../../Vento/src/app/Components/auth/SessionGuard.tsx) |
| Logout federado | Route server-side | [Vento/src/app/api/auth/kc-logout/route.ts](../../Vento/src/app/api/auth/kc-logout/route.ts) |
| Registro + confirmación | Rutas custom + federated logout | [Vento/src/app/api/auth/register/route.ts](../../Vento/src/app/api/auth/register/route.ts) · [callback](../../Vento/src/app/api/auth/register/callback/route.ts) · [ADR-012](../adr/ADR-012-post-registration-confirmation-app-side.md) |

**Principio**: defensa en profundidad — cada capa verifica por su cuenta, sin asumir que la anterior ya filtró.

---

## 2. Flujo de autenticación completo

```
┌──────────┐  1. Click "Iniciar sesión"  ┌──────────┐
│ Browser  │ ──────────────────────────► │ Next.js  │
│  (user)  │                             │ (Vento)  │
└──────────┘                             └────┬─────┘
                                              │
                       2. signIn("keycloak")  │
                              redirect        │
                                              ▼
                                     ┌────────────────┐
                                     │   Keycloak     │
                                     │   realm vento  │
                                     │   (OIDC/OAuth2)│
                                     └────────┬───────┘
                                              │
                                3. Login form │ (o SSO cookie)
                                              │
                                              ▼
                                     ┌────────────────┐
                                     │ Authorization  │
                                     │     Code       │
                                     └────────┬───────┘
                                              │
                  4. Code redirect a Next.js  │
                                              ▼
┌──────────┐                             ┌──────────┐
│ Browser  │ ◄────────────────────────── │ Next.js  │
│          │  5. JWE cookie encriptado   │ auth.ts  │
└──────────┘  (refreshToken + roles)     └──────────┘
                                              │
                              6. session callback limpia
                                 payload — idToken NO va al cliente
```

### Qué contiene el cookie `authjs.session-token` (JWE)

Encriptado con `AUTH_SECRET` server-side. Payload mínimo:
- `refreshToken` — para renovar access_token sin re-login
- `expiresAt` — Unix timestamp de expiración access_token
- `roles` — realm roles extraídos de `realm_access.roles` del access_token Keycloak
- `error` — string si el refresh falló (`RefreshTokenError`, `NoRefreshToken`)

**NO contiene** (decisión para reducir tamaño <4KB y mitigar 400 nginx en AccuWeb):
- `accessToken` (solo se necesita server-side para backend calls — ver §4)
- `idToken` (no se usa tras el login; logout federado usa `client_id` + `post_logout_redirect_uri`)

### Tamaño cookie tras optimización
Pre-refactor: 3250 bytes. Post: ~1750 bytes. Ver [ADR histórico en auth.ts comentarios](../../Vento/src/auth.ts).

---

## 3. Capas de protección (defensa en profundidad)

### 3.1 Edge Middleware — primera línea

Archivo: [Vento/src/middleware.ts](../../Vento/src/middleware.ts)

```ts
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) return Response.redirect(new URL("/", req.nextUrl));
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const isAdmin = req.auth?.roles?.includes("admin");
    if (!isAdmin) return Response.redirect(new URL("/not-authorized", req.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/dimensions/:path*"],
};
```

**Qué garantiza**:
- Cualquier request a `/dashboard`, `/admin` o `/dimensions` sin sesión válida → redirect a `/` (login).
- Cualquier request a `/admin/*` sin rol `admin` → redirect a `/not-authorized`.
- Se ejecuta **antes** de renderizar, en el edge runtime de Next.js. El componente no llega a cargar.

**Limitaciones**:
- No ve rutas API (`/api/*`) — están fuera del `matcher`.
- No ve rutas públicas (`/`, `/not-authorized`).

### 3.2 Server Component Layout — segunda línea

Archivo: [Vento/src/app/admin/layout.tsx](../../Vento/src/app/admin/layout.tsx)

```tsx
export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session) redirect("/");
  if (!session.roles?.includes("admin")) redirect("/not-authorized");
  return <>{children}</>;
}
```

**Por qué existe aunque el middleware ya protege**:
- **Defensa en profundidad**: si el middleware se desactiva o se cambia el `matcher`, esta capa sigue bloqueando.
- **Se ejecuta en el servidor** antes de enviar HTML al cliente — un atacante no puede bypassear con DevTools.
- Proporciona `session` al árbol de componentes para evitar re-fetch.

### 3.3 API Routes — tercera línea

Archivo: [Vento/src/app/api/admin/users/route.ts](../../Vento/src/app/api/admin/users/route.ts)

```ts
export async function requireAdmin() {
  const session = await auth();
  return !!session && !!session.roles?.includes("admin");
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  // ...
}
```

**Qué garantiza**:
- Cualquier fetch al API admin sin rol → 403 JSON.
- Incluso si un atacante construye el request manualmente (curl/Postman), no pasa sin access_token válido.
- El helper `requireAdmin` está en el mismo archivo del handler para forzar su uso por cada verbo (GET/POST/PUT/DELETE).

### 3.4 UI condicionada — última línea (cosmética)

Archivo: [Vento/src/app/Components/layout/SideBar.tsx](../../Vento/src/app/Components/layout/SideBar.tsx)

```tsx
const isAdmin = session?.roles?.includes("admin");
// ...
{isAdmin && (
  <Link href="/admin/users">Gestión de usuarios</Link>
)}
```

**Qué garantiza**:
- Un usuario sin rol admin no ve el link — reduce confusión y "shoulder surfing".

**Qué NO garantiza**:
- Un atacante que tipee `/admin/users` directamente en URL bar **también** es bloqueado, pero por las capas 3.1 y 3.2, no por esta. Esta es cosmética.

---

## 4. Manejo de tokens para llamar al backend FastAPI

### Estado actual
El backend FastAPI valida tokens OIDC como Resource Server. Requiere header `Authorization: Bearer <access_token>` en cada request.

### Problema
El cliente (browser) **no tiene acceso al access_token** tras la optimización de cookies (§2).

### Solución propuesta (US-AUTH-GUARD AC Bearer, pendiente)
Proxy route server-side en Next.js:
- `/api/proxy/[...path]/route.ts` recibe fetches del cliente
- Lee `access_token` de la sesión server-side vía `auth()`
- Adjunta `Authorization: Bearer ...` y re-emite al backend FastAPI
- Retorna el response al cliente

**Ventajas**:
- Access token nunca llega al navegador
- CSP + CORS quedan más estrictos (solo mismo origen)
- Refresh automático funciona sin intervención del cliente

**Estado**: diseñado, no implementado. Sprint próximo.

---

## 5. Manejo de sesión expirada

Archivo: [Vento/src/app/Components/auth/SessionGuard.tsx](../../Vento/src/app/Components/auth/SessionGuard.tsx)

### Flujo
1. Access token expira (default 5 min Keycloak).
2. NextAuth detecta expiración en `jwt` callback → intenta refresh con `refresh_token`.
3. Si refresh **falla** (token revocado o Keycloak down), `session.error = "RefreshTokenError"`.
4. `SessionGuard` detecta el error y dispara `signOut({ redirect: false })` + redirect a `/`.
5. Usuario vuelve a loguear.

### Configuración de lifespan (pendiente US-FB-03)
Actualmente usa defaults de Keycloak. Propuesto:
- Access Token Lifespan: **15 min**
- SSO Session Idle: **30 min**
- SSO Session Max: **10h**

---

## 5bis. Flujo de registro con confirmación (US-FB-02)

Para evitar que un usuario recién registrado caiga directo al dashboard sin un paso explícito de login, el registro NO pasa por `signIn("keycloak")` de NextAuth. Se implementan dos rutas API custom:

### `GET /api/auth/register`
Construye la URL de Keycloak con `kc_action=register` + `state` (CSRF, almacenado en cookie HttpOnly con scope `/api/auth/register`) y redirige al navegador.

### `GET /api/auth/register/callback`
1. Verifica `state` contra la cookie (rechaza en CSRF mismatch).
2. Intercambia `code` → `tokens` server-side (solo para capturar `id_token`).
3. Redirige al usuario al `logout_endpoint` de Keycloak con `id_token_hint` y `post_logout_redirect_uri=/registration-success`.
4. Limpia la cookie de state.

**Nunca crea sesión NextAuth.** Cuando el usuario aterriza en `/registration-success`, la cookie SSO de Keycloak ya fue eliminada por el logout federado → no existe forma de saltar al dashboard sin volver a autenticarse.

### `/registration-success`
Server Component estático con mensaje en español "¡Usuario registrado!" y botón explícito a `/` (login).

### Entrada al flujo
Desde la landing (`/`), junto al botón "Iniciar sesión" aparece "Crear cuenta" (componente `SignUpButton`) que apunta a `/api/auth/register`.

Ver [ADR-012](../adr/ADR-012-post-registration-confirmation-app-side.md) para el razonamiento completo (por qué no se hizo en el theme Keycloak ni en el Registration Flow del realm).

---

## 6. Logout federado

Archivo: [Vento/src/app/api/auth/kc-logout/route.ts](../../Vento/src/app/api/auth/kc-logout/route.ts)

### Flujo
1. Usuario click "Cerrar sesión" en SideBar.
2. FE llama `signOut({ redirect: false })` — borra cookie NextAuth local.
3. FE redirige a `/api/auth/kc-logout` (route server-side).
4. Route lee `AUTH_KEYCLOAK_ISSUER` + `AUTH_KEYCLOAK_ID` + `AUTH_URL` server-side.
5. Redirige a `{issuer}/protocol/openid-connect/logout?client_id=X&post_logout_redirect_uri=Y`.
6. Keycloak cierra sesión SSO + redirige a `AUTH_URL/` (login page).

### ¿Por qué sin `id_token_hint`?
Antes del refactor, el `idToken` se enviaba al cliente para firmar el logout criptográficamente. Ahora:
- Keycloak 18+ permite logout con `client_id` + `post_logout_redirect_uri` whitelist.
- Trade-off menor de seguridad compensado por cookie más pequeña (ver §2).
- **Requisito**: añadir `AUTH_URL/*` a **Valid post logout redirect URIs** en el cliente Keycloak.

---

## 7. Roles y RBAC

### Roles primera entrega
- **`admin`** — acceso a `/admin/*`, gestión de usuarios
- **`analista`** — usuario regular, acceso al flujo principal

### Fuente de verdad
Realm roles en Keycloak realm `vento`. Asignación vía:
- Keycloak admin console (directo)
- UI de `/admin/users` (usa Keycloak Admin API internamente — ver [Vento/src/app/Utils/apis/keycloakAdmin.ts](../../Vento/src/app/Utils/apis/keycloakAdmin.ts))

### Propagación al frontend
1. Usuario se loguea.
2. Access token contiene `realm_access.roles: ["admin", "analista", ...]`.
3. `auth.ts` extrae roles en `jwt` callback vía `realmRolesFromOidcTokens`.
4. `session.roles` disponible en middleware, layouts y componentes.

### Nota: los roles NO se refrescan en tiempo real
Si un admin asigna rol a un usuario que ya está logueado, **el usuario debe hacer logout + login** para que el nuevo rol entre en su JWT. Esto es limitación fundamental de JWTs — no se "revocan" hasta expirar.

Mitigación futura: considerar lifespan corto (15 min) para que cambios de rol propaguen en <15 min. O usar database sessions.

---

## 8. Variables de entorno relevantes

| Variable | Ubicación | Propósito |
|----------|-----------|-----------|
| `AUTH_SECRET` | `.env` server-side | Firma y cifra JWE cookie. Nunca expuesto al cliente |
| `AUTH_KEYCLOAK_ID` | `.env` server-side | Client ID en Keycloak — valor real: **`vento-web`** |
| `AUTH_KEYCLOAK_SECRET` | `.env` server-side | Client Secret — cliente confidencial, `publicClient: false` |
| `AUTH_KEYCLOAK_ISSUER` | `.env` server-side | URL del realm (dev: `http://localhost:8080/realms/vento`) |
| `NEXT_PUBLIC_KEYCLOAK_URL` | `.env` | Base pública de Keycloak para logout en el browser |
| `NEXT_PUBLIC_KEYCLOAK_REALM` | `.env` | `vento` |
| `NEXT_PUBLIC_KEYCLOAK_ISSUER` | `.env` (opcional) | Issuer explícito si Keycloak usa path prefix (ej. `.../identity/realms/vento`) |
| `AUTH_URL` | `.env` prod | URL pública de la app (para logout redirect). Requerido en AccuWeb por proxy inverso |
| `AUTH_TRUST_HOST` | `.env` prod | `true` si detrás de proxy |

### Cliente Keycloak (realm-export)

Del archivo [infra/keycloak/realm-export.json](../../infra/keycloak/realm-export.json):

- **Realm**: `vento`
- **Client ID**: `vento-web`
- **Client type**: confidencial (`publicClient: false`, con secret)
- **Flows habilitados**: Standard Flow (Authorization Code) — no implícito, no direct grants
- **Login theme**: `keycloakify-starter` (JAR custom montado desde `infra/keycloak/themes/`)
- **Roles realm**: `admin`, `analista` (default al registrarse: `analista`)
- **`verifyEmail`**: `false` (stopper SMTP — ver [ADR-009](../adr/ADR-009-notificaciones-email-pendientes-smtp.md))
- **Redirect URIs dev**: `http://localhost:3000/*`
- **Post-logout URIs dev**: `http://localhost:3000/*`
- **Web Origins dev**: `http://localhost:3000`

Para producción hay que actualizar `redirectUris`, `webOrigins` y `attributes.post.logout.redirect.uris` al dominio real.

---

## 9. Cosas que NO hacemos (y por qué)

| Decisión | Razón |
|----------|-------|
| No guardamos sesiones en DB | Keycloak es fuente de verdad. JWT stateless suficiente. Cambio a DB requeriría adapter (Prisma/Drizzle) |
| No usamos `id_token_hint` en logout | Reduce cookie ~1.5KB. Seguridad equivalente con whitelist de redirect URIs |
| No sincronizamos usuarios a DB propia | Keycloak maneja CRUD. Nuestra DB (futura) guardará análisis de viabilidad, no identidad |
| No implementamos 2FA ahora | Keycloak soporta MFA nativo — activar post-v1.0 sin tocar nuestro código |
| No permitimos login sin Keycloak (backdoor admin) | Aumenta superficie de ataque. Si Keycloak cae, se resuelve en infra, no en app |

---

## 10. Auditoría y trazabilidad

### Qué se loguea actualmente
- `[AUTH] ENV CHECK` al arranque del server (ver `auth.ts` línea 128)
- `[AUTH] ISSUER CONFIG` al arranque
- `[AUTH] DISCOVERY OK` o `DISCOVERY FETCH FAILED` al hacer fetch OIDC discovery
- Errores de Keycloak Admin API (`console.error` en `keycloakAdmin.ts`)

### Qué falta (roadmap)
- Registro de eventos (login exitoso, login fallido, logout, cambio de rol) a tabla `audit_log` en PostgreSQL
- Keycloak Events Listener → webhook a backend
- Dashboard de auditoría en `/admin/audit` (post-v1.0)

---

## 11. Referencias cruzadas

- [ADR-005 Keycloak como IdP](../adr/ADR-005-keycloak-identidad.md)
- [ADR-009 Email notificaciones bloqueadas por SMTP](../adr/ADR-009-notificaciones-email-pendientes-smtp.md)
- [test-strategy.md](../testing/test-strategy.md) — tests de auth/middleware/admin
- [feedback-cliente-v1.md](../stories/feedback-cliente-v1.md) — US-FB-01, US-FB-03, US-FB-05, US-FB-06

---

## 12. Checklist para revisar al modificar auth

Cada vez que toques código de auth, verifica:

- [ ] Tests de `auth.test.ts` y `middleware.test.ts` pasan
- [ ] Cookie `authjs.session-token` sigue <4KB (abrir DevTools → Application → Cookies)
- [ ] Logout redirige a login limpiamente (sin `?error=` en URL)
- [ ] `/admin/*` sigue bloqueado para usuarios no-admin
- [ ] `/api/admin/*` retorna 403 sin token válido
- [ ] `SessionGuard` sigue detectando `RefreshTokenError` y re-autenticando
- [ ] ENV vars presentes en producción (AccuWeb): `AUTH_SECRET`, `AUTH_URL`, `AUTH_KEYCLOAK_*`
