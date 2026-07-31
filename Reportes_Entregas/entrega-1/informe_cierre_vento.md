# Informe de Cierre de Contrato — Proyecto Vento

**Proveedor:** Mavalan Software
**Cliente:** Vento
**Fecha:** Abril 2026
**Versión:** 1.0

---

## 1. Resumen Ejecutivo

Este documento certifica la entrega y cierre de la primera fase del proyecto **Vento**, una plataforma web de análisis geoespacial para evaluación de viabilidad de proyectos de energía eólica en Colombia. El desarrollo fue ejecutado por **Mavalan Software** con base en la propuesta técnica firmada el 19 de febrero de 2026.

La entrega fue desplegada exitosamente en el ambiente de producción **AccuWeb** y validada por el cliente. Como resultado del proceso de revisión post-deploy, se ejecutó un sprint de estabilización con **7 historias de usuario** (36h de trabajo), de las cuales **6 están completadas** y 1 está en ejecución final.

---

## 2. Scope Contratado vs. Entregado

### 2.1 Historias de Usuario del Contrato Original

| ID | Historia | Prioridad | Estado |
|----|----------|-----------|--------|
| US01 | Login institucional vía Keycloak | Alta | ✅ Entregado y funcional |
| US03 | Selección territorial H3 — mapa base Colombia | Crítica | ✅ Entregado y funcional |
| US08 | Gestión de usuarios CRUD admin | Media | ✅ Entregado (vía consola Keycloak + UI admin) |

### 2.2 Entregado más allá del scope mínimo

Durante el desarrollo, Mavalan Software amplió la entrega para garantizar una solución robusta y lista para escalar. Lo siguiente fue construido sin costo adicional:

| Área | Qué se entregó |
|------|----------------|
| Arquitectura | Backend FastAPI con Clean Architecture + DDD, repos separados |
| Autenticación | Sistema completo Keycloak OIDC con NextAuth, realm dedicado, roles, flujo PKCE |
| Mapa demo | Heatmap interactivo con tiles, leyenda dinámica, selector de variables, popup por hexágono |
| Pipeline de datos | Ingesta y procesado del archivo `.h3.parquet` de 126 MB con índice espacial tile-based |
| Rendimiento | Arquitectura tile-based con 5 niveles de caché — solo se cargan los hexágonos visibles en pantalla |
| Testing | 17 archivos de pruebas unitarias (Vitest + React Testing Library) |
| CI/CD | Pipeline en GitHub Actions: lint, typecheck, tests, build, escaneo de secretos |
| Deploy | Configuración completa para AccuWeb (Apache + standalone Next.js + proxy SSL) |
| Responsive | Interfaz adaptada para mobile y desktop con menú hamburguesa y layout overlay |
| Documentación técnica | auth-strategy, test-strategy, tech-stack-validation, runbook AccuWeb, infraestructura Keycloak |

---

## 3. Arquitectura Entregada

```
Browser (usuario)
    │
    ▼
Next.js 16 + React 19 — Frontend (AccuWeb)
    ├─ Mapa SIG: DeckGL 9 + MapLibre GL + hexágonos H3
    ├─ Autenticación: NextAuth v5 + Keycloak OIDC
    ├─ Admin UI: tabla de usuarios + asignación de roles
    └─ API Routes: proxy a FastAPI + rutas auth locales
    │
    ▼
FastAPI — Backend (Python, Clean Architecture)
    ├─ Tiles H3: sirve hexágonos por viewport
    └─ Auth guard: valida JWT RS256 contra Keycloak JWKS
    │
    ▼
Keycloak — Identidad (Docker)
    └─ Realm "vento": roles admin/analista, cliente OIDC, theme custom
```

**Stack tecnológico confirmado:**

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | Next.js 16 + React 19 + TypeScript | ✅ Implementado |
| Mapa | DeckGL 9 + MapLibre GL + h3-js v4 | ✅ Implementado |
| Auth frontend | NextAuth v5 + Keycloak provider | ✅ Implementado |
| Auth backend | PyJWT + JWKS (RS256) | ✅ Implementado |
| Identidad | Keycloak 26 (Docker, realm "vento") | ✅ Implementado |
| Backend API | FastAPI (Python) | ✅ Implementado |
| Testing | Vitest + React Testing Library | ✅ Implementado |
| CI/CD | GitHub Actions | ✅ Implementado |
| Datos | .h3.parquet procesado con hyparquet | ✅ Funcional |
| Deploy | AccuWeb (Apache + Node.js standalone) | ✅ Desplegado |

---

## 4. Objetivos del Contrato — Cumplimiento

| Objetivo | Estado | Detalle |
|----------|--------|---------|
| Motor geoespacial H3 con precisión estandarizada | ✅ Cumplido | Selección de hexágonos H3 resolución 3–7. Click → ID hexagonal → pintado. Colombia continental completa. San Andrés y offshore en sprint de feedback. |
| Login institucional | ✅ Cumplido | Keycloak OIDC con restricción de dominio, recuperación de contraseña, roles diferenciados. |
| Gestión de usuarios CRUD | ✅ Cumplido | Consola Keycloak provee CRUD completo. UI de admin con tabla de usuarios y asignación de roles incluida en sprint de feedback. |

