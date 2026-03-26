---
id: ADR-004
title: Viabilidad y Distribución de Equipo — 1 Mes
status: aceptado
date: 2026-03-24
---

# ADR-004: Viabilidad y Distribución de Equipo — 1 Mes

## Contexto

Equipo disponible: 1 dev fulltime (160h/mes) + 2 devs part-time (~80h c/u). Total: ~320 horas-dev.
Scope: Login (US01) + Admin CRUD (US08) + Mapa SIG completo (US03 + ACs).
Sin backend API (ver ADR-003).

## Estimación

| Componente | Horas est. |
|-----------|-----------|
| Setup proyecto (scaffolding, Docker, DB, CI) | 16h |
| US01 — Login institucional | 16h |
| US08 — CRUD Usuarios | 14h |
| US03 — Mapa base + H3 + ingesta datos | 40h |
| US03-AC1 — Mapa de calor score general | 20h |
| US03-AC2 — Filtrado por variable crítica | 20h |
| US03-AC3 — Popup hexágono | 14h |
| US03-AC4 — Dato central en hexágono | 12h |
| US03-AC5 — Hexágonos decorativos | 8h |
| US03-AC6 — Pre-proceso .parquet → JSON | 16h |
| US03-AC7 — Metadata variables | 10h |
| Testing + QA + bugs | 20h |
| Buffer imprevistos (~10%) | 24h |
| **TOTAL** | **230h** |

**230h de 320h disponibles = 72% utilización. Viable con margen.**

(Reducido vs estimación anterior al eliminar backend API)

## Distribución de Responsabilidades

### Dev A — Fulltime → Dueño del Mapa (160h)

| Semana | Tarea |
|--------|-------|
| S1 | Setup frontend + Leaflet + mapa base Colombia + renderizado hexágonos H3 + pre-proceso .parquet→JSON |
| S2 | Mapa de calor (AC1) + hexágonos decorativos (AC5) + dato central (AC4) |
| S3 | Popup hexágono (AC3) + Filtrado por variable (AC2) |
| S4 | Metadata UI (AC7) + integración con auth + pulido + bugs |

### Dev B — Part-time → Login + Admin (80h)

| Semana | Tarea |
|--------|-------|
| S1 | Setup auth: JWT + modelo usuarios + DB schema + login backend/servicio |
| S2 | Login UI (US01) + CRUD usuarios completo (US08) |
| S3 | Integración auth con mapa + protección rutas + roles |
| S4 | Testing E2E + QA cross-módulo + bugs |

### Dev C — Part-time → Datos + Soporte (80h)

| Semana | Tarea |
|--------|-------|
| S1 | Validar estructura .parquet real + script conversión → JSON/GeoJSON + PostgreSQL schema |
| S2 | Servicio de datos (capa lectura) + testing datos + soporte Dev A con integración |
| S3 | Optimización carga datos + soporte QA + documentación |
| S4 | Testing + buffer + documentación técnica + deploy |

## Cronograma

```
         Semana 1          Semana 2          Semana 3          Semana 4
Dev A    [Setup FE +       [Mapa calor +     [Popup +          [Metadata +
(FT)      Mapa H3 +         Decorativos +     Filtrado          Integración +
          Parquet→JSON]      Dato central]     variable]         Pulido]

Dev B    [Auth + JWT +      [Login UI +       [Auth + mapa +    [QA + Testing
(PT)      DB schema]         CRUD Users]       Rutas/Roles]      E2E + Bugs]

Dev C    [Validar parquet   [Servicio datos   [Optimización +   [Testing +
(PT)      + Script conv +    + Testing +       QA soporte +      Deploy +
          DB schema]         Soporte A]        Docs]             Docs]

HITO     Mapa renderiza     Mapa funcional    Mapa completo     Entrega v1.0
         hexágonos reales   + Login + Admin   con filtros       integrada
```

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Estructura .parquet inesperada | Dev C valida en S1 ANTES de que Dev A construya sobre ella |
| Rendimiento Leaflet con ~30K hex | PoC en S1 con datos reales. Si lento → Canvas renderer o bajar resolución |
| Dev A sin experiencia Leaflet/H3 | Spike 4-8h en S1 para PoC |
| Scope creep | Solo lo que está en las AC explícitas. Sin excepciones |

## Decisión

**Viable en 1 mes con margen del 28%.** El factor crítico es Dev A (mapa). Si el mapa avanza bien, el proyecto avanza bien.
