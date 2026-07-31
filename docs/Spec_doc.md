---
version: 2.0
project: Vento
date: 2026-07-13
author: Mavalan Software
status: vigente — Scopes 1 y 2 entregados; Sprint 3 (feedback v2) en curso
---

# Especificaciones del Proyecto Vento

## 1. Visión General

Herramienta web SIG multicriterio para evaluar la viabilidad de proyectos de energía eólica (onshore y offshore) en el territorio colombiano. Integra 5 dimensiones de análisis sobre un mapa interactivo basado en hexágonos H3, con respaldo institucional de ANH y EAFIT.

### 1.0 Flujo Esperado del Usuario (Completo)

| Paso | Acción | Scope |
|------|--------|-------|
| 1 | Login de usuario (Keycloak — correo general) | ✅ Scope 1 |
| 2 | Selección de área en mapa interactivo (hexágonos H3) | ✅ Scope 1 |
| 3 | Configurar variables agrupadas por dimensión (Técnica, Ambiental, Socioeconómica, Macroeconómica; Regulatoria informativa) | ✅ Scope 2 (US04) |
| 4 | Insertar características del proyecto (capacidad MW, categoría de aerogenerador) | ✅ Scope 2 (US05) |
| 5 | Informe de idoneidad del área con descarga PDF | ✅ Scope 2 (US06) |
| 6 | Ver historial de informes | 🔨 Sprint 3 (US07) |

### 1.1 Problema

- **Dispersión de datos:** Información ambiental, técnica, regulatoria y socioeconómica en fuentes y formatos dispersos
- **Complejidad geográfica:** Herramientas SIG complejas fuera del alcance de tomadores de decisiones
- **Incertidumbre:** Informes de viabilidad tardan semanas, retrasando inversión en energías limpias

### 1.2 Objetivos

1. Motor geoespacial H3 con resolución estandarizada para Colombia (nivel zonas/regiones, ~res 5-6)
2. Automatizar generación de reportes de viabilidad de 5 días a <30 segundos
3. Centralizar 5 dimensiones de análisis en fuente de verdad única

### 1.3 Dimensiones de Análisis

| # | Dimensión | Descripción |
|---|-----------|-------------|
| 1 | Técnica | Recurso eólico, geología, condiciones marinas, logística, implementación (46 variables) |
| 2 | Ambiental | Áreas protegidas, impacto ecosistémico, cobertura terrestre |
| 3 | Socioeconómica | Dinámicas territoriales, conflictividad, accesibilidad |
| 4 | Regulatoria | Normativa colombiana, zonas de exclusión legal, NSR-10 |
| 5 | Macroeconómica | Indicadores financieros (VPN, TIR, LCOE), costos de implementación |

> **Actualización (US-FB3-06, Sprint 3):** la **Regulatoria pasó a informativa** — ya no puntúa en el score general. El WLC se calcula sobre **4 dimensiones puntuables** (Técnica, Ambiental, Socioeconómica, Macroeconómica).

### 1.4 Tipos de Variables

| Tipo | Rol en el modelo | Ejemplo |
|------|-----------------|---------|
| **Excluyentes** | Máscara binaria (0/1). Zona inviable = excluida | Áreas protegidas, pendientes extremas |
| **Mínimo viable (Incluyentes)** | Núcleo del índice multicriterio. Entran a AHP | Velocidad viento, densidad energética |
| **Penalizantes** | Reducen score sin excluir. Fricciones/costos adicionales | Pendiente terreno, distancia a red eléctrica |
| **Informativas** | No alteran índice. Contexto para decisiones | Dirección viento, turbulencia, composición terreno |

---

## 2. Clasificación del Proyecto

| Campo | Valor |
|-------|-------|
| Tipo | Web App — Plataforma de Análisis Geoespacial |
| Dominio | Energía — Geoespacial Científico |
| Complejidad | Alta |
| Contexto | Híbrido (brownfield pipeline datos, greenfield frontend web) |
| Fase metodológica | Fase 2 (desarrollo herramienta SIG) con criterios para Fase 3 |

### 2.1 Perfiles de Usuario

| Perfil | Necesidad principal |
|--------|-------------------|
| Analista técnico | Filtrar variables, explorar hexágonos, comparar dimensiones |
| Tomador de decisiones | Mapa de calor general, reportes profesionales |
| Administrador | Gestión de usuarios y accesos |

---

## 3. Datos de Entrada

### 3.1 Modelo de Datos (Recibido)

El equipo NO es responsable del modelo multicriterio. Se reciben archivos `.h3.parquet` generados por el equipo de investigación con los datos ya procesados.

**Formato:** `.h3.parquet` indexado por `h3_index`

**Estructura esperada por registro:**

