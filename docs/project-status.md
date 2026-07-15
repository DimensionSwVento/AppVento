---
version: 6.0
date: 2026-07-13
project: Vento
author: mavalan Software
---

# Resumen e Índice del Proyecto Vento

## 1. Estado General

> **Estado vivo del proyecto → [docs/README.md](README.md) (índice maestro).** Este documento aporta el **índice detallado de documentos** (§2). Scopes 1 y 2 y los feedbacks FB1/FB2 están **cerrados**; el trabajo activo es el **Sprint 3** (feedback v2).

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Clasificación del proyecto | ✅ Definido | Web App — Plataforma Análisis Geoespacial, dominio Energía |
| Flujo de usuario | ✅ Documentado | 6 pasos: Login → Mapa → Config variables → Input técnico → Reporte → Historial |
| Stack tecnológico | ✅ Confirmado | Next.js 16 + React 19 + DeckGL + MapLibre + FastAPI + H3 + Keycloak |
| Arquitectura | ✅ Actualizado | Frontend Next.js + Backend FastAPI (repos separados), conectados via API_BASE |
| Identidad/Auth | ✅ Implementado | Keycloak OIDC via NextAuth — realm "vento", client "vento-frontend" (PR auth mergeado) |
| Storage/Cache geoespacial | ✅ Parcial | TileLayer cache (64 tiles) + HTTP Cache-Control; storage definitivo pendiente (ADR-006) |
| Scopes contractuales | ✅ Cerrados | Scope 1 (Acceso+Mapa+Admin) y Scope 2 (flujo prefactibilidad, cerrado 2026-06-01) |
| Historias de usuario (futuras) | ✅ Definido | 20 HU en backlog futuro |
| Épicas formales | ✅ Generado | 11 épicas (5 primera entrega + 6 futuras) via workflow BMAD |
| Viabilidad equipo/plazo | ✅ Analizado | 230h de 320h disponibles. Viable con 28% margen |
| Testing unitario | ✅ Hecho | Vitest + RTL — 17 archivos test (auth, middleware, keycloak admin, Map, SideBar, dashboard, context, routes) |
| Responsive mobile | ✅ Hecho | SideBar colapsado + subpágina overlay + hamburguesa + fullscreen top-right |
| Deploy AccuWeb standalone | ✅ Hecho | `output: "standalone"`, proxy SSL HTTP/HTTPS, cookie reduction |
| Feedback cliente | ✅ FB1/FB2 cerrados · v2 en curso | `feedback-cliente-v1.md`, `feedback-1-round2.md` y `feedback-cliente-v2.md` (Sprint 3) |
| Documentación técnica detallada | ✅ Hecho | auth-strategy + test-strategy + tech-stack-validation + runbook AccuWeb |
| PRD formal | 🔴 Pendiente | Workflow PRD interrumpido en paso 2 |
| UX Design | ✅ Hecho | Diseños Figma del discovery |
| Sprint 3 (feedback v2) | 🔨 En curso | Onboarding, histórico, radar dinámico, ajustes mapa/UX — ver `stories/sprint-3.md` |

### Historial de scopes, feedback y sprints

Todas las fases entregadas están **cerradas**; el trabajo activo es el **Sprint 3**.

| Fase | Qué incluyó | Estado | Documento |
|------|-------------|--------|-----------|
| **Scope 1** — Acceso + Mapa + Admin | US01 login Keycloak · US03(P1) selección H3 · US08 admin de usuarios | ✅ Cerrado (desplegado en AccuWeb) | [scope-primera-entrega.md](stories/scope-primera-entrega.md) |
| **FB1** — Feedback ronda 1 | US-FB-01 Keycloak ES · FB-02 post-registro · FB-03 expiración de sesión · FB-04 territorio offshore/insular · FB-05 admin roles UI · FB-06 notificación email | ✅ Cerrado | [feedback-cliente-v1.md](stories/feedback-cliente-v1.md) |
| **FB2** — Feedback ronda 2 | US-FB2-01 guía próximo paso · FB2-02 cartografía IGAC · FB2-03 polish landing · FB2-04 transición de zoom · FB2-05 icono de logout | ✅ Cerrado | [feedback-1-round2.md](stories/feedback-1-round2.md) |
| **Scope 2** — Flujo completo de prefactibilidad | US03(P2) área km² + búsqueda · US04 variables/dimensiones · US05 características · US06 informe + PDF | ✅ Cerrado (2026-06-01) | [scope-dos.md](stories/scope-dos.md) |
| **Sprint 3** — Feedback v2 del Scope 2 | US02 onboarding · US06-01 radar dinámico · US07 histórico · US09 toasts/alertas · US-FB3-01…06 · US03-02/03 (fix mapa) | 🔨 **En curso** | [sprint-3.md](stories/sprint-3.md) · [feedback-cliente-v2.md](stories/feedback-cliente-v2.md) |

**Bloqueos externos vigentes:** datos reales del modelo (equipo de investigación) · SMTP pago MailerSend (cliente) · negociación de alcance US05 (reunión).

