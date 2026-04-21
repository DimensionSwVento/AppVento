---
version: 1.0
date: 2026-04-20
scope: post-primera-entrega (feedback cliente)
equipo: 1 fulltime (winx) + 2 part-time
origen: revisión cliente post-deploy AccuWeb
---

# Historias de Usuario — Feedback Cliente (Sprint de estabilización)

Consolidación de los 11 items de feedback recibidos del cliente tras la revisión de la primera entrega desplegada en AccuWeb. Se agrupan en 7 historias (6 de implementación + 1 de documentación), totalizando **34h** de trabajo.

> **Nota:** Numeración `US-FB-XX` para identificarlas como feedback, distinguibles de las US originales del scope contractual.

---

## Resumen ejecutivo

| ID | Historia | Área | Horas | Estado |
|----|----------|------|-------|--------|
| US-FB-01 | Keycloak en español + botón inicio + password policy | 🎨 Theme + 🛠️ Realm | 8h | 🔨 Pendiente |
| US-FB-02 | Flujo post-registro con confirmación | 🎨 Theme + 🛠️ Realm | 4h | 🔨 Pendiente |
| US-FB-03 | Gestión de expiración de sesión | 🛠️ Realm + 📦 FE | 3h | 🔨 Pendiente |
| US-FB-04 | Territorio colombiano completo (offshore + insular) | 📦 FE | 7h | 🔨 Pendiente |
| US-FB-05 | Admin visibilidad y asignación de roles | 📦 FE | 3h | 🔨 Pendiente |
| US-FB-06 | Notificación email al asignar admin | ⛔ SMTP stopper | 0h | ⛔ Bloqueado (ADR-009) |
| US-DOC-01 | Documentación técnica (auth, testing, stack) | 📚 Docs | 7h | 🔨 Pendiente |

**Total ejecutable: 32h** · **Bloqueado: 1 HU** (ADR-009)

---

## US-FB-01 — Keycloak en Español + Navegación + Políticas

**Como** usuario que se registra o autentica
**Quiero** ver toda la interfaz de Keycloak en español, con nombres claros de campos y poder volver al inicio
**Para** entender qué hago y no perderme si me equivoco de pantalla

### Criterios de aceptación

| AC | Descripción | Archivo afectado | Horas |
|----|-------------|------------------|-------|
| AC1 | Todos los formularios (login, registro, recuperar password, verify email) en español | 🎨 Theme Keycloak — `messages_es.properties` override | 2h |
| AC2 | Campo "email" se muestra como "Correo de Usuario" o "Cuenta de Usuario" | 🎨 Theme — `messages_es.properties` + `login.ftl`, `register.ftl` | 1h |
| AC3 | Política de contraseñas: mínimo 8 caracteres, mayúscula, número, carácter especial | 🛠️ Realm `vento` → Authentication → Password Policy | 0.5h |
| AC4 | Botón "Inicio" visible en todas las pantallas Keycloak, redirige a `AUTH_URL` | 🎨 Theme — `template.ftl` (header) | 2h |
| AC5 | Mensaje post-logout en español con enlace a página de inicio | 🎨 Theme — `messages_es.properties` (redirect ya resuelto en `kc-logout`) | 1h |
| AC6 | Tests: no requieren tests nuevos (cambios son theme/config) | — | — |

### Notas técnicas

- Keycloak 24+ soporta locale nativo. Activar en realm: **Realm Settings → Localization → Default Locale: `es`**
- Theme custom deploy: copiar a `/opt/keycloak/themes/vento/` del contenedor o montar via volumen
- Probar en test antes de migrar a prod

---

## US-FB-02 — Flujo Post-Registro con Confirmación

**Como** nuevo usuario que se acaba de registrar
**Quiero** ver un mensaje de confirmación claro y ser redirigido a login
**Para** saber que el registro fue exitoso antes de autenticarme

### Criterios de aceptación

