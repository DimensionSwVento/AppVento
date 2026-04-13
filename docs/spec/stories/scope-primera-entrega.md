---
version: 2.0
date: 2026-03-24
scope: primera-entrega
plazo: 1 mes
equipo: 1 fulltime + 2 part-time
organizacion: por épica y prioridad (sin sprints)
---

# Scope Primera Entrega — Guía de Desarrollo

Origen: Épicas (epics.md) + ADR-005, ADR-006, ADR-007 + Aclaraciones del equipo.

> **Nota:** Este documento consolida TODAS las historias de la primera entrega. No hay división por sprints — el equipo prioriza según las dependencias y prioridades indicadas. Las historias marcadas 🔴 Crítica son bloqueantes para otras; las 🟡 Alta son necesarias pero pueden parallelizarse; las 🟢 Media pueden posponerse si hay presión de tiempo.

---

## Resumen por Épica

| Épica | Historias | Prioridad dominante | Dependencias |
|-------|-----------|---------------------|--------------|
| **E0 — Fundación e Infraestructura** | US-MONO, US-ENV, US-DDD, US-CI, US-KEY | 🔴 Crítica | Ninguna (prerequisito de todo) |
| **E1 — Login y Autenticación** | US01, US-AUTH-GUARD | 🔴 Crítica | E0 (Keycloak, monorepo) |
| **E2 — Mapa SIG Interactivo** | US03, US03-AC6, US03-AC1, AC2, AC3, AC4, AC5, AC7, US-CACHE | 🔴 Crítica | E0 (monorepo, datos) |
| **E3 — Admin y CRUD de Usuarios** | US08 | 🟢 Media | E0, E1 (Keycloak, auth) |

```
DEPENDENCIAS:

  E0 Fundación ──────┬──────────────────┬──────────────────┐
        │             │                  │                  │
        ▼             ▼                  ▼                  │
  E1 Login    E2 Mapa (paralelo)   E3 Admin ◄──────────────┘
        │                                │
        └────────── requiere ────────────┘
```

---

# E0 — Fundación e Infraestructura

> **Objetivo:** Establecer la base técnica sobre la que se construyen las 3 épicas funcionales. Nada arranca sin esto.

---

### US-MONO — Estructura Monorepo del Proyecto
- **Prioridad:** 🔴 Crítica
- **ADR:** ADR-007
- **Épica origen:** E1 (Fundación)
- **Criterios de Aceptación:**
  1. Repositorio organizado como monorepo con workspaces (npm/yarn/pnpm)
  2. Estructura: `apps/web/` (frontend), `apps/api/` (backend), `packages/shared-types/`, `packages/h3-processor/`, `infra/`
  3. Herramienta monorepo configurada (Turborepo si React, Nx si Angular)
  4. Comando único `docker-compose up` levanta todos los servicios (frontend, backend, PostgreSQL+PostGIS, Keycloak)
  5. Scripts compartidos: `dev`, `build`, `test`, `lint` desde la raíz
  6. Tipos TypeScript compartidos entre frontend y backend via `packages/shared-types/`
  7. Proyecto frontend inicializado con stack definido + Leaflet como dependencia
  8. Configuración de linting y formateo
- **Desbloquea:** Todas las demás historias

---

### US-ENV — Variables de Entorno
- **Prioridad:** 🟡 Alta
- **ADR:** ADR-007
- **Épica origen:** E1 (Fundación)
- **Criterios de Aceptación:**
  1. Archivo `.env.example` en la raíz del monorepo con todas las variables documentadas
  2. Variables cubren: base de datos, Keycloak, aplicación, datos geoespaciales
  3. `.env` incluido en `.gitignore` — nunca se sube al repositorio
  4. Documentación de cada variable con comentarios descriptivos
  5. Docker-compose consume variables desde `.env`
  6. Valores de ejemplo funcionales para desarrollo local
- **Desbloquea:** docker-compose funcional, desarrollo local del equipo

---

