---
version: 2.0
date: 2026-04-09
status: implementado
---

# Arquitectura del Sistema — Vento

## 1. Vista General

### Arquitectura Actual (Primera Entrega)

```
┌─────────────────────────────────────────────────────────────────────┐
│                 FRONTEND — Next.js 16 + React 19                    │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Mapa SIG         │  │ SideBar      │  │ Auth                  │  │
│  │ (DeckGL+MapLibre)│  │ (Navegación) │  │ (NextAuth+Keycloak)   │  │
│  │                  │  │              │  │                       │  │
│  │ Map.tsx          │  │ Dimensions   │  │ middleware.ts         │  │
│  │ (esencial)       │  │ Report       │  │ auth.ts               │  │
│  │                  │  │ NextStep     │  │ SignInButton           │  │
│  │ HeatmapDemo.tsx  │  │              │  │ keycloakLogout.ts     │  │
│  │ (features demo)  │  │              │  │                       │  │
│  └────────┬─────────┘  └──────┬───────┘  └───────────┬───────────┘  │
│           │                   │                      │              │
│  ┌────────▼───────────────────▼──────────────────────▼──────────┐   │
│  │                Estado Global + Servicios                     │   │
│  │  AccionPrincipalContext (accion, selectedHexes)               │   │
│  │  API_BASE → FastAPI cuando NEXT_PUBLIC_API_URL está set      │   │
│  │  API Routes locales (/api/tiles/*, /api/health)              │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │ (cuando API_BASE apunta a FastAPI)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              BACKEND — FastAPI (repo separado)                       │
│                                                                     │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ routers/   │  │ application/ │  │ infrastructure/            │   │
│  │ tiles.py   │  │ tile_service │  │ auth/keycloak_guard.py     │   │
│  │ health.py  │  │              │  │ (JWT RS256 via JWKS)       │   │
│  └────────────┘  └──────────────┘  └────────────────────────────┘   │
│                                                                     │
│  AUTH_ENABLED=true → require_auth en todas las rutas tiles          │
│  .h3.parquet → tile_index server-side → TileHex[] por bbox          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              IDENTIDAD — Keycloak (Docker)                          │
│                                                                     │
│  Realm: vento │ Client: vento-frontend (público, PKCE)              │
│  Roles: admin, analista                                             │
│  infra/keycloak/docker-compose.yml + realm-export.json              │
└─────────────────────────────────────────────────────────────────────┘
```

### Arquitectura Futura (Con PostgreSQL + Motor Multicriterio)

```
┌──────────────────────────────────────────────────┐
│          FRONTEND — Next.js + React               │
│  ┌────────────┐ ┌──────────┐ ┌───────────────┐    │
│  │ Mapa SIG   │ │ Reportes │ │ Admin/Auth    │    │
│  │ (DeckGL)   │ │ (PDF)    │ │ (Keycloak)    │    │
│  └─────┬──────┘ └────┬─────┘ └──────┬────────┘    │
└────────┼─────────────┼──────────────┼──────────────┘
         │             │              │
    ┌────▼─────────────▼──────────────▼──────┐
    │         API REST (FastAPI)             │
    │  /tiles  /reports  /variables  /auth   │
    └──────────────────┬─────────────────────┘
                       │
    ┌──────────────────▼─────────────────────┐
    │      PostgreSQL + PostGIS + H3         │
    │  ┌───────────┐  ┌──────────────────┐   │
    │  │ Datos H3  │  │ Modelo MCDM      │   │
    │  │ importados│  │ (AHP del equipo  │   │
    │  │           │  │  investigación)  │   │
    │  └───────────┘  └──────────────────┘   │
    └────────────────────────────────────────┘
```

---

## 2. Componentes Primera Entrega

### 2.1 Módulo Mapa SIG

- **Tecnología:** DeckGL 9 + MapLibre GL + h3-js v4
- **Componentes:**
  - `Map.tsx` (esencial): cuadrícula H3 client-side con `polygonToCells(COLOMBIA_POLYGON)`. Sin API. Solo selección.
  - `HeatmapDemo.tsx` (demo): heatmap con API tiles, leyenda dinámica pos/neg, selector variables, popup, freeze/unfreeze.
- **Rendering:** TileLayer con cache de 64 tiles, solo renderiza lo visible del viewport
- **Resolución:** H3 res 3-7 según zoom (mapeo idéntico entre Map.tsx y HeatmapDemo)
- **Selección:** Click en hexágono → toggle en `selectedHexes` (Set global)

### 2.2 Módulo Auth

- **Tecnología:** NextAuth v5 (beta) + Keycloak OIDC — ADR-005
- **Flujo:** Landing (`page.tsx`) → SignInButton → redirect a Keycloak → callback → `/dashboard`
- **Protección:** `middleware.ts` protege `/dashboard/*` — redirige a login si no hay sesión
- **Backend:** `keycloak_guard.py` valida JWT RS256 contra JWKS de Keycloak
- **Roles:** `admin`, `analista` (configurados en realm-export.json)
- **Logout:** RP-initiated logout via `keycloakLogout.ts`

### 2.3 Módulo Admin

