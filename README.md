# Vento

**Herramienta SIG multicriterio para identificar zonas con potencial eolico en Colombia.**

Un convenio entre **ANH** (Agencia Nacional de Hidrocarburos) y **EAFIT** para acelerar la transicion energetica del pais.

---
## Que es Vento?
Vento es una aplicacion web que muestra un **mapa interactivo de Colombia** dividido en miles de hexagonos. Cada hexagono tiene un **puntaje de viabilidad** que indica que tan factible es instalar un parque eolico en esa zona.

| Pregunta | Respuesta |
|----------|-----------|
| Que problema resuelve? | Evaluar donde instalar parques eolicos toma semanas y requiere cruzar datos de muchas fuentes. Vento lo centraliza en un solo mapa. |
| Para quien es? | Analistas de energia, investigadores y tomadores de decisiones de ANH/EAFIT. |
| Que muestra el mapa? | Un mapa de calor donde los colores indican viabilidad: zonas rojas/calidas = alto potencial, zonas frias = bajo potencial. |
| Que dimensiones evalua? | 5: Tecnica, Ambiental, Regulatoria, Socioeconomica y Macroeconomica. |
| De donde vienen los datos? | El equipo de investigacion genera archivos `.h3.parquet` con los datos ya procesados por un modelo multicriterio  |

---

## Flujo del Usuario

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUJO COMPLETO DEL USUARIO                       │
│                                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  LOGIN   │───►│  MAPA SIG    │───►│  SELECCION   │                   │
│  │          │    │  INTERACTIVO │    │  DE AREA     │                   │
│  │ Correo   │    │              │    │              │                   │
│  │ instit.  │    │ Mapa de calor│    │ Click en     │                   │
│  │ + pwd    │    │ con hexagonos│    │ hexagonos    │                   │
│  └──────────┘    └──────┬───────┘    └──────┬───────┘                   │
│                         │                   │                           │
│                         ▼                   ▼                           │
│                  ┌──────────────┐    ┌──────────────────┐               │
│                  │  FILTRADO    │    │  POPUP DETALLE   │               │
│                  │              │    │                  │               │
│                  │ Cambiar var. │    │ Score + variables│               │
│                  │ del mapa de  │    │ del hexagono     │               │
│                  │ calor        │    │ seleccionado     │               │
│                  └──────────────┘    └──────────────────┘               │
│                                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ FUTURO ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ CONFIGURAR   │───►│  INFORME DE  │───►│  HISTORIAL   │               │
│  │ VARIABLES    │    │  VIABILIDAD  │    │  DE INFORMES │               │
│  │              │    │              │    │              │               │
│  │ Por dimension│    │ Generacion   │    │ Consultar    │               │
│  │ + parametros │    │ automatica   │    │ analisis     │               │
│  │ tecnicos     │    │ + descarga   │    │ anteriores   │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Paso a paso

| # | Paso | Que hace el usuarios | Que hace Vento | Entrega |
|---|------|---------------------|----------------|---------|
| 1 | **Login** | Ingresa correo institucional y contrasena | Valida dominio autorizado (ANH/EAFIT), emite token JWT | Primera |
| 2 | **Ver mapa** | Navega, hace zoom y pan sobre Colombia | Renderiza ~4,500-31,000 hexagonos H3 con mapa de calor por score general | Primera |
| 3 | **Filtrar** | Selecciona una variable especifica del selector | Re-colorea el mapa con los valores de esa variable en vez del score general | Primera |
| 4 | **Explorar** | Hace click en un hexagono | Muestra popup con score, 2-3 variables secundarias y el ID H3 | Primera |
| 5 | **Seleccionar area** | Hace click en multiples hexagonos | Resalta la zona seleccionada y muestra area aproximada | Primera |
| 6 | **Configurar analisis** | Elige variables por dimension y parametros tecnicos (tipo turbina, MW) | Recalcula scores con el modelo multicriterio | Futura |
| 7 | **Generar informe** | Solicita informe de la zona seleccionada | Genera reporte con desglose por dimension en <30 segundos | Futura |
| 8 | **Descargar** | Click en "Descargar PDF" | Genera PDF con branding institucional ANH/EAFIT | Futura |
| 9 | **Historial** | Accede a la seccion de informes anteriores | Muestra lista cronologica de analisis previos | Futura |

