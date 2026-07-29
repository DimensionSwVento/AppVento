---
version: 1.0
date: 2026-04-20
author: mavalan Software
audience: dev team + future on-call
scope: operación de producción Vento en AccuWeb
---

# Runbook — Operación Vento en AccuWeb

Guía operativa para despliegue, monitoreo y resolución de incidentes del frontend Vento en hosting AccuWeb. Sirve de onboarding para los devs part-time.

> **Antes de operar**: lee [auth-strategy.md](../security/auth-strategy.md) y [tech-stack-validation.md](../architecture/tech-stack-validation.md) §13 — lecciones aprendidas.

---

## 1. Información esencial

| Dato | Valor |
|------|-------|
| Proveedor | AccuWeb.cloud |
| URL pública | (dominio oficial pendiente — actualmente dominio de test) |
| Panel admin | Credenciales en gestor de secretos del equipo (no en repo) |
| Soporte proveedor | Ticket system vía panel AccuWeb |
| Runtime en servidor | Node.js (version especificada por AccuWeb) |
| Artefacto | `.next/standalone/` + `node_modules/` mínimos + `public/` + `.next/static/` |
| Proxy | Nginx interno del proveedor (no configurable por nosotros) |
| Certificado SSL | Gestionado por AccuWeb (externo HTTPS) |
| HTTP interno | Entre contenedores solo HTTP (no HTTPS) |

---

## 2. Limitaciones conocidas del hosting

### 2.1 Nginx buffers restrictivos
- `client_header_buffer_size` y `large_client_header_buffers` son los default del proveedor, **no podemos aumentarlos**.
- Síntoma típico: `400 Bad Request — Request Header Or Cookie Too Large`.
- **Workaround aplicado**: reducción de cookie `authjs.session-token` removiendo `idToken` del JWT. Ver [auth-strategy.md §2](../security/auth-strategy.md).

### 2.2 HTTPS externo, HTTP interno
- Keycloak reporta issuer HTTPS en tokens, pero solo acepta HTTP entre contenedores.
- **Workaround aplicado**: función `httpsToHttp()` en [Vento/src/auth.ts](../../Vento/src/auth.ts) reescribe URLs internas.

### 2.3 Sin `npm install` en servidor
- AccuWeb no permite ejecutar `npm install` post-deploy.
- **Workaround aplicado**: `output: "standalone"` en [Vento/next.config.ts](../../Vento/next.config.ts). Copiar `.next/standalone/` + `node_modules/` mínimos.

### 2.4 Sin acceso a logs del nginx proxy
- Solo vemos logs de Node.js (stdout/stderr de la app).
- Para debug de problemas de cookies/headers: usar DevTools del browser.

---

## 3. Estructura de deploy

### 3.1 Artefactos requeridos
Tras `npm run build`, copiar al servidor:
```
/ (raíz app en servidor)
├── server.js               # Entry point standalone
├── package.json
├── node_modules/           # Solo deps prod (Next.js lo genera mínimo)
├── .next/
│   ├── server/             # Del build standalone
│   └── static/             # Assets estáticos
└── public/                 # Assets públicos (logos, etc.)
```

### 3.2 Variables de entorno en producción
Archivo `.env` en servidor (no en repo):

```bash
# Auth
AUTH_SECRET=<secreto-criptográfico-largo>
AUTH_TRUST_HOST=true
AUTH_URL=<URL pública del dominio>

# Keycloak
AUTH_KEYCLOAK_ID=<client-id>
AUTH_KEYCLOAK_SECRET=<client-secret>
AUTH_KEYCLOAK_ISSUER=<URL interna HTTP del realm>

# Backend API
NEXT_PUBLIC_API_URL=<URL backend FastAPI>

# Node
NODE_ENV=production
PORT=3000
```

**Nunca** commitear `.env` con valores reales — solo `.env.example` con placeholders.

---

## 4. Proceso de deploy