---

## 2. Índice de Documentos

### Especificaciones y Conocimiento

| # | Documento | Ruta | Estado |
|---|-----------|------|--------|
| 0 | **Master — punto de entrada único** | `docs/README.md` | ✅ v2.0 |
| 1 | Conocimiento del proyecto | `docs/project_knowledge.md` | ✅ Organizado v1 |
| 2 | Resumen e Índice (este archivo) | `docs/project-status.md` | ✅ v6.0 |
| 3 | Especificaciones generales | `docs/Spec_doc.md` | ✅ v1.1 |
| 4 | Tecnologías aplicables | `docs/architecture/tecnologias.md` | ✅ v1.0 |

### Arquitectura y ADRs

| # | Documento | Ruta | Estado |
|---|-----------|------|--------|
| 5 | Arquitectura del sistema | `docs/architecture/architecture.md` | ✅ v1.0 propuesta |
| 6 | ADR-001 Stack Frontend | `docs/adr/ADR-001-stack-frontend.md` | ⚠️ Propuesto |
| 7 | ADR-002 Resolución H3 | `docs/adr/ADR-002-resolucion-h3.md` | ⚠️ Propuesto |
| 8 | ADR-003 Sin Backend API Inicial | `docs/adr/ADR-003-sin-backend-api-inicial.md` | ⛔ Superseded por ADR-007 |
| 9 | ADR-004 Equipo y Viabilidad | `docs/adr/ADR-004-equipo-viabilidad-1-mes.md` | ✅ Aceptado |
| 10 | ADR-005 Keycloak Identidad | `docs/adr/ADR-005-keycloak-identidad.md` | ✅ Aceptado |
| 11 | ADR-006 Storage/Cache Geoespacial | `docs/adr/ADR-006-storage-cache-datos-geoespaciales.md` | ✅ Aceptado |
| 12 | ADR-007 Backend Clean Arch + DDD + Monorepo | `docs/adr/ADR-007-backend-clean-architecture-ddd-monorepo.md` | ✅ Aceptado |
| 12b | ADR-008 Arquitectura Tile-based | `docs/adr/ADR-008-arquitectura-tile-based.md` | ✅ Aceptado |
| 12c | ADR-009 Notificaciones Email Pendientes SMTP | `docs/adr/ADR-009-notificaciones-email-pendientes-smtp.md` | ⚠️ Propuesto — bloqueado por stopper externo |
| 12d | ADR-010 Hosting AccuWeb vs Supabase+Vercel | `docs/adr/ADR-010-hosting-accuweb-vs-supabase-vercel.md` | ✅ Aceptado |
| 12e | ADR-011 Parquet Backend (no Browser) | `docs/adr/ADR-011-parquet-procesamiento-backend-no-browser.md` | ✅ Aceptado |

### Épicas, Stories y Planificación

| # | Documento | Ruta | Estado |
|---|-----------|------|--------|
| 13 | Épicas y Stories (desglose completo) | `_bmad-output/planning-artifacts/epics.md` | ✅ v1.0 generado |
| 14 | Scope Primera Entrega (guía de desarrollo) | `docs/stories/scope-primera-entrega.md` | ✅ v2.0 consolidado |
| 15b | Feedback Cliente — Sprint Estabilización | `docs/stories/feedback-cliente-v1.md` | ✅ v1.0 — 7 HUs consolidadas |

### Documentación Técnica Detallada