| AC | Descripción | Archivo afectado | Horas |
|----|-------------|------------------|-------|
| AC1 | Tras registro exitoso, se muestra pantalla de confirmación con mensaje en español | 🎨 Theme — `info.ftl` o `register-complete.ftl` | 2h |
| AC2 | Desde la pantalla de confirmación, botón o redirect automático lleva a login | 🎨 Theme + 🛠️ Realm Auth Flow → Post Broker Login Flow | 1.5h |
| AC3 | No se redirige directamente al dashboard tras registro sin autenticación | 🛠️ Realm Auth Flow | 0.5h |

### Flujo esperado
```
Registro → [CONFIRMACIÓN "Usuario registrado"] → Login → Dashboard
          (antes iba directo: Registro → Dashboard)
```

---

## US-FB-03 — Gestión de Expiración de Sesión

**Como** usuario autenticado
**Quiero** recibir un mensaje amigable cuando mi sesión expire
**Para** entender por qué me piden autenticarme de nuevo y no pensar que hay un error

### Criterios de aceptación

| AC | Descripción | Archivo afectado | Horas |
|----|-------------|------------------|-------|
| AC1 | Configurar `Access Token Lifespan` en realm (propuesto: 15 min) | 🛠️ Realm `vento` → Token Settings | 0.5h |
| AC2 | Al expirar, `SessionGuard` muestra modal/toast en español: "Tu sesión ha expirado" | 📦 FE `Vento/src/app/Components/SessionGuard.tsx` | 1.5h |
| AC3 | Tras mostrar mensaje, redirigir a `/` (login) automáticamente después de 3s | 📦 FE `SessionGuard.tsx` | 0.5h |
| AC4 | Test unitario: SessionGuard detecta `error: RefreshTokenError` y dispara signOut | 🧪 `Vento/__tests__/unit/app/Components/SessionGuard.test.tsx` (nuevo) | 0.5h |

### Lifespan propuesto
- **Access token**: 15 min (corto, se renueva con refresh)
- **SSO session idle**: 30 min
- **SSO session max**: 10h

---

## US-FB-04 — Territorio Colombiano Completo (offshore + insular)

**Como** analista evaluando proyectos offshore
**Quiero** ver los límites marítimos de Colombia y poder seleccionar hexágonos en todo el territorio incluyendo San Andrés, Providencia y mares adyacentes
**Para** no estar limitado al continente al evaluar viabilidad eólica offshore

### Criterios de aceptación

| AC | Descripción | Archivo afectado | Horas |
|----|-------------|------------------|-------|
| AC1 | Mapa renderiza `PolygonLayer` con borde semi-transparente de `COLOMBIA_POLYGON` | 📦 FE `Vento/src/app/Components/Map.tsx` | 2h |
| AC2 | Estilo del borde: color contrastante (ej. `#165170` semi), no oculta hexágonos | 📦 FE `Map.tsx` — PolygonLayer props | 0.5h |
| AC3 | `COLOMBIA_POLYGON` extendido con archipiélago San Andrés + Providencia + ZEE Caribe norte | 📦 FE `Vento/src/app/Utils/h3Resolution.ts` | 2h |
| AC4 | `MAX_BOUNDS` extendido para permitir pan hasta las islas (oeste hasta ~-82) | 📦 FE `h3Resolution.ts` | 0.5h |
| AC5 | Selección de hexágonos funciona sobre las islas (incluso sin datos de heatmap) | 📦 FE — validar en `Map.tsx` handlers | 1h |
| AC6 | Test: `polygonToCells(COLOMBIA_POLYGON, res)` incluye cells del archipiélago | 🧪 `Vento/src/app/Components/Map.test.tsx` (ampliar) | 1h |

### Notas
- **No bloqueado por datos oficiales**: esta HU es solo selección (no pintado de scores). Los hexágonos aparecerán pero sin color de heatmap hasta que el equipo investigación procese el dataset insular.
- Dominio de test disponible, no requiere dominio oficial.

---

## US-FB-05 — Admin Visibilidad y Asignación de Roles

**Como** administrador
**Quiero** ver claramente qué rol tiene cada usuario y poder asignar/cambiar el rol admin desde la UI
**Para** gestionar permisos sin salirme a la consola Keycloak

### Criterios de aceptación