- **Decisión:** Usar consola de administración nativa de Keycloak (no UI propia)
- **CRUD usuarios:** Crear, listar, editar, desactivar — todo desde Keycloak admin console
- **Acceso:** Solo usuarios con rol `admin`

### 2.4 Pipeline de Datos

- **Input:** `master_variables.h3.parquet` (126 MB, res 8) del equipo de investigación
- **Map.tsx (esencial):** No usa el parquet. Genera cuadrícula con `polygonToCells` de h3-js.
- **HeatmapDemo (demo):** Parsea parquet con `hyparquet` en warmup → índice espacial server-side → tiles por bbox.
- **Ubicación:** `Vento/src/app/Utils/master_variables.h3.parquet` (excluido de git)

---

## 3. Flujo de Datos

### 3.1 Map.tsx (Modo Esencial — Sin API)

```
polygonToCells(COLOMBIA_POLYGON, resolution)
    │ Genera hexágonos H3 client-side
    │ Cache por resolución (Map<res, CachedCell[]>)
    │
    ▼
TileLayer (client-side)
    │ getTileData: filtra por bbox del tile
    │ cellToLatLng pre-calculado en cache
    │
    ▼
PolygonLayer grid (transparente, clickeable)
PolygonLayer selected (gris-azulado)
    │
    ▼
Click → toggleHex en selectedHexes (contexto global)
```

### 3.2 HeatmapDemo.tsx (Modo Demo — Con API)

```
GET /api/tiles/warmup → parsea parquet → construye índice
    │
    ▼
GET /api/tiles/{z}/{x}/{y}?var=nombre
    │ Filtra por bbox + resolución
    │ Retorna TileHex[] compacto
    │
    ▼
TileLayer (API) → PolygonLayer con colores pos/neg
    │ Positivas: azul → amarillo → verde
    │ Negativas: azul → amarillo → rojo
    │
    ▼
VariableSelector + Leyenda dinámica + LayerInfo + HexPopup
```

---

## 4. Stack Tecnológico

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | Next.js 16 + React 19 + TypeScript | ✅ Implementado |
| Mapa | DeckGL 9 + MapLibre GL + h3-js v4 | ✅ Implementado |
| Auth frontend | NextAuth v5 (Keycloak provider) | ✅ Implementado |
| Auth backend | PyJWT + JWKS (RS256) | ✅ Implementado |
| Identidad | Keycloak (Docker, realm "vento") | ✅ Implementado |
| Backend API | FastAPI (Python, Clean Architecture) | ✅ Implementado |
| Testing | Vitest + React Testing Library | ✅ Configurado (5 tests) |
| CI | GitHub Actions (lint + typecheck + vitest + build + gitleaks) | ✅ Implementado |
| Datos | .h3.parquet parseado con hyparquet (Node.js) | ✅ Funcional (demo) |
| DB | PostgreSQL + PostGIS | 🔴 Futuro (Épica E6) |
| Reportes | PDF profesional | 🔴 Futuro (US-F10) |

---

## 5. Decisiones Arquitectónicas

Ver documentos ADR detallados en `docs/adr/`:

- **ADR-001:** Stack Frontend — Next.js + React + DeckGL (confirmado, Leaflet descartado)
- **ADR-002:** Resolución H3 — Res 3-7 según zoom (~59km a ~1.2km). Datos fuente en res 8
- **ADR-003:** ~~Sin Backend API inicial~~ — **Supersedido por ADR-007**
- **ADR-004:** Viabilidad equipo 1 mes — 230h estimadas de 320h disponibles
- **ADR-005:** Keycloak como proveedor de identidad — implementado con NextAuth
- **ADR-006:** Cache: TileLayer (64 tiles) + HTTP Cache-Control. Storage definitivo pendiente
- **ADR-007:** Backend FastAPI con Clean Architecture (repos separados, monorepo descartado)
- **ADR-008:** Arquitectura tile-based para renderizado H3

---

## 6. Infraestructura

### 6.1 Desarrollo Local

```bash
# Keycloak + PostgreSQL (para auth)
cd infra/keycloak && docker-compose up -d

# Frontend
cd Vento && npm install && npm run dev    # localhost:3000

# Backend FastAPI (repo separado)
cd AppVento---Backend && uvicorn api.main:app --port 8000
```

### 6.2 Variables de Entorno

**Frontend (`Vento/.env.local`):**
- `NEXT_PUBLIC_API_URL` — URL del backend FastAPI (vacío = API routes locales)
- `AUTH_SECRET` — Firma de sesiones NextAuth
- `AUTH_KEYCLOAK_ID` / `AUTH_KEYCLOAK_SECRET` / `AUTH_KEYCLOAK_ISSUER`
- `NEXT_PUBLIC_KEYCLOAK_URL` / `NEXT_PUBLIC_KEYCLOAK_REALM`

**Backend (`AppVento---Backend/.env`):**
- `KEYCLOAK_URL` / `KEYCLOAK_REALM` / `AUTH_ENABLED`
- `PARQUET_PATH` / `CORS_ORIGINS`

**CI (GitHub Secrets):** Los 7 secrets del frontend se inyectan en el step de build.

### 6.3 Producción (AccuWeb)

- Frontend: Apache sirviendo build de Next.js
- Backend: uvicorn con proxy Apache
- Keycloak: desplegado como servicio
