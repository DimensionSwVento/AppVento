---
version: 2.1
date: 2026-07-30
audience: cliente · stakeholders · devs · PM
revisar: cada 30 días
maintainer: Mavalan Software
---

# Vento — Documentación Maestra

> **Punto único de entrada** a toda la documentación del proyecto Vento. Resume el estado, los stoppers y enlaza a docs específicas según lo que busques.

---

## TL;DR

**Vento** es una herramienta web SIG multicriterio para evaluar la **idoneidad** de proyectos de energía eólica (onshore y offshore) en Colombia. Convenio **ANH + EAFIT**, desarrollado por **Mavalan Software**.

- **Scope 1** (Acceso + Mapa + Admin): ✅ cerrado y desplegado en AccuWeb.
- **Scope 2** (flujo completo de idoneidad): ✅ cerrado (2026-06-01).
- **Feedback de rondas previas** (FB1, FB2): ✅ cerrados.
- **Tercera entrega / Sprint 3** (feedback v2 + catálogo definitivo): ✅ **entregado en modo template** — catálogo definitivo de variables/dimensiones, informe (previsualización a pantalla completa, captura del mapa, PDF = previsualización, disclaimer, fuentes), emplazamiento mar/tierra, histórico. Detalle en [feedback-cliente-v2.md](stories/feedback-cliente-v2.md), [scope-tercera-entrega.md](stories/scope-tercera-entrega.md) y el reporte [Reportes_Entregas/entrega-3](../Reportes_Entregas/entrega-3/scope-3-entregado.md).
- **Stoppers activos**: datos reales del modelo (equipo de investigación), texto oficial del disclaimer (Secretaría General), SMTP (cliente), formato del manual de usuario, ambiente de test (migración de dominios). Ver §3.

---

## 1. Diagrama del sistema

```mermaid
flowchart LR
    U([Usuario / Cliente]) -->|Login OIDC| KC[Keycloak<br/>realm vento]
    U --> APP[App Vento<br/>Next.js 16]
    APP -->|/api/auth/*| KC
    APP -->|/api/admin/*| KC
    APP -->|/api/tiles/* via rewrite| BE[Backend FastAPI<br/>repo separado]
    BE -->|lee| PARQUET[(Datos oficiales<br/>.h3.parquet)]
    PARQUET -.->|entrega| INV([Equipo investigación])

    classDef external fill:#fde725,stroke:#999,color:#000
    classDef app fill:#21918c,stroke:#0a3a3a,color:#fff
    classDef data fill:#3b528b,stroke:#1a253a,color:#fff
    class U,INV external
    class APP,KC,BE app
    class PARQUET data
```

**Lectura rápida**: el usuario entra a Vento (Next.js), Keycloak gestiona quién es; cuando consulta el mapa, Vento le pide tiles al backend FastAPI; el backend lee los datos del equipo de investigación.

---

## 2. Estado del proyecto (semáforo)

> **Terminología:** US01–US09 son las **épicas / módulos** del proyecto (no historias). Las historias reales (US-FBx, US0x-AC…) viven en los docs de `stories/`. Scopes 1 y 2 y los feedbacks FB1/FB2 están **cerrados**; el trabajo activo es el **Sprint 3** (feedback v2).