---

## Que se entrega y cuando?

### Primera Entrega (Sprint 1-4)

Lo que el usuario puede hacer desde el dia uno:

| Modulo | Funcionalidad | Estado |
|--------|--------------|--------|
| **Login** | Acceso con correo institucional, recuperacion de contrasena, proteccion de rutas | Por construir |
| **Mapa interactivo** | Mapa de Colombia con hexagonos H3, mapa de calor, filtrado por variable, popups, seleccion de area | Por construir |
| **Admin** | Crear, ver, editar y eliminar usuarios del sistema | Por construir |
| **Infraestructura** | Script de datos, base de datos, Docker, CI/CD, micro-API | Por construir |

### Entregas Futuras (Sprint 5+)

| Modulo | Funcionalidad |
|--------|--------------|
| **Backend API** | API REST completa con FastAPI, reemplaza consumo de datos estaticos |
| **Reportes** | Generacion de informes de viabilidad, descarga PDF, historial |
| **Modelo multicriterio** | Configuracion de variables por dimension, parametros tecnicos del proyecto |
| **Offshore** | Analisis de zonas maritimas con variables especificas (batimetria, oleaje) |
| **Roles avanzados** | Sistema de permisos por rol (Admin, Analista, Visor) y auditoria |
| **Analisis avanzado** | Sensibilidad de pesos, comparacion de escenarios, validacion TOPSIS |

---

## Arquitectura

### Primera Entrega

```
┌────────────────────────────────────────────────────────────┐
│                   NAVEGADOR DEL USUARIO                    │
│                                                            │
│  ┌────────────┐  ┌───────────────────┐  ┌──────────────┐  │
│  │  Modulo    │  │  Modulo Mapa SIG  │  │  Modulo      │  │
│  │  Auth      │  │  (Leaflet + H3)   │  │  Admin       │  │
│  │  (Login)   │  │                   │  │  (CRUD)      │  │
│  └─────┬──────┘  └────────┬──────────┘  └──────┬───────┘  │
│        │                  │                    │           │
│        │     ┌────────────┴────────────┐       │           │
│        │     │  JSON/GeoJSON estatico  │       │           │
│        │     │  (hexagonos H3)         │       │           │
│        │     └─────────────────────────┘       │           │
│        │                                       │           │
└────────┼───────────────────────────────────────┼───────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────────────────────────────────────────────┐
│              MICRO-API  (Auth + Users)                  │
│         POST /auth/login    GET /users                  │
│         POST /auth/reset    POST/PUT/DELETE /users      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL + PostGIS                        │
│         Tablas: users, sessions, password_resets         │
└─────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────┐
         │  Script Python (offline)        │
         │  .h3.parquet ──► JSON estatico  │
         └─────────────────────────────────┘
```

### Arquitectura Futura

```
┌─────────────────────────────────────────────────────────┐
│                  NAVEGADOR DEL USUARIO                   │
│   Mapa SIG  │  Reportes  │  Admin/Auth  │  Config MCDM  │
└──────┬──────────────┬──────────────┬────────────┬───────┘
       │              │              │            │
       ▼              ▼              ▼            ▼
┌─────────────────────────────────────────────────────────┐
│                  API REST (FastAPI)                      │
│  /hexagons  /reports  /users  /auth  /variables         │
│  /filters   /metadata /sensitivity                      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              PostgreSQL + PostGIS + H3                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Datos H3     │  │ Usuarios     │  │ Modelo MCDM  │  │
│  │ (.parquet    │  │ Roles        │  │ (integracion │  │
│  │  importados) │  │ Auditoria    │  │  futura)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Stack Tecnologico

| Capa | Tecnologia | Por que? |
|------|-----------|----------|
| Frontend | Angular 17+ o React | Segun experiencia del equipo |
| Mapas | Leaflet + plugin H3 (Canvas) | Suficiente para ~30K hexagonos, maduro y documentado |
| Autenticacion | JWT | Estandar, stateless, simple |
| Base de datos | PostgreSQL + PostGIS | Ya existe en el pipeline de investigacion |
| Pre-proceso | Python + pandas + pyarrow | Compatible con pipeline existente |
| Contenedores | Docker + docker-compose | Despliegue consistente |
| Backend API (futuro) | FastAPI | Se implementa cuando se necesiten reportes y datos dinamicos |

---

## Datos y Hexagonos H3

### De donde vienen los datos?

```
Equipo de investigacion
        │
        │  Genera archivo .h3.parquet
        │  (modelo multicriterio ya procesado)
        │
        ▼