Se manejan **dos modos en paralelo** — el CI cuando funciona, y manual cuando CI falla.

### 4.1 Deploy vía CI (preferido)

Workflow: [`ci.yml`](../.github/workflows/ci.yml). En ramas de desarrollo vive en `docs/.github/workflows/ci.yml`; al push/PR a `main` una automation lo reubica a `.github/workflows/` para que Actions lo ejecute (ver §8).

Flujo:
1. Push a rama `develop` → stages `quality → build → security → deploy`
2. Stage `deploy` crea/sobreescribe la rama orphan `deploy-test` con solo el contenido de `Vento/` movido a la raíz (elimina `docs/`, `_bmad/`, `_bmad-output/`, `infra/`, `.next`).
3. cPanel de AccuWeb tiene configurado **auto-deploy desde `deploy-test`** — pull + `npm install` + restart Node.
4. Para producción: merge `develop` → `main`, push → genera `deploy-prod` análogamente.

**Secrets requeridos en GitHub** (Settings → Secrets):
- `NEXT_PUBLIC_API_URL`, `AUTH_SECRET`, `AUTH_KEYCLOAK_SECRET`, `AUTH_KEYCLOAK_ISSUER`
- `NEXT_PUBLIC_KEYCLOAK_URL`, `NEXT_PUBLIC_KEYCLOAK_REALM`, `NEXT_PUBLIC_KEYCLOAK_ISSUER`

### 4.2 Deploy manual (fallback si CI no corre)

Opción A — **con standalone** (activar temporalmente en `next.config.ts` si se necesita evitar `npm install` en servidor):
```bash
# En next.config.ts añadir: output: "standalone"
cd Vento
npm run build
# Copiar artefactos mínimos:
rsync -avz --delete \
  .next/standalone/ \
  .next/static/ \
  public/ \
  usuario@accuweb-host:/ruta/app/
```

Opción B — **deploy normal via git** (reproduce el flujo CI manualmente):
```bash
# Local desde la raíz del repo
git checkout deploy-test
git pull
# Si deploy-test diverge mucho, recrearlo desde develop:
git checkout develop
git subtree push --prefix Vento origin deploy-test  # o equivalente
# cPanel toma el push y redesplega
```

Opción C — **SFTP simple** (sin git):
```bash
cd Vento
npm run build
# Subir todo Vento/ (excepto node_modules y .next/cache) al servidor vía panel AccuWeb
# En servidor: npm install --production && reiniciar app
```

### 4.3 Verificación post-deploy
1. Abrir URL pública → debe cargar login.
2. Loguear con usuario de test → dashboard.
3. Click en hex → selección visible.
4. Logout → vuelve a login.
5. DevTools → Application → Cookies → `authjs.session-token` existe y es **<4KB**.

Si algo falla → §7 troubleshooting.

### 4.3 Verificación post-deploy
1. Abrir URL pública → debe cargar login.
2. Loguear con usuario de test → dashboard.
3. Click en hex → selección visible.
4. Logout → vuelve a login.
5. DevTools → Application → Cookies → `authjs.session-token` existe y es **<4KB**.

Si algo falla → §7 troubleshooting.

---

## 5. Configuración Keycloak para producción

Cuando el dominio oficial llegue, en Keycloak realm `vento` → cliente de Vento:

- **Root URL**: `https://dominio-oficial.com`
- **Valid Redirect URIs**: `https://dominio-oficial.com/api/auth/callback/keycloak`
- **Valid post logout redirect URIs**: `https://dominio-oficial.com/*` (o el path exacto)
- **Web Origins**: `https://dominio-oficial.com`

Tras esto, actualizar `AUTH_URL` en `.env` del servidor y redeploy.

---

## 6. Monitoreo y logs

### 6.1 Logs de Node.js
- Panel AccuWeb → Node.js app → Logs
- Buscar errores críticos con keyword: `Error`, `FATAL`, `auth`, `keycloak`

