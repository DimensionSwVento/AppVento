---
id: ADR-007
title: Backend FastAPI con Arquitectura Limpia, DDD y Estructura Monorepo
status: aceptado
date: 2026-03-31
supersedes: ADR-003 (parcialmente), ADR-007 (2026-03-24, tecnología pendiente)
---

# ADR-007: Backend FastAPI con Arquitectura Limpia, DDD y Estructura Monorepo

## Contexto

El ADR-003 original decidió no construir backend API en la primera entrega. Con la incorporación de Keycloak (ADR-005), la arquitectura tile-based (ADR-008) y la escala del proyecto (50+ personas, agencia nacional), se requiere backend desde el inicio.

**Actualización (2026-03-31):** Se confirma **FastAPI (Python)** como tecnología de backend. La infraestructura es **AccuWeb Cloud** con Apache como reverse proxy (ADR-006 v2). Se descarta NestJS/Express.

## Decisión

### 1. Tecnología: FastAPI (Python)

**Confirmado.** Razones:

| Factor | FastAPI | NestJS/Express |
|--------|---------|----------------|
| Ecosistema geoespacial | h3, pandas, pyarrow, geopandas — nativos | h3-js existe pero sin pandas/pyarrow |
| Pipeline de datos | El equipo de investigación usa Python — mismo lenguaje | Requiere bridge Python↔Node |
| Compatibilidad parquet | pyarrow lee .parquet nativo | hyparquet limitado (bugs con datasets grandes) |
| PostGIS | psycopg2 + SQLAlchemy maduro | TypeORM/Prisma soportan PostGIS pero menos maduro |
| Async | Nativo (ASGI, uvicorn) | Nativo |
| Clean Architecture | Viable con inyección de dependencias | Más natural con NestJS pero no justifica el trade-off |

### 2. Alcance Primera Entrega

- Tile-server: `GET /api/tiles/{z}/{x}/{y}` (migra de Next.js API routes)
- Warmup: `GET /api/tiles/warmup` (pre-carga índice H3)
- Validación de tokens Keycloak (middleware)
- Health checks
- CRUD usuarios (proxy a Keycloak Admin API)

### 3. Arquitectura Limpia + DDD

```
backend/
├── src/
│   ├── domain/              # Entidades, value objects, interfaces
│   │   ├── entities/        # User, Hexagon, AnalysisArea
│   │   ├── value_objects/   # H3Index, Score, Coordinate, TileBBox
│   │   └── ports/           # Interfaces de repositorios y servicios
│   │
│   ├── application/         # Casos de uso
│   │   ├── use_cases/       # GetTileHexagons, WarmupIndex, FilterByVariable
│   │   └── dto/             # TileHex, HexagonDetail, TileRequest
│   │
│   ├── infrastructure/      # Implementaciones concretas
│   │   ├── persistence/     # PostgreSQL/PostGIS repos (SQLAlchemy)
│   │   ├── auth/            # Keycloak adapter (python-keycloak)
│   │   ├── data/            # Lector parquet (pandas + pyarrow)
│   │   ├── spatial/         # H3 tile index, agrupación por resolución
│   │   └── http/            # FastAPI routers
│   │
│   └── shared/              # Logging, errors, config
│
├── pyproject.toml
├── requirements.txt
└── Dockerfile
```

### 4. Estructura Monorepo

```
Vento/
├── apps/
│   ├── web/                 # Frontend (Next.js → next export)
│   └── api/                 # Backend (FastAPI + Clean Architecture)
├── packages/
│   └── h3-processor/        # Scripts Python de pre-procesamiento parquet
├── infra/
│   ├── docker/              # Dockerfiles
│   ├── keycloak/            # Configuración realm
│   ├── apache/              # Config reverse proxy
│   └── ci/                  # CI/CD (GitHub Actions)
├── docs/                    # Documentación
├── docker-compose.yml       # Orquestación local
└── .env.example
```

**Nota:** El monorepo actual (`Vento/`) no está estructurado así aún. La migración a esta estructura se hará progresivamente.

### 5. Deploy en AccuWeb Cloud

```
Apache (:80/:443)
  ├─ /           → archivos estáticos (next export)
  └─ /api/*      → reverse proxy → FastAPI (:8000, uvicorn)

FastAPI (:8000)
  └─ conecta a PostgreSQL + PostGIS (AccuWeb)
  └─ valida tokens con Keycloak (AccuWeb)
```

## Justificación

### ¿Por qué FastAPI y no NestJS?
- El equipo de investigación trabaja en Python — unificar lenguaje reduce fricción
- pandas + pyarrow resuelven el parseo del parquet de 126 MB sin los bugs de hyparquet (stack overflow, etc.)
- h3 (Python) es la librería oficial de Uber — más estable que h3-js para server-side
- FastAPI + uvicorn tiene rendimiento comparable a Node.js para I/O async

### ¿Por qué backend desde el inicio?
- Keycloak necesita un resource server que valide tokens
- La arquitectura tile-based requiere computación server-side (agrupación por resolución, filtrado por bbox)
- `next export` (estático) no puede tener API routes — se necesita un servidor

### ¿Por qué Clean Architecture + DDD?
- Proyecto de escala nacional — no se puede improvisar estructura
- DDD alinea el código con el dominio (hexágonos, scores, dimensiones, tiles)
- Clean Architecture permite cambiar de parquet a PostGIS sin tocar lógica de negocio
- Facilita testing: domain y use-cases se testean sin infraestructura

## Migración de Next.js API Routes → FastAPI

| Next.js (actual, temporal) | FastAPI (target) |
|---------------------------|------------------|
| `api/tiles/[z]/[x]/[y]/route.ts` | `GET /api/tiles/{z}/{x}/{y}` |
| `api/tiles/warmup/route.ts` | `GET /api/tiles/warmup` |
| `api/hexagons/route.ts` (deprecado) | Eliminado |
| `api/health/route.ts` | `GET /api/health` |
| `api/users/route.ts` (stub) | `GET/POST /api/users` (Keycloak Admin) |
| `h3TileIndex.ts` | `infrastructure/spatial/tile_index.py` |
| `h3DataCache.ts` | Cache en memoria → PostgreSQL (E6) |
| `parseH3Parquet.ts` | `infrastructure/data/parquet_reader.py` |

## Consecuencias

- El frontend pasa a `next export` — archivos estáticos servidos por Apache
- FastAPI corre como proceso persistente (uvicorn) detrás de Apache
- La lógica de tiles se migra 1:1 de TypeScript a Python
- PostgreSQL + PostGIS reemplazará el cache en memoria cuando se implemente E6
- El monorepo se reestructura progresivamente

## Relación con Otros ADRs

| ADR | Relación |
|-----|----------|
| ADR-003 | Supersedido — ahora hay backend FastAPI |
| ADR-005 | FastAPI valida tokens Keycloak como resource server |
| ADR-006 | FastAPI sirve tiles H3, AccuWeb Cloud como infra |
| ADR-008 | FastAPI implementa el tile-server de la arquitectura tile-based |
