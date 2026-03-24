---
version: 1.1
project: Vento
date: 2026-03-24
author: mavalan Software
status: draft
---

# Especificaciones del Proyecto Vento

## 1. Visión General

Herramienta web SIG multicriterio para evaluar la viabilidad de proyectos de energía eólica (onshore y offshore) en el territorio colombiano. Integra 5 dimensiones de análisis sobre un mapa interactivo basado en hexágonos H3, con respaldo institucional de ANH y EAFIT.

### 1.0 Flujo Esperado del Usuario (Completo)

| Paso | Acción | Scope |
|------|--------|-------|
| 1 | Login de usuario (Keycloak — correo general) | Primera entrega |
| 2 | Selección de área en mapa interactivo (hexágonos H3) | Primera entrega |
| 3 | Configurar variables agrupadas por dimensión (Técnica, Ambiental, Regulatoria, Socioeconómica, Macroeconómica) | Futuro (US-F17) |
| 4 | Insertar características del proyecto (capacidad MW, tipo turbina, etc.) | Futuro (US-F18) |
| 5 | Informe de viabilidad del área seleccionada con opción de descarga | Futuro (US-F10, US-F19) |
| 6 | Ver historial de informes | Futuro (US-F11) |

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
- No incluye análisis offshore (pendiente definir proceso)
- ~~No incluye backend API~~ — **ACTUALIZADO (ADR-007):** SÍ incluye backend con Clean Architecture + DDD desde primera entrega

---

## 5. Notas Técnicas

- **Resolución H3:** Nivel zonal (res 5-6), NO nivel de metros. Colombia ~ 4,500-31,000 hexágonos
- **Rendimiento:** A esta resolución, carga completa de datos viable sin paginación ni tiles
- **Tecnologías confirmadas:** PostgreSQL, PostGIS, H3, Docker, Keycloak (ADR-005)
- **Tecnologías por confirmar:** Framework frontend (Angular vs React), librería de mapas, tecnología backend (FastAPI vs NestJS)
- **Diseños:** Existen diseños en Figma del discovery (referencia visual)
- **CRS:** EPSG:4326 estándar para todo el pipeline
- **Datos:** Se recibe .h3.parquet → pre-proceso a JSON → frontend consume directamente

---

## 6. Índice de Documentos de Especificación

| Documento | Ruta | Descripción |
|-----------|------|-------------|
| Spec (este archivo) | `docs/spec/Spec_doc.md` | Especificaciones generales del proyecto |
| Arquitectura | `docs/spec/architecture/architecture.md` | Arquitectura del sistema (actual y futura) |
| ADR-001 Stack Frontend | `docs/spec/adr/ADR-001-stack-frontend.md` | Decisión de stack frontend |
| ADR-002 Resolución H3 | `docs/spec/adr/ADR-002-resolucion-h3.md` | Decisión de resolución geoespacial |
| ADR-003 Sin Backend API | `docs/spec/adr/ADR-003-sin-backend-api-inicial.md` | Decisión de postergar backend API |
| ADR-004 Equipo y Viabilidad | `docs/spec/adr/ADR-004-equipo-viabilidad-1-mes.md` | Análisis viabilidad 1 mes con equipo actual |
| ADR-005 Keycloak Identidad | `docs/spec/adr/ADR-005-keycloak-identidad.md` | Keycloak como proveedor de identidad desde primera entrega |
| ADR-006 Storage y Cache Datos | `docs/spec/adr/ADR-006-storage-cache-datos-geoespaciales.md` | Storage, cache y entrega de datos geoespaciales (decisión pendiente) |
| ADR-007 Backend + DDD + Monorepo | `docs/spec/adr/ADR-007-backend-clean-architecture-ddd-monorepo.md` | Backend con Arquitectura Limpia, DDD y estructura monorepo |
| Tecnologías Aplicables | `docs/spec/architecture/tecnologias.md` | Comparativa de todas las opciones tecnológicas |
| Resumen e Índice Proyecto | `docs/spec/project-status.md` | Estado general, actividades y ruta recomendada |
| Stories — Primera Entrega | `docs/spec/stories/scope-primera-entrega.md` | 11 historias del scope primera entrega |
| Stories — Futuros Sprints | `docs/spec/stories/futuros-sprints.md` | 19 historias para entregas futuras (incluye flujo usuario pasos 3-6) |
| Reunión Pendiente | `docs/spec/reunion-pendiente-decisiones-arquitectura.md` | Convocatoria reunión multidisciplinaria para decisiones arquitectónicas |