### US-DDD — Backend con Arquitectura Limpia y DDD
- **Prioridad:** 🔴 Crítica
- **ADR:** ADR-007
- **Épica origen:** E1 (Fundación)
- **Criterios de Aceptación:**
  1. Backend estructurado siguiendo Clean Architecture: `domain/`, `application/`, `infrastructure/`, `shared/`
  2. Capa domain: entidades (User, Hexagon), value objects (H3Index, Score), ports (interfaces de repositorio)
  3. Capa application: casos de uso, DTOs
  4. Capa infrastructure: implementaciones PostgreSQL, adapter Keycloak, controllers HTTP
  5. Dependencias apuntan hacia adentro: domain no importa de infrastructure
  6. Al menos un caso de uso completo implementado con test unitario que NO requiere infraestructura
  7. Endpoints expuestos: health check, proxy/cache datos geoespaciales, endpoints admin protegidos
  8. Integración con Keycloak como resource server (validación de tokens OIDC)
  9. Esquema BD PostgreSQL+PostGIS con migraciones versionadas y usuario admin seed
- **Desbloquea:** US01, US08, endpoints protegidos

---

### US-KEY — Integración Keycloak como Proveedor de Identidad
- **Prioridad:** 🔴 Crítica
- **ADR:** ADR-005
- **Épica origen:** E2 (Auth) — prerequisito
- **Criterios de Aceptación:**
  1. Keycloak desplegado como contenedor en docker-compose
  2. Realm "vento" configurado con roles básicos: `admin`, `analista`
  3. Registro y login de usuarios vía Keycloak (formulario Keycloak, no propio)
  4. Frontend integrado con keycloak-js u oidc-client-ts
  5. Backend valida tokens OIDC emitidos por Keycloak
  6. Validación de correo electrónico general (NO restringido a dominio institucional)
  7. Recuperación de contraseña gestionada por Keycloak (no desarrollo propio)
- **Impacto:** Simplifica US01, elimina historia de recuperación de contraseña propia, reduce CRUD usuarios (Keycloak admin console cubre operaciones básicas)
- **Desbloquea:** US01, US-AUTH-GUARD, US08

---

### US-CI — Pipeline CI + Deploy Automático
- **Prioridad:** 🟡 Alta
- **ADR:** ADR-007
- **Épica origen:** E1 (Fundación)
- **Flujo de ramas:** `develop` → PR → `main`. Deploy automático via ramas limpias (`deploy-test`, `deploy-prod`)
- **Criterios de Aceptación:**
  1. GitHub Actions ejecuta en cada push a `develop`/`main` y en PRs hacia `main`
  2. Stage de calidad: lint + type-check + tests unitarios (Vitest)
  3. Stage de build: verificar que el proyecto compila correctamente con env vars de Keycloak
  4. Stage de seguridad: audit de dependencias + scan de secretos (gitleaks)
  5. Stage de deploy: genera rama `deploy-test` (desde develop) o `deploy-prod` (desde main) con solo `Vento/` — sin docs, specs, infra
  6. Branch protection activo en `main` — no se permite push directo, requiere PR
  7. Review obligatorio: mínimo 1 aprobación antes de merge a `main`
  8. Pipeline documenta claramente errores cuando falla
  9. cPanel de AccuWeb apunta a `deploy-test` (staging) y `deploy-prod` (producción) con autodeploy
  10. Las ramas `deploy-test` y `deploy-prod` son permanentes — no se editan manualmente
- **Nota:** El flujo anterior `develop → test → main` fue simplificado a `develop → main` con deploy branches automáticas

---

# E1 — Login y Autenticación

> **Objetivo:** Acceso seguro a la plataforma via Keycloak (OIDC). Gracias a ADR-005, NO se desarrolla login propio, recuperación de contraseña propia, ni hasheo de passwords — todo lo gestiona Keycloak.
>
> **Historias eliminadas por Keycloak:** E2.3 (recuperar pwd propio), E2.2 (validación dominio institucional — ahora es correo general gestionado por Keycloak)

**Dependencias:** US-KEY, US-MONO, US-DDD

---

### US01 — Login de Usuario (via Keycloak)
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E2 (Auth)
- **ADR:** ADR-005
- **Criterios de Aceptación:**
  1. El frontend redirige a Keycloak para autenticación (flujo OIDC Authorization Code)
  2. Usuarios se registran y logean con correo electrónico general (NO restringido a dominio institucional)
  3. Recuperación de contraseña gestionada por Keycloak (no desarrollo propio)
  4. Token OIDC almacenado de forma segura en el frontend
  5. Redirección al mapa principal tras login exitoso
  6. Si las credenciales son incorrectas, Keycloak muestra error (no es desarrollo propio)
