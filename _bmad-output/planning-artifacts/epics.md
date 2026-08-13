---
stepsCompleted: ['step-01-validate', 'step-02-design-epics', 'step-03-stories']
inputDocuments:
  - 'docs/project_knowledge.md'
  - 'docs/spec/architecture/architecture.md'
  - 'docs/spec/adr/ADR-001-stack-frontend.md'
  - 'docs/spec/adr/ADR-003-sin-backend-api-inicial.md'
---

# Vento — Desglose de Épicas e Historias de Usuario

**Autor:** mavalan Software
**Fecha:** 2026-03-24
**Versión:** 1.0

---

## Índice de Relaciones y Conexiones

### Mapa Visual de Dependencias

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                           VENTO — MAPA DE RELACIONES                                 ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║  ┌────────────────────────────────────────────────────────────────────────────────┐   ║
║  │                      PRIMERA ENTREGA (Sprint 1-4)                             │   ║
║  │                                                                               │   ║
║  │  EPIC 1: Fundación ────────────────────────────────────────┐                  │   ║
║  │  [E1.1] Scaffold proyecto                                  │                  │   ║
║  │  [E1.2] Pre-proceso .parquet→JSON + validación ──┐         │                  │   ║
║  │  [E1.3] Esquema BD usuarios/sesiones              │         │                  │   ║
║  │  [E1.4] CI/CD + Docker                            │         │                  │   ║
║  │  [E1.5] Spike/PoC H3+Leaflet (Semana 1) ─────────┤         │                  │   ║
║  │  [E1.6] Micro-API Auth/Users ─────────────────────┤         │                  │   ║
║  │         │                                         │         │                  │   ║
║  │         ▼                                         ▼         ▼                  │   ║
║  │  EPIC 2: Auth ◄────────────────── EPIC 3: Mapa SIG ◄── EPIC 4: Admin        │   ║
║  │  [E2.1] Login + hasheo        [E3.1] Mapa base Colombia  [E4.1] CRUD         │   ║
║  │  [E2.2] Dominio inst.         [E3.2] Renderizado H3      [E4.2] Listado      │   ║
║  │  [E2.3] Recuperar pwd            + loading indicator      [E4.3] Validación   │   ║
║  │  [E2.4] Protección rutas      [E3.3] Mapa de calor                           │   ║
║  │         │                      [E3.4] Filtrado variables                      │   ║
║  │         │                      [E3.5] Popup hexágonos                         │   ║
║  │         │                      [E3.6] Hex. decorativos                        │   ║
║  │         │                      [E3.7] Dato central hex.                       │   ║
║  │         │                      [E3.8] Selección multi-hex (área)              │   ║
║  │         │                      [E3.9] Panel control + leyenda + selector      │   ║
║  │         │                               │                                     │   ║
║  │         ▼                               ▼                                     │   ║
║  │  ─────────────────── EPIC 5: Integración y QA ───────────────                │   ║
║  │  [E5.1] Integración módulos                                                   │   ║
║  │  [E5.2] Testing E2E                                                           │   ║
║  │  [E5.3] Despliegue producción                                                 │   ║
║  └────────────────────────────────────────────────────────────────────────────────┘   ║
║         │                            │                                                ║
║         ▼                            ▼                                                ║
║  ┌────────────────────────────────────────────────────────────────────────────────┐   ║
║  │                      ENTREGAS FUTURAS (Sprint 5+)                             │   ║
║  │                                                                               │   ║
║  │  EPIC 6: Backend API ◄────── EPIC 7: Reportes ◄──── EPIC 8: MCDM           │   ║
║  │  [E6.1] FastAPI setup      [E7.1] Informe viabil.  [E8.1] Integración       │   ║
║  │  [E6.2] Endpoints hex.    [E7.2] Descarga PDF      [E8.2] Config vars       │   ║
║  │  [E6.3] Endpoints users   [E7.3] Historial          [E8.3] Config turb.     │   ║
║  │  [E6.4] Migración JSON→API                                                   │   ║
║  │  [E6.5] Proceso actualiz. datos                                               │   ║
║  │         │                         │                    │                      │   ║
║  │         ▼                         ▼                    ▼                      │   ║
║  │  EPIC 9: Marítimo ◄──── EPIC 10: Roles ◄──── EPIC 11: Avanzado             │   ║
║  │  [E9.1] Análisis offshore [E10.1] Sistema roles  [E11.1] Sensibilidad      │   ║
║  │  [E9.2] Variables marinas [E10.2] Permisos       [E11.2] Comparación        │   ║
║  │  [E9.3] Batimetría       [E10.3] Auditoría      [E11.3] TOPSIS             │   ║
║  └────────────────────────────────────────────────────────────────────────────────┘   ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

### Matriz de Trazabilidad: Requisitos → Épicas → Historias