Script de pre-proceso (Python)
        │
        │  Convierte a JSON/GeoJSON
        │  Valida integridad de datos
        │
        ▼
JSON estatico servido como asset del frontend
        │
        ▼
El mapa renderiza los hexagonos
```

### Que contiene cada hexagono?

| Campo | Descripcion | Ejemplo |
|-------|------------|---------|
| `h3_index` | Identificador unico del hexagono en el sistema H3 | `85283473fffffff` |
| `score_general` | Promedio de viabilidad de las 5 dimensiones (0-1) | `0.73` |
| `tipo_celda` | Si el hexagono es activo o excluido | `activa` / `excluida` |
| Variables | Valores individuales por variable (velocidad viento, pendiente, etc.) | `6.2 m/s` |
| Metadata | Origen y vigencia de cada variable | `GWA 2024` |

### Tipos de variables

| Tipo | Que hace | Ejemplo |
|------|---------|---------|
| **Excluyente** | Descarta zonas automaticamente (si/no) | Area protegida, cuerpo de agua |
| **De decision** | Contribuye al score con valor graduado | Velocidad de viento, densidad energetica |
| **Penalizante** | Reduce el score sin excluir completamente | Pendiente pronunciada, distancia a red electrica |
| **Informativa** | No afecta el score, pero ayuda a interpretar | Direccion del viento, composicion del terreno |

### Dimensiones de analisis

| Dimension | Que evalua |
|-----------|-----------|
| **Tecnica** | Recurso eolico, condiciones geologicas, logistica, implementacion |
| **Ambiental** | Areas protegidas, impacto ecosistemas, restricciones ambientales |
| **Regulatoria** | Normativa vigente, permisos, zonas de exclusion legal |
| **Socioeconomica** | Impacto en comunidades, acceso, infraestructura social |
| **Macroeconomica** | Costos, retorno de inversion, viabilidad financiera |

---

## Estructura del Proyecto

```
Vento-/
├── docs/
│   ├── project_knowledge.md          # Contexto completo del proyecto
│   └── spec/
│       ├── architecture/
│       │   └── architecture.md        # Arquitectura del sistema
│       └── adr/                       # Decisiones arquitectonicas
│           ├── ADR-001-stack-frontend.md
│           ├── ADR-002-resolucion-h3.md
│           ├── ADR-003-sin-backend-api-inicial.md
│           └── ADR-004-equipo-viabilidad-1-mes.md
├── _bmad-output/
│   └── planning-artifacts/
│       └── epics.md                   # Epicas e historias de usuario
└── _bmad/                             # Configuracion BMAD (agentes de planificacion)
```

---

## Epicas del Proyecto

### Primera Entrega

| # | Epica | Historias | Prioridad |
|---|-------|----------|-----------|
| E1 | Fundacion y Setup | 6 (scaffold, datos, BD, Docker, spike H3, micro-API) | Critica |
| E2 | Autenticacion Institucional | 4 (login, dominio, recuperar pwd, rutas) | Alta |
| E3 | Mapa SIG Interactivo H3 | 9 (mapa, hexagonos, calor, filtro, popup, decorativos, dato central, seleccion area, panel control) | Critica |
| E4 | Administracion de Usuarios | 3 (crear, listar, editar/eliminar) | Media |
| E5 | Integracion, QA y Despliegue | 3 (integracion, testing E2E, deploy) | Alta |

### Entregas Futuras

| # | Epica | Historias |
|---|-------|----------|
| E6 | Backend API REST (FastAPI) | 5 |
| E7 | Reportes e Informes de Viabilidad | 3 |
| E8 | Integracion Modelo Multicriterio | 3 |
| E9 | Analisis Maritimo (Offshore) | 3 |
| E10 | Sistema de Roles y Permisos | 3 |
| E11 | Analisis Avanzado y Sensibilidad | 3 |

> Detalle completo de todas las historias con criterios de aceptacion en [`_bmad-output/planning-artifacts/epics.md`](_bmad-output/planning-artifacts/epics.md)

---

## Mapa de Dependencias

```
                    PRIMERA ENTREGA
                    ═══════════════