| Módulo (épica) | Estado | Detalle |
|----------------|--------|---------|
| **US01 Acceso** | 🟢 Cerrado | Login institucional Keycloak (OIDC+PKCE). Falta **SMTP pago (MailerSend)** — externo. |
| **US02 Onboarding** | 🟢 Cerrado | Modal · carrusel de pasos · **disclaimer al inicio** (modal). |
| **US03 Mapa** | 🟢 Cerrado | Selección H3; emplazamiento mar/tierra por dato (seam a la columna `es_offshore`); zonas excluidas morado + leyenda. Faltan **datos reales**. |
| **US04 Variables** | 🟢 Cerrado | Catálogo **definitivo**: 61 ponderadas (jerarquía criterio/subcriterio) + 30 informativas; variables ocultables por emplazamiento. Faltan **datos reales**. |
| **US05 Proyecto** | 🟢 Cerrado | Características: capacidad manual, emplazamiento por dato, tamaño/turbina con definiciones. |
| **US06 Reportes** | 🟢 Cerrado (template) | Previsualización a pantalla completa · captura del mapa · **PDF = previsualización** · disclaimer · tabla de fuentes · ranking de variables. Faltan **pesos reales**. |
| **US07 Histórico** | 🟢 Cerrado | Listado cronológico · ver informes (con reencuadre) · límite 100 · hexes compactados. |
| **US08 Admin** | 🟢 Cerrado | Gestión de usuarios CRUD. |
| **US09 UX/UI** | 🟢 Cerrado | Toasts · alertas de validación · renombre idoneidad · limpieza de menú. |

**Infra y transversales:** Tests unitarios 🟢 · Deploy AccuWeb 🟡 (CI estable en `main`, manual en `develop`) · Documentación 🟢 consolidada (stories + ADRs + arquitectura + dev-notes) · Modelo multicriterio 🟠 datos placeholder hasta ingesta real · SMTP 🔴 bloqueado (cliente).

Leyenda: 🟢 cerrado · 🔨 en curso (Sprint 3) · 🟡 parcial · 🟠 en proceso externo · 🔴 bloqueado externo

---

## 3. Stoppers y riesgos vigentes