```
┌────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ REQ    │ EP1  │ EP2  │ EP3  │ EP4  │ EP5  │ EP6  │ EP7  │ EP8  │ EP9  │ EP10 │ EP11 │
├────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ FR01   │      │ E2.1 │      │      │      │      │      │      │      │      │      │
│ FR02   │      │ E2.2 │      │      │      │      │      │      │      │      │      │
│ FR03   │      │ E2.3 │      │      │      │      │      │      │      │      │      │
│ FR04   │      │      │ E3.1 │      │      │      │      │      │      │      │      │
│ FR05   │      │      │E3.2-3│      │      │      │      │      │      │      │      │
│ FR06   │      │      │ E3.3 │      │      │      │      │      │      │      │      │
│ FR07   │      │      │ E3.4 │      │      │      │      │      │      │      │      │
│ FR08   │      │      │ E3.5 │      │      │      │      │      │      │      │      │
│ FR09   │      │      │ E3.6 │      │      │      │      │      │      │      │      │
│ FR10   │      │      │ E3.7 │      │      │      │      │      │      │      │      │
│ FR11   │      │      │      │ E4.1 │      │      │      │      │      │      │      │
│ FR12   │ E1.2 │      │      │      │      │      │      │      │      │      │      │
│ FR20   │ E1.3 │      │      │      │      │      │      │      │      │      │      │
│ FR13   │      │      │      │      │      │ E6.1 │      │      │      │      │      │
│ FR14   │      │      │      │      │      │      │ E7.1 │      │      │      │      │
│ FR15   │      │      │      │      │      │      │ E7.3 │      │      │      │      │
│ FR16   │      │      │      │      │      │      │      │E8.1-3│      │      │      │
│ FR17   │      │      │      │      │      │      │      │      │E9.1-3│      │      │
│ FR18   │      │      │      │      │      │      │      │      │      │E10.1 │      │
│ FR19   │      │      │      │      │      │      │ E7.2 │      │      │      │      │
│ FR21   │      │      │ E3.8 │      │      │      │      │      │      │      │      │
│ FR22   │ E1.6 │      │      │      │      │      │      │      │      │      │      │
│ FR23   │ E1.2 │      │      │      │      │      │      │      │      │      │      │
│ FR24   │      │      │      │      │      │ E6.5 │      │      │      │      │      │
├────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ NFR01  │ E1.5 │      │ E3.2 │      │      │      │      │      │      │      │      │
│ NFR02  │      │ E2.1 │      │      │      │      │      │      │      │      │      │
│ NFR03  │ E1.4 │      │      │      │ E5.3 │      │      │      │      │      │      │
│ NFR04  │      │      │ E3.4 │      │      │      │      │      │      │      │      │
│ NFR05  │      │ E2.4 │      │      │      │      │      │      │      │      │      │
│ NFR06  │      │      │ E3.1 │      │      │      │      │      │      │      │      │
│ NFR07  │      │      │      │      │      │      │      │      │      │      │E11.1 │
│ NFR08  │      │      │      │      │      │ E6.2 │      │      │      │      │      │
│ NFR09  │      │      │      │      │      │      │      │      │      │E10.3 │      │
│ NFR10  │ E1.2 │      │      │      │      │      │      │      │      │      │      │
│ NFR11  │      │      │ E3.2 │      │      │      │      │      │      │      │      │
│ NFR12  │ E1.6 │ E2.1 │      │      │      │      │      │      │      │      │      │
│ NFR13  │      │      │ E3.2 │      │      │      │      │      │      │      │      │
└────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

---

## Inventario de Requisitos

### Requisitos Funcionales (FR)

```
FR01: El sistema debe permitir login via Keycloak (OIDC) con correo electrónico general y contraseña (US01, ADR-005)
FR02: El sistema debe validar correo electrónico (NO restringido a dominio  — abierto a profesionales de todo el país)
FR03: El sistema debe ofrecer enlace y flujo de recuperación de contraseña
FR04: El sistema debe cargar y mostrar mapa base de Colombia con Leaflet
FR05: El sistema debe renderizar hexágonos H3 (res 5-6, ~4,500-31,000) sobre el mapa
FR06: El sistema debe colorear hexágonos como mapa de calor según score_general (promedio idoneidad de todas las dimensiones)
FR07: El sistema debe permitir filtrar el mapa de calor por variable crítica específica, re-renderizando con la variable seleccionada en vez del score general
FR08: Al hacer click en un hexágono, debe mostrar popup con: score usado en mapa de calor + 2-3 variables secundarias importantes
FR09: Los hexágonos excluidos/no disponibles deben renderizarse como decorativos (visibles pero no interactuables ni calculables)
FR10: Cada hexágono debe mostrar un dato central que determina el color del mapa de calor (score general o variable filtrada)
FR11: El sistema debe permitir CRUD completo de usuarios (Crear, Leer, Actualizar, Borrar) — US08
FR12: Debe existir un script de pre-procesamiento que convierta .h3.parquet → JSON/GeoJSON estático para consumo del frontend
FR13: [FUTURO] El sistema debe exponer API REST (FastAPI) con endpoints: /hexagons, /reports, /users, /auth, /variables, /filters, /metadata
FR14: [FUTURO] El sistema debe generar informes de idoneidad del área seleccionada en menos de 30 segundos
FR15: [FUTURO] El sistema debe mantener historial de informes con opción de ver análisis previos
FR16: [FUTURO] El sistema debe integrar el modelo multicriterio MCDM con configuración de variables por dimensión (Técnica, Ambiental, Regulatoria, Socioeconómica, económica)
FR17: [FUTURO] El sistema debe soportar análisis de variables en áreas marítimas (offshore)
FR18: [FUTURO] El sistema debe implementar sistema de roles avanzado para usuarios
FR19: [FUTURO] El sistema debe permitir descarga de informes de idoneidad
FR20: El sistema debe tener esquema de base de datos PostgreSQL+PostGIS para usuarios, sesiones y recuperación de contraseña
FR21: El sistema debe permitir seleccionar múltiples hexágonos como área de análisis (selección territorial)
FR22: El sistema debe contar con un backend (Clean Architecture + DDD) para validar tokens Keycloak, servir datos geoespaciales y exponer endpoints protegidos (ADR-007)
FR23: El sistema debe validar la integridad de los datos pre-procesados (conteo de hexágonos, rangos de scores, estructura JSON)
FR24: [FUTURO] El sistema debe importar nuevas versiones del .parquet mediante un proceso documentado de actualización de datos
```

### Requisitos No Funcionales (NFR)

```
NFR01: Rendimiento — El frontend debe renderizar ~30,000 hexágonos H3 sin degradación perceptible usando Leaflet Canvas renderer
NFR02: Seguridad — Autenticación basada en JWT stateless con tokens seguros
NFR03: Despliegue — La aplicación debe ejecutarse en contenedores Docker
NFR04: Rendimiento Mapa — El re-renderizado del mapa de calor al cambiar filtro de variable debe completarse en <2 segundos
NFR05: Seguridad — Las rutas protegidas no deben ser accesibles sin sesión JWT válida
NFR06: Usabilidad — El mapa debe ser responsivo e interactivo (zoom, pan, click) en navegadores modernos
NFR07: [FUTURO] Robustez — El análisis de sensibilidad debe soportar variación de pesos ±10% sin degradación
NFR08: [FUTURO] Escalabilidad — La API REST debe soportar consultas concurrentes de múltiples usuarios
NFR09: [FUTURO] Trazabilidad — Toda acción de usuario debe registrarse para auditoría
NFR10: Datos — El pipeline de pre-procesamiento debe manejar metadatos de variables (origen, vigencia) para trazabilidad
NFR11: Resiliencia — El sistema debe mostrar estados de error claros cuando falle la carga de datos, la conexión a BD o servicios externos (sin pantallas en blanco)
NFR12: Seguridad — Las contraseñas deben almacenarse con hasheo seguro (bcrypt/argon2) y cumplir política mínima (8+ caracteres, al menos 1 mayúscula y 1 número)
NFR13: UX — El mapa debe mostrar indicador de carga/progreso mientras se cargan los hexágonos (~30K polígonos)
```

### Requisitos Adicionales (Arquitectura)

```
ARQ01: Stack Frontend: Angular 17+ o React + Leaflet (según experiencia equipo) — ADR-001
ARQ02: Resolución H3 nivel zonal: res 5-6 (~4,500-31,000 hexágonos) — ADR-002
ARQ03: Sin Backend API en primera entrega — datos pre-procesados como JSON estático — ADR-003
ARQ04: Base de datos PostgreSQL + PostGIS + H3 para usuarios y sesiones
ARQ05: Script pre-proceso en Python (pandas + pyarrow) compatible con pipeline existente
ARQ06: Datos .parquet contienen: h3_index, scores, variables, tipo_celda, metadata
ARQ07: Variables clasificadas como: excluyentes (binarias), decisión (graduadas), informativas (contexto), penalizantes (fricción)
ARQ08: Backend desde primera entrega con Clean Architecture + DDD (ADR-007, supersede ADR-003)
ARQ09: El sistema debe diseñarse pensando en integrar información actual + futura del modelo multicriterio
ARQ10: Keycloak como proveedor de identidad OIDC/OAuth2 desde primera entrega (ADR-005)
ARQ11: Estructura monorepo con workspaces: apps/web, apps/api, packages/shared-types, packages/h3-processor, infra/ (ADR-007)
ARQ12: Pipeline CI mínimo con lint, type-check, tests, build, audit de seguridad y branch protection (ADR-007)
ARQ13: Cache de datos geoespaciales en frontend via Service Worker + HTTP Cache + versionado con hash (ADR-006)
ARQ14: Variables de entorno documentadas en .env.example, secretos nunca en repositorio (ADR-007)
ARQ15: Storage definitivo de datos geoespaciales pendiente decisión: archivos (S3+CDN) vs API/BD — depende de cliente (ADR-006)
```

---

## Lista de Épicas

| # | Épica | Entrega | Prioridad | Dependencias |
|---|-------|---------|-----------|--------------|
| E1 | Fundación y Setup del Proyecto | Primera | Crítica | Ninguna |
| E2 | Autenticación  | Primera | Alta | E1 |
| E3 | Mapa SIG Interactivo con H3 | Primera | Crítica | E1 |
| E4 | Administración de Usuarios | Primera | Media | E1, E2 |
| E5 | Integración, QA y Despliegue | Primera | Alta | E2, E3, E4 |
| E6 | Backend API REST (FastAPI) | Futura | Alta | E1.6, E5 |
| E7 | Reportes e Informes de idoneidad | Futura | Alta | E6 |
| E8 | Integración Modelo Multicriterio (MCDM) | Futura | Alta | E6 |
| E9 | Análisis Marítimo (Offshore) | Futura | Media | E8 |
| E10 | Sistema de Roles y Permisos Avanzado | Futura | Media | E6 |
| E11 | Análisis Avanzado y Sensibilidad | Futura | Baja | E8 |

---

# ═══════════════════════════════════════════════
# PRIMERA ENTREGA
# ═══════════════════════════════════════════════

## Épica 1: Fundación y Setup del Proyecto

**Objetivo:** Establecer la base técnica del proyecto: scaffold, pipeline de datos, CI/CD y Docker, para que todos los módulos puedan construirse sobre una base sólida.

**Requisitos cubiertos:** FR12, FR20, FR22, FR23, NFR01, NFR03, NFR10, NFR13, ARQ01-ARQ06

---

### Historia 1.1: Scaffold del Proyecto Frontend

Como **desarrollador del equipo**,
Quiero tener el proyecto frontend inicializado con el stack definido (Angular/React + Leaflet),
Para que todos los miembros del equipo puedan comenzar a desarrollar sobre una base estandarizada.

**Criterios de Aceptación:**

**Dado** que no existe proyecto frontend inicializado
**Cuando** se ejecute el scaffold
**Entonces** debe crearse un proyecto Angular 17+ o React con:
- Estructura de carpetas por módulos (auth, map, admin, shared)
- Leaflet integrado como dependencia
- Configuración de linting y formateo
- Archivo de configuración de ambiente (dev/prod)
**Y** el proyecto debe compilar y ejecutar sin errores con `npm start`

---

### Historia 1.2: Script de Pre-procesamiento .parquet → JSON

Como **desarrollador del equipo**,
Quiero un script Python que convierta el archivo `.h3.parquet` a JSON/GeoJSON estático,
Para que el frontend pueda consumir los datos de hexágonos directamente como asset.

**Criterios de Aceptación:**

**Dado** un archivo `.h3.parquet` con columnas: h3_index, scores, variables, tipo_celda, metadata
**Cuando** se ejecute el script de pre-procesamiento
**Entonces** debe generar un archivo JSON/GeoJSON que contenga:
- Todos los hexágonos con su h3_index
- score_general (promedio de dimensiones)
- Variables críticas por hexágono
- Tipo de celda (activa/excluida)
- Metadatos de variables (origen, vigencia)
**Y** el archivo resultante debe ser <10MB para carga eficiente en navegador
**Y** debe ser reproducible (misma entrada = misma salida)
**Y** el script valida integridad de datos: conteo de hexágonos esperado, rangos de scores [0-1], ausencia de h3_index nulos/duplicados, estructura JSON válida (FR23)
**Y** se documenta el proceso de actualización: pasos para re-ejecutar cuando el equipo de investigación entregue nueva versión del .parquet

---

### Historia 1.3: Esquema de Base de Datos para Usuarios y Sesiones

Como **desarrollador del equipo**,
Quiero tener el esquema de base de datos PostgreSQL+PostGIS diseñado e implementado para usuarios y sesiones,
Para que los módulos de Auth y Admin tengan dónde persistir la información desde el inicio.

**Criterios de Aceptación:**

**Dado** que PostgreSQL+PostGIS está disponible (contenedor Docker)
**Cuando** se ejecuten las migraciones iniciales
**Entonces** se crean las tablas:
- `users` (id, nombre, correo, password_hash, dominio_email, estado, fecha_creación, fecha_actualización)
- `sessions` (id, user_id, token_jwt, fecha_creación, fecha_expiración)
- `password_resets` (id, user_id, token, fecha_expiración, usado)
**Y** se incluyen índices en correo (unique) y en user_id de sesiones
**Y** las migraciones son reproducibles y versionadas (scripts SQL o herramienta de migración)
**Y** se crea al menos un usuario administrador seed para desarrollo

---

### Historia 1.4: Configuración Docker y CI/CD Base

Como **desarrollador del equipo**,
Quiero tener Dockerfiles y pipeline CI/CD configurados,
Para que el proyecto se despliegue de forma consistente en cualquier entorno.

**Criterios de Aceptación:**

**Dado** el proyecto frontend scaffoldeado
**Cuando** se ejecute `docker-compose up`
**Entonces** debe levantar:
- Contenedor del frontend (servido por nginx o similar)
- Contenedor PostgreSQL + PostGIS (para usuarios/sesiones)
**Y** el pipeline CI debe ejecutar lint + build + tests en cada push
**Y** la imagen Docker debe construirse correctamente

---

### Historia 1.5: Spike/PoC — Validación Plugin H3 con Leaflet

Como **desarrollador del equipo**,
Quiero validar que el plugin H3 para Leaflet puede renderizar ~30K hexágonos con datos reales del .parquet,
Para que confirmemos la idoneidad técnica del stack antes de construir todo el módulo de mapa.

**Criterios de Aceptación:**

**Dado** una muestra real del archivo .h3.parquet convertida a JSON
**Cuando** se carga en un prototipo mínimo con Leaflet + plugin H3 + Canvas renderer
**Entonces** se renderizan los hexágonos correctamente sobre el mapa de Colombia
**Y** el rendimiento es aceptable (<5s carga inicial, sin lag al hacer pan/zoom)
**Y** se valida que los hexágonos responden a eventos click
**Y** se documenta si se requiere alguna optimización (clustering, lazy loading, etc.)
**Y** si el plugin NO funciona adecuadamente, se documenta la alternativa (Deck.gl, MapLibre)

> **Nota:** Este spike es prerrequisito de la Épica 3. Según ADR-001, debe realizarse en Semana 1.

---

### Historia 1.6: Servicio Backend Ligero para Auth y Usuarios (Micro-API)

Como **desarrollador del equipo**,
Quiero implementar un servicio backend mínimo que conecte el frontend con PostgreSQL para autenticación y gestión de usuarios,
Para que el frontend no necesite acceso directo a la base de datos (lo cual es inseguro e inviable).

**Criterios de Aceptación:**

**Dado** que la arquitectura define "sin backend API completo" pero se necesita persistencia de usuarios
**Cuando** se implementa el micro-servicio
**Entonces** expone endpoints mínimos:
- `POST /auth/login` — valida credenciales, emite JWT
- `POST /auth/reset-password` — inicia flujo de recuperación
- `GET /users` — lista usuarios (protegido)
- `POST /users` — crea usuario (protegido)
- `PUT /users/:id` — actualiza usuario (protegido)
- `DELETE /users/:id` — elimina/desactiva usuario (protegido)
**Y** se implementa en el mismo stack (Node/Express si Angular/React, o FastAPI ligero)
**Y** se incluye en el docker-compose como servicio adicional
**Y** las contraseñas se hashean con bcrypt o argon2 (NFR12)

> **Nota:** Esto NO es el backend API completo de la Épica 6. Es un servicio mínimo exclusivo para auth/users en primera entrega.

---

## Épica 2: Autenticación

**Objetivo:** Implementar acceso seguro con JWT o keycloack, incluyendo login, validación de dominio y recuperación de contraseña. (US01)

**Requisitos cubiertos:** FR01, FR02, FR03, NFR02, NFR05, NFR11, NFR12

---

### Historia 2.1: Pantalla e Integración de Login

Como **usuario**,
Quiero ingresar mi correo y contraseña para acceder a la plataforma,
Para que solo personas autorizadas puedan usar la herramienta.

**Criterios de Aceptación:**

**Dado** que el usuario está en la pantalla de login
**Cuando** ingresa correo y contraseña válidos
**Entonces** el sistema autentica vía JWT y redirige al mapa principal
**Y** el token JWT se almacena de forma segura (httpOnly o localStorage con expiración)

**Dado** que el usuario ingresa campos vacíos
**Cuando** intenta hacer login
**Entonces** el sistema muestra mensajes de validación por cada campo requerido

**Dado** que las credenciales son incorrectas
**Cuando** intenta hacer login
**Entonces** el sistema muestra mensaje de error genérico (sin revelar qué campo falló)

**Requisitos de seguridad (NFR12):**
- Las contraseñas se hashean con bcrypt o argon2 (nunca texto plano ni MD5/SHA)
- Política mínima de contraseña: 8+ caracteres, al menos 1 mayúscula y 1 número
- Máximo 5 intentos fallidos antes de bloqueo temporal (15 min)

---

### Historia 2.2: Validación de Correo Electrónico (General)

> **ACTUALIZADO (ADR-005):** Los usuarios NO son solo institucionales. Cualquier profesional con correo válido puede acceder.

Como **administrador del sistema**,
Quiero que se valide que los usuarios se registren con un correo electrónico válido,
Para que el acceso esté controlado pero abierto a profesionales de todo el país.

**Criterios de Aceptación:**

**Dado** que un usuario intenta registrarse
**Cuando** ingresa un correo electrónico
**Entonces** Keycloak valida formato de correo y envía verificación por email

**Dado** que el correo ha sido verificado
**Cuando** el usuario intenta hacer login
**Entonces** el sistema permite continuar con el flujo de autenticación

---

### Historia 2.3: Recuperación de Contraseña

Como **usuario**,
Quiero poder recuperar mi contraseña si la olvido,
Para que no pierda acceso a la plataforma.

**Criterios de Aceptación:**

**Dado** que el usuario está en la pantalla de login
**Cuando** hace click en "¿Olvidaste tu contraseña?"
**Entonces** se muestra formulario para ingresar correo 

**Dado** que el correo existe en el sistema
**Cuando** solicita recuperación
**Entonces** se envía enlace de restablecimiento con token temporal (expiración 1 hora)

**Dado** que el usuario accede al enlace de restablecimiento
**Cuando** ingresa nueva contraseña (cumpliendo política mínima de seguridad)
**Entonces** la contraseña se actualiza y puede hacer login con la nueva

---

### Historia 2.4: Protección de Rutas Autenticadas

Como **sistema de seguridad**,
Quiero que las rutas del mapa y admin estén protegidas,
Para que usuarios no autenticados no puedan acceder a funcionalidad restringida.

**Criterios de Aceptación:**

**Dado** que un usuario no autenticado intenta acceder a /mapa o /admin
**Cuando** no tiene token JWT válido
**Entonces** es redirigido automáticamente a la pantalla de login

**Dado** que un token JWT ha expirado
**Cuando** el usuario intenta una acción
**Entonces** el sistema redirige a login con mensaje "Sesión expirada"

---

## Épica 3: Mapa SIG Interactivo con Hexágonos H3

**Objetivo:** Implementar el mapa interactivo de Colombia con visualización de hexágonos H3, mapa de calor por score/variable, filtrado dinámico, popups informativos y manejo de hexágonos decorativos. (US03 — Selección Territorial H3)

**Requisitos cubiertos:** FR04, FR05, FR06, FR07, FR08, FR09, FR10, FR21, NFR01, NFR04, NFR06, NFR11, NFR13, ARQ02

---

### Historia 3.1: Mapa Base de Colombia con Leaflet

Como **usuario analista**,
Quiero ver un mapa interactivo de Colombia al ingresar a la plataforma,
Para que sea el punto de partida de mi análisis territorial.

**Criterios de Aceptación:**

**Dado** que el usuario ha iniciado sesión
**Cuando** accede a la vista principal del mapa
**Entonces** se carga un mapa base de Colombia centrado y con zoom apropiado
**Y** el mapa soporta interacciones: zoom (scroll/botones), paneo (drag), y es responsivo
**Y** se muestra una capa base (OpenStreetMap o similar) con límites departamentales visibles

---

### Historia 3.2: Renderizado de Hexágonos H3 sobre el Mapa

Como **usuario analista**,
Quiero ver los hexágonos H3 superpuestos en el mapa de Colombia,
Para que pueda visualizar las unidades de análisis territorial.

**Criterios de Aceptación:**

**Dado** que el JSON/GeoJSON estático está disponible como asset
**Cuando** el mapa se carga completamente
**Entonces** se renderizan los hexágonos H3 (res 5-6) sobre el territorio colombiano
**Y** el renderizado usa Leaflet Canvas renderer para manejar ~4,500-31,000 hexágonos sin lag
**Y** el tiempo de carga inicial del mapa con hexágonos debe ser <5 segundos
**Y** mientras se cargan los hexágonos se muestra un indicador de progreso/spinner (NFR13)
**Y** si la carga de datos falla, se muestra mensaje de error claro al usuario (NFR11)

---

### Historia 3.3: Mapa de Calor por Score General

Como **usuario analista**,
Quiero que los hexágonos se coloreen según el score general de idoneidad,
Para que pueda identificar visualmente las zonas con mayor y menor potencial eólico.

**Criterios de Aceptación:**

**Dado** que los hexágonos están renderizados en el mapa
**Cuando** se aplica el modo por defecto (score_general)
**Entonces** cada hexágono se colorea con una escala de colores (gradiente) proporcional a su score_general
**Y** el score_general representa el promedio de idoneidad de todas las dimensiones
**Y** se muestra una leyenda con la escala de colores y sus valores asociados
**Y** las zonas de mayor score se distinguen claramente de las de menor score

---

### Historia 3.4: Filtrado de Mapa de Calor por Variable Específica

Como **usuario analista**,
Quiero poder cambiar la variable que colorea el mapa de calor,
Para que pueda analizar la distribución territorial de cada variable crítica individualmente.

**Criterios de Aceptación:**

**Dado** que el mapa muestra el mapa de calor por score_general
**Cuando** el usuario selecciona una variable crítica del selector de filtros
**Entonces** el mapa de calor se re-renderiza usando los valores de la variable seleccionada en lugar del score general
**Y** la leyenda se actualiza para reflejar la nueva variable y su escala
**Y** el re-renderizado completa en <2 segundos (NFR04)

**Dado** que el usuario quiere volver al modo default
**Cuando** selecciona "Score General" en el selector
**Entonces** el mapa vuelve a colorearse por score_general

---

### Historia 3.5: Popup Informativo al Click en Hexágono

Como **usuario analista**,
Quiero que al hacer click en un hexágono se muestre un popup con información detallada,
Para que pueda consultar datos específicos de cada zona sin salir del mapa.

**Criterios de Aceptación:**

**Dado** que el usuario hace click en un hexágono activo
**Cuando** el popup se abre
**Entonces** muestra:
- El score usado actualmente en el mapa de calor (general o variable filtrada)
- 2-3 variables secundarias relevantes del hexágono
- Identificador H3 del hexágono
**Y** el popup se cierra al hacer click fuera de él o en el botón de cerrar

---

### Historia 3.6: Hexágonos Decorativos (Excluidos)

Como **usuario analista**,
Quiero que los hexágonos excluidos/no disponibles sean visibles pero claramente diferenciados,
Para que entienda la cobertura completa del territorio pero sepa cuáles zonas están excluidas del análisis.

**Criterios de Aceptación:**

**Dado** que un hexágono tiene tipo_celda = "excluido" en los datos
**Cuando** se renderiza en el mapa
**Entonces** se muestra con un estilo decorativo (gris/transparente/patrón diferenciado)
**Y** NO es interactuable (no responde a click)
**Y** NO se incluye en cálculos ni filtros
**Y** visualmente se distingue claramente de los hexágonos activos

---

### Historia 3.7: Dato Central Visible en Hexágono

Como **usuario analista**,
Quiero que cada hexágono muestre un dato numérico central que indique su valor en el mapa de calor,
Para que pueda leer valores sin necesidad de abrir el popup.

**Criterios de Aceptación:**

**Dado** que los hexágonos están renderizados
**Cuando** el nivel de zoom es suficiente para leer texto
**Entonces** cada hexágono activo muestra en su centro el valor numérico del score general o de la variable filtrada activa
**Y** el texto se oculta en niveles de zoom alejados para evitar sobrecarga visual
**Y** el valor se actualiza cuando se cambia el filtro de variable

---

### Historia 3.8: Selección de Área Multi-Hexágono

Como **usuario analista**,
Quiero poder seleccionar múltiples hexágonos para definir un área de análisis,
Para que pueda delimitar la zona geográfica que quiero evaluar.

**Criterios de Aceptación:**

**Dado** que el usuario está en el mapa con hexágonos activos
**Cuando** hace click en varios hexágonos (o usa herramienta de selección por región)
**Entonces** los hexágonos seleccionados se resaltan visualmente (borde/color diferenciado)
**Y** se muestra un contador de hexágonos seleccionados y área aproximada
**Y** puede deseleccionar hexágonos individuales haciendo click nuevamente
**Y** puede limpiar toda la selección con un botón "Limpiar selección"
**Y** los hexágonos decorativos/excluidos NO son seleccionables

---

### Historia 3.9: Panel de Control — Leyenda y Selector de Variables

Como **usuario analista**,
Quiero un panel de control visible en el mapa con la leyenda de colores y el selector de variable,
Para que pueda interpretar el mapa de calor y cambiar el filtro sin buscar en menús ocultos.

**Criterios de Aceptación:**

**Dado** que el mapa está renderizado con hexágonos
**Cuando** el usuario ve el panel de control (sidebar o overlay)
**Entonces** se muestra:
- Leyenda de colores con escala y valores min/max de la variable activa
- Dropdown/selector para cambiar entre "Score General" y variables críticas disponibles
- Indicador de la variable actualmente visualizada
**Y** el panel es colapsable/minimizable para no obstruir el mapa
**Y** al cambiar variable en el selector, se actualizan simultáneamente: mapa de calor, leyenda, y datos centrales de hexágonos

---

## Épica 4: Administración de Usuarios

**Objetivo:** Implementar el módulo de gestión básica de usuarios (CRUD) para la primera entrega, sin sistema de roles avanzado. (US08)

**Requisitos cubiertos:** FR11, ARQ04

---

### Historia 4.1: Creación de Usuarios

Como **administrador**,
Quiero poder crear nuevos usuarios en el sistema,
Para que personas autorizadas puedan acceder a la plataforma.

**Criterios de Aceptación:**

**Dado** que el administrador está en el panel de admin
**Cuando** hace click en "Crear usuario" y llena el formulario (nombre, correo, contraseña temporal)
**Entonces** se crea el usuario en PostgreSQL con la información proporcionada
**Y** se valida que el correo pertenezca a dominio autorizado
**Y** se muestra confirmación de creación exitosa

**Dado** que el correo ya existe en el sistema
**Cuando** intenta crear un usuario duplicado
**Entonces** muestra error: "El correo ya está registrado"

---

### Historia 4.2: Listado y Consulta de Usuarios

Como **administrador**,
Quiero ver la lista de todos los usuarios registrados,
Para que pueda gestionar las cuentas activas del sistema.

**Criterios de Aceptación:**

**Dado** que el administrador accede al panel de admin
**Cuando** se carga la vista de usuarios
**Entonces** se muestra tabla con: nombre, correo, fecha de creación, estado (activo/inactivo)
**Y** permite búsqueda por nombre o correo
**Y** soporta paginación si hay más de 20 usuarios

---

### Historia 4.3: Actualización y Eliminación de Usuarios

Como **administrador**,
Quiero poder editar datos de un usuario o eliminarlo del sistema,
Para que pueda mantener actualizada la base de usuarios.

**Criterios de Aceptación:**

**Dado** que el administrador selecciona un usuario de la lista
**Cuando** hace click en "Editar"
**Entonces** puede modificar: nombre, estado (activo/inactivo), resetear contraseña
**Y** los cambios se guardan en PostgreSQL

**Dado** que el administrador quiere eliminar un usuario
**Cuando** hace click en "Eliminar" y confirma la acción
**Entonces** el usuario se desactiva/elimina del sistema
**Y** se muestra confirmación de la operación

---

## Épica 5: Integración, QA y Despliegue Primera Entrega

**Objetivo:** Integrar los módulos Auth + Mapa + Admin, realizar pruebas end-to-end y desplegar la primera versión de producción.

**Requisitos cubiertos:** NFR03, NFR06

---

### Historia 5.1: Integración de Módulos y Navegación

Como **usuario**,
Quiero navegar fluidamente entre el mapa y el panel de admin,
Para que la aplicación se sienta unificada y coherente.

**Criterios de Aceptación:**

**Dado** que el usuario ha iniciado sesión
**Cuando** navega entre las vistas de mapa y admin
**Entonces** la navegación es fluida (SPA, sin recargas completas)
**Y** el header/sidebar muestra opciones según el contexto
**Y** la sesión JWT se mantiene activa durante la navegación
**Y** existe botón de logout accesible desde cualquier vista

---

### Historia 5.2: Testing End-to-End

Como **equipo de desarrollo**,
Quiero tener pruebas E2E que cubran los flujos principales,
Para que pueda validar que todo funciona correctamente antes de cada despliegue.

**Criterios de Aceptación:**

**Dado** que los tres módulos están integrados
**Cuando** se ejecuta el suite de tests E2E
**Entonces** se validan los flujos:
- Login exitoso → visualización de mapa → interacción con hexágonos
- Login fallido → mensajes de error correctos
- Admin: CRUD completo de usuarios
- Protección de rutas sin autenticación

---

### Historia 5.3: Despliegue a Producción

Como **equipo de desarrollo**,
Quiero desplegar la primera versión en el entorno de producción,
Para que los usuarios puedan comenzar a usar la herramienta.

**Criterios de Aceptación:**

**Dado** que todos los tests E2E pasan
**Cuando** se ejecuta el pipeline de despliegue
**Entonces** la aplicación se despliega en contenedores Docker
**Y** PostgreSQL + PostGIS está configurado con datos de usuarios iniciales
**Y** el JSON/GeoJSON pre-procesado está disponible como asset
**Y** la aplicación es accesible via HTTPS

---

# ═══════════════════════════════════════════════
# ENTREGAS FUTURAS
# ═══════════════════════════════════════════════

## Épica 6: Backend API REST (FastAPI)

**Objetivo:** Implementar el backend API con FastAPI para servir datos dinámicamente, reemplazando el consumo de JSON estático y habilitando features avanzados.

**Requisitos cubiertos:** FR13, NFR08, ARQ08

---

### Historia 6.1: Setup FastAPI con Estructura Base

Como **desarrollador backend**,
Quiero inicializar el proyecto FastAPI con estructura modular,
Para que los endpoints se desarrollen sobre una base organizada.

**Criterios de Aceptación:**

**Dado** que se necesita un backend API
**Cuando** se crea el proyecto FastAPI
**Entonces** incluye: estructura modular (routers, models, schemas), conexión a PostgreSQL+PostGIS, documentación OpenAPI auto-generada, configuración Docker

---

### Historia 6.2: Endpoints de Hexágonos y Variables

Como **frontend**,
Quiero consumir datos de hexágonos desde la API en vez de JSON estático,
Para que los datos puedan actualizarse dinámicamente sin re-desplegar.

**Criterios de Aceptación:**

**Dado** que los datos .h3.parquet están importados en PostgreSQL
**Cuando** el frontend solicita `GET /hexagons?resolution=5`
**Entonces** retorna el conjunto de hexágonos con scores y variables
**Y** soporta filtros: `GET /hexagons?variable=velocidad_viento`
**Y** `GET /variables` retorna lista de variables disponibles con metadata
**Y** `GET /metadata` retorna información de origen y vigencia de datos

---

### Historia 6.3: Endpoints de Usuarios y Auth

Como **sistema de autenticación**,
Quiero migrar la lógica de auth y users a endpoints API,
Para que la autenticación sea gestionada centralmente por el backend.

**Criterios de Aceptación:**

**Dado** que el backend está operativo
**Cuando** se implementan los endpoints
**Entonces** `POST /auth/login` emite JWT, `POST /auth/reset-password` inicia flujo, `GET /users` lista usuarios, `POST /users` crea usuario, `PUT /users/{id}` actualiza, `DELETE /users/{id}` elimina

---

### Historia 6.4: Migración Frontend de JSON Estático a API

Como **usuario**,
Quiero que la aplicación consuma datos del API sin cambio visible en la experiencia,
Para que la transición sea transparente.

**Criterios de Aceptación:**

**Dado** que los endpoints están disponibles
**Cuando** se actualiza el frontend para consumir la API
**Entonces** el mapa y admin funcionan idénticamente a la versión con JSON estático
**Y** se mantiene fallback a JSON estático si el API no está disponible (graceful degradation)

---

### Historia 6.5: Proceso de Actualización de Datos .parquet

Como **administrador del sistema**,
Quiero un proceso automatizado para importar nuevas versiones del .parquet al backend,
Para que los datos del mapa se actualicen sin re-desplegar la aplicación.

**Criterios de Aceptación:**

**Dado** que el equipo de investigación entrega una nueva versión del .h3.parquet
**Cuando** se ejecuta el proceso de actualización
**Entonces** los datos se importan a PostgreSQL, se valida integridad, y el API sirve los datos actualizados
**Y** se registra la versión del archivo, fecha de importación y hash SHA-256 para trazabilidad
**Y** el proceso se puede ejecutar sin downtime de la aplicación

---

## Épica 7: Reportes e Informes de idoneidad

**Objetivo:** Implementar la generación de informes de idoneidad del área seleccionada con opción de descarga y gestión de historial.

**Requisitos cubiertos:** FR14, FR15, FR19

---

### Historia 7.1: Generación de Informe de idoneidad

Como **usuario analista**,
Quiero generar un informe de idoneidad para el área que seleccione en el mapa,
Para que pueda evaluar rápidamente el potencial eólico de una zona.

**Criterios de Aceptación:**

**Dado** que el usuario ha seleccionado un área en el mapa (uno o más hexágonos)
**Cuando** solicita generar informe
**Entonces** el sistema calcula y muestra un resumen con: score general del área, desglose por dimensión (técnica, ambiental, regulatoria, socioeconómica, económica), variables clave del área, mapa miniatura del área seleccionada
**Y** la generación completa en <30 segundos (FR14)

---

### Historia 7.2: Descarga de Informe en PDF

Como **usuario analista**,
Quiero descargar el informe de idoneidad como PDF profesional,
Para que pueda compartirlo con tomadores de decisiones y stakeholders.

**Criterios de Aceptación:**

**Dado** que se ha generado un informe de idoneidad
**Cuando** el usuario hace click en "Descargar PDF"
**Entonces** se genera un PDF con branding institucional (ANH/EAFIT), datos del informe, gráficos y mapa
**Y** el PDF incluye fecha, autor y metadatos del análisis

---

### Historia 7.3: Historial de Informes

Como **usuario analista**,
Quiero ver mis informes anteriores,
Para que pueda comparar análisis y hacer seguimiento de evolución.

**Criterios de Aceptación:**

**Dado** que el usuario ha generado informes previos
**Cuando** accede a la sección de historial
**Entonces** ve lista cronológica de informes con: fecha, área analizada, score general
**Y** puede abrir cualquier informe anterior para consultarlo
**Y** puede descargar nuevamente el PDF

---

## Épica 8: Integración Modelo Multicriterio (MCDM)

**Objetivo:** Integrar el motor de análisis multicriterio que permite al usuario configurar variables por dimensión y características técnicas del proyecto para obtener análisis personalizados de idoneidad.

**Requisitos cubiertos:** FR16, ARQ07, ARQ09

---

### Historia 8.1: Integración del Motor MCDM

Como **sistema**,
Quiero integrar el modelo multicriterio (agregación ponderada AHP) con el backend,
Para que los scores se calculen dinámicamente según la configuración del usuario.

**Criterios de Aceptación:**

**Dado** que el modelo MCDM está disponible
**Cuando** se integra con el backend
**Entonces** el sistema puede calcular V = Σ(wi × x'i) según los pesos configurados
**Y** soporta las capas: exclusión → mínimo viable → penalización → informativa
**Y** los resultados se reflejan en el mapa de calor en tiempo real

---

### Historia 8.2: Configuración de Variables por Dimensión

Como **usuario analista**,
Quiero configurar qué variables considerar en el análisis agrupadas por dimensión,
Para que el análisis se adapte a los criterios específicos de mi evaluación.

**Criterios de Aceptación:**

**Dado** que el usuario accede a la configuración de análisis
**Cuando** selecciona variables dentro de cada dimensión (Técnica, Ambiental, Regulatoria, Socioeconómica, económica)
**Entonces** el sistema recalcula los scores según la selección
**Y** el mapa se actualiza con los nuevos resultados
**Y** se muestran las variables como: excluyentes, de decisión, penalizantes e informativas

---

### Historia 8.3: Configuración de Características Técnicas del Proyecto

Como **usuario analista**,
Quiero ingresar las características técnicas del proyecto (tipo de turbina, capacidad en MW, etc.),
Para que el análisis considere los parámetros específicos de mi proyecto eólico.

**Criterios de Aceptación:**

**Dado** que el usuario está configurando un análisis
**Cuando** ingresa parámetros técnicos (capacidad MW, tipo turbina HAWT/VAWT, altura torre)
**Entonces** el modelo ajusta los cálculos considerando estos parámetros
**Y** las recomendaciones HAWT vs VAWT se basan en las condiciones del sitio (vientos fuertes→HAWT, turbulencia→VAWT)

---

## Épica 9: Análisis Marítimo (Offshore)

**Objetivo:** Extender el análisis territorial para incluir áreas marítimas con variables específicas offshore.

**Requisitos cubiertos:** FR17

---

### Historia 9.1: Extensión del Mapa a Zonas Offshore

Como **usuario analista**,
Quiero visualizar hexágonos H3 en zonas marítimas colombianas,
Para que pueda evaluar potencial eólico offshore.

**Criterios de Aceptación:**

**Dado** que existen datos offshore en el sistema
**Cuando** el usuario navega a zonas costeras/marítimas
**Entonces** se renderizan hexágonos H3 marítimos con su score correspondiente
**Y** se distinguen visualmente de los hexágonos terrestres

---

### Historia 9.2: Variables Marinas Específicas

Como **usuario analista**,
Quiero filtrar por variables marinas (batimetría, oleaje, lecho marino),
Para que el análisis offshore considere condiciones específicas del mar.

**Criterios de Aceptación:**

**Dado** que el usuario está analizando zonas offshore
**Cuando** filtra por variables marinas
**Entonces** el mapa de calor offshore se re-renderiza con la variable marina seleccionada
**Y** las variables incluyen: batimetría, altura de oleaje, periodo de oleaje, composición lecho marino

---

### Historia 9.3: Restricciones de Profundidad (Batimetría)

Como **sistema de análisis**,
Quiero aplicar restricciones de profundidad para cimentación,
Para que zonas demasiado profundas para anclaje fijo se marquen correctamente.

**Criterios de Aceptación:**

**Dado** que un hexágono offshore tiene profundidad >100m
**Cuando** se evalúa con tecnología de anclaje fijo
**Entonces** se marca como no viable para cimentación fija
**Y** se sugiere tecnología flotante como alternativa (si aplica)

---

## Épica 10: Sistema de Roles y Permisos Avanzado

**Objetivo:** Evolucionar el CRUD básico de usuarios a un sistema completo de roles, permisos y auditoría.

**Requisitos cubiertos:** FR18, NFR09

---

### Historia 10.1: Definición de Roles

Como **administrador**,
Quiero definir roles con permisos diferenciados,
Para que cada tipo de usuario tenga acceso solo a las funciones que necesita.

**Criterios de Aceptación:**

**Dado** que se necesitan roles diferenciados
**Cuando** se implementa el sistema de roles
**Entonces** existen al menos: Admin, Analista, Visor
**Y** cada rol tiene permisos específicos sobre: mapa, reportes, admin, configuración

---

### Historia 10.2: Asignación de Permisos Granulares

Como **administrador**,
Quiero asignar y modificar permisos por usuario o por rol,
Para que el control de acceso sea flexible y seguro.

**Criterios de Aceptación:**

**Dado** que existen roles definidos
**Cuando** el admin asigna un rol a un usuario
**Entonces** el usuario solo puede acceder a las funciones permitidas por su rol
**Y** las rutas del frontend y endpoints del API validan permisos

---

### Historia 10.3: Registro de Auditoría

Como **administrador**,
Quiero ver un log de todas las acciones de los usuarios,
Para que pueda hacer seguimiento y cumplir requisitos de trazabilidad.

**Criterios de Aceptación:**

**Dado** que un usuario realiza una acción en el sistema
**Cuando** se registra la acción
**Entonces** se almacena: usuario, acción, timestamp, datos afectados
**Y** el admin puede consultar y filtrar el log de auditoría

---

## Épica 11: Análisis Avanzado y Sensibilidad

**Objetivo:** Implementar herramientas avanzadas de análisis: sensibilidad de pesos, comparación de escenarios y validación TOPSIS.

**Requisitos cubiertos:** NFR07

---

### Historia 11.1: Análisis de Sensibilidad de Pesos

Como **usuario analista avanzado**,
Quiero variar los pesos de las dimensiones y ver cómo cambian los resultados,
Para que pueda evaluar la robustez de mis conclusiones.

**Criterios de Aceptación:**

**Dado** que el usuario tiene un análisis completo
**Cuando** ajusta pesos de dimensiones (±10% o por escenarios)
**Entonces** el sistema recalcula y muestra:
- Estabilidad espacial de zonas mejor clasificadas
- Cambios significativos por dimensión
- Indicador de robustez del resultado

---

### Historia 11.2: Comparación de Escenarios

Como **usuario analista**,
Quiero comparar dos o más configuraciones de análisis lado a lado,
Para que pueda tomar decisiones informadas entre alternativas.

**Criterios de Aceptación:**

**Dado** que el usuario ha generado múltiples análisis
**Cuando** selecciona escenarios para comparar
**Entonces** se muestran mapas y métricas lado a lado con diferencias resaltadas

---

### Historia 11.3: Validación TOPSIS

Como **sistema de análisis**,
Quiero calcular ordenamiento alternativo por TOPSIS,
Para que el usuario pueda contrastar con el método principal (suma ponderada AHP).

**Criterios de Aceptación:**

**Dado** que existe un análisis por suma ponderada
**Cuando** se ejecuta validación TOPSIS
**Entonces** el sistema calcula ranking por cercanía a solución ideal
**Y** muestra zonas sensibles donde los dos métodos difieren significativamente

---

## Índice de Relaciones Cruzadas

### Épicas → Módulos del Sistema

| Épica | Módulo Mapa SIG | Módulo Auth | Módulo Admin | Pre-proceso | Micro-API | Backend API | MCDM |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| E1 Fundación | ● | ● | ● | ● | ● | | |
| E2 Auth | | ● | | | ● | | |
| E3 Mapa SIG | ● | | | | | | |
| E4 Admin | | | ● | | ● | | |
| E5 Integración | ● | ● | ● | | | | |
| E6 Backend API | | ● | ● | | | ● | |
| E7 Reportes | ● | | | | | ● | |
| E8 MCDM | ● | | | | | ● | ● |
| E9 Offshore | ● | | | | | ● | ● |
| E10 Roles | | ● | ● | | | ● | |
| E11 Avanzado | ● | | | | | ● | ● |

### Historias de Usuario Original → Épicas

| Historia Original | Épica(s) Asociada(s) | Historias Derivadas |
|-------------------|----------------------|---------------------|
| US01 — Login  | E2 Auth | E2.1, E2.2, E2.3, E2.4 |
| US03 — Selección Territorial H3 | E3 Mapa SIG | E3.1, E3.2, E3.3, E3.4, E3.5, E3.6, E3.7, E3.8, E3.9 |
| US08 — Gestión de Usuarios | E4 Admin | E4.1, E4.2, E4.3 |

### Flujo de Datos entre Épicas

```
Pipeline Investigación (.h3.parquet)
        │
        ▼
   E1.2 Pre-proceso ──────────────► JSON/GeoJSON estático
        │                                    │
        │                                    ▼
        │                           E3 Mapa SIG (Primera Entrega)
        │                                    │
        ▼                                    ▼
   E6 Backend API ◄──────────────── E6.4 Migración JSON→API
        │
        ├──► E7 Reportes (consume /hexagons, /reports)
        ├──► E8 MCDM (consume /variables, /filters, calcula scores)
        ├──► E9 Offshore (extiende /hexagons con datos marinos)
        └──► E10 Roles (consume /users, /auth)
