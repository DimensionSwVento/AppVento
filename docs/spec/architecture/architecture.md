---
version: 1.0
date: 2026-03-24
status: propuesto
---

# Arquitectura del Sistema — Vento

## 1. Vista General

### Primera Entrega (Sin Backend API)

```
┌──────────────────────────────────────────────────┐
│              FRONTEND (Angular/React)              │
│                                                    │
│  ┌────────────┐ ┌───────────────┐ ┌────────────┐  │
│  │ Módulo     │ │ Módulo        │ │ Módulo     │  │
│  │ Mapa SIG   │ │ Admin         │ │ Auth       │  │
│  │ (Leaflet)  │ │ (CRUD Users)  │ │ (Login)    │  │
│  └─────┬──────┘ └──────┬────────┘ └─────┬──────┘  │
│        │               │                │          │
│  ┌─────▼───────────────▼────────────────▼──────┐   │
│  │         Capa de Datos / Servicios           │   │
│  │  JSON estático (pre-procesado de .parquet)  │   │
│  │  + Auth Service (JWT)                       │   │
│  │  + User Service (CRUD)                      │   │
│  └─────────────────────┬───────────────────────┘   │
└────────────────────────┼───────────────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │   PostgreSQL + PostGIS + H3     │
        │   (Usuarios + Sesiones)         │
        │                                 │
        │   .h3.parquet → JSON estático   │
        │   (pre-procesado offline)       │
        └─────────────────────────────────┘
```

### Arquitectura Futura (Con Backend API)

```
┌──────────────────────────────────────────────────┐
│              FRONTEND (Angular/React)              │
│  ┌────────────┐ ┌──────────┐ ┌───────────────┐    │
│  │ Mapa SIG   │ │ Reportes │ │ Admin/Auth    │    │
│  │ (Leaflet)  │ │ (Vista)  │ │ (CRUD Users)  │    │
│  └─────┬──────┘ └────┬─────┘ └──────┬────────┘    │
└────────┼─────────────┼──────────────┼──────────────┘
         │             │              │
    ┌────▼─────────────▼──────────────▼──────┐
    │           API REST (FastAPI)           │
    │  /hexagons  /reports  /users  /auth    │
    │  /variables /filters  /metadata        │
    └──────────────────┬─────────────────────┘
                       │
    ┌──────────────────▼─────────────────────┐
    │      PostgreSQL + PostGIS + H3         │
    │  ┌───────────┐  ┌──────────────────┐   │
    │  │ Datos H3  │  │ Modelo MCDM      │   │
    │  │ .parquet  │  │ (integración     │   │
    │  │ importados│  │  futura)         │   │
    │  └───────────┘  └──────────────────┘   │
    └────────────────────────────────────────┘
```

## 2. Componentes Primera Entrega

### 2.1 Módulo Mapa SIG

- **Tecnología:** Leaflet + plugin H3 (Canvas renderer para rendimiento)
- **Responsabilidad:** Visualización mapa Colombia, renderizado hexágonos, mapa de calor, filtrado, popups
- **Datos:** Lee JSON/GeoJSON estático pre-procesado del .parquet
- **Hexágonos:** ~4,500-31,000 según resolución H3 (res 5-6)

### 2.2 Módulo Auth

- **Tecnología:** Keycloak (OIDC/OAuth2) — ADR-005
- **Responsabilidad:** Login de usuarios, gestión de identidad, recuperación de contraseña
- **Usuarios:** Correo electrónico general (NO restringido a dominio institucional)
- **Roles:** `admin`, `analista`

### 2.3 Módulo Admin

- **Responsabilidad:** CRUD de usuarios (crear, leer, actualizar, borrar)
- **Alcance Parte 1:** Operaciones básicas sin sistema de roles avanzado

### 2.4 Pre-procesamiento de Datos

- **Input:** `.h3.parquet` recibido del equipo de investigación
- **Proceso:** Script offline (Python) convierte a JSON/GeoJSON
- **Output:** Archivo JSON estático servido como asset del frontend
- **Frecuencia:** Cada vez que el equipo de investigación entrega nueva versión del .parquet

## 3. Flujo de Datos (Primera Entrega)

```
Equipo investigación genera .h3.parquet
    │
    ▼
Script pre-proceso (Python offline)
    │ Lee .parquet con pandas/pyarrow
    │ Extrae: h3_index, scores, variables, tipo_celda, metadata
    │ Genera JSON/GeoJSON optimizado
    │
    ▼
JSON estático desplegado como asset
    │
    ▼
Frontend carga JSON completo en memoria
    │ Renderiza hexágonos en Leaflet
    │ Colorea por score_general (default)
    │ Permite filtrar por variable específica
    │ Muestra popup con datos al click
    │ Hexágonos excluidos = decorativos
    ▼
Usuario interactúa con el mapa
```

## 4. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | Angular 17+ o React (por confirmar) | Según experiencia equipo |
| Mapas | Leaflet + plugin H3 | Suficiente para ~30K hexágonos. Maduro, documentado |
| Auth/Identidad | Keycloak (OIDC) | ADR-005 — escala nacional, SSO, MFA futuro |
| DB | PostgreSQL + PostGIS | Ya existe en pipeline. Para usuarios y sesiones |
| Pre-proceso | Python + pandas + pyarrow | Compatible con pipeline existente |
| Deploy | Docker | Contenedores existentes |
| Backend API | Clean Architecture + DDD (ADR-007) | Desde primera entrega — validación Keycloak, proxy datos, endpoints admin |

## 5. Decisiones Arquitectónicas

Ver documentos ADR detallados en `docs/spec/adr/`:

- **ADR-001:** Stack Frontend — Angular/React + Leaflet (sin necesidad de WebGL pesado)
- **ADR-002:** Resolución H3 — Nivel zonal (res 5-6), ~4,500-31,000 hexágonos
- **ADR-003:** ~~Sin Backend API inicial~~ — **Supersedido parcialmente por ADR-007**
- **ADR-004:** Viabilidad equipo 1 mes — 230h estimadas de 320h disponibles
- **ADR-005:** Keycloak como proveedor de identidad desde primera entrega
- **ADR-006:** Storage, cache y entrega de datos geoespaciales (decisión pendiente archivos vs API)
- **ADR-007:** Backend en primera entrega con Arquitectura Limpia, DDD y estructura monorepo