### 6.2 Métricas básicas a verificar semanalmente
- App responde en <2s (página de login)
- Ningún `500` en últimas 24h
- Uso de memoria dentro del plan contratado con AccuWeb

### 6.3 Pendiente — futuro
- Integrar con servicio de APM (Sentry, LogRocket) — evaluar costo/beneficio post-v1.0
- Healthcheck `/api/health` integrado a monitor externo (UptimeRobot gratis)

---

## 7. Troubleshooting

### 7.1 Error 400 "Request Header Or Cookie Too Large"
**Causa probable**: cookies acumuladas de auth > 4KB.
**Diagnóstico**:
- DevTools → Application → Cookies → medir tamaño de cada cookie
- Sumar todos los valores; si > 4KB, el problema es tamaño
**Fix inmediato**: pedir al usuario borrar cookies del dominio y relogear
**Fix estructural**: revisar que los cambios de `auth.ts` (cookie reduction) están desplegados — validar que `authjs.session-token` es ~1.7KB, no 3.2KB

### 7.2 Logout redirige a URL concatenada rara
**Ejemplo**: `https://midominio.comhttps://otro...`
**Causa**: Root URL mal configurada en cliente Keycloak (placeholder residual)
**Fix**: Keycloak admin → cliente → Settings → limpiar Root URL. Ver [auth-strategy.md §6](../security/auth-strategy.md).

### 7.3 Login infinito (loop de redirects)
**Causa probable**: `AUTH_URL` en `.env` no coincide con URL pública real
**Diagnóstico**: comparar `AUTH_URL` vs dominio en barra del browser
**Fix**: ajustar `.env` + reiniciar Node

### 7.4 App no arranca post-deploy
**Causa probable**: `.env` falta variables o `node_modules/` incompleto
**Diagnóstico**:
```bash
# En servidor
node --version                     # debe ser >= 20
ls -la node_modules/next           # debe existir
cat .env | grep AUTH_SECRET        # debe existir y no estar vacío
```
**Fix**: re-copiar artefactos o re-generar `.env`

### 7.5 "DISCOVERY FETCH FAILED" en logs arranque
**Causa**: Keycloak no responde al `.well-known/openid-configuration`
**Diagnóstico**:
```bash
curl -v http://keycloak-interno/identity/realms/vento/.well-known/openid-configuration
```
**Fix**: revisar que el contenedor Keycloak está corriendo y la URL interna es correcta

### 7.6 Hexágonos no aparecen en el mapa
**Causa probable**: backend FastAPI no responde a `/api/tiles/{z}/{x}/{y}`
**Diagnóstico**: DevTools → Network → ver si hay 404/500 en requests de tiles
**Fix**:
- Si 404 en zoom alto (12+): backend no soporta esa resolución — revertir `MAX_ZOOM` temporalmente
- Si 500: revisar logs del backend

---

## 8. Pipeline CI — estado y troubleshooting

### 8.1 Estado actual
⚠️ **CI inestable en ramas de desarrollo.** Funciona al llegar a `main` — hay automations que reubican los workflows (`docs/.github/workflows/` → `.github/workflows/`) en el push/PR a `main`. Durante desarrollo en `develop` y feature branches el pipeline puede no dispararse consistentemente.