```

### Cadena de Dependencias Críticas

```
E1.1 Scaffold ──► E1.5 Spike H3 ──► E1.2 Pre-proceso ──► E3.2 Hexágonos ──► E3.3 Mapa calor
                                                                                       │
E1.1 Scaffold ──► E1.3 BD ──► E1.6 Micro-API ──► E2.1 Login ──► E2.4 Rutas            │
                                                                    │                   │
                                                                    ▼                   ▼
                                                             E5.1 Integración ──► E5.2 Testing ──► E5.3 Deploy
```

### Verificación contra Flujo de Usuario (§1.1)

```
Flujo Esperado                        │ Épica/Historia              │ Estado
──────────────────────────────────────┼─────────────────────────────┼──────────
1. Login                              │ E2.1, E2.2, E2.3, E2.4     │ ✅ Primera
2. Selección de área en mapa          │ E3.1→E3.8 (multi-hex)      │ ✅ Primera
3. Configurar variables por dimensión │ E8.2 (Config variables)     │ 📅 Futura
4. Insertar config. técnica proyecto  │ E8.3 (Config turbina/MW)    │ 📅 Futura
5. Informe idoneidad + descarga      │ E7.1, E7.2                  │ 📅 Futura
6. Historial de informes              │ E7.3                        │ 📅 Futura
──────────────────────────────────────┼─────────────────────────────┼──────────
Infraestructura (no visible usuario)  │ E1.1-E1.6, E5.1-E5.3       │ ✅ Primera
Visualización mapa calor + filtros    │ E3.1-E3.7, E3.9             │ ✅ Primera
```