E1.1 Scaffold ──► E1.5 Spike H3 ──► E1.2 Pre-proceso ──► E3 Mapa SIG
                                                                │
E1.1 Scaffold ──► E1.3 BD ──► E1.6 Micro-API ──► E2 Auth       │
                                                    │           │
                                                    ▼           ▼
                                             E4 Admin    E5 Integracion + Deploy


                    ENTREGAS FUTURAS
                    ════════════════

E1.6 Micro-API ──► E6 Backend API ──┬──► E7 Reportes
                                    ├──► E8 MCDM ──► E9 Offshore
                                    ├──► E10 Roles     E11 Analisis Avanzado
                                    └──► E8 MCDM ──► E11 Analisis Avanzado
```

---

## Equipo y Contexto

| Aspecto | Detalle |
|---------|---------|
| Institucion | Convenio ANH - Universidad EAFIT |
| Fase del proyecto | Fase 2 (Desarrollo de herramienta SIG) con criterios para Fase 3 |
| Equipo dev | 1 desarrollador fulltime + 2 part-time |
| Plazo primera entrega | 1 mes (~230h de 320h disponibles) |
| Metodologia | Agile con BMAD framework para planificacion asistida por IA |

---

## Decisiones Arquitectonicas (ADR)

| ADR | Decision | Justificacion |
|-----|----------|---------------|
| ADR-001 | Angular/React + Leaflet (sin WebGL pesado) | A res H3 nivel 5-6, Leaflet con Canvas es suficiente para ~30K hexagonos |
| ADR-002 | Resolucion H3 nivel 5-6 | Balance entre precision y rendimiento (~4,500-31,000 hexagonos) |
| ADR-003 | Sin backend API en primera entrega | Reduce complejidad; el equipo se concentra en mapa + login + admin |
| ADR-004 | Viabilidad equipo 1 mes | 230h estimadas de 320h disponibles; scope ajustado a lo esencial |

---

## Glosario

| Termino | Significado |
|---------|------------|
| **H3** | Sistema de indexacion hexagonal creado por Uber. Divide el planeta en hexagonos de diferentes resoluciones. Vento usa resolucion 5-6. |
| **SIG** | Sistema de Informacion Geografica. Software para capturar, gestionar y visualizar datos georreferenciados. |
| **MCDM** | Multi-Criteria Decision Making. Modelo matematico que pondera multiples variables para calcular un score de viabilidad. |
| **AHP** | Analytic Hierarchy Process. Metodo para asignar pesos a los criterios del modelo multicriterio. |
| **Score general** | Promedio ponderado de viabilidad considerando las 5 dimensiones. Valor entre 0 (no viable) y 1 (altamente viable). |
| **Hexagono excluido** | Zona donde no es posible instalar (area protegida, cuerpo de agua, etc.). Se muestra en el mapa pero no es interactuable. |
| **Parquet** | Formato de archivo columnar eficiente para datos grandes. El equipo de investigacion entrega los datos en `.h3.parquet`. |
| **JWT** | JSON Web Token. Estandar para autenticacion segura sin estado en el servidor. |
| **HAWT/VAWT** | Tipos de turbina eolica: eje horizontal (HAWT, las clasicas) y eje vertical (VAWT, para vientos turbulentos). |
| **Offshore/Onshore** | Offshore = instalacion en el mar. Onshore = instalacion en tierra firme. |
| **LCOE** | Levelized Cost of Energy. Costo promedio de generar electricidad durante la vida util del proyecto. |
