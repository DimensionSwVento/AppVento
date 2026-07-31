---
id: ADR-012
title: Flujo Post-Registro con Confirmación — Implementación App-Side
status: aceptado
date: 2026-04-22
related:
  - ADR-005-keycloak-identidad
  - ADR-009-notificaciones-email-pendientes-smtp
historia: US-FB-02
---

# ADR-012: Flujo Post-Registro con Confirmación — Implementación App-Side

## Contexto

La historia [US-FB-02](../stories/feedback-cliente-v1.md#us-fb-02) pide que, tras registrarse, el usuario vea una pantalla de confirmación en español y sea redirigido a login explícito antes de poder entrar al dashboard. Flujo esperado:

```
Registro → [CONFIRMACIÓN "Usuario registrado"] → Login → Dashboard
          (antes iba directo: Registro → Dashboard)
```

El AC original sugirió resolverlo con:
- `🎨 Theme` — `info.ftl` / `register-complete.ftl`
- `🛠️ Realm Auth Flow → Post Broker Login Flow`

Al revisar el repo y la configuración real de Keycloak aparecieron **tres restricciones** que invalidan ese camino tal como está escrito:

1. **Fuentes del theme no viven en este repo.** El tema custom `keycloakify-starter` se compila fuera (con [Keycloakify](https://keycloakify.dev)) y solo los `.jar` resultantes se versionan en `infra/keycloak/themes/`. Ver [`docs/infra/keycloak.md §4`](../infra/keycloak.md#4-theme-custom-keycloakify-starter). Modificar `info.ftl` requeriría rebuild externo + subida manual del JAR, saliendo del flujo normal del sprint.

2. **"Post Broker Login Flow" no aplica.** Ese flow de Keycloak corre únicamente cuando hay *identity brokering* (IdP externo como Google, Azure AD, etc.). Vento no tiene IdP externo: los usuarios se registran directo en el realm `vento` vía OIDC. El flow nunca se ejecuta.

3. **Email verification bloqueada.** La forma Keycloak-nativa de romper el auto-login tras registro es activar `verifyEmail: true` — el usuario queda inactivo hasta confirmar por correo. Está **bloqueada por [ADR-009](ADR-009-notificaciones-email-pendientes-smtp.md)** (sin SMTP institucional).

Sin ninguna de esas tres palancas, el flujo OIDC de Keycloak emite tokens al terminar el registro y NextAuth crea la sesión → middleware manda al dashboard.

## Decisión

**Controlar el flujo post-registro desde Next.js** (capa que sí controlamos en el repo), mediante dos rutas API nuevas que orquestan el registro en Keycloak y cierran la sesión SSO antes de enseñar la confirmación.

### Componentes

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| `GET /api/auth/register` | `Vento/src/app/api/auth/register/route.ts` | Construye y redirige al endpoint dedicado de Keycloak `/<realm>/protocol/openid-connect/registrations` (alias del authorization endpoint que muestra el form de registro directo, sin pasar por login) con `state` (CSRF) y `redirect_uri` apuntando al callback |
| `GET /api/auth/register/callback` | `Vento/src/app/api/auth/register/callback/route.ts` | Valida `state`, intercambia `code`→`tokens` (solo para capturar `id_token`), redirige a `logout_endpoint` de Keycloak con `id_token_hint` y `post_logout_redirect_uri=/registration-success` |
| `/registration-success` | `Vento/src/app/registration-success/page.tsx` | Server component con mensaje en español y botón explícito a `/` (login) |
| `SignUpButton` | `Vento/src/app/Components/SignUpButton.tsx` | Disparador del flujo desde la landing |

**Clave:** el callback **no llama a NextAuth** ni persiste sesión local — solo extrae `id_token` para el federated logout. Cuando el usuario termina el logout federado en Keycloak, la cookie SSO de Keycloak se elimina y el usuario queda 100% desautenticado antes de ver la confirmación. Esto garantiza AC3 ("no se redirige al dashboard sin autenticación") de forma criptográficamente fuerte: no existe token válido en ningún lado.

### Diagrama

```
┌──────────┐ 1. Click "Crear cuenta"   ┌──────────────────────┐
│ Browser  │──────────────────────────►│ GET /api/auth/       │
│          │                           │     register         │
└──────────┘                           └──────────┬───────────┘
                                                  │ 2. Redirect a KC
                                                  │    /protocol/openid-connect/
                                                  │      registrations
                                                  │    state=<csrf>
                                                  ▼
                                       ┌──────────────────────┐
                                       │ Keycloak Register    │
                                       └──────────┬───────────┘
                                                  │ 3. Usuario completa form
                                                  │    KC crea SSO cookie
                                                  │    emite auth code
                                                  ▼
                                       ┌────────────────────────────┐
                                       │ GET /api/auth/register/    │
                                       │       callback             │
                                       │ - verify state             │
                                       │ - POST token_endpoint      │
                                       │ - extract id_token         │
                                       └──────────┬─────────────────┘
                                                  │ 4. Redirect a KC logout
                                                  │    id_token_hint=...
                                                  │    post_logout_redirect=
                                                  │      /registration-success
                                                  ▼
                                       ┌────────────────────────────┐
                                       │ Keycloak logout endpoint   │
                                       │ - termina SSO              │
                                       │ - borra cookie KC          │
                                       └──────────┬─────────────────┘
                                                  │ 5. Redirect limpio
                                                  ▼
                                       ┌────────────────────────────┐
                                       │ /registration-success      │
                                       │ "¡Registro exitoso!"       │
                                       │ [Iniciar sesión] → /       │
                                       └────────────────────────────┘
```

## Alternativas consideradas

### A. Modificar `register-complete.ftl` / `info.ftl` en el theme
- ❌ Fuentes del theme fuera del repo (Keycloakify externo)
- ❌ Requiere rebuild + upload manual del JAR → fricción por cada cambio
- ❌ No resuelve AC3 por sí sola: aunque el theme muestre la confirmación, Keycloak ya emitió código y creado sesión — el atacante puede ir directo a `/dashboard` si navega rápido

### B. Activar `verifyEmail: true` en el realm
- ❌ **Bloqueado** por ADR-009 (sin SMTP)
- ✅ Sería la vía ideal cuando haya SMTP → migrar a esto post-ADR-009

### C. Required Action custom tras registro (Keycloak SPI)
- ❌ Requiere escribir código Java y empaquetar un `.jar` adicional como provider
- ❌ Over-engineering para una historia de 4h

### D. Modificar el Registration Flow con `reset-credentials` al final
- ❌ Keycloak no permite encadenar "crear user → logout" sin SPI
- ❌ El flow de registro siempre termina con sesión activa por diseño del protocolo OIDC

### E. Detectar registro en callback `signIn` de NextAuth y devolver `false`
- ⚠️ Posible pero frágil: necesita un claim fiable (`created_timestamp`, `auth_time`) y no limpia la cookie SSO de Keycloak → en el próximo `signIn` el usuario entra sin pedir credenciales (SSO silencioso)
- ❌ No cumple AC3 de forma estricta

La opción elegida (**app-side con dos rutas + federated logout**) es la única que cumple los tres AC **hoy**, sin depender de SMTP ni de rebuild externo.

## Consecuencias

### Positivas
- Cumple AC1, AC2 y AC3 con código que vive dentro del repo y se testea con Vitest como el resto de rutas de auth.
- Cero modificaciones al JAR del theme — el entregable de Keycloakify sigue siendo responsabilidad del pipeline externo.
- Reversible: quitar `SignUpButton` de la landing oculta el camino; las rutas quedan inertes.
- Compatible con la migración futura a `verifyEmail: true` cuando SMTP esté listo (el mensaje de confirmación se puede adaptar para decir "revisa tu correo" en vez de "inicia sesión").

### Negativas / Trade-offs
- El texto de confirmación vive en Next.js, no en el theme. Si un día el cliente decide que el tema debe incluir branding en esa pantalla, habrá que migrar el texto a `info.ftl` — cambio de ~15 min cuando las fuentes del theme entren al repo.
- Un request extra a Keycloak (token exchange + logout) por cada registro. Despreciable a nuestra escala.
- El `client_secret` se usa en el callback — ya vivía en server-side (ver [`auth-strategy.md §2`](../security/auth-strategy.md)).

### Requisitos operativos
- `redirectUris` del cliente Keycloak debe incluir el callback. En dev `http://localhost:3000/*` ya lo cubre. En producción (ver [`docs/ops/accuweb-runbook.md`](../ops/accuweb-runbook.md)) debe incluir `https://vento.dominio/*`.
- `post.logout.redirect.uris` debe permitir `/registration-success`. Ya cubierto por el wildcard.

## Limitaciones conocidas

### L1. Link "Register" nativo dentro del login form de Keycloak

Con el realm configurado con `registrationAllowed: true` (necesario para que `/registrations` funcione), Keycloak también renderiza un link **"Register"** al pie de su form de login nativo. Si un usuario llega al login (flujo `signIn("keycloak")` disparado desde `SignInButton`) y pulsa ese link en vez de nuestro botón "Crear cuenta":

1. Keycloak lo lleva al form de registro interno.
2. Tras completar el registro, Keycloak redirige al `redirect_uri` del **login original** (`/api/auth/callback/keycloak`, el callback por defecto de NextAuth), **no** al nuestro.
3. NextAuth procesa ese callback como un login exitoso y crea sesión → middleware manda al dashboard.
4. **Resultado:** el usuario se salta `/registration-success` y aterriza directo en dashboard.

**Por qué no se bloquea aquí:**
- El link "Register" vive en el template Freemarker del theme (`login.ftl`); el theme se compila fuera de este repo (ver [`docs/infra/keycloak.md §4`](../infra/keycloak.md#4-theme-custom-keycloakify-starter)). Ocultarlo requiere rebuild externo del JAR — fuera del alcance de US-FB-02.
- Detectar server-side en el callback de NextAuth si el usuario acaba de registrarse (vía claim `auth_time`, `created_timestamp` o similar) es la alternativa E evaluada arriba; frágil y no limpia la cookie SSO → no cumple AC3 estricto.

**Resolución prevista:**
- **[US-FB-01](../stories/feedback-cliente-v1.md#us-fb-01)** contempla la modificación del theme. Cuando esa historia entre, se ocultará el link "Register" del `login.ftl` (o se apuntará al mismo `/api/auth/register` del app vía `socialProviders`), eliminando el camino alternativo.
- **Post-ADR-009 (SMTP disponible):** al activar `verifyEmail: true`, ambos caminos convergen porque Keycloak deja al usuario inactivo hasta verificar email — no hay auto-login posible por ningún lado.

**Mitigación operativa actual:**
- El flujo "correcto" (Crear cuenta en la landing) sí cumple los tres AC.
- El flujo "alternativo" (Register dentro del login) es funcionalmente equivalente al login estándar de cualquier sitio con autoregistro — el usuario queda logueado. No introduce un riesgo de seguridad; solo salta el mensaje de confirmación visual.
- Si el cliente reporta el comportamiento antes de US-FB-01, se puede mitigar temporalmente poniendo `registrationAllowed: false` en el realm y dejando `/protocol/openid-connect/registrations` como endpoint "oculto" accesible solo desde nuestro botón. **Trade-off:** perderíamos el link "Register" oficial, pero como nadie debería llegar ahí (solo venimos desde `SignUpButton`), es aceptable. Cambio reversible en `infra/keycloak/realm-export.json`.

## Plan de migración cuando SMTP esté disponible (post-ADR-009)

1. Activar `verifyEmail: true` en `realm-export.json`.
2. Actualizar copy en `/registration-success` para decir "Revisa tu correo para activar la cuenta" + botón deshabilitado hasta verificar.
3. Opcional: mover el texto a `info.ftl` del theme cuando las fuentes entren al repo.
4. Mantener las rutas `/api/auth/register*` como fallback (útiles si SMTP cae).

## Referencias

- [US-FB-02 en `feedback-cliente-v1.md`](../stories/feedback-cliente-v1.md#us-fb-02-flujo-post-registro-con-confirmación)
- [`auth-strategy.md §3`](../security/auth-strategy.md#3-capas-de-protección-defensa-en-profundidad) — capas de protección existentes
- [`docs/infra/keycloak.md §4`](../infra/keycloak.md#4-theme-custom-keycloakify-starter) — por qué el theme está fuera del repo
- [Keycloak — Registration endpoint (`/protocol/openid-connect/registrations`)](https://www.keycloak.org/docs/latest/server_admin/#con-user-registration_server_administration_guide) — alias del authorization endpoint que muestra el form de registro directo
- [OpenID Connect RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
- Nota sobre `kc_action=register`: ese parámetro es para Keycloak Required Actions (CONFIGURE_TOTP, UPDATE_PASSWORD, etc.), NO para disparar el form de registro; Keycloak lo rechaza con `kc_action_status=error` y muestra login. Por eso usamos `/registrations`.