- **Nota:** Simplificado respecto a versión original. Keycloak maneja formularios, validación, hasheo y bloqueo por intentos fallidos.

---

### US-AUTH-GUARD — Protección de Rutas Autenticadas
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E2 (Auth)
- **Criterios de Aceptación:**
  1. Rutas protegidas (/mapa, /admin) redirigen a Keycloak si no hay token OIDC válido
  2. Si el token ha expirado, el sistema redirige a login con mensaje "Sesión expirada"
  3. Backend rechaza peticiones sin token válido (401 Unauthorized)
  4. Guard implementado como middleware reutilizable en frontend y backend

---

# E2 — Mapa SIG Interactivo

> **Objetivo:** Implementar el mapa interactivo de Colombia con hexágonos H3, mapa de calor, filtros, popups y manejo de datos geoespaciales. Es el core funcional de la aplicación.

**Dependencias:** US-MONO (para scaffold frontend + Leaflet)

---

### US03 — Mapa Base + Renderizado Hexágonos H3
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E3 (Mapa SIG)
- **Criterios de Aceptación:**
  1. Carga de mapa base de Colombia centrado con zoom apropiado (OpenStreetMap o similar)
  2. Mapa soporta interacciones: zoom, paneo, responsivo
  3. Hexágonos H3 (res 5-6, ~4,500-31,000) renderizados sobre el territorio usando Canvas renderer
  4. Click en hexágono convierte a ID hexagonal H3
  5. Hexágonos seleccionados se pintan con estilo diferenciado
  6. Tiempo de carga inicial <5s, sin lag al pan/zoom
  7. Indicador de progreso/spinner mientras cargan hexágonos (NFR13)
  8. Mensaje de error claro si falla la carga de datos (NFR11)
- **Nota:** Incluye validación técnica (spike) de que el stack H3+Leaflet+Canvas funciona con datos reales. Si no funciona, documentar alternativa (Deck.gl, MapLibre).

---

### US03-AC6 — Ingesta de Datos .h3.parquet
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E1 (Fundación — datos)
- **Criterios de Aceptación:**
  1. Script Python lee archivo .h3.parquet (pandas + pyarrow)
  2. Convierte a JSON/GeoJSON con estructura: h3_index, scores, variables, tipo_celda, metadata
  3. JSON resultante servido como asset estático del frontend (<10MB)
  4. Validación de estructura: conteo hexágonos esperado, rangos scores [0-1], ausencia h3_index nulos/duplicados
  5. Script reproducible (misma entrada = misma salida)
  6. Documentado el proceso de actualización cuando el equipo de investigación entregue nueva versión del .parquet
- **Desbloquea:** US03, US03-AC1, y todas las historias de mapa que necesitan datos

---

### US03-AC1 — Mapa de Calor por Score General
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E3 (Mapa SIG)
- **Dependencia:** US03, US03-AC6
- **Criterios de Aceptación:**
  1. Hexágonos coloreados según score_general (promedio viabilidad de las 5 dimensiones)
  2. Escala de color continua (gradiente) proporcional al score
  3. Leyenda visible con escala de colores y valores min/max
  4. Zonas de mayor score se distinguen claramente de las de menor
  5. Actualización visual al cargar datos

---

### US03-AC2 — Filtrado Mapa por Variable Crítica
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E3 (Mapa SIG)
- **Dependencia:** US03-AC1
- **Criterios de Aceptación:**
  1. Selector/dropdown de variables disponibles
  2. Al seleccionar variable, mapa se re-renderiza con esa variable en vez del score general
  3. Leyenda se actualiza según la variable seleccionada
  4. Opción de volver al score general
  5. Re-renderizado completa en <2 segundos (NFR04)

---

### US03-AC3 — Popup Hexágono con Información
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E3 (Mapa SIG)
- **Dependencia:** US03
- **Criterios de Aceptación:**
  1. Click en hexágono activo muestra popup
  2. Popup muestra: score usado en el mapa de calor actual
  3. Popup muestra: 2-3 variables secundarias importantes del hexágono
  4. Popup muestra: identificador H3
  5. Popup no aparece en hexágonos excluidos/decorativos
  6. Popup se cierra al click fuera o botón cerrar

---

