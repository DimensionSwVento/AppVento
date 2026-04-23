---
version: 1.0
date: 2026-04-20
author: winx (tech lead)
scope: infraestructura Keycloak — dev (docker-compose) y producción (AccuWeb)
---

# Infraestructura Keycloak — Vento

Documentación consolidada de cómo se despliega, configura y opera Keycloak en el proyecto Vento. Complementa [auth-strategy.md](../security/auth-strategy.md) que se enfoca en el lado Next.js.

---

## 1. Archivos clave

| Archivo | Propósito |
|---------|-----------|
| [infra/keycloak/docker-compose.yml](../../infra/keycloak/docker-compose.yml) | Stack Keycloak + PostgreSQL para dev local |
| [infra/keycloak/.env.example](../../infra/keycloak/.env.example) | Plantilla de variables (admin, DB) |
| [infra/keycloak/realm-export.json](../../infra/keycloak/realm-export.json) | Realm `vento` pre-configurado (roles, cliente, scopes) |
| [infra/keycloak/themes/](../../infra/keycloak/themes/) | JARs del theme custom `keycloakify-starter` |
| [infra/keycloak/themes/README.md](../../infra/keycloak/themes/README.md) | Instrucciones para producción y dev |

---

## 2. Stack dev (docker-compose)

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:26.2
    command: start-dev --import-realm
    # ...
  keycloak-db:
    image: postgres:16-alpine
    # ...
```

### Componentes
- **Keycloak 26.2** en modo `start-dev` (no usar en prod)
- **PostgreSQL 16-alpine** para almacenar datos del IdP
- **Volume persistente** `keycloak_pgdata` — los usuarios creados sobreviven a `docker compose down`

### Qué monta automáticamente
1. `realm-export.json` → `/opt/keycloak/data/import/realm-export.json` (cargado con `--import-realm` al arrancar)
2. JAR del theme `keycloakify-starter` → `/opt/keycloak/providers/` (Keycloak lo detecta al boot)

### Levantar localmente

```bash
cd infra/keycloak
cp .env.example .env
# (opcional) ajustar admin password
docker compose up -d

# Acceder a consola admin:
#   http://localhost:8080
#   admin / admin (por defecto)

# Acceder al realm vento:
#   http://localhost:8080/realms/vento/account
```

### Detener y limpiar

```bash
# Detener (mantiene DB)
docker compose down

