---
version: 1.0
date: 2026-04-20
author: winx (tech lead)
scope: validación técnica del stack elegido vs scope primera entrega
---

# Validación de Stack Técnico — Proyecto Vento

Documento que responde al feedback cliente item #8: **¿el scaffold, la gestión de datos, PostGIS, Dockerización, spike H3 y micro-API estuvieron bien?** Explica qué se eligió, por qué, y cómo se validó contra el scope real.

> **Complemento de** [docs/spec/architecture/tecnologias.md](../spec/architecture/tecnologias.md) (opciones comparadas) y los ADRs 001-008 (decisiones formales). Este doc consolida el **resultado práctico**.

---

## 1. Resumen de capas

| Capa | Tecnología final | ADR que lo soporta | Veredicto |
|------|------------------|--------------------|-----------|
| Frontend framework | **Next.js 16** + React 19 + TypeScript | ADR-001 (stack frontend) | ✅ Acertado |
| Mapa / SIG | **DeckGL 9.2** + MapLibre GL + react-map-gl | ADR-008 (tile-based) | ✅ Acertado (superó a Leaflet propuesto originalmente) |
| Indexación geoespacial | **H3** (`h3-js`) res 3-8 | ADR-002 (resolución H3) | ✅ Acertado |
| Backend API | **FastAPI** (Python) + Clean Architecture + DDD | ADR-007 (backend DDD monorepo) | ✅ Acertado; repos separados en vez de monorepo (decisión práctica) |
| Identidad | **Keycloak** OIDC/OAuth2 | ADR-005 | ✅ Acertado |
| Base de datos | **PostgreSQL + PostGIS + h3-pg** | propuesta confirmada | ✅ Preparado, uso mínimo actual |
| Pre-procesamiento datos | **Python + PyArrow** | — | ✅ Funcional |
| Cache / Storage geoespacial | **TileLayer cache + HTTP Cache-Control** | ADR-006 | ⚠️ Parcial — Service Worker pendiente |
| Deploy | **Docker local + AccuWeb standalone** (prod) | — | ⚠️ AccuWeb tiene limitaciones (nginx buffers, HTTPS↔HTTP mixto) |
| CI/CD | **GitHub Actions** | — | ⚠️ Pipeline no se dispara — en resolución |

---

## 2. Scaffold y estructura de carpetas

### Decisión: repos separados (no monorepo)
ADR-007 recomendaba monorepo con Turborepo/Nx. En la práctica se optó por **repos separados**:
- **Frontend**: `AppVento/Vento/` — Next.js 16 standalone
- **Backend**: repo FastAPI separado (fuera de este working directory)

**Justificación práctica**:
- Equipo pequeño (1 FT + 2 PT), monorepo tooling agregaba ceremonia sin ganancia inmediata.
- Deploy independiente — frontend a AccuWeb, backend podría ir a otra infra (Railway/Render).
- Linting/typing de Python y TypeScript viven en universos separados; CI más simple de mantener.

**Trade-off**: duplicación de tooling en ambos repos (.gitignore, tests config). Aceptable a esta escala.

### Estructura frontend validada

```
Vento/
├── src/
│   ├── auth.ts              # NextAuth config
│   ├── middleware.ts        # Edge auth guard
│   └── app/
│       ├── layout.tsx       # Root layout
│       ├── page.tsx         # Landing (login)
│       ├── dashboard/       # Flujo principal
│       ├── admin/           # /admin/users — CRUD
│       ├── api/             # Route handlers (auth, admin, tiles proxy)
│       ├── Components/      # Reusable UI
│       ├── Utils/           # Business logic (keycloakAdmin, h3Resolution)
│       └── types/           # Shared types
├── __tests__/unit/          # Tests fuera de src (infra + integration)
├── vitest.config.ts
└── next.config.ts
```

**Veredicto**: ✅ convención clara. Separar `Components` de `Utils` ayudó a los part-time a ubicarse rápido.

---

## 3. Frontend — Next.js 16 + React 19

### Por qué Next.js (no Angular/Vue)
- **Ecosistema de mapas**: DeckGL/MapLibre tienen bindings React maduros (`@deck.gl/react`, `react-map-gl`).
- **Server components + edge middleware**: ideal para el patrón de auth que usamos (§auth-strategy.md).
- **Standalone output**: permite deploy en AccuWeb sin `npm install` en servidor.
- **React Compiler activo** (`reactCompiler: true` en `next.config.ts`) reduce `useMemo`/`useCallback` manuales.