| # | Stopper | Tipo | Impacto | ADR / Doc |
|---|---------|------|---------|-----------|
| 1 | **Modelo definitivo** (datos + pesos + ecuación) en `.h3.parquet` no entregado | Externo (investigación) | Scores, heatmap, "variables que más influyen" y zonas excluidas siguen en **modo template** (marcadores deterministas) | [entrega-3 §3](../Reportes_Entregas/entrega-3/scope-3-entregado.md) |
| 2 | **Texto oficial del disclaimer** (aviso legal) | Externo (Secretaría General) | Hoy hay texto template en el modal de inicio y en el informe/PDF | [reportTemplates.ts](../Vento/src/app/Utils/report/reportTemplates.ts) |
| 3 | **Servidor SMTP / MailerSend** | Externo (cliente) | Bloquea notificación email + recovery password | [ADR-009](adr/ADR-009-notificaciones-email-pendientes-smtp.md) |
| 4 | **Formato del manual de usuario** sin decidir | Definición conjunta (Mavalan enviará ejemplos) | El manual arranca cuando se decida (walkthrough externo vs. recorrido in-app) | [manual-usuario.md](manual-usuario.md) |
| 5 | **Ambiente de test** caído por migración de dominios/certificados | Infra (proveedor) | Mavalan reconfigura subdominio propio; pruebas mientras tanto en producción | [accuweb-runbook](ops/accuweb-runbook.md) |
| 6 | **CI GitHub Actions** inestable en ramas de desarrollo | Interno | Deploys vía CI confiables tras llegar a `main`; deploy manual en `develop` | [accuweb-runbook §8](ops/accuweb-runbook.md#8-pipeline-ci--estado-y-troubleshooting) |

---

## 3.5 Procedimientos y técnicas clave

Técnicas usadas en la tercera entrega que conviene conocer antes de tocar el código:

- **Modo template (interruptores en `projectData.ts`)**: la app funciona sin datos reales cayendo a marcadores deterministas. Se controla con `USE_BACKEND` (env `NEXT_PUBLIC_USE_BACKEND`), `USE_PLACEHOLDER_FALLBACK`, `SHOW_PLACEHOLDER_EXCLUDED`, `USE_API_EMPLAZAMIENTO`. Cómo pasar a datos reales: ver [entrega-3 §3](../Reportes_Entregas/entrega-3/scope-3-entregado.md).
- **Compactación de hexágonos (`Utils/historial/hexCodec.ts`)**: al guardar un informe, los H3 se compactan con `compactCells` (7 hijos → 1 padre). Geométricamente idéntico, mismo formato `string[]`, mucho más liviano (local y backend). El heatmap y el popup **siempre normalizan a res 8**, así que la compactación no afecta el render.
- **PDF por captura del DOM (`Report.tsx`)**: el PDF se genera capturando el propio informe con `html2canvas-pro` (soporta `oklch` de Tailwind v4) y paginando A4 con jsPDF → el PDF **es** la previsualización. Se eliminó el `pdfExport.ts` nativo.
- **Reencuadre del mapa (`focusNonce`/`requestMapFocus` en `AccionPrincipalContext`)**: abrir un informe (incluido uno del histórico) reencuadra la selección con el mismo fitBounds del botón de enfoque.
- **Emplazamiento mar/tierra**: `isOffshoreHex`/`selectionNature` (hoy por geometría, seam a la columna `es_offshore`); variables ocultables por `aplicaEn` (`mar`/`tierra`) en el menú de dimensiones.
- **Catálogo de variables (`variablesCatalog.ts`)**: jerarquía Dimensión→Criterio→Subcriterio; cada variable con `masterId` (columna del parquet), `fuente`, `enMapa`, `aplicaEn`. 61 ponderadas + 30 informativas.

---

## 4. Índice navegable

> Cada archivo lleva una línea de "qué encontrarás ahí" para no abrir 20 docs buscando.

### Para el cliente y stakeholders no técnicos

| Doc | Para qué |
|-----|----------|
| [Spec_doc.md](Spec_doc.md) | Visión, problema, objetivos, flujo de usuario, dimensiones (3 puntuables + económica y Regulatoria informativas), tipos de variables |
| [project-status.md](project-status.md) | Tabla de estado del proyecto, índice maestro de docs, actividades hechas y pendientes |
| [manual-usuario.md](manual-usuario.md) | Guía paso a paso para el **usuario final** del software |
| Este archivo (`docs/README.md`) | Punto de entrada general — qué es Vento y dónde mirar |

### Para gestión del proyecto y stakeholders técnicos

| Doc | Para qué |
|-----|----------|
| [scope-primera-entrega.md](stories/scope-primera-entrega.md) | 20 historias contractuales de la primera entrega (US01, US03, US08, etc.) |
| [scope-segunda-entrega.md](stories/scope-segunda-entrega.md) | Sub-historias de la segunda entrega (US03P2, US04, US05, US06) — ✅ cerrado (2026-06-01) |
| [scope-tercera-entrega.md](stories/scope-tercera-entrega.md) | Historias de la tercera entrega (feedback v2 + catálogo definitivo) — ✅ entregado en modo template |
| [feedback-cliente-v1.md](stories/feedback-cliente-v1.md) | 7 HUs derivadas del feedback post-deploy v1 (Keycloak ES, expiración sesión, territorio insular, admin roles, …) |
| [feedback-1-round2.md](stories/feedback-1-round2.md) | Feedback ronda 2 — evaluación de terceros tras deploy v1 (5 HUs derivadas + items descartados con razón) |
| [tecnologias.md](architecture/tecnologias.md) | Comparativa de opciones tecnológicas (parcialmente histórico — ver [tech-stack-validation.md](architecture/tech-stack-validation.md)) |

### Para desarrolladores nuevos

| Doc | Para qué |
|-----|----------|
| [tech-stack-validation.md](architecture/tech-stack-validation.md) | Qué tecnologías se usan y por qué — retrospectiva práctica del stack |
| [frontend-backend-integration.md](architecture/frontend-backend-integration.md) | Cómo Next.js se conecta a FastAPI (rewrites, proxy, dónde van los handlers locales vs proxy) |
| [backend-api.md](architecture/backend-api.md) | Referencia técnica del backend FastAPI: endpoints, modelo de datos, scoring, ingesta |
| [backend-sync-checklist.md](architecture/backend-sync-checklist.md) | Peticiones del front a la API + qué debe proveer/sincronizar el backend (para pasar a datos reales) |
| [auth-strategy.md](security/auth-strategy.md) | Cómo funciona el login y la protección de rutas (middleware + layouts + API guards) |
| [infra/keycloak.md](infra/keycloak.md) | Cómo desplegar y configurar Keycloak para Vento (dev + prod, theme, realm) |
| [test-strategy.md](testing/test-strategy.md) | Estrategia de testing: dónde viven los tests, qué validan, cómo añadir nuevos |
| [accuweb-runbook.md](ops/accuweb-runbook.md) | Cómo desplegar, monitorear y troubleshoot Vento en AccuWeb (incluye onboarding) |
| [dev-notes/map-rendering.md](dev-notes/map-rendering.md) | Detalles del renderizado de mapa (DeckGL + MapLibre + TileLayer) |
| [dev-notes/h3-data-pipeline.md](dev-notes/h3-data-pipeline.md) | Pipeline de datos H3 (de `.parquet` a tiles JSON) |
| [dev-notes/navigation-state-machine.md](dev-notes/navigation-state-machine.md) | Máquina de estados del flujo (selección → dimensiones → características → informe) |

### ADRs (Architecture Decision Records)

| ADR | Decisión | Estado |
|-----|----------|--------|
| [ADR-001](adr/ADR-001-stack-frontend.md) | Stack frontend | ✅ Aceptado (validado en producción, Next.js 16) |
| [ADR-002](adr/ADR-002-resolucion-h3.md) | Resolución H3 | ✅ Aceptado (refinado por ADR-008 tile-based) |
| [ADR-003](adr/ADR-003-sin-backend-api-inicial.md) | Sin backend API inicial | ⛔ Superseded por ADR-007 |
| [ADR-004](adr/ADR-004-equipo-idoneidad-1-mes.md) | Equipo y idoneidad 1 mes | ✅ Aceptado |
| [ADR-005](adr/ADR-005-keycloak-identidad.md) | Keycloak como proveedor de identidad | ✅ Aceptado |
| [ADR-006](adr/ADR-006-storage-cache-datos-geoespaciales.md) | Storage y cache geoespacial | ✅ Aceptado |
| [ADR-007](adr/ADR-007-backend-clean-architecture-ddd-monorepo.md) | Backend Clean Architecture + DDD | ✅ Aceptado (repos separados, no monorepo) |
| [ADR-008](adr/ADR-008-arquitectura-tile-based.md) | Arquitectura tile-based | ✅ Aceptado |
| [ADR-009](adr/ADR-009-notificaciones-email-pendientes-smtp.md) | Notificaciones email pendientes SMTP | 🔴 Bloqueado externo |
| [ADR-010](adr/ADR-010-hosting-accuweb-vs-supabase-vercel.md) | Hosting AccuWeb vs Supabase+Vercel | ✅ Aceptado |
| [ADR-011](adr/ADR-011-parquet-procesamiento-backend-no-browser.md) | Parquet backend, no browser | ✅ Aceptado |
| [ADR-012](adr/ADR-012-post-registration-confirmation-app-side.md) | Confirmación post-registro app-side | ✅ Aceptado |
| ADR-013 | PDF generation lib (WeasyPrint / ReportLab / jsPDF) | ✅ Aceptado — el cliente permitió usar cualquiera a conveniencia del equipo |
| [ADR-014](adr/ADR-014-validacion-per-tile-point-in-polygon.md) | Validación per-tile point-in-polygon (sin cache global de Colombia) | ✅ Aceptado |
| ADR-015 | Catálogo aerogeneradores: JSON vs BE | ✅ Resuelto en reunión datos — el catálogo + restricciones se cubren en US05-AC1/AC2/AC3 |
| [ADR-016](adr/ADR-016-provider-composer-reutilizable.md) | ProviderComposer reutilizable (evita "provider hell") | ✅ Aceptado |
| [ADR-017](adr/ADR-017-fuente-unica-intervalos-variables.md) | Fuente única de intervalos (min–max) de variables ponderadas | ✅ Aceptado |

---

## 5. Cómo empezar según tu rol

### Soy del **cliente / stakeholder no técnico**
1. Lee §1 Diagrama y §2 Estado.
2. Si quieres entender qué hace Vento: [Spec_doc.md](Spec_doc.md).
3. Si quieres ver qué se entregó y qué falta: [project-status.md](project-status.md).
4. Si tienes feedback nuevo: lo capturaremos en una próxima ronda (`feedback-cliente-vN.md`).

### Soy **PM / coordinador**
1. Lee este master + [project-status.md](project-status.md).
2. Para asignar trabajo: [scope-primera-entrega.md](stories/scope-primera-entrega.md), [scope-segunda-entrega.md](stories/scope-segunda-entrega.md), [scope-tercera-entrega.md](stories/scope-tercera-entrega.md).
3. Para entender decisiones técnicas: navega los [ADRs](adr/).
4. Las HUs se sincronizan a GitHub Issues vía `.github/workflows/sync-stories.yml`.

### Soy **dev nuevo en el equipo**
1. Lee §1 Diagrama y §4 → carpeta "Para desarrolladores nuevos".
2. Setup local: [accuweb-runbook §13 Onboarding](ops/accuweb-runbook.md#13-onboarding-rápido-para-nuevo-dev).
3. Antes de tocar auth: [auth-strategy.md](security/auth-strategy.md).
4. Antes de tocar el mapa: [dev-notes/map-rendering.md](dev-notes/map-rendering.md).
5. Antes de hacer PR: [test-strategy.md](testing/test-strategy.md).
6. Contexto de la 3ª entrega: [scope-tercera-entrega.md](stories/scope-tercera-entrega.md) y [feedback-cliente-v2.md](stories/feedback-cliente-v2.md).

### Soy **DevOps / on-call**
1. [accuweb-runbook.md](ops/accuweb-runbook.md) — completo.
2. [infra/keycloak.md](infra/keycloak.md) — para temas de IdP.
3. Si CI falla en `develop`: §8 del runbook.

---

## 6. Glosario

| Término | Qué significa en Vento |
|---------|------------------------|
| **H3** | Sistema de indexación geoespacial de Uber que divide el mundo en hexágonos. Vento usa H3 para discretizar Colombia (resoluciones 3-8 según zoom). |
| **Hexágono / cell / tile** | Un hexágono H3. La unidad mínima de análisis del mapa. Cada hex tiene un score y variables. |
| **Resolución H3** | Tamaño del hex. Res 3 ≈ 68 km de borde; res 8 ≈ 460 m. Más resolución = más detalle pero más datos. |
| **Tile-based** | Patrón de renderizado: la app pide solo los hexágonos visibles en pantalla, no todos a la vez. |
| **OIDC** | OpenID Connect. Protocolo estándar para login federado — Keycloak lo implementa. |
| **Realm** | Espacio de Keycloak donde viven los usuarios, roles y clientes. Vento usa el realm `vento`. |
| **Cliente Keycloak** | App que pide tokens al realm. Aquí es `vento-web` (confidencial). |
| **JWT / JWE** | Token cifrado/firmado. Vento usa JWE para la cookie de sesión (refreshToken + roles). |
| **NextAuth** | Librería que conecta Next.js con Keycloak vía OIDC. |
| **FastAPI** | Framework Python para el backend. Sirve los tiles H3 y endpoints de datos. |
| **`.h3.parquet`** | Archivo binario con datos geoespaciales por hexágono — entregado por el equipo de investigación. |
| **Modelo multicriterio** | Algoritmo del equipo de investigación que calcula scores de idoneidad eólica por hex. En desarrollo. |
| **Score general** | Promedio ponderado (WLC) de las **3 dimensiones puntuables** para un hexágono. |
| **Dimensiones** | Ambiental, Técnica, **Social** (**3 puntuables**) + **económica** y Regulatoria (**informativas**). |
| **Idoneidad** | Aptitud relativa de una zona para un proyecto eólico (antes "prefactibilidad"; renombrado en la 3ª entrega). |
| **Criterio / Subcriterio** | Niveles de agrupación de variables dentro de una dimensión (Dimensión→Criterio→Subcriterio→Variable). |
| **Modo template** | La app funciona con marcadores deterministas hasta tener datos reales; se activa lo real con interruptores en `projectData.ts`. |
| **Variables incluyentes / penalizantes / excluyentes** | Tipos de variable según cómo afectan el score (suman, restan, eliminan zona). |
| **ZEE** | Zona Económica Exclusiva — territorio marítimo. Vento permite seleccionar hexágonos offshore en la ZEE colombiana (incluido San Andrés y Providencia). |
| **AccuWeb** | Proveedor de hosting donde corre Vento en producción. |
| **cPanel** | Panel de gestión del hosting AccuWeb. Auto-deploya desde ramas `deploy-test`/`deploy-prod`. |
| **ADR** | Architecture Decision Record. Documento que registra una decisión técnica, su contexto y consecuencias. |
| **HU (Historia de Usuario)** | Unidad de trabajo: "Como X quiero Y para Z" + criterios de aceptación. |
| **AC (Criterio de Aceptación)** | Cláusula verificable que dice cuándo una HU está "lista". |
| **Standalone** | Modo de build de Next.js que produce un servidor Node minimalista sin necesidad de `npm install` en producción. |
| **SMTP** | Protocolo de envío de email. Vento depende del cliente para proveerlo (bloqueante ADR-009). |

---

## 7. Mantenimiento de este documento

**Revisar mensualmente** estos 6 puntos. Si alguno cambia, actualiza la sección correspondiente:

1. ¿El semáforo de §2 sigue reflejando la realidad?
2. ¿Hay stoppers nuevos en §3 o alguno se resolvió?
3. ¿Aparecieron docs nuevos? → añadir al índice §4
4. ¿Algún ADR cambió de estado (propuesto → aceptado, o aceptado → superseded)?
5. ¿Hay nuevos términos técnicos no explicados en el glosario?
6. Fecha de la última revisión arriba en el frontmatter.

**Mantenedor**: Mavalan Software. Si otro dev edita, marca el cambio en commit message como `docs(master): ...` para no pasar desapercibido.

---

## 8. Cambios relevantes

| Fecha | Cambio |
|-------|--------|
| 2026-04-20 | Creación inicial del master doc tras consolidación post-feedback v1 |
| 2026-07-13 | v2.0 — reubicado a `docs/README.md`; estado actualizado a Sprint 3 (Scopes 1/2 y FB1/FB2 cerrados); stoppers al día |
| 2026-07-13 | Reorg: **`spec/` aplanado** — `adr/`, `architecture/`, `stories/`, `Spec_doc.md`, `project-status.md` promovidos a `docs/`; `reunion-pendiente` eliminado (obsoleto) |
| 2026-07-13 | `futuros-sprints.md` eliminado (fases finales); `Spec_doc.md` → v2.0 (flujo, stack y dimensiones al día); ADR-001/002 marcados aceptados |
| 2026-07-30 | v2.1 — **3ª entrega**: renombre idoneidad; dimensiones Social/económicao (61+30); §3.5 Procedimientos (modo template, compactación, PDF por captura); stoppers al día; `spec/stories/` eliminado; enlace a `Reportes_Entregas/entrega-3` |