# Detener y borrar DB (limpia usuarios registrados)
docker compose down -v
```

---

## 3. Realm `vento` — configuración

Exportado en `realm-export.json`. Campos clave:

| Campo | Valor | Notas |
|-------|-------|-------|
| `realm` | `vento` | ID único del realm |
| `registrationAllowed` | `true` | Usuarios pueden auto-registrarse en `/realms/vento/login-actions/registration` |
| `registrationEmailAsUsername` | `true` | El email se usa como username (simplifica UX) |
| `resetPasswordAllowed` | `true` | Flujo "olvidé mi contraseña" habilitado |
| `loginWithEmailAllowed` | `true` | Login con email (no username separado) |
| `duplicateEmailsAllowed` | `false` | Un email = un usuario |
| `verifyEmail` | `false` | ⛔ Deshabilitado por stopper SMTP (ver [ADR-009](../spec/adr/ADR-009-notificaciones-email-pendientes-smtp.md)) |
| `editUsernameAllowed` | `false` | Username inmutable tras crear |
| `rememberMe` | `true` | Checkbox "Recordarme" en login |
| `loginTheme` | `keycloakify-starter` | Theme custom — ver §5 |
| `sslRequired` | `external` | HTTPS obligatorio para accesos externos, no internos |

### Roles de realm

| Rol | Descripción | Uso |
|-----|-------------|-----|
| `admin` | Administrador del sistema Vento | Acceso a `/admin/*` en la app |
| `analista` | Analista de viabilidad eólica | Usuario estándar, acceso al flujo principal |

**Default role en registro**: `analista` — todo usuario nuevo entra sin privilegios admin.

### Cliente OIDC

| Campo | Valor |
|-------|-------|
| `clientId` | `vento-web` |
| `publicClient` | `false` (confidencial — requiere secret) |
| `standardFlowEnabled` | `true` (Authorization Code) |
| `implicitFlowEnabled` | `false` |
| `directAccessGrantsEnabled` | `false` |
| `redirectUris` | `["http://localhost:3000/*"]` — **dev only** |
| `webOrigins` | `["http://localhost:3000"]` — **dev only** |
| `secret` | `dev-secret-change-in-production` — **rotar en prod** |

### Para producción, actualizar en el realm-export o en el admin console

```
redirectUris: ["https://vento.dominio-oficial.com/*"]
webOrigins: ["https://vento.dominio-oficial.com"]
attributes.post.logout.redirect.uris: "https://vento.dominio-oficial.com/*"
secret: <generado nuevo y almacenado en .env>
```

---

## 4. Theme custom `keycloakify-starter`

### Qué es
Un theme JAR que reemplaza las pantallas default de Keycloak (login, registro, reset password, account, error) con branding Vento.

### Archivos
- `themes/keycloak-theme-for-kc-22-to-25.jar` — compatibilidad Keycloak 22-25
- `themes/keycloak-theme-for-kc-all-other-versions.jar` — **Keycloak 26+** (el que usamos)

### Origen
Compilado con la herramienta [Keycloakify](https://keycloakify.dev) fuera de este repo. Solo los `.jar` resultantes se versionan aquí.

### Cómo se aplica en dev
Automático — el `docker-compose.yml` monta el JAR en `/opt/keycloak/providers/` y Keycloak lo detecta.
Si el theme no aparece en **Realm Settings → Themes**, verificar:
```bash
docker compose logs keycloak | grep -i theme
```

### Cómo se aplica en prod
Ver [infra/keycloak/themes/README.md](../../infra/keycloak/themes/README.md):
1. Copiar JAR a `<keycloak-install>/providers/`
2. `bin/kc.sh build` (si la instalación lo requiere)
3. Reiniciar Keycloak
4. Admin Console → Realm `vento` → Realm Settings → Themes → Login theme → seleccionar

### Actualizar el theme
1. Generar nuevo JAR con Keycloakify (fuera de este repo)
2. Reemplazar el archivo en `infra/keycloak/themes/`
3. Commit
4. En producción: subir al servidor + reiniciar Keycloak

### Pendiente relacionado
El feedback cliente (US-FB-01) pide **formularios 100% en español + rename "email" → "Correo de Usuario"**. Esto se hace **ajustando el theme** (archivos `.properties` de i18n) — no tocando backend. Tiempo estimado: 2-3h (ver [feedback-cliente-v1.md](../spec/stories/feedback-cliente-v1.md#us-fb-01)).

### US-FB-02 — confirmación post-registro (resuelta app-side)
El flujo `Registro → Confirmación → Login → Dashboard` se implementa con rutas custom en Next.js en lugar de `info.ftl`/`register-complete.ftl` en el theme. Decisión documentada en [ADR-012](../spec/adr/ADR-012-post-registration-confirmation-app-side.md). El realm no requiere cambios: el wildcard `http://localhost:3000/*` ya cubre los nuevos endpoints (`/api/auth/register/callback` y `/registration-success`). En producción, los wildcards en `redirectUris` y `post.logout.redirect.uris` del cliente `vento-web` deben apuntar al dominio real (ya documentado en §3).

---

## 5. Variables de entorno Keycloak (dev)

Del `.env.example`:

```bash
# Admin console
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin  # cambiar en cualquier entorno real
KC_HTTP_PORT=8080              # puerto expuesto en host

# DB del IdP (PostgreSQL interno)
POSTGRES_DB=keycloak
POSTGRES_USER=keycloak
POSTGRES_PASSWORD=keycloak     # cambiar en cualquier entorno real
```

**Importante**: NUNCA committear un `.env` con passwords reales — solo `.env.example` con placeholders.

---

## 6. Variables de entorno que consume el frontend (Vento)

Del `Vento/.env.example`:

```bash
AUTH_KEYCLOAK_ID=vento-web
AUTH_KEYCLOAK_SECRET=<secret del cliente en Keycloak>
AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/vento

NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=vento
# Opcional — si Keycloak usa path prefix:
# NEXT_PUBLIC_KEYCLOAK_ISSUER=https://example.com/identity/realms/vento
```

Ver [auth-strategy.md §8](../security/auth-strategy.md) para uso completo.

---

## 7. Usuarios admin — cómo promover manualmente

Opción A — **Consola Keycloak**:
1. `http://localhost:8080` → admin / admin
2. Seleccionar realm `vento` (no `master`)
3. Users → buscar usuario → Role mapping → Assign role → seleccionar `admin` → Assign

Opción B — **UI de la app** (si ya hay un admin existente):
1. Loguearse como admin existente
2. `/admin/users` → editar usuario → cambiar rol a admin

Opción C — **Crear un admin inicial** (primera vez):
1. Registrarse normalmente en la app → queda como `analista`
2. Promover a admin via opción A
3. Logout + login para que el nuevo rol entre al JWT

---

## 8. Flujo típico de uso para devs

### Primera vez
```bash
# 1. Levantar Keycloak + DB
cd infra/keycloak && cp .env.example .env && docker compose up -d

# 2. Verificar que el realm vento cargó
curl http://localhost:8080/realms/vento/.well-known/openid-configuration

# 3. Crear primer admin (ver §7 opción C)

# 4. Iniciar frontend
cd ../../Vento
cp .env.example .env  # rellenar AUTH_SECRET y AUTH_KEYCLOAK_SECRET
npm install
npm run dev
```

### Día a día
```bash
# Arrancar Keycloak (si no está corriendo)
docker compose -f infra/keycloak/docker-compose.yml up -d

# Iniciar frontend
cd Vento && npm run dev
```

### Resetear todo (borrar usuarios, empezar de cero)
```bash
cd infra/keycloak
docker compose down -v  # elimina volume de la DB
docker compose up -d    # re-importa realm-export
```

---

## 9. Exportar el realm para persistir cambios

Si cambias config en la admin console y quieres versionarlos:

```bash
# Dentro del contenedor keycloak
docker exec -it keycloak-keycloak-1 \
  /opt/keycloak/bin/kc.sh export --dir /opt/keycloak/data/export --realm vento

# Copiar al host
docker cp keycloak-keycloak-1:/opt/keycloak/data/export/vento-realm.json \
  ./infra/keycloak/realm-export.json

# Commit
```

**Ojo**: el export incluye secrets del cliente. Rotar el secret dev (`dev-secret-change-in-production`) después de exportar si lo comparten externamente.

---

## 10. Troubleshooting

### "Invalid redirect URI"
- Revisar que `redirectUris` del cliente incluye la URL exacta del frontend (protocolo + host + puerto + path wildcard)
- En prod, actualizar del valor dev `http://localhost:3000/*` al dominio real

### Keycloak no arranca
```bash
docker compose logs keycloak -f
# Causa común: DB aún no healthy
# Esperar ~10s y reintentar
```

### "HTTPS required" en login
- Revisar `sslRequired: "external"` del realm — permite HTTP en acceso interno
- En prod detrás de proxy HTTPS: asegurar `X-Forwarded-Proto: https` llega a Keycloak (configurar `proxy-headers: xforwarded` en Keycloak)

### Theme no aparece en Admin Console
- Verificar JAR está en `/opt/keycloak/providers/`
- Reiniciar contenedor: `docker compose restart keycloak`
- Si persiste: revisar version del JAR vs version de Keycloak

### Access token expira muy rápido (<1 min)
- Admin → Realm Settings → Tokens → "Access Token Lifespan" — ajustar
- Default Keycloak: 5 min. Propuesta [US-FB-03](../spec/stories/feedback-cliente-v1.md#us-fb-03): 15 min

---

## 11. Relacionados

- [auth-strategy.md](../security/auth-strategy.md) — cómo el frontend usa Keycloak
- [frontend-backend-integration.md](../architecture/frontend-backend-integration.md) — integración Next.js ↔ FastAPI (ambos validan contra Keycloak)
- [ADR-005 Keycloak como IdP](../spec/adr/ADR-005-keycloak-identidad.md)
- [ADR-009 SMTP stopper](../spec/adr/ADR-009-notificaciones-email-pendientes-smtp.md)
- [US-FB-01 Keycloak ES + botón inicio + password policy](../spec/stories/feedback-cliente-v1.md#us-fb-01) — trabajo pendiente en theme
- [accuweb-runbook.md §5](../ops/accuweb-runbook.md) — config Keycloak para producción