### 8.2 Pasos de diagnóstico cuando no dispara
1. GitHub repo → Settings → Actions → Permissions → "Allow all actions" activado
2. GitHub repo → Settings → Actions → General → workflow permissions → "Read and write"
3. Secrets configurados (GitHub → Settings → Secrets and variables → Actions):
   - `AUTH_SECRET`, `AUTH_KEYCLOAK_SECRET`, `AUTH_KEYCLOAK_ISSUER`
   - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_KEYCLOAK_URL`, `NEXT_PUBLIC_KEYCLOAK_REALM`, `NEXT_PUBLIC_KEYCLOAK_ISSUER`
4. Verificar que la automation que mueve `.github` ejecutó correctamente (ver el job correspondiente en Actions history).
5. Si no, revisar `on:` triggers en `docs/.github/workflows/ci.yml` — debe incluir `push` a las ramas activas y `paths-ignore` no debe excluir todo.
6. Commit dummy en `develop` → ver Actions tab del repo.

### 8.3 Workaround mientras tanto
Deploy manual (§4.2) si CI no entrega artefactos.

---

## 9. Rotación de secretos

### Cuándo
- Si se sospecha filtración
- Cada 6 meses como higiene
- Al salir un dev del equipo

### Cómo
1. Generar nuevo `AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
2. Keycloak admin → Clients → Vento → Credentials → Regenerate Secret
3. Actualizar ambos en `.env` servidor
4. Reiniciar Node
5. Actualizar GitHub Secrets si CI los usa
6. **Todos los usuarios logueados serán forzados a re-loguear** (sus JWT firmados con el secret anterior dejan de validar)

---

## 10. Escalamiento y contactos

| Problema | Primera acción | Escalación |
|----------|----------------|-----------|
| App caída | §7.4 | Soporte AccuWeb vía panel |
| Keycloak caído | Revisar contenedor Keycloak | Responsable de infra (otro dev) |
| Backend FastAPI caído | Logs del backend | Responsable backend (mavalan Software) |
| Certificado SSL expirado | AccuWeb debe renovar automáticamente | Ticket a AccuWeb |
| Filtración de secreto | §9 rotación inmediata | Notificar cliente + equipo |

---

## 11. Checklist pre-deploy

Antes de cada deploy a producción, confirmar:

- [ ] Tests pasan local: `npm run test:run`
- [ ] Typecheck pasa: `npx tsc --noEmit`
- [ ] Lint pasa: `npm run lint`
- [ ] `.env` en servidor tiene todas las variables requeridas
- [ ] Ninguna referencia a `localhost` o dominio de test en código committeado
- [ ] Keycloak whitelist de redirect URIs incluye dominio de destino
- [ ] Changelog o PR description clara de qué cambia
- [ ] Backup del artefacto actual en servidor antes de sobrescribir

## 12. Checklist post-deploy

- [ ] URL pública carga login
- [ ] Login completo funciona (usuario de test)
- [ ] `/admin/users` accesible solo para admin
- [ ] Selección de hexágono funciona
- [ ] Logout redirige a login sin errores
- [ ] `authjs.session-token` < 4KB en DevTools
- [ ] Ningún `500` en logs de Node en primeros 5 minutos

---

## 13. Onboarding rápido para nuevo dev

Si eres nuevo al equipo, orden de lectura:
1. [Spec_doc.md](../spec/Spec_doc.md) — contexto del proyecto
2. [tech-stack-validation.md](../architecture/tech-stack-validation.md) — qué se usa y por qué
3. [auth-strategy.md](../security/auth-strategy.md) — cómo funciona auth
4. Este runbook — cómo operarlo
5. [test-strategy.md](../testing/test-strategy.md) — cómo testear lo que cambies
6. [feedback-cliente-v1.md](../spec/stories/feedback-cliente-v1.md) — qué sigue

Tras leer, levantar stack local:
```bash
cd Vento
cp .env.example .env           # rellenar con valores de dev
npm install
npm run dev                    # en paralelo el docker-compose con Keycloak + Postgres
```

Primer commit recomendado: pequeño bugfix o doc fix — familiarizarse con el flujo git + PR + review antes de tomar una HU completa.

---

## 14. Referencias

- [auth-strategy.md](../security/auth-strategy.md)
- [tech-stack-validation.md](../architecture/tech-stack-validation.md)
- [test-strategy.md](../testing/test-strategy.md)
- [feedback-cliente-v1.md](../spec/stories/feedback-cliente-v1.md)
- [ADR-009 SMTP](../spec/adr/ADR-009-notificaciones-email-pendientes-smtp.md)
