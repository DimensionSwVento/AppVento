# Vento Frontend

Frontend del proyecto Vento — aplicación web de análisis de viabilidad eólica para Colombia.

## Stack

- **Next.js 16+** (App Router, TypeScript, Tailwind CSS)
- **NextAuth v5** + **Keycloak** (OIDC authentication)
- **jose** (JWT decoding)

## Arquitectura

```
  ┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
  │   Frontend   │──────>│  FastAPI Backend  │──────>│  Parquet/BD  │
  │   (Next.js)  │ HTTP  │  (Python)        │       │              │
  └──────┬───────┘       └──────────────────┘       └──────────────┘
         │
         ▼
  ┌──────────────┐
  │   Keycloak   │
  │   (OIDC)     │
  └──────────────┘
```

## Ramas

| Rama | Propósito |
|------|-----------|
| `develop` | Desarrollo activo |
| `main` | Código estable |
| `deploy-test` | Staging — solo frontend, sin docs/infra. AccuWeb apunta aquí |
| `deploy-prod` | Producción — solo frontend, sin docs/infra. AccuWeb apunta aquí |

Las ramas `deploy-*` se generan automáticamente por GitHub Actions. No editar manualmente.

---

## Desarrollo local

### 1. Keycloak (si necesitas auth)

```bash
cd infra/keycloak
docker-compose up -d
```

### 2. Frontend

```bash
cd Vento
npm install
npm run dev
```

### 3. Variables de entorno (`Vento/.env.local`)

```env
AUTH_TRUST_HOST=true
AUTH_SECRET=<openssl rand -base64 32>
AUTH_KEYCLOAK_ID=vento-web
AUTH_KEYCLOAK_SECRET=<de Keycloak admin console>
AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/vento
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=vento
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Deploy a producción (Standalone)

### Proceso completo: del repo al servidor

#### 1. Preparar la rama de deploy

Las ramas `deploy-test` y `deploy-prod` contienen solo el contenido de `Vento/` movido a la raíz. Se generan automáticamente por CI o manualmente así:

```bash
git checkout deploy-test   # o deploy-prod
```

Si necesitas generarla manualmente desde develop/main:

```bash
git checkout develop       # o main para prod
git checkout --orphan deploy-test
git rm -rf .
git checkout develop -- Vento/
shopt -s dotglob
mv Vento/* .
rm -rf Vento docs _bmad _bmad-output infra node_modules .next
git add -A
git commit -m "deploy: deploy-test"
git push origin deploy-test --force
```

#### 2. Instalar dependencias (solo producción)

```bash
npm install --omit=dev
```

Esto instala solo las dependencias de `dependencies` (next, react, next-auth, jose) sin las de `devDependencies` (vitest, eslint, etc.).

#### 3. Configurar variables de entorno

Crear `.env.local` o configurar en el panel de AccuWeb:

```env
AUTH_TRUST_HOST=true
AUTH_SECRET=<secret seguro generado>
AUTH_KEYCLOAK_ID=vento-web
AUTH_KEYCLOAK_SECRET=<secret de Keycloak prod>
AUTH_KEYCLOAK_ISSUER=https://keycloak.accuweb.cloud/realms/vento
NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.accuweb.cloud
NEXT_PUBLIC_KEYCLOAK_REALM=vento
NEXT_PUBLIC_API_URL=https://api.accuweb.cloud
```

#### 4. Build

```bash
npm run build
```

Genera `.next/standalone/` con servidor Node.js mínimo (gracias a `output: "standalone"` en `next.config.ts`).

#### 5. Copiar archivos estáticos al standalone

```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

**Importante:** Standalone NO incluye `public/` ni `.next/static/` automáticamente. Sin este paso la app se ve sin estilos ni imágenes.

#### 6. Arrancar el servidor

```bash
node .next/standalone/server.js
```

La app corre en `http://localhost:3000`. En AccuWeb, nginx hace proxy a este puerto.

#### Resumen de comandos

**En el build (CI o máquina local):**
```bash
npm install
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

**En el servidor (AccuWeb):** solo copiar `.next/standalone/` y correr:
```bash
node server.js
```

No se necesita `npm install` en el servidor — standalone incluye todas las dependencias.

#### Variables de entorno en el runtime standalone

**Importante:** El servidor standalone NO lee `.env.local` automáticamente — solo carga variables exportadas en el shell del proceso.

**Dev local con standalone:**
```bash
export $(cat .env.local | xargs) && node .next/standalone/server.js
```

O directo en el comando:
```bash
AUTH_TRUST_HOST=true AUTH_SECRET=xxx node .next/standalone/server.js
```

**En AccuWeb:** configurar las variables en el panel de Node.js App (Environment Variables). El panel las exporta automáticamente al proceso del servidor.

**Diferencia importante:**
- `npm run build` → sí lee `.env.local` (las `NEXT_PUBLIC_*` se embeben en el bundle)
- `node .next/standalone/server.js` → NO lee `.env.local`, necesita variables exportadas

---

## Configuración de AccuWeb (cPanel)

### Git Version Control

| Campo | Staging | Producción |
|-------|---------|------------|
| Branch | `deploy-test` | `deploy-prod` |
| Autodeploy | Activado | Activado |

### Variables de entorno

Agregar las 8 variables de `.env.local` en el panel de Node.js App o como archivo `.env.local` en el servidor.

### nginx proxy

nginx debe hacer proxy al puerto 3000 donde corre el standalone server.

---

## Configuración de Keycloak

El cliente `vento-web` en Keycloak requiere:

1. **Client Authentication**: On (requiere client secret)
2. **Service Accounts Enabled**: Activo (Client Credentials Grant)
3. **Redirect URIs**: `https://tu-dominio/*` y `http://localhost:3000/*`
4. **Roles de Service Account**:
   - Pestaña "Service accounts roles" → Assign role
   - Filtrar por clients → `realm-management` → asignar **`manage-users`**
5. **Realm Roles**: `admin` y `analista` creados

---

## Workflows (GitHub Actions)

| Workflow | Archivo | Trigger | Función |
|----------|---------|---------|---------|
| Quality | `quality.yml` | PR a develop/main | Lint + TypeCheck |
| Unit Tests | `unit-tests.yml` | PR a develop/main | Vitest |
| Deploy | `deploy.yml` | Push a develop/main | Genera deploy-test / deploy-prod |
| Enforce Flow | `enforce-flow-v2.yml` | PR a main | Valida develop→main |
| PR Labels | `pr-labeler.yml` | PR abierto | Labels automáticos |
| Sync Stories | `sync-stories.yml` | Push a .github/stories/ | Issues → Project |
