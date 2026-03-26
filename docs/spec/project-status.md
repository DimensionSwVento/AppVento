---
version: 2.0
date: 2026-03-24
project: Vento
author: mavalan Software
---

# Resumen e Índice del Proyecto Vento

## 1. Estado General

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Clasificación del proyecto | ✅ Definido | Web App — Plataforma Análisis Geoespacial, dominio Energía |
| Flujo de usuario | ✅ Documentado | 6 pasos: Login → Mapa → Config variables → Input técnico → Reporte → Historial |
| Stack tecnológico | ⚠️ Propuesto (por confirmar) | Angular/React + Leaflet + PostgreSQL/PostGIS + H3 + Keycloak |
| Arquitectura | ✅ Actualizado | Backend Clean Architecture + DDD + Monorepo desde 1ra entrega (ADR-007, supersede ADR-003) |
| Identidad/Auth | ✅ Definido | Keycloak OIDC como proveedor de identidad (ADR-005) |
| Storage/Cache geoespacial | ✅ Definido | Service Worker + HTTP Cache; storage definitivo pendiente (ADR-006) |
| Historias de usuario (scope) | ✅ Consolidado v2 | 18 HU para primera entrega — organizado por épica y prioridad (sin sprints) |
| Historias de usuario (futuras) | ✅ Definido | 19 HU en backlog futuro |
| Épicas formales | ✅ Generado | 11 épicas (5 primera entrega + 6 futuras) via workflow BMAD |
| Viabilidad equipo/plazo | ✅ Analizado | 230h de 320h disponibles. Viable con 28% margen |
| PRD formal | 🔴 Pendiente | Workflow PRD interrumpido en paso 2 |
| UX Design | 🔴 Pendiente | Existen diseños Figma del discovery |
| Sprint Planning | 🔴 Pendiente | Scope definido por prioridad; falta asignación formal |
| Decisiones pendientes con equipo | ⚠️ Documentado | Ver reunion-pendiente-decisiones-arquitectura.md |

---

## 2. Índice de Documentos

### Especificaciones y Conocimiento

| # | Documento | Ruta | Estado |
|---|-----------|------|--------|
| 1 | Conocimiento del proyecto | `docs/project_knowledge.md` | ✅ Organizado v1 |
| 2 | Resumen e Índice (este archivo) | `docs/spec/project-status.md` | ✅ v2.0 |
| 3 | Especificaciones generales | `docs/spec/Spec_doc.md` | ✅ v1.1 |
| 4 | Tecnologías aplicables | `docs/spec/architecture/tecnologias.md` | ✅ v1.0 |

### Arquitectura y ADRs

| # | Documento | Ruta | Estado |
|---|-----------|------|--------|
| 5 | Arquitectura del sistema | `docs/spec/architecture/architecture.md` | ✅ v1.0 propuesta |
| 6 | ADR-001 Stack Frontend | `docs/spec/adr/ADR-001-stack-frontend.md` | ⚠️ Propuesto |
| 7 | ADR-002 Resolución H3 | `docs/spec/adr/ADR-002-resolucion-h3.md` | ⚠️ Propuesto |
| 8 | ADR-003 Sin Backend API Inicial | `docs/spec/adr/ADR-003-sin-backend-api-inicial.md` | ⛔ Superseded por ADR-007 |
| 9 | ADR-004 Equipo y Viabilidad | `docs/spec/adr/ADR-004-equipo-viabilidad-1-mes.md` | ✅ Aceptado |
| 10 | ADR-005 Keycloak Identidad | `docs/spec/adr/ADR-005-keycloak-identidad.md` | ✅ Aceptado |
| 11 | ADR-006 Storage/Cache Geoespacial | `docs/spec/adr/ADR-006-storage-cache-datos-geoespaciales.md` | ✅ Aceptado |
| 12 | ADR-007 Backend Clean Arch + DDD + Monorepo | `docs/spec/adr/ADR-007-backend-clean-architecture-ddd-monorepo.md` | ✅ Aceptado |

### Épicas, Stories y Planificación

| # | Documento | Ruta | Estado |
|---|-----------|------|--------|
| 13 | Épicas y Stories (desglose completo) | `_bmad-output/planning-artifacts/epics.md` | ✅ v1.0 generado |
| 14 | Scope Primera Entrega (guía de desarrollo) | `docs/spec/stories/scope-primera-entrega.md` | ✅ v2.0 consolidado |
| 15 | Stories — Futuros Sprints | `docs/spec/stories/futuros-sprints.md` | ✅ 19 historias |
| 16 | Decisiones pendientes reunión equipo | `docs/spec/reunion-pendiente-decisiones-arquitectura.md` | ⚠️ Por resolver |

### Artefactos BMAD

| # | Documento | Ruta | Estado |
|---|-----------|------|--------|
| 17 | PRD (en progreso) | `_bmad-output/planning-artifacts/prd.md` | 🔴 Solo frontmatter |

---

## 3. Índice de Actividades

### Planificación