| AC | Descripción | Archivo afectado | Horas |
|----|-------------|------------------|-------|
| AC1 | Tabla de usuarios muestra badge visible con el rol actual (`admin` / `analista`) | 📦 FE `Vento/src/app/Components/Admin/UsersTable.tsx` | 1h |
| AC2 | Modal crear usuario: selector claro de rol con explicación corta | 📦 FE `Vento/src/app/Components/Admin/CreateUserModal.tsx` | 1h |
| AC3 | Modal editar usuario: permite cambiar rol | 📦 FE `Vento/src/app/Components/Admin/EditUserModal.tsx` | 0.5h |
| AC4 | Cambio de rol se refleja inmediatamente sin recargar página | 📦 FE — invalidar cache roles en `UsersTable.tsx` | 0.5h |

### Dependencia
- Password policy estándar ya resuelto en **US-FB-01 AC3** (no se duplica)

---

## US-FB-06 — Notificación Email al Asignar Admin ⛔ BLOQUEADA

**Como** usuario recién promovido a administrador
**Quiero** recibir un email notificándome que ahora tengo rol admin
**Para** saber que puedo acceder a funciones administrativas

### Estado
⛔ **Bloqueada por ADR-009** — Servidor SMTP del cliente aún no provisto.

### Criterios de aceptación (cuando SMTP esté disponible)

| AC | Descripción | Horas estimadas |
|----|-------------|-----------------|
| AC1 | Configurar SMTP en realm `vento` (Email settings) | 0.5h |
| AC2 | Keycloak Events Listener custom o hook en `/api/admin/users/[id]/roles` dispara email | 2h |
| AC3 | Template de email en español con branding Vento | 1h |
| AC4 | Feature flag `ENABLE_EMAIL_NOTIFICATIONS` para encender/apagar | 0.5h |

**Total estimado post-desbloqueo: 4h**

Ver [ADR-009](../adr/ADR-009-notificaciones-email-pendientes-smtp.md) para contexto y plan.

---

## US-DOC-01 — Documentación Técnica Solicitada

**Como** cliente / nuevo dev / auditor
**Quiero** documentación clara de cómo funciona auth, qué se testea y qué stack se validó
**Para** entender las decisiones sin leer todo el código

### Criterios de aceptación

| AC | Descripción | Entregable | Horas |
|----|-------------|------------|-------|
| AC1 | Doc: estrategia de protección de rutas autenticadas | `docs/security/auth-strategy.md` | 2h |
| AC2 | Doc: estrategia de testing — dónde viven, qué hacen, qué validan | `docs/testing/test-strategy.md` | 2h |
| AC3 | Doc: validación de stack técnico (scaffold, PostGIS, Docker, H3, API) | `docs/architecture/tech-stack-validation.md` | 3h |

### Origen
- Item #6 del feedback (auth)
- Item #7 del feedback (testing)
- Item #8 del feedback (stack)

---

## Propuesta de asignación al equipo

| Dev | Horas semana 1 | HUs asignadas |
|-----|----------------|---------------|
| **Winx (tú)** | 20h | 🛠️ Realm configs (US-FB-01 AC3, US-FB-03 AC1) · 📚 Docs (US-DOC-01) · ADR-009 · Review PRs |
| **Part-time A** | 15h | 🎨 Theme Keycloak (US-FB-01 AC1, 2, 4, 5 + US-FB-02) |
| **Part-time B** | 15h | 📦 FE Mapa (US-FB-04) + Admin (US-FB-05) + SessionGuard (US-FB-03 AC2, 3, 4) |

**Total disponible**: 50h/sem · **Trabajo comprometido**: 32h · **Buffer**: 36% para reviews, bloqueos, demos.

---

## Cierre esperado

Al final del sprint:
- ✅ 6 HUs cerradas (US-FB-01 a US-FB-05 + US-DOC-01)
- ⛔ 1 HU en espera de SMTP (US-FB-06) con ADR formal
- 📚 3 documentos nuevos en `docs/`
- 🚀 Deploy de cambios a `deploy-test` para validación cliente