```
h3_index           | string  — ID hexagonal H3
score_general      | float   — Promedio viabilidad 5 dimensiones
dim_tecnica        | float   — Score dimensión técnica
dim_ambiental      | float   — Score dimensión ambiental
dim_socioeconomica | float   — Score dimensión socioeconómica
dim_regulatoria    | float   — Score dimensión regulatoria
dim_macroeconomica | float   — Score dimensión macroeconómica
var_*              | float   — Variables individuales (velocidad viento, pendiente, etc.)
tipo_celda         | string  — "disponible" | "excluida"
metadata_*         | json    — Origen y vigencia de cada variable
```

### 3.2 Tipos de Columnas en el .parquet

- **Variables informativas** — Contexto, no alteran score
- **Scores** — Valores calculados por dimensión y general
- **Incluyentes** — Variables que entran al cálculo multicriterio
- **Celdas excluidas** — Hexágonos marcados como no viables
- **Metadata** — Origen y vigencia de cada variable para trazabilidad

### 3.3 Consideraciones

- Desarrollar pensando en integrar datos actuales + futuros (modelo en construcción)
- Los scores pueden ser preliminares hasta que el modelo completo esté listo
- La arquitectura debe permitir agregar nuevas variables/dimensiones sin cambios estructurales

---

## 4. Exclusiones del Scope (Primera Entrega)

- No incluye desarrollo del modelo multicriterio de análisis
- No incluye mantenimiento del modelo multicriterio
- No incluye despliegue y operación del modelo multicriterio
- No incluye integración con sistemas externos no especificados
- No incluye migración de datos históricos previos al proyecto
- ~~No incluye análisis offshore~~ — **ACTUALIZADO:** SÍ incluye offshore + insular (FB-04 — cartografía IGAC + mar territorial + San Andrés/Providencia)
- ~~No incluye backend API~~ — **ACTUALIZADO (ADR-007):** SÍ incluye backend con Clean Architecture + DDD desde primera entrega

---

## 5. Notas Técnicas

- **Resolución H3:** Adaptativa según zoom (res 3–8) sobre arquitectura **tile-based** (ADR-008) — se renderizan solo los hexágonos visibles, no toda Colombia de una vez
- **Stack confirmado (frontend):** Next.js 16 + React 19 + Tailwind v4 · mapas DeckGL + MapLibre GL + h3-js (ADR-001)
- **Stack confirmado (backend):** FastAPI (Python) con Clean Architecture + DDD, repos separados (ADR-007)
- **Identidad:** Keycloak (realm `vento`, OIDC + PKCE) vía NextAuth (ADR-005)
- **Datos:** el backend FastAPI lee el `.h3.parquet` y sirve **tiles** por viewport (ADR-011) — el frontend ya no parsea parquet en el navegador
- **CRS:** EPSG:4326 estándar para todo el pipeline
- **Diseños:** Figma del discovery (referencia visual)

---

## 6. Índice de Documentos de Especificación

| Documento | Ruta | Descripción |
|-----------|------|-------------|
| Spec (este archivo) | `docs/Spec_doc.md` | Especificaciones generales del proyecto |
| Índice maestro | `docs/README.md` | Punto de entrada y **estado vivo** del proyecto |
| Estado / historial | `docs/project-status.md` | Estado general + historial de scopes/feedback/sprints + índice de docs |
| Arquitectura del sistema | `docs/architecture/architecture.md` | Arquitectura (actual y futura) |
| Validación del stack | `docs/architecture/tech-stack-validation.md` | Stack real usado y por qué (retrospectiva práctica) |
| Integración FE↔BE | `docs/architecture/frontend-backend-integration.md` | Cómo Next.js se conecta a FastAPI (rewrites/proxy) |
| Tecnologías (comparativa) | `docs/architecture/tecnologias.md` | Opciones tecnológicas evaluadas (pre-decisión) |
| Decisiones de arquitectura | `docs/adr/` | 13 ADRs (ADR-001 … ADR-014). Estado de cada uno en el índice maestro |
| Stories — Scope 1 | `docs/stories/scope-primera-entrega.md` | Historias de la primera entrega |
| Stories — Scope 2 | `docs/stories/scope-segunda-entrega.md` | Historias de la segunda entrega |
| Stories — 3ª entrega | `docs/stories/scope-tercera-entrega.md` | Guía de la tercera entrega (feedback v2 + catálogo definitivo) |
| Feedback v1 / v2 | `docs/stories/feedback-cliente-v1.md` · `feedback-1-round2.md` · `feedback-cliente-v2.md` | Rondas de feedback del cliente |
| Reporte de entrega 3 | `Reportes_Entregas/entrega-3/scope-3-entregado.md` | Cierre de la 3ª entrega + guía de modo template → datos reales |
