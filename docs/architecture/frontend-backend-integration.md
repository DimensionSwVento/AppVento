---
version: 1.0
date: 2026-04-20
author: Mavalan Software
scope: integración Next.js (Vento) ↔ FastAPI (repo separado) + API local standalone
---

# Integración Frontend ↔ Backend

Cómo el frontend Next.js se conecta al backend FastAPI (repo separado), cuándo usar rutas API locales de Next.js vs proxy al backend, y cómo funciona en dev y prod.

---

## 1. Topología

```
┌─────────────────────┐         ┌─────────────────────┐
│  Browser            │         │  Keycloak (realm)   │
│  (user)             │◄────────│  infra/keycloak/    │
└──────────┬──────────┘  OIDC   │  docker-compose     │
           │                    └─────────────────────┘
           │ HTTP(S)
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│  Next.js (Vento)    │         │  FastAPI (repo     │
│  ────────────────   │  HTTP   │  separado)          │
│  - SSR + pages      │◄───────►│  ────────────       │
│  - /api/**          │  proxy  │  /api/tiles/{z}/…   │
│    auth, admin,     │         │  /api/variables     │
│    kc-logout        │         │  /health            │
│  - rewrites →       │         └─────────────────────┘
│    FastAPI          │                  ▲
└──────────┬──────────┘                  │
           │                             │
           │                             │ lee
           │ invalida cache              ▼
           │                    ┌─────────────────────┐
           │                    │  Datos oficiales    │
           │                    │  `.h3.parquet`      │
           │                    │  (equipo investig.) │
           │                    └─────────────────────┘
           ▼
     Cookie JWE NextAuth
     (refreshToken + roles + expiresAt)
```

---

## 2. Responsabilidades de cada capa

### 2.1 Next.js (repo `AppVento/Vento/`)

**Sirve server-side** (ruta → archivo Next.js):

| Ruta | Archivo | Propósito |
|------|---------|-----------|
| `/api/auth/*` | [src/app/api/auth/[...nextauth]/route.ts](../../Vento/src/app/api/auth/%5B...nextauth%5D/route.ts) | NextAuth OIDC flow (login, callback, session) |
| `/api/auth/kc-logout` | [src/app/api/auth/kc-logout/route.ts](../../Vento/src/app/api/auth/kc-logout/route.ts) | Logout federado server-side hacia Keycloak |
| `/api/admin/users` | [src/app/api/admin/users/route.ts](../../Vento/src/app/api/admin/users/route.ts) | CRUD usuarios vía Keycloak Admin API |
| `/api/admin/users/[id]` | [src/app/api/admin/users/[id]/route.ts](../../Vento/src/app/api/admin/users/%5Bid%5D/route.ts) | Editar/borrar usuario |
| `/api/admin/users/[id]/roles` | [src/app/api/admin/users/[id]/roles/route.ts](../../Vento/src/app/api/admin/users/%5Bid%5D/roles/route.ts) | Roles de un usuario específico |
| `/api/health` | [src/app/api/health/route.ts](../../Vento/src/app/api/health/route.ts) | Healthcheck simple |
| `/api/tiles/{z}/{x}/{y}` | [src/app/api/tiles/[z]/[x]/[y]/route.ts](../../Vento/src/app/api/tiles/%5Bz%5D/%5Bx%5D/%5By%5D/route.ts) | Stub devuelve `503 moved_to_fastapi` — reemplazado por rewrite (§3) |

### 2.2 FastAPI (repo separado)

**Propósito**: servir tiles H3 pre-procesados desde `.h3.parquet`, endpoints de datos geoespaciales, lógica de negocio.

Endpoints actuales:
- `GET /api/tiles/{z}/{x}/{y}` — tiles H3 con scores
- `GET /api/tiles/{z}/{x}/{y}?var=X` — filtrados por variable
- `GET /api/variables` — lista de variables disponibles
- `GET /health` — healthcheck

Endpoints futuros:
- Informe de viabilidad, histórico, metadata de variables

### 2.3 Keycloak

Fuente de verdad de identidad. No lo contacta el browser directamente durante la operación — solo durante login/logout. En el resto del tiempo, el browser tiene una cookie JWE firmada por NextAuth.

---

