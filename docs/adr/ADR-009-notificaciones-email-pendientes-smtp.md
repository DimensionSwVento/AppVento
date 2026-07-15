---
id: ADR-009
title: Notificaciones por Email — Pendientes de SMTP Institucional
status: propuesto — bloqueado por stopper externo
date: 2026-04-20
---

# ADR-009: Notificaciones por Email — Pendientes de SMTP Institucional

## Contexto

Durante la revisión del cliente al deploy en AccuWeb se recibió feedback solicitando:

- **Notificación al asignar rol admin**: que un usuario recién promovido reciba email avisándolo (item #7 del feedback cliente, ahora `US-FB-06`).
- **Emails transaccionales Keycloak**: verificación de correo en registro, recuperación de contraseña (ya contemplado parcialmente en `US01.3` del scope contractual).

**Bloqueante**: el cliente aún no ha provisto un servidor SMTP institucional. Sin SMTP, Keycloak no puede enviar emails de:
- Verificación de cuenta
- Reset de contraseña
- Notificaciones custom (ej. cambio de rol)

Se rescató previamente el Keycloak server, pero SMTP sigue sin configurar porque depende de infraestructura del cliente (relay corporativo, credenciales, dominio de envío).

## Decisión

**Preparar el código y la configuración lo más posible asumiendo SMTP futuro, pero NO activarlo hasta que el cliente provea credenciales.** Se implementa con `feature flag` que permite encender el flujo sin nuevos despliegues cuando SMTP esté disponible.

### Estado de las piezas

| Componente | Estado ahora | Estado al llegar SMTP |
|------------|--------------|------------------------|
| Keycloak realm SMTP settings | Vacío | Rellenar (host, port, auth, from) |
| Password policy con "Verify Email" | Desactivado | Activar en authentication flow |
| Feature flag `ENABLE_EMAIL_NOTIFICATIONS` | `false` (default) | `true` en `.env` producción |
| Hook en `POST /api/admin/users/[id]/roles` que dispara email custom | **No implementado** — se implementa al desbloquear | Activado vía feature flag |
| Template de email en español con branding Vento | Pendiente (se hace al desbloquear) | Desplegado |

### Ruta crítica al desbloqueo

1. Cliente entrega: host SMTP, puerto, usuario, password, dominio de `from`, política (STARTTLS/SSL).
2. Configurar realm `vento` → Email Settings (~15 min).
3. Probar envío real (Keycloak tiene botón "Test connection") (~5 min).
4. Activar `Verify Email` en required actions del realm (~5 min).
5. Implementar hook custom + template para notificación admin (ver US-FB-06, ~3.5h).
6. Encender flag `ENABLE_EMAIL_NOTIFICATIONS=true` en `.env`, redeploy.

**Tiempo total tras desbloqueo: ~4h** (asumiendo cliente entrega credenciales correctas y no hay firewall que bloquee el puerto).

## Alternativas consideradas

### Opción A: Usar SMTP público (Mailgun, Sendgrid, Resend) mientras llega el oficial
- ❌ Rechazada — emails institucionales no pueden salir de dominios terceros por políticas del cliente (ANH).
- ❌ Riesgo de que el cliente reciba emails de `@mailgun.net` y lo marque como spam o exija migración inmediata.

### Opción B: Desarrollar el hook + template desde ya, desactivado
- ⚠️ Considerada pero rechazada para este sprint — riesgo de que los requerimientos de template cambien al llegar las credenciales (branding, firma legal, compliance).
- ✅ Lo que SÍ se hace ahora: preparar feature flag en código y dejar realm listo para recibir config.

### Opción C: Mock SMTP en desarrollo
- ✅ Aceptada para ambiente local de dev (ver docker-compose con `mailhog` opcional).
- No aplica a producción AccuWeb.

## Consecuencias

### Positivas
- No se introduce deuda técnica prematura. El código que se escriba cuando llegue SMTP será con requisitos reales del cliente.
- Feature flag evita redeploy: solo cambio de `.env` + reinicio contenedor.
- ADR deja constancia formal de que **el bloqueo es externo**, no del equipo dev.

### Negativas
- **Registro de usuarios sin verificación de email**: cualquier email válido (formato) pasa. Mitigación temporal: aprobación manual del admin vía UI de Keycloak antes de asignar rol.
- **Recuperación de contraseña manual**: si un usuario olvida password, solo el admin puede resetearla desde la consola Keycloak. Mitigación: documentarlo en `docs/ops/accuweb-runbook.md`.
- Feedback cliente item #7 (notificación admin) no se entrega en este sprint — se comunica formalmente que depende de SMTP.

### Riesgos
- **Bloqueo indefinido**: si el cliente tarda >3 semanas en entregar SMTP, considerar Opción A (temporal) con acuerdo explícito del cliente.
- **Configuración SMTP incorrecta**: primera prueba puede fallar por firewall o credenciales. Buffer de 2h para diagnóstico con cliente.

## Items afectados

| Item feedback | Historia | Dependencia de este ADR |
|---------------|----------|-------------------------|
| #7 (notificación admin) | US-FB-06 | **Bloqueado** — se implementa cuando SMTP llegue |
| US01.3 (reset password) | Scope contractual | **Bloqueado** — mismo stopper |
| Verificación de email en registro | Implícito en US-FB-02 | **Degradado temporalmente** — sin verificación |

## Acción inmediata

1. Este ADR se adjunta a la próxima comunicación formal al cliente (demo / status report) solicitando SMTP como **bloqueante crítico** para cerrar contractualmente US01 y entregar US-FB-06.
2. Se actualiza [docs/project-status.md](../project-status.md) marcando esos items como "⛔ bloqueado — ver ADR-009".
3. Cualquier desarrollador que toque auth debe leer este ADR antes de asumir que SMTP está disponible.

---

**Aceptado por**: Mavalan Software
**Próxima revisión**: al recibir credenciales SMTP del cliente, o a los 14 días (2026-05-04) si sigue sin resolverse.