| # | Actividad | Estado | Próximo paso |
|---|-----------|--------|-------------|
| 1 | Definir problema y objetivos | ✅ Hecho | — |
| 2 | Clasificar proyecto | ✅ Hecho | — |
| 3 | Documentar flujo de usuario | ✅ Hecho | — |
| 4 | Identificar y categorizar HU (scope 1ra entrega) | ✅ Hecho | — |
| 5 | Identificar y categorizar HU (futuras) | ✅ Hecho | — |
| 6 | Proponer stack tecnológico | ✅ Hecho | Confirmar con equipo |
| 7 | Definir arquitectura primera entrega | ✅ Actualizado | ADR-007 supersede ADR-003: backend desde día 1 |
| 8 | Definir proveedor de identidad | ✅ Hecho | ADR-005: Keycloak OIDC |
| 9 | Definir estrategia datos geoespaciales | ✅ Hecho | ADR-006: Cache frontend + storage pendiente |
| 10 | Analizar viabilidad 1 mes | ✅ Hecho | — |
| 11 | Organizar documentación de proyecto | ✅ Hecho | — |
| 12 | Documentar tecnologías aplicables | ✅ Hecho | — |
| 13 | Generar épicas y stories (BMAD) | ✅ Hecho | 11 épicas, 5 primera entrega |
| 14 | Consolidar scope primera entrega | ✅ Hecho | 18 HU por épica y prioridad (v2.0) |
| 15 | Crear PRD completo | 🔴 Pendiente | `bmad-create-prd` (retomar paso 2) |
| 16 | Crear UX Design formal | ✅ Hecho | `figma` |
| 17 | Check Implementation Readiness | 🔴 Pendiente | `bmad-check-implementation-readiness` |
| 18 | Sprint Planning formal | 🔴 Pendiente | `bmad-sprint-planning` |

### Implementación (primera entrega — por prioridad)

| # | Historia | Épica | Prioridad | Estado |
|---|----------|-------|-----------|--------|
| 19 | US-MONO — Estructura Monorepo | E0 Fundación | 🔴 Crítica | 🔴 Pendiente |
| 20 | US-ENV — Variables de Entorno | E0 Fundación | 🟡 Alta | 🔴 Pendiente |
| 21 | US-DDD — Backend Clean Arch + DDD | E0 Fundación | 🔴 Crítica | 🔴 Pendiente |
| 22 | US-KEY — Integración Keycloak | E0 Fundación | 🔴 Crítica | 🔴 Pendiente |
| 23 | US-CI — Pipeline CI Mínimo | E0 Fundación | 🟡 Alta | 🔴 Pendiente |
| 24 | US01 — Login via Keycloak | E1 Login | 🔴 Crítica | 🔴 Pendiente |
| 25 | US-AUTH-GUARD — Protección Rutas | E1 Login | 🔴 Crítica | 🔴 Pendiente |
| 26 | US03 — Mapa Base + Hexágonos H3 | E2 Mapa | 🔴 Crítica | 🔴 Pendiente |
| 27 | US03-AC6 — Ingesta .parquet → JSON | E2 Mapa | 🔴 Crítica | 🔴 Pendiente |
| 28 | US03-AC1 — Mapa de Calor por Score | E2 Mapa | 🔴 Crítica | 🔴 Pendiente |
| 29 | US03-AC2 — Filtrado por Variable | E2 Mapa | 🔴 Crítica | 🔴 Pendiente |
| 30 | US03-AC3 — Popup Hexágono | E2 Mapa | 🔴 Crítica | 🔴 Pendiente |
| 31 | US03-AC5 — Hexágonos Decorativos | E2 Mapa | 🟡 Alta | 🔴 Pendiente |
| 32 | US03-AC4 — Dato Central en Hexágono | E2 Mapa | 🟡 Alta | 🔴 Pendiente |
| 33 | US03-AC9 — Panel Control (Leyenda + Selector) | E2 Mapa | 🟡 Alta | 🔴 Pendiente |
| 34 | US-CACHE — Cache Datos Geoespaciales | E2 Mapa | 🟡 Alta | 🔴 Pendiente |
| 35 | US03-AC7 — Metadata de Variables | E2 Mapa | 🟢 Media | 🔴 Pendiente |
| 36 | US08 — CRUD Usuarios (Admin) | E3 Admin | 🟢 Media | 🔴 Pendiente |
| 37 | Testing E2E + QA + bugs | Integración | — | 🔴 Pendiente |
| 38 | Deploy v1.0 | Integración | — | 🔴 Pendiente |

---

## 4. Cambios Relevantes (desde v1.0)

| Cambio | Antes | Ahora |
|--------|-------|-------|
| Arquitectura backend | Sin backend API (ADR-003) | Clean Architecture + DDD + Monorepo (ADR-007) |
| Autenticación | Login propio + hasheo + recuperar pwd | Keycloak OIDC — todo delegado (ADR-005) |
| Cache geoespacial | No definido | Service Worker + HTTP Cache + hash (ADR-006) |
| Organización scope | 3 sprints (S1, S2, S3) | Por épica (E0-E3) y prioridad |
| Historias primera entrega | 11 originales + 6 infra = fragmentado | 18 consolidadas en un solo documento |
| Historias eliminadas | — | E2.3 (pwd recovery), E2.2 (dominio institucional), E1.6 (micro-API auth propia) |

---

## 5. Ruta Recomendada

### Siguiente paso inmediato
El scope primera entrega está consolidado con 18 historias priorizadas. Las opciones son:

### Opción A — Completar planificación BMAD
```
PRD → UX Design → Readiness Check → Sprint Planning → Implementar
```

### Opción B — Formalizar lo mínimo necesario
```
Sprint Planning (asignar historias) → Implementar
```
> Ya tenemos: arquitectura (ADR-005/006/007), épicas (epics.md), stories consolidadas (scope-primera-entrega.md v2)

### Opción C — Arrancar directo
```
Implementar siguiendo ruta crítica del scope-primera-entrega.md
```
> Viable porque las historias ya tienen criterios de aceptación detallados y dependencias claras.