### US03-AC5 — Hexágonos No Disponibles (Decorativos)
- **Prioridad:** 🟡 Alta
- **Épica origen:** E3 (Mapa SIG)
- **Dependencia:** US03
- **Criterios de Aceptación:**
  1. Hexágonos con tipo_celda="excluida" se renderizan visualmente
  2. Estilo visual diferenciado (gris, opacidad reducida, o similar)
  3. No son interactuables (sin click, sin popup)
  4. No participan en cálculos ni en el mapa de calor
  5. No son seleccionables

---

### US03-AC4 — Dato Central Visible en Hexágono
- **Prioridad:** 🟡 Alta
- **Épica origen:** E3 (Mapa SIG)
- **Dependencia:** US03-AC1
- **Criterios de Aceptación:**
  1. Cada hexágono activo muestra un valor numérico central
  2. El valor corresponde al dato que determina el color (score general o variable filtrada)
  3. Texto legible según nivel de zoom (se oculta en zoom alejado)
  4. Valor se actualiza cuando se cambia el filtro de variable

---

### US03-AC9 — Panel de Control: Leyenda + Selector de Variables
- **Prioridad:** 🟡 Alta
- **Épica origen:** E3 (Mapa SIG)
- **Dependencia:** US03-AC1, US03-AC2
- **Criterios de Aceptación:**
  1. Panel visible (sidebar o overlay) con leyenda de colores y escala min/max
  2. Dropdown para cambiar entre "Score General" y variables críticas
  3. Indicador de variable actualmente visualizada
  4. Panel colapsable/minimizable para no obstruir el mapa
  5. Cambio de variable actualiza simultáneamente: mapa, leyenda y datos centrales

---

### US-CACHE — Cache de Datos Geoespaciales en Frontend
- **Prioridad:** 🟡 Alta
- **ADR:** ADR-006
- **Épica origen:** E3 (Mapa SIG — performance)
- **Dependencia:** US03-AC6
- **Criterios de Aceptación:**
  1. Service Worker implementado para cache de datos del mapa en el navegador
  2. Archivos JSON/GeoJSON versionados con hash en el nombre (`hexagons-{hash}.json`)
  3. HTTP Cache configurado con headers `Cache-Control` y `ETag`
  4. Segunda visita carga datos desde cache local (sin re-descargar)
  5. Cuando hay datos nuevos (nuevo hash), cache se invalida automáticamente
  6. Indicador visual cuando se descargan datos nuevos vs. usando cache

---

### US03-AC7 — Metadata de Variables
- **Prioridad:** 🟢 Media
- **Épica origen:** E3 (Mapa SIG — datos)
- **Dependencia:** US03-AC6, US03-AC2
- **Criterios de Aceptación:**
  1. Cada variable muestra metadatos de origen (fuente de datos)
  2. Cada variable muestra vigencia (fecha/periodo de los datos)
  3. Accesible desde la interfaz (tooltip, panel lateral, o dentro del popup)

---

# E3 — Admin y CRUD de Usuarios

> **Objetivo:** Gestión básica de usuarios por parte del administrador. Gracias a Keycloak (ADR-005), gran parte del CRUD se simplifica — Keycloak admin console cubre registro, contraseñas, y estado de cuentas. El desarrollo propio se enfoca en la interfaz integrada en Vento.

**Dependencias:** US-KEY, US01, US-DDD

---

### US08 — Gestión de Usuarios (CRUD)
- **Prioridad:** 🟢 Media
- **Épica origen:** E4 (Admin)
- **Criterios de Aceptación:**
  1. Crear usuario (via Keycloak Admin API o consola)
  2. Listar usuarios con tabla: nombre, correo, fecha creación, estado, rol
  3. Búsqueda por nombre o correo
  4. Paginación si >20 usuarios
  5. Editar datos de usuario: nombre, estado (activo/inactivo), rol
  6. Eliminar/desactivar usuario con confirmación
  7. Solo accesible por usuario con rol `admin`
  8. Error claro si se intenta crear usuario con correo duplicado
- **Nota:** Evaluar si para primera entrega basta con Keycloak admin console directamente, y la UI integrada en Vento se pospone. Decisión del equipo.

---

# Resumen Consolidado

## Todas las historias ordenadas por prioridad