## 3. El truco de `rewrites` en [next.config.ts](../../Vento/next.config.ts)

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  // ...
  ...(API_URL && {
    async rewrites() {
      return [
        {
          source: "/api/tiles/:path*",
          destination: `${API_URL}/api/tiles/:path*`,
        },
      ];
    },
  }),
  // ...
};
```

### Qué hace
- Si `NEXT_PUBLIC_API_URL` está definido, **cualquier request a `/api/tiles/*` del frontend se redirige (server-side) al backend FastAPI** en `${NEXT_PUBLIC_API_URL}/api/tiles/*`.
- El rewrite es transparente al cliente — el browser ve `/api/tiles/3/1/2` pero Next.js lo sirve desde FastAPI.
- Si `NEXT_PUBLIC_API_URL` no está definido (ej. dev sin backend), Next.js usa su stub local que retorna `503 moved_to_fastapi`.

### Por qué este patrón
- **Mismo origen en browser**: evita CORS complejo. El browser ve todo bajo `https://vento.dominio.com/api/*`, sin cross-origin a `https://backend.dominio.com`.
- **Secretos del backend quedan server-side**: si mañana añadimos headers de auth al proxy (JWT Bearer), el cliente no los ve.
- **Swap en 1 env var**: cambiar de backend (local ↔ staging ↔ prod) es solo cambiar `NEXT_PUBLIC_API_URL`. No toca código.
- **Desarrollo local sin backend**: si estás trabajando solo en UI, no necesitas tener el FastAPI corriendo; las rutas `/api/tiles` responden 503 y ya.

### Limitaciones
- Solo `/api/tiles/*` está proxied hoy. Si añades endpoint nuevo al backend (ej. `/api/variables`), hay que añadir otra entrada al array de rewrites.
- No inyecta `Authorization: Bearer` automáticamente — para eso hay que implementar un proxy route real (ver §5).

---

## 4. Diferencia: ruta API local vs proxy al backend

| Criterio | Ruta API local (Next.js handler) | Rewrite (proxy al backend) |
|----------|----------------------------------|---------------------------|
| Se ejecuta en | Node.js del frontend (o edge runtime) | Node.js del frontend; el body se forwarda al backend |
| Usa secretos server-side | Sí — `auth()`, `AUTH_SECRET`, `AUTH_KEYCLOAK_SECRET` | No (solo forward) |
| Requiere backend corriendo | No | Sí |
| Latencia extra | 1 hop | 2 hops (browser → Next → backend) |
| Ejemplos | `/api/auth/*`, `/api/admin/users` | `/api/tiles/*` |

### Cuándo usar cada uno

**Ruta API local de Next.js** — usa cuando:
- Necesitas leer la sesión/cookie (`auth()`)
- Llamas a servicios que requieren secretos server-side (Keycloak Admin API)
- La lógica es específica del frontend (ej. formatear para UI)

**Rewrite al backend FastAPI** — usa cuando:
- Los datos viven en el backend (tiles H3, variables, informes)
- No necesitas lógica custom en Next.js — el backend ya expone el endpoint exacto
- Quieres evitar CORS en el browser

---

## 5. Manejo de tokens para llamadas autenticadas al backend

### Estado actual
El backend FastAPI valida tokens OIDC como Resource Server (según [ADR-005](../adr/ADR-005-keycloak-identidad.md) y [ADR-007](../adr/ADR-007-backend-clean-architecture-ddd-monorepo.md)). Espera `Authorization: Bearer <access_token>`.

### Problema
Tras la [reducción de cookie](../security/auth-strategy.md), el access_token **no se envía al browser**. El rewrite actual (`/api/tiles/*`) tampoco añade Authorization header — reenvía lo que llegó del browser (que es nada).

### Consecuencia
Los endpoints del backend que requieren auth **no son accesibles** vía el proxy simple. Solo `GET /api/tiles/*` funciona porque el backend actualmente **no requiere auth en ese endpoint público** (escenario típico de tile serving público).

### Solución propuesta (pendiente — US-AUTH-GUARD AC Bearer)
Implementar proxy route manual en Next.js con `auth()` server-side:

```ts
// src/app/api/proxy/[...path]/route.ts (propuesto)
export async function GET(req: Request, { params }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const accessToken = await getAccessTokenFromJWT();  // pendiente: guardar access_token server-side en JWT
  const backendPath = params.path.join("/");
  const res = await fetch(`${process.env.BACKEND_URL}/api/${backendPath}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return new Response(res.body, { status: res.status });
}
```

**Trade-off**: requiere volver a almacenar `access_token` en el JWT (estaba quitado por cookie size). Alternativa: database sessions con adapter.

---

## 6. Variables de entorno para la integración

| Variable | Ubicación | Propósito |
|----------|-----------|-----------|
| `NEXT_PUBLIC_API_URL` | `.env` Vento | Base del backend FastAPI (dev: `http://localhost:8000`). Activa el rewrite |
| (futuro) `BACKEND_URL` | `.env` Vento | Base del backend para proxies que añaden auth server-side |
| (backend) `KEYCLOAK_ISSUER` | `.env` FastAPI | Para validar JWTs de Keycloak |
| (backend) `CORS_ORIGINS` | `.env` FastAPI | Permitir requests directos del frontend (solo si no usas rewrite) |

---

## 7. Topología en dev vs prod

### Dev (local)
```
Browser (localhost:3000)
  └─> Next.js (npm run dev, port 3000)
        ├─ rutas locales: /api/auth/*, /api/admin/*
        └─ rewrite: /api/tiles/* → http://localhost:8000/api/tiles/*
              └─> FastAPI (docker o uvicorn, port 8000)

Keycloak en docker-compose (puerto 8080)
  └─ infra/keycloak/docker-compose.yml
```

### Prod (AccuWeb)
```
Browser (https://vento.dominio.com)
  └─> Next.js en AccuWeb (cPanel Node)
        ├─ rutas locales (handlers NextAuth, admin API)
        └─ rewrite: /api/tiles/* → https://backend-fastapi.dominio.com/api/tiles/*
              └─> FastAPI (deploy separado — infra diferente, posiblemente otro AccuWeb app o cloud)

Keycloak en AccuWeb (contenedor propio)
  └─ No es parte del CI del frontend. Deploy aparte.
```

---

## 8. Pre-procesamiento de datos (.h3.parquet)

El frontend **no** lee `.parquet` directamente. El flujo actual:

```
Equipo investigación
  └─> genera .h3.parquet
       └─> entrega al backend FastAPI
            └─> FastAPI lo indexa con pyarrow + h3-py
                 └─> sirve tiles pre-indexados a Next.js vía rewrite
```

Código histórico en [Vento/src/app/Utils/h3/parseH3Parquet.ts](../../Vento/src/app/Utils/h3/parseH3Parquet.ts) intentaba parsear en browser con `hyparquet` — **deshabilitado**. Ver [ADR futuro: parquet backend vs browser] (pendiente).

---

## 9. Cache y performance

### Frontend
- **TileLayer cache DeckGL**: 64 tiles en memoria por viewport (ver [Vento/src/app/Utils/h3/h3DataCache.ts](../../Vento/src/app/Utils/h3/h3DataCache.ts)).
- **HTTP Cache-Control**: headers del backend indican `max-age` — browser reutiliza tiles entre navegaciones.
- **Service Worker**: pendiente (US-CACHE parcial, ver [ADR-006](../adr/ADR-006-storage-cache-datos-geoespaciales.md)).

### Backend
- Cache en memoria de `.parquet` indexado. Se reconstruye al reiniciar contenedor.
- Reduce I/O disk a una vez por arranque.

---

## 10. Checklist para añadir un endpoint nuevo

### Si vive en el backend (tiles, datos, informes):
1. Implementarlo en FastAPI como `/api/nuevo-endpoint`
2. Añadir entrada al array de `rewrites` en [next.config.ts](../../Vento/next.config.ts):
   ```ts
   { source: "/api/nuevo-endpoint/:path*", destination: `${API_URL}/api/nuevo-endpoint/:path*` }
   ```
3. Consumirlo en el frontend con `fetch("/api/nuevo-endpoint/...")` — sin pensar en CORS ni URL
4. Si requiere auth: usar proxy route manual (§5) hasta que se implemente el proxy genérico

### Si vive en Next.js (auth, UI-specific, secretos):
1. Crear `src/app/api/nuevo-endpoint/route.ts` con handlers GET/POST
2. Usar `auth()` para leer sesión si aplica
3. Añadir test en `__tests__/unit/app/api/nuevo-endpoint/route.test.ts`
4. No añadir al array de rewrites (son handlers locales)

---

## 11. Referencias

- [auth-strategy.md](../security/auth-strategy.md) — cómo funciona la auth end-to-end
- [tech-stack-validation.md](./tech-stack-validation.md) — stack completo
- [test-strategy.md](../testing/test-strategy.md) — cómo testear rutas API
- [ADR-005 Keycloak](../adr/ADR-005-keycloak-identidad.md)
- [ADR-007 Backend DDD](../adr/ADR-007-backend-clean-architecture-ddd-monorepo.md)
- [ADR-008 Tile-based](../adr/ADR-008-arquitectura-tile-based.md)
- [next.config.ts](../../Vento/next.config.ts) — donde vive el rewrite