| # | Documento | Ruta | Estado |
|---|-----------|------|--------|
| 16a | Estrategia de Autenticación | `docs/security/auth-strategy.md` | ✅ v1.0 |
| 16b | Estrategia de Testing | `docs/testing/test-strategy.md` | ✅ v1.0 |
| 16c | Validación del Stack Técnico | `docs/architecture/tech-stack-validation.md` | ✅ v1.0 |
| 16c2 | Integración Frontend ↔ Backend | `docs/architecture/frontend-backend-integration.md` | ✅ v1.0 |
| 16d | Runbook AccuWeb | `docs/ops/accuweb-runbook.md` | ✅ v1.0 |
| 16d2 | Infraestructura Keycloak | `docs/infra/keycloak.md` | ✅ v1.0 |
| 16e | Dev Notes — H3 Pipeline | `docs/dev-notes/h3-data-pipeline.md` | ✅ Existente |
| 16f | Dev Notes — Map Rendering | `docs/dev-notes/map-rendering.md` | ✅ Existente |
| 16g | Dev Notes — Navigation State Machine | `docs/dev-notes/navigation-state-machine.md` | ✅ Existente |

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
| 19 | US-MONO — Estructura Monorepo | E0 Fundación | 🔴 Crítica | ⚠️ Adaptado | Repos separados (no monorepo). Frontend Next.js + Backend FastAPI |
| 20 | US-ENV — Variables de Entorno | E0 Fundación | 🟡 Alta | ⚠️ Parcial | `.env.example` en Vento/ e infra/keycloak/. CI inyecta 7 secrets |
| 21 | US-DDD — Backend Clean Arch + DDD | E0 Fundación | 🔴 Crítica | ✅ Hecho | FastAPI con domain/application/infrastructure/shared |
| 22 | US-KEY — Integración Keycloak | E0 Fundación | 🔴 Crítica | ✅ Hecho | NextAuth + Keycloak, realm-export, docker-compose, backend JWT guard |
| 23 | US-CI — Pipeline CI Mínimo | E0 Fundación | 🟡 Alta | ⚠️ Parcial | Build + lint + TypeCheck + Vitest + gitleaks. Falta branch protection |
| 24 | US01 — Login via Keycloak | E1 Login | 🔴 Crítica | ✅ Hecho | PR auth: NextAuth OIDC, SignInButton, redirect a dashboard |
| 25 | US-AUTH-GUARD — Protección Rutas | E1 Login | 🔴 Crítica | ⚠️ Parcial | middleware.ts protege /dashboard. Falta Bearer header en fetches |
| 26 | US03 — Mapa Base + Hexágonos H3 | E2 Mapa | 🔴 Crítica | ✅ Hecho | DeckGL + MapLibre + TileLayer client-side con COLOMBIA_POLYGON |
| 27 | US03-AC6 — Ingesta .parquet → JSON | E2 Mapa | 🔴 Crítica | ⚠️ Parcial | Parseo con hyparquet funcional. Falta validación y doc de actualización |
| 28 | US03-AC1 — Mapa de Calor por Score | E2 Mapa | 🔴 Crítica | ✅ Hecho | En HeatmapDemo.tsx — gradiente pos/neg por variable |
| 29 | US03-AC2 — Filtrado por Variable | E2 Mapa | 🔴 Crítica | ✅ Hecho | En HeatmapDemo.tsx — VariableSelector + re-render |
| 30 | US03-AC3 — Popup Hexágono | E2 Mapa | 🔴 Crítica | ✅ Hecho | En HeatmapDemo.tsx — HexPopup con score + variables + H3 ID |
| 31 | US03-AC5 — Hexágonos Decorativos | E2 Mapa | 🟡 Alta | ⚠️ Parcial | tipo_celda se muestra en popup, falta estilo visual diferenciado |
| 32 | US03-AC4 — Dato Central en Hexágono | E2 Mapa | 🟡 Alta | ❌ Pendiente | No implementado |
| 33 | US03-AC9 — Panel Control (Leyenda + Selector) | E2 Mapa | 🟡 Alta | ✅ Hecho | En HeatmapDemo.tsx — leyenda dinámica pos/neg + selector + LayerInfo |
| 34 | US-CACHE — Cache Datos Geoespaciales | E2 Mapa | 🟡 Alta | ⚠️ Parcial | TileLayer cache + HTTP headers. Falta Service Worker |
| 35 | US03-AC7 — Metadata de Variables | E2 Mapa | 🟢 Media | ❌ Pendiente | No implementado |
| 36 | US08 — CRUD Usuarios (Admin) | E3 Admin | 🟢 Media | ✅ Resuelto | Decidido usar Keycloak admin console directamente |
| 37 | US03-AC1-FIX01 — Colores + Leyenda feedback datos | E2 Mapa | 🟡 Alta | ✅ Hecho | Gradiente pos/neg implementado en HeatmapDemo.tsx |
| 38 | US-KEY-01 — Realm/Client dedicado Keycloak | E0/E1 | 🔴 Crítica | ✅ Hecho | PR auth con realm-export.json + docker-compose |
| 39 | Testing unitario (Vitest) | Integración | — | ✅ Hecho | 5 tests: Context, SideBar, NextStepButton, Map, dashboard |
| 40 | Deploy v1.0 | Integración | — | 🔴 Pendiente | — |

---

## 4. Cambios Relevantes (desde v1.0)

| Cambio | Antes | Ahora |
|--------|-------|-------|
| Arquitectura backend | Sin backend API (ADR-003) | FastAPI Clean Architecture (repos separados, no monorepo) |
| Autenticación | Login propio + hasheo + recuperar pwd | Keycloak OIDC via NextAuth (ADR-005) — implementado |
| Mapa SIG | Leaflet (propuesto) | DeckGL + MapLibre + TileLayer client-side (ADR-008) |
| Renderizado hexágonos | Fetch monolítico todos los hex | Tile-based: cuadrícula client-side con `polygonToCells` + COLOMBIA_POLYGON |
| Componente Map.tsx | Todo junto (heatmap + selección + API) | Separado: Map.tsx (esencial) + HeatmapDemo.tsx (features demo) |
| Cache geoespacial | No definido | TileLayer cache (64 tiles) + HTTP Cache-Control |
| Testing | Ninguno | Vitest + React Testing Library (5 tests unitarios) |
| Organización scope | 3 sprints (S1, S2, S3) | Por épica (E0-E3) y prioridad |
| Historias primera entrega | 18 consolidadas | 20 HU (se agregaron US03-AC1-FIX01 y US-KEY-01) |
| CRUD Usuarios | UI propia planificada | Keycloak admin console (decisión equipo) |

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