### Validación práctica
- Bundle size aceptable para una app empresarial.
- HMR rápido en dev.
- Turbopack configurado explícitamente con `root: turbopackRoot` para evitar conflicto con `package-lock.json` del repo padre.

**Veredicto**: ✅ acertado. Ninguna fricción mayor.

---

## 4. Mapa — DeckGL + MapLibre (no Leaflet como se propuso)

### Cambio de rumbo vs propuesta original
[tecnologias.md](../spec/architecture/tecnologias.md) §2 recomendaba **Leaflet** para primera entrega. Se migró a **DeckGL + MapLibre** (ADR-008).

### Por qué el cambio
- **H3HexagonLayer nativo**: DeckGL fue construido por Uber para visualizar H3. Rendering WebGL2 → soporta decenas de miles de hexágonos sin lag.
- **Tile-based architecture**: `TileLayer` de DeckGL carga hexágonos por viewport, no todos a la vez. Esto cambió la arquitectura de datos: de "fetch monolítico" a "tiles z/x/y".
- **MapLibre** (base map) es open source y no exige API key de Mapbox.

### Dato clave
- Resolución H3 adaptativa según zoom (ver [h3TileIndex.ts](../../Vento/src/app/Utils/h3TileIndex.ts)):
  - zoom < 6 → res 3
  - zoom 6 → res 4
  - zoom 7 → res 5
  - zoom 8-9 → res 6
  - zoom 10-11 → res 7
  - zoom ≥ 12 → res 8 (~460m edge)
- `MAX_ZOOM = 14` (antes 10)

### Costos
- Mayor curva de aprendizaje vs Leaflet.
- Setup inicial más complejo (adapters WebGL, registro de layers).
- No hay popups nativos — se construyeron manualmente.

**Veredicto**: ✅ acertado a posteriori. El scope real necesita tiles + H3, Leaflet no hubiera escalado.

---

## 5. Backend — FastAPI con Clean Architecture + DDD

### Estructura aplicada
```
backend/
├── src/
│   ├── domain/          # Entidades, value objects (sin deps externas)
│   ├── application/     # Use cases, DTOs, ports
│   ├── infrastructure/  # Adapters a DB, APIs externas, HTTP
│   └── shared/          # Utils, constantes
├── tests/
└── docker-compose.yml
```

### Endpoints implementados
- `/api/tiles/{z}/{x}/{y}` — tiles H3 para renderizar mapa (acepta query `var` para filtrar)
- Healthcheck `/health`
- (Futuro) Informes de viabilidad, históricos

### Validación
- Python + GeoPandas + H3-py = zero friction con el pipeline existente del equipo investigación.
- Async nativo — importante para servir tiles en paralelo.
- Pydantic → OpenAPI docs automáticos en `/docs`.

**Veredicto**: ✅ acertado. La integración natural con el pipeline Python ahorró semanas.

---

## 6. Keycloak

Ver detalle en [auth-strategy.md](../security/auth-strategy.md).

### Alcance validado primera entrega
- Realm `vento` desplegado
- Registro + login funcional
- Roles `admin` + `analista` propagados a JWT
- Admin Console para gestión avanzada
- UI `/admin/users` usando Admin API interno

### Pendientes por stoppers externos
- SMTP para verify email + reset password (**bloqueado** — ver [ADR-009](../spec/adr/ADR-009-notificaciones-email-pendientes-smtp.md))
- Theme en español (US-FB-01)

**Veredicto**: ✅ acertado. Ahorro estimado: 2-3 semanas de desarrollo custom de auth.

---

## 7. Base de datos — PostgreSQL + PostGIS + h3-pg

### Estado actual
- PostgreSQL configurado en `docker-compose`.
- PostGIS 3.4+ instalado.
- h3-pg extensión disponible.
- **Uso productivo actual**: ninguno — Keycloak maneja usuarios en su propia DB, los datos geoespaciales se sirven desde `.h3.parquet` vía FastAPI.

### Uso futuro (v1.1+)
- Persistir análisis de viabilidad (US-F10)
- Histórico de informes (US-F11)
- Metadata de variables (US03-AC7)
- Audit log de autenticación

**Veredicto**: ✅ preparado, subutilizado a propósito. Meter DB prematuramente habría sido over-engineering para v1.0.

---

## 8. Pre-procesamiento de datos (.h3.parquet)

### Flujo actual
```
Equipo investigación → .h3.parquet → FastAPI (lee con pyarrow) → tiles JSON → Next.js DeckGL
```