| Prioridad | ID | Historia | Épica |
|-----------|----|----------|-------|
| 🔴 Crítica | US-MONO | Estructura Monorepo | E0 |
| 🔴 Crítica | US-DDD | Backend Clean Architecture + DDD | E0 |
| 🔴 Crítica | US-KEY | Integración Keycloak | E0 |
| 🔴 Crítica | US01 | Login via Keycloak | E1 |
| 🔴 Crítica | US-AUTH-GUARD | Protección de Rutas | E1 |
| 🔴 Crítica | US03 | Mapa Base + Hexágonos H3 | E2 |
| 🔴 Crítica | US03-AC6 | Ingesta .parquet → JSON | E2 |
| 🔴 Crítica | US03-AC1 | Mapa de Calor por Score | E2 |
| 🔴 Crítica | US03-AC2 | Filtrado por Variable | E2 |
| 🔴 Crítica | US03-AC3 | Popup Hexágono | E2 |
| 🟡 Alta | US-ENV | Variables de Entorno | E0 |
| 🟡 Alta | US-CI | Pipeline CI Mínimo | E0 |
| 🟡 Alta | US03-AC5 | Hexágonos Decorativos | E2 |
| 🟡 Alta | US03-AC4 | Dato Central en Hexágono | E2 |
| 🟡 Alta | US03-AC9 | Panel de Control (Leyenda + Selector) | E2 |
| 🟡 Alta | US-CACHE | Cache Datos Geoespaciales | E2 |
| 🟢 Media | US03-AC7 | Metadata de Variables | E2 |
| 🟢 Media | US08 | CRUD Usuarios (Admin) | E3 |
| 🟡 Alta | US03-AC1-FIX01 | Revisión Colores + Leyenda (feedback datos) | E2 |
| 🔴 Crítica | US-KEY-01 | Realm y Client dedicado Keycloak | E0/E1 |
| 🔴 Crítica | FIX-DEPLOY-01 | Keycloak Redirect URIs HTTP | E0/E1 |
| 🔴 Crítica | FIX-DEPLOY-02 | NextAuth Proxy SSL + Cookies Overflow | E1 |

**Total historias:** 22

## Historias eliminadas (por Keycloak — ADR-005)

| Historia original | Razón de eliminación |
|-------------------|---------------------|
| E2.3 — Recuperación de contraseña propia | Keycloak gestiona esto nativamente |
| E2.2 — Validación dominio institucional | Ya no aplica: correo general, validado por Keycloak |
| E1.3 — Esquema BD usuarios/sesiones (parcial) | Keycloak gestiona usuarios; BD solo para datos propios de la app |
| E1.6 — Micro-API Auth propia | Reemplazada por US-DDD + Keycloak como resource server |

## Ruta crítica sugerida

```
Semana 1:  US-MONO + US-ENV + US-KEY + US03-AC6 (en paralelo, 3 devs)
Semana 2:  US-DDD + US01 + US03 (spike + mapa base)
Semana 3:  US03-AC1 + AC2 + AC3 + AC5 + US-AUTH-GUARD + US-CI
Semana 4:  US03-AC4 + AC9 + US-CACHE + US03-AC7 + US08
```

> **Nota:** La ruta es una sugerencia de secuencia, NO sprints. El equipo puede reorganizar según capacidad y bloqueos reales.

---

## Historias Adicionales (surgidas durante implementación)

---

### US03-AC1-FIX01 — Revisión de Colores y Leyenda con Feedback del Equipo de Datos
- **Prioridad:** 🟡 Alta
- **Épica origen:** E2 (Mapa SIG)
- **Dependencia:** US03-AC1, US03-AC2
- **Tipo:** Fix / Refinamiento
- **Contexto:** El equipo de datos revisó el avance del mapa de calor y retroalimentó que la escala de colores debe reflejar si una variable es beneficiosa o perjudicial para el potencial eólico. Se requiere sesión de feedback para validar el renderizado actual contra las expectativas del equipo de investigación.
- **Criterios de Aceptación:**
  1. Variables positivas (velocidad viento, densidad energética, score general) usan gradiente: transparente → azul → amarillo → verde (alto = bueno)
  2. Variables negativas (cigarrillos ilegales, zona reserva campesina) usan gradiente: transparente → azul → amarillo → rojo (alto = malo)
  3. Leyenda visible en el mapa que refleja la escala activa y cambia dinámicamente según la variable seleccionada
  4. Leyenda indica si la variable visualizada es de impacto positivo o negativo
  5. Hexágonos seleccionados mantienen borde azul diferenciado
  6. Hexágonos bajo umbral / con hijos seleccionados usan azul oscuro distinguible del gradiente de datos
  7. Sesión de demo con equipo de datos realizada — feedback documentado y aplicado