> Los objetivos marcados como parciales corresponden a funcionalidades que dependen del modelo multicriterio de análisis, cuyo desarrollo está **explícitamente excluido del alcance contractual** (ver sección 5).

---

## 5. Exclusiones del Scope — Confirmadas

Las siguientes exclusiones fueron establecidas en el contrato original y se mantienen:

- Desarrollo, mantenimiento y despliegue del modelo multicriterio de análisis (AHP)
- Integración con sistemas externos no especificados en el contrato
- Migración de datos históricos previos al proyecto
- Base de datos PostgreSQL + PostGIS (Épica E6 — scope futuro)
- Generación de reportes PDF profesionales (US-F10 — scope futuro)

---

## 6. Sprint de Estabilización Post-Deploy

Tras la revisión del cliente del deploy en AccuWeb, se recibieron **11 puntos de feedback** consolidados en **7 historias de usuario** ejecutadas dentro del período de garantía:

| ID | Historia | Área | Horas | Estado |
|----|----------|------|-------|--------|
| US-FB-01 | Keycloak en español + botón inicio + política de contraseñas | Theme + Realm | 8h | ✅ Completado |
| US-FB-02 | Flujo post-registro con pantalla de confirmación | Theme + Realm | 4h | 🔨 Pendiente |
| US-FB-03 | Gestión de expiración de sesión con mensaje amigable | Realm + Frontend | 3h | ✅ Completado |
| US-FB-04 | Territorio colombiano completo (offshore + San Andrés + Providencia) | Frontend | 7h | ✅ Completado |
| US-FB-05 | Admin: visibilidad de roles + asignación desde UI | Frontend | 3h | ✅ Completado |
| US-FB-06 | Notificación email al asignar rol admin | Theme + Realm | 4h | ✅ Completado (SendGrid temporal) |
| US-DOC-01 | Documentación técnica (auth, testing, stack) | Documentación | 7h | ✅ Completado |

**Completadas:** 6 de 7 HUs | **Pendiente:** 1 HU (US-FB-02)

> **US-FB-06 — Notificaciones email:** Funcional con SendGrid como servidor SMTP temporal. Pendiente migración al servidor SMTP definitivo y dominio de correo institucional del cliente — ambos por proveer por parte del cliente.

---

## 7. Responsabilidades de Infraestructura

| Responsabilidad | Parte responsable | Estado |
|----------------|-------------------|--------|
| Ambiente de producción AccuWeb | Cliente | ✅ Provisto — deploy realizado |
| Hosting y dominio | Cliente | ✅ Provisto |
| Certificados SSL | Cliente | Responsabilidad del cliente |
| Servidor SMTP para notificaciones | Cliente | ⚠️ Temporal (SendGrid) — pendiente dominio y SMTP definitivo del cliente |
| Datos actualizados del modelo (parquet) | Equipo de investigación del cliente | Responsabilidad del cliente |
| Cuentas de correo institucional | Cliente | Responsabilidad del cliente |

---

## 8. Soporte y Período de Garantía

Según los términos del contrato:

**Período:** 10 días hábiles (~medio mes calendario) desde la entrega final en AccuWeb.

**Cubre:**
- Corrección de errores que impidan el funcionamiento del sistema
- Bugs en las funcionalidades entregadas
- Problemas de rendimiento no detectados en pruebas

**No cubre:**
- Nuevas funcionalidades o cambios de alcance
- Mejoras o optimizaciones no contempladas inicialmente
- Capacitaciones adicionales
- Soporte por uso indebido o modificaciones del cliente al código

---

## 9. Backlog Futuro Documentado

El proyecto tiene documentadas **20 historias de usuario futuras** organizadas en épicas, listas para un siguiente contrato:

| Épica | Descripción |
|-------|-------------|
| E4 — Dimensiones | Configuración dinámica de pesos y variables por el analista |
| E5 — Características | Input de parámetros técnicos del proyecto (turbinas, MW) |
| E5b — Reporte PDF | Generación de informe profesional descargable |
| E6 — Base de datos | Migración a PostgreSQL + PostGIS + H3 nativo |
| E7 — Histórico | Registro y comparación de análisis previos |
| E8 — Motor MCDM | Integración del modelo AHP del equipo de investigación EAFIT/ANH |

---

## 10. Entregables de Documentación

| Documento | Ruta en el repositorio |
|-----------|----------------------|
| Arquitectura del sistema | `docs/architecture/architecture.md` |
| Estrategia de autenticación | `docs/security/auth-strategy.md` |
| Estrategia de testing | `docs/testing/test-strategy.md` |
| Validación del stack técnico | `docs/architecture/tech-stack-validation.md` |
| Infraestructura Keycloak | `docs/infra/keycloak.md` |
| Integración frontend ↔ backend | `docs/architecture/frontend-backend-integration.md` |
| Runbook AccuWeb (operaciones) | `docs/ops/accuweb-runbook.md` |
| Pipeline de datos H3 | `docs/dev-notes/h3-data-pipeline.md` |
| Renderizado del mapa | `docs/dev-notes/map-rendering.md` |
| Máquina de estados navegación | `docs/dev-notes/navigation-state-machine.md` |
| Índice general del proyecto | `docs/project-status.md` |

---

*Mavalan Software — Proyecto Vento v1.0 — Abril 2026*