### Pipeline inicial (frontend)
Originalmente se intentó parsear `.parquet` en browser con `hyparquet`. **Migrado** al backend cuando la arquitectura pasó a tile-based (ADR-008). El código frontend quedó como referencia en [parseH3Parquet.ts](../../Vento/src/app/Utils/parseH3Parquet.ts) (deshabilitado).

### Frecuencia de actualización
Cada vez que el equipo investigación entrega nueva versión del `.parquet`:
1. Copiar a volumen del backend.
2. Reiniciar contenedor FastAPI (recarga índices).
3. (Falta doc formal — US03-AC6 pendiente parcial).

**Veredicto**: ✅ acertado. Separa concern de datos vs presentación.

---

## 9. Dockerización

### `docker-compose.yml` local incluye:
- `keycloak` — IdP (realm-export.json pre-cargado)
- `postgres` — BD compartida
- `backend` — FastAPI
- `frontend` — Next.js dev mode (opcional, se suele correr local con `npm run dev`)

### Producción (AccuWeb)
Se manejan **dos modos de deploy en paralelo**:

**A) Deploy vía CI (preferido cuando Actions corre)**
- Workflow `ci.yml` stage `deploy` crea branches permanentes `deploy-test` (desde `develop`) y `deploy-prod` (desde `main`) con **solo el contenido de `Vento/` movido a la raíz** (sin `docs/`, `_bmad/`, `_bmad-output/`, `infra/`).
- cPanel de AccuWeb apunta a esas branches con auto-deploy → ejecuta `npm install` + start del runtime Node.
- Ver [ci.yml stage deploy](../.github/workflows/ci.yml).

**B) Deploy manual (fallback cuando CI falla)**
- Build local con `npm run build`; copia artefactos al servidor vía SFTP/panel AccuWeb.
- Si se activa `output: "standalone"` en `next.config.ts`, solo se sube `.next/standalone/` + `.next/static/` + `public/` y se evita `npm install` en el servidor.
- Actualmente `next.config.ts` **no** tiene standalone activado; el deploy manual asume `npm install` en servidor o se activa standalone ad-hoc según necesidad.

Ambos modos son válidos. El CI está inestable (actions no se disparan — ver [accuweb-runbook.md §8](../ops/accuweb-runbook.md)), por lo que el deploy manual ha sido el path usado recientemente.

- Keycloak se despliega aparte — contenedor propio en el hosting, con JAR del theme `keycloakify-starter` (ver [infra/keycloak/themes/README.md](../../infra/keycloak/themes/README.md)).
- Backend FastAPI está en **repo separado** y deploy independiente (no por este CI).

**Veredicto**: ✅ dev acertado. Prod con fricciones por AccuWeb (ver §11 y §13), compensadas con doble modo de deploy.

---

## 10. Spike H3

### Qué se validó
1. ¿Cuántos hexágonos render en pantalla sin lag? → ~50K con DeckGL, sin lag visible.
2. ¿La resolución zonal (res 5-6) es suficiente? → Sí para macro, res 7-8 necesaria para micro-análisis.
3. ¿El mapping zoom → res funciona intuitivamente? → Sí, pero requirió 3 iteraciones de tabla.
4. ¿Conversión de click → h3_index? → `latLngToCell` de h3-js, instantáneo.

### Resultados
Todo superó los requisitos del scope. Se documentó el mapping en [h3TileIndex.ts](../../Vento/src/app/Utils/h3TileIndex.ts) + [map-rendering.md](../dev-notes/map-rendering.md).

**Veredicto**: ✅ spike exitoso. H3 es la indexación correcta para este problema.

---

## 11. Micro-API (FastAPI endpoints)

### Endpoints actuales validados

| Endpoint | Método | Propósito | Estado |
|----------|--------|-----------|--------|
| `/api/tiles/{z}/{x}/{y}` | GET | Tiles H3 con scores | ✅ funcional |
| `/api/tiles/{z}/{x}/{y}?var=X` | GET | Filtrar por variable | ✅ funcional |
| `/health` | GET | Healthcheck | ✅ funcional |
| `/api/variables` | GET | Lista de variables disponibles | ✅ funcional |

### Lo que falta (roadmap)
- Endpoint de informe de viabilidad (US-F10)
- Endpoint de histórico (US-F11)
- Endpoint de metadata de variables (US03-AC7)

**Veredicto**: ✅ suficiente para scope contractual. Extensión natural cuando lleguen HUs futuras.

---

## 12. CI/CD — GitHub Actions

### Pipeline diseñado
```
Push / PR
  ├─ gitleaks (secret scan)
  ├─ lint (eslint)
  ├─ typecheck (tsc)
  ├─ test (vitest)
  └─ build (next build)
```

