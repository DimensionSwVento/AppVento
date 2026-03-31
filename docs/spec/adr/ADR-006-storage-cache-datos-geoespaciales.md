---
id: ADR-006
title: Storage, Cache y Entrega de Datos Geoespaciales
status: decidido
date: 2026-03-31
supersedes: ADR-006 (2026-03-24, pendiente-decision-equipo)
---

# ADR-006: Storage, Cache y Entrega de Datos Geoespaciales

## Contexto

Vento consume datos geoespaciales generados por el motor multicriterio. Los datos llegan como archivos `.h3.parquet` a resolución 8 (~150K+ hexágonos, 126 MB). Se requiere una estrategia de almacenamiento, cache y entrega que soporte el rendimiento del mapa interactivo.

**Actualización (2026-03-31):** La infraestructura se confirmó como **AccuWeb Cloud** con Apache, PostgreSQL propio y Keycloak ya desplegados. Esto invalida las recomendaciones previas de Supabase + Vercel.

## Decisión

**Arquitectura tile-based con FastAPI + PostgreSQL en AccuWeb Cloud.**

### Infraestructura Confirmada

```
┌──────────────────────────────────────────────────┐
│                  AccuWeb Cloud                    │
│                                                   │
│  ┌─────────────┐  ┌───────────────────────────┐  │
│  │   Apache     │  │   Apache Reverse Proxy    │  │
│  │  /static     │  │   /api/* → FastAPI :8000  │  │
│  │  (next export│  │                           │  │
│  └──────────────┘  └───────────────────────────┘  │
│                            │                      │
│               ┌────────────▼──────────────┐       │
│               │   FastAPI (Python)         │       │
│               │   - h3 + pandas + pyarrow  │       │
│               │   - /api/tiles/{z}/{x}/{y} │       │
│               │   - /api/tiles/warmup      │       │
│               │   - PostGIS queries        │       │
│               └────────────┬──────────────┘       │
│                            │                      │
│               ┌────────────▼──────────────┐       │
│               │   PostgreSQL + PostGIS     │       │
│               │   - Hexágonos H3          │       │
│               │   - Usuarios + sesiones   │       │
│               │   - Histórico informes    │       │
│               └───────────────────────────┘       │
│                                                   │
│               ┌───────────────────────────┐       │
│               │   Keycloak (OIDC/OAuth2)  │       │
│               │   ya desplegado           │       │
│               └───────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

### Estrategia de Entrega de Datos (Tile-Based)

```
.h3.parquet → FastAPI parsea → PostgreSQL+PostGIS (fuente de verdad)
                                       │
    TileLayer (deck.gl) ← /api/tiles/{z}/{x}/{y} ← PostGIS query por bbox
```

- El servidor agrupa hexágonos por resolución H3 según el zoom del tile (ADR-002)
- Cada tile retorna solo los hexágonos dentro de su bounding box
- deck.gl TileLayer gestiona automáticamente carga/descarga de tiles (ADR-008)

### Estrategia de Cache (5 niveles)

| Nivel | Ubicación | Qué cachea | Duración |
|-------|-----------|-----------|----------|
| 1. Parquet parseado | Server (memoria FastAPI) | Dataset completo | Vida del proceso |
| 2. Agrupaciones por resolución | Server (memoria) | Hexágonos agrupados por res H3 | Vida del proceso |
| 3. TileLayer | Client (deck.gl) | Tiles renderizados, `maxCacheSize: 64` | Sesión del mapa |
| 4. HTTP Cache-Control | Browser | Responses de tiles, `max-age=3600` | 1 hora |
| 5. useMemo | Client (React) | Instancia de TileLayer | Hasta cambio de selección |

### Migración Progresiva

| Fase | Storage | Entrega |
|------|---------|---------|
| **Actual (dev)** | .parquet en disco + cache memoria (Next.js API routes) | JSON por tile |
| **Primera entrega** | .parquet → FastAPI cache memoria | JSON por tile via FastAPI |
| **Futuro (E6)** | PostgreSQL + PostGIS + H3-pg | PostGIS query por tile |

## Justificación

- **AccuWeb Cloud** ya está contratado con Apache + PostgreSQL + Keycloak — no hay razón para agregar Supabase/Vercel
- **FastAPI** es la opción principal de backend (ADR-007) — la lógica de tiles se migra directo
- **PostgreSQL + PostGIS** ya tiene nodo asignado en AccuWeb — listo para migrar de cache en memoria a BD
- **Tile-based** resuelve el problema de rendimiento con 150K+ hexágonos (ADR-008)
- **HTTP Cache-Control** en las responses de tiles permite que Apache/browser cacheen sin lógica adicional

## Cambios respecto a v1

| Aspecto | ADR-006 v1 (2026-03-24) | ADR-006 v2 (2026-03-31) |
|---------|-------------------------|-------------------------|
| Infra | Supabase + Vercel | AccuWeb Cloud (propio) |
| Entrega | JSON estático completo o CDN | Tiles dinámicos por bbox |
| Backend | Serverless Vercel | FastAPI en AccuWeb |
| BD | Supabase PostgreSQL | PostgreSQL propio en AccuWeb |
| Cache frontend | Service Worker | TileLayer maxCacheSize + HTTP Cache-Control |
| Status | Pendiente decisión | Decidido |

## Consecuencias

- El frontend se despliega como `next export` estático — Apache sirve directamente
- FastAPI sirve tiles H3 y maneja auth — Apache hace reverse proxy
- PostgreSQL + PostGIS reemplazará el cache en memoria cuando se implemente E6
- No se necesita CDN externo — los tiles se cachean en browser vía HTTP headers
- El `.parquet` se sube manualmente al servidor FastAPI hasta que se implemente pipeline de ingesta