---

### US-KEY-01 — Configuración Realm y Client Dedicado para Vento en Keycloak
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E0 (Fundación) / E1 (Login)
- **Dependencia:** US-KEY
- **ADR:** ADR-005
- **Contexto:** El equipo validó que se creará un realm y client propio en Keycloak para la aplicación. El frontend se comunicará con Keycloak vía OIDC (Authorization Code + PKCE), no directamente con la consola de administración. Esto requiere configurar el client como público con los redirect URIs correctos.
- **Criterios de Aceptación:**
  1. Realm "vento" creado en Keycloak con configuración de sesión y tokens adecuada
  2. Client "vento-frontend" configurado como público (public) con flujo Authorization Code + PKCE
  3. Redirect URIs configurados para desarrollo local (`http://localhost:3000/*`) y producción
  4. Roles `admin` y `analista` creados en el realm y asignables a usuarios
  5. Al menos un usuario de prueba creado con cada rol para validación
  6. Export del realm (`realm-export.json`) versionado en el repositorio para reproducibilidad
  7. Documentación de las variables de entorno necesarias: `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`
  8. Backend FastAPI valida tokens emitidos por este realm/client específico (ya implementado en `keycloak_guard.py`, verificar compatibilidad)
- **Desbloquea:** US01 (Login via Keycloak), US-AUTH-GUARD

---

### FIX-DEPLOY-01 — Keycloak Redirect URIs HTTP
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E0 (Fundación) / E1 (Login)
- **Dependencia:** US-KEY-01
- **Tipo:** Fix / Configuración
- **Contexto:** En AccuWeb los contenedores se comunican via HTTP internamente. Keycloak tiene redirect URIs solo en HTTPS, lo que bloquea el callback de NextAuth.
- **Criterios de Aceptación:**
  1. Todas las `redirect_uri` en el client `vento-web` del realm "vento" incluyen variantes HTTP además de HTTPS (ej: `http://midominio.com/*` y `https://midominio.com/*`)
  2. Login completo funciona desde el contenedor del frontend sin error "Invalid parameter: redirect_uri"
- **Tiempo estimado:** ~15 min (configuración manual en consola Keycloak)

---

### FIX-DEPLOY-02 — NextAuth Proxy SSL + Cookies Overflow
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E1 (Login)
- **Dependencia:** FIX-DEPLOY-01
- **Tipo:** Fix / Integración
- **Contexto:** Keycloak está detrás de un proxy SSL externo: se reporta como HTTPS pero internamente solo acepta HTTP. NextAuth falla al conectar via HTTPS y al validar el issuer. Los tokens JWT de Keycloak generan cookies que exceden el límite de nginx (4KB), devolviendo error 400.
- **Criterios de Aceptación:**
  1. `auth.ts` reescribe URLs de endpoints OIDC (token, userinfo, authorization) de HTTPS a HTTP para conexiones internas, manteniendo el issuer como HTTPS para validación de tokens
  2. Provider OIDC manual reemplaza el wrapper `Keycloak()` de NextAuth con endpoints explícitos reescritos a HTTP
  3. nginx en AccuWeb configurado con `large_client_header_buffers 4 16k` para aceptar cookies de sesión grandes
  4. La aplicación no crashea con "400 Bad Request — Request Header Or Cookie Too Large" después de múltiples logins/refresh
  5. Logs de diagnóstico en `auth.ts`: ENV CHECK, ISSUER CONFIG, DISCOVERY
  6. Variables de entorno documentadas en README.md: `AUTH_KEYCLOAK_ISSUER` (HTTP interno), `AUTH_TRUST_HOST=true`

---

## ADRs Referenciados

| ADR | Decisión | Impacto en primera entrega |
|-----|----------|---------------------------|
| ADR-005 | Keycloak como proveedor de identidad | Elimina auth propio, simplifica login y CRUD usuarios |
| ADR-006 | Storage y cache datos geoespaciales | Service Worker + HTTP Cache; storage definitivo (S3 vs BD) pendiente |
| ADR-007 | Backend Clean Architecture + DDD + Monorepo | Define estructura del proyecto y backend desde primera entrega |