### Estado actual
⚠️ **Pipeline no se dispara** — bug operativo en resolución. Posibles causas:
- Trigger `on:` mal configurado
- Branch filter excluyendo la rama actual
- Permisos del workflow en repo settings
- Secrets no configurados (causando falla silenciosa pre-execution)

### Acción inmediata
1. Revisar `.github/workflows/ci.yml` — verificar `on:` triggers
2. Verificar permisos en Settings → Actions
3. Probar con commit dummy en branch develop

**Veredicto**: ⚠️ diseño correcto, operación pendiente.

---

## 13. Deploy AccuWeb — lecciones aprendidas

### Limitaciones del hosting
- **Nginx interno con buffers chicos**: obligó a reducir cookies NextAuth (ver §auth-strategy.md §2).
- **HTTPS externo, HTTP interno**: Keycloak reporta issuer HTTPS pero acepta solo HTTP entre contenedores. Se resolvió con `httpsToHttp()` en [auth.ts](../../Vento/src/auth.ts).
- **No `npm install` en server**: forzó `output: "standalone"`.
- **No acceso directo a nginx**: imposible ajustar `large_client_header_buffers` — workaround fue reducir payload del JWT.

### Lecciones
- Hosting de bajo costo = más trabajo en el código para adaptarse.
- Documentar TODO en un runbook (`docs/ops/accuweb-runbook.md` — pendiente).
- Evaluar para v1.1: migrar a Vercel + Supabase (ver ADR-006 combinación recomendada).

---

## 14. Qué hubiéramos hecho distinto (retrospectiva)

| Decisión | Si volviera | Razón |
|----------|-------------|-------|
| Leaflet → DeckGL | Empezar con DeckGL directo | Migrar a mitad de sprint costó tiempo |
| Monorepo → repos separados | Mantener repos separados | Simplifica tooling; monorepo lo evaluamos en v1.1 si crece equipo |
| Parse parquet en browser → backend | Empezar con backend | Hyparquet browser tuvo memory issues con archivos grandes |
| AccuWeb sin evaluar nginx | Pedir docs de nginx al proveedor antes de deploy | Buffer issues sorprendieron en prod |

---

## 15. Referencias cruzadas

- [tecnologias.md](../spec/architecture/tecnologias.md) — opciones comparadas (pre-decisión)
- [ADR-001](../spec/adr/ADR-001-stack-frontend.md) — stack frontend
- [ADR-002](../spec/adr/ADR-002-resolucion-h3.md) — resolución H3
- [ADR-005](../spec/adr/ADR-005-keycloak-identidad.md) — Keycloak
- [ADR-006](../spec/adr/ADR-006-storage-cache-datos-geoespaciales.md) — storage + cache
- [ADR-007](../spec/adr/ADR-007-backend-clean-architecture-ddd-monorepo.md) — backend DDD
- [ADR-008](../spec/adr/ADR-008-arquitectura-tile-based.md) — tile-based arch
- [ADR-009](../spec/adr/ADR-009-notificaciones-email-pendientes-smtp.md) — SMTP stopper
- [ADR-010](../spec/adr/ADR-010-hosting-accuweb-vs-supabase-vercel.md) — AccuWeb vs Supabase/Vercel
- [ADR-011](../spec/adr/ADR-011-parquet-procesamiento-backend-no-browser.md) — parquet en backend, no browser
- [auth-strategy.md](../security/auth-strategy.md) — protección de rutas
- [frontend-backend-integration.md](./frontend-backend-integration.md) — Next.js ↔ FastAPI via rewrites
- [infra/keycloak.md](../infra/keycloak.md) — infraestructura Keycloak
- [test-strategy.md](../testing/test-strategy.md) — estrategia de testing
- [map-rendering.md](../dev-notes/map-rendering.md) — detalles del render
- [h3-data-pipeline.md](../dev-notes/h3-data-pipeline.md) — pipeline de datos

---

## 16. Conclusión

El stack elegido (Next.js + DeckGL + FastAPI + Keycloak + PostgreSQL/PostGIS) **superó los requisitos** del scope contractual. Los ajustes vs propuesta inicial (Leaflet → DeckGL, monorepo → repos separados) fueron **mejoras prácticas**, no retrocesos. Los pendientes son operativos (CI, nginx AccuWeb, SMTP) no arquitectónicos.

**Recomendación**: mantener el stack para v1.0. Evaluar cambios solo en v1.1 si el cliente necesita escalar a otro hosting (Vercel + Supabase) o si el equipo crece (monorepo + Turborepo).
