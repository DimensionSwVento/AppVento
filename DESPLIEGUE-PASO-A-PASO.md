# Despliegue paso a paso — Vento (backend + frontend)

> Material interno. Reemplaza los placeholders `<...>` por los valores reales de tu
> entorno (no se incluyen credenciales/IPs/rutas reales). Dos frentes independientes:
> **backend FastAPI** y **frontend Next.js**. Deben compartir el mismo `INTERNAL_API_SECRET`.

Estado de ramas a la fecha:
- **Frontend**: el trabajo de mapa/informe está en **`fix-sprint4`**.
- **Backend**: en **`develop`** (migraciones hasta `0020`, escalera de MV res4–7, PostGIS, buscador propio en `geo/`).
- Antes de desplegar, **mergea cada rama a tu rama de despliegue** (p. ej. `main`).

---

## ⚠️ Gotchas que rompen el despliegue (leer primero)

1. **PostGIS** (la migración `0017` hace `CREATE EXTENSION postgis`). **Ya está instalado en el entorno actual** → no hay acción. Solo recordarlo si algún día se monta una BD nueva: Docker necesitaría la imagen `postgis/postgis:...` (el `docker-compose.yml` apunta a `postgres:16-alpine` sin PostGIS) y en bare-metal el paquete PostGIS del SO.

2. **Toda ingesta llena TODAS las resoluciones (no hace falta backfill).** Los dos caminos calculan `h3_res4..7` por fila **y refrescan las 4 MV** (res4/5/6/7):
   - **Consola** `python -m tools.ingest_parquet` → `copy_ingest`/`replace_all` → `refresh_resolution_mvs`.
   - **Subir máster por la INTERFAZ (admin)** → UPSERT por chunks (`_to_row` calcula los `h3_res{N}`, y el conflicto los refresca siempre) → `bundle_service.finalize` llama a `refresh_resolution_mvs`. (Consola/prod por paquetes usa `blue_green_replace` → `recreate_resolution_mvs`.)
   - El `backfill_h3_parents` es **solo** para el caso de **actualizar una BD con datos ya existentes SIN re-ingerir**: ahí `alembic upgrade head` agrega columnas/MV que nacen vacías para las filas viejas, y el backfill las llena. Si ingestás o subís máster, **no lo necesitás**.

3. **Un solo interruptor de producción en el front**: `NEXT_PUBLIC_USE_BACKEND=true`. En `false` la app va en modo template (sin backend, buscador con Nominatim). En `true` usa el backend y el **buscador propio** (`/api/tiles/geocode`).

---

## Frente 1 — Backend (FastAPI)

### 1.1 Requisitos
- **Postgres con PostGIS** (ver gotcha 1).
- **Keycloak** con realm `vento` (auth obligatoria, no opcional).
- El **parquet / bundle** del equipo de investigación.
- `geo/geocodes-colombia.json` → **ya está commiteado** en el repo; viaja con el código (no hay que generarlo de nuevo). Alimenta `/api/tiles/geocode`.

### 1.2 Configuración (`.env`)
```bash
cp .env.example .env
```
Edita al menos:
```bash
DATABASE_URL=postgresql+psycopg://<user>:<pass>@<host>:5432/<db>
KEYCLOAK_ISSUER=https://<keycloak>/realms/vento
INTERNAL_API_SECRET=<secreto-largo>        # DEBE coincidir con el del frontend
CORS_ORIGINS=https://<dominio-frontend>
PARQUET_PATH=./data/master_variables.h3.parquet
```

### 1.3 Opción A — Docker
```bash
git checkout <rama-deploy> && git pull

# 0) En docker-compose.yml: imagen del servicio db → postgis/postgis:16-3.4 (gotcha 1)

# 1) parquet en su sitio
cp <ruta>/master_variables.h3.parquet data/master_variables.h3.parquet

# 2) build + up (el entrypoint corre 'alembic upgrade head' al arrancar)
docker compose up -d --build

# 3) ingesta de datos (destructiva: borra y recarga hexagon, llena h3_res4..7
#    y refresca las 4 MV → mapa completo, sin pasos extra)
docker compose run --rm app python -m tools.ingest_parquet
#    (si el server es chico y se mata por OOM, usar el chunked:)
# docker compose run --rm app python -m tools.ingest_bundle_chunked

# 4) verificar
curl http://localhost:8000/api/health        # → {"status":"ok","index_ready":true}
```

### 1.4 Opción B — Bare-metal + systemd
```bash
git checkout <rama-deploy> && git pull

python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# DB + rol (una vez) — y PostGIS disponible (gotcha 1)
sudo -u postgres psql -c "CREATE ROLE <user> LOGIN PASSWORD '<pass>';"
sudo -u postgres psql -c "CREATE DATABASE <db> OWNER <user>;"
sudo -u postgres psql -d <db> -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 1) migraciones (tablas + PostGIS geom + columnas padre + MV res5/6 pobladas, res4/7 vacías)
alembic upgrade head

# 2) ingesta de datos (destructiva: llena h3_res4..7 + refresca las 4 MV)
cp <ruta>/master_variables.h3.parquet data/master_variables.h3.parquet
python -m tools.ingest_parquet
#    (OOM en server chico → python -m tools.ingest_bundle_chunked)

# 3) servicio
sudo cp deploy/vento-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vento-backend
```

### 1.5 Actualizar un despliegue YA EXISTENTE (con datos previos)
Si la BD ya tenía datos de antes de la escalera de MV:
```bash
git checkout <rama-deploy> && git pull
# (asegurar PostGIS si vienes de antes de la 0017)
alembic upgrade head                 # aplica 0017→0020
python -m tools.backfill_h3_parents  # llena h3_res4/7 + refresca sus MV (IMPRESCINDIBLE)
sudo systemctl restart vento-backend # o: docker compose restart app
```
> No hace falta re-ingestar si los datos no cambiaron: el backfill llena las columnas nuevas sin tocar `hexagon`.

### 1.6 Verificación backend
```bash
curl http://localhost:8000/api/health
# buscador propio (sin Nominatim):
curl -H "X-Internal-Secret: <secreto>" "http://localhost:8000/api/tiles/geocode?q=medellin&limit=5"
# MV pobladas (deben tener filas):
psql -d <db> -c "SELECT count(*) FROM mv_hexagon_res4;"
psql -d <db> -c "SELECT count(*) FROM mv_hexagon_res7;"
```

---

## Frente 2 — Frontend (Next.js 16 · React 19 · Node ≥ 20)

### 2.1 Configuración (`.env.local` / variables de entorno de producción)
```bash
# interruptor de producción (activa backend + buscador propio)
NEXT_PUBLIC_USE_BACKEND=true

# backend
NEXT_PUBLIC_API_URL=https://<backend-publico-o-interno>
BACKEND_URL=http://<backend-interno>:8000          # server-only (BFF); cae a NEXT_PUBLIC_API_URL
INTERNAL_API_SECRET=<secreto-largo>                # MISMO valor que el backend

# auth (next-auth + Keycloak)
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://<dominio-frontend>
AUTH_TRUST_HOST=true
AUTH_KEYCLOAK_ID=vento-web
AUTH_KEYCLOAK_SECRET=<secret del cliente vento-web>
AUTH_KEYCLOAK_ISSUER=https://<keycloak>/realms/vento
NEXT_PUBLIC_KEYCLOAK_URL=https://<keycloak>
NEXT_PUBLIC_KEYCLOAK_REALM=vento
# NEXT_PUBLIC_KEYCLOAK_ISSUER=...   # solo si Keycloak usa prefijo de path

# correo de registro
SENDGRID_API_KEY=<api-key>
SENDGRID_FROM_EMAIL=<remitente>

# NOTA: NEXT_PUBLIC_GEOCODER_URL NO se usa en producción (con USE_BACKEND el buscador
# va por /api/tiles/geocode). Solo aplica en modo template/dev (Nominatim).
```

### 2.2 Build + arranque
```bash
git checkout <rama-deploy> && git pull     # el trabajo de mapa está en fix-sprint4
npm ci
npm run build
npm run start                              # o standalone / pm2 / systemd detrás de nginx
```

### 2.3 Verificación frontend
- Login vía Keycloak (si falla el issuer: `curl` al `.well-known/openid-configuration` debe dar 200 JSON).
- Buscar **"Medellín"** en la barra → un solo resultado y al elegirlo **centra + selecciona el área** (usa el backend, no Nominatim).
- Mapa: capas de dimensiones/escala renderizan; **malla gris solo en selección de área**; escala con tonos distintos + bordes brillantes.
- Informe: el **radar** se ve como radar (no barras) e incluye la dimensión económica si el área tiene dato.

---

## Orden recomendado end-to-end
1. **Backend primero** (hasta que `/api/health` dé `index_ready:true` y las MV tengan filas).
2. Backend en **red privada**; puerto 8000 accesible solo desde el BFF del front (security group).
3. **Frontend** con `NEXT_PUBLIC_USE_BACKEND=true` y el mismo `INTERNAL_API_SECRET`.
4. Humo: login → mapa → buscar lugar → generar informe.

## Checklist rápido
- [ ] PostGIS disponible (imagen `postgis/postgis` o paquete del SO).
- [ ] `alembic upgrade head` OK.
- [ ] Datos ingeridos (`ingest_parquet` / `ingest_bundle_chunked`) → llena h3_res4..7 + refresca las 4 MV.
- [ ] (solo si actualizás SIN re-ingerir) `backfill_h3_parents` corrido.
- [ ] MV con filas (`SELECT count(*) FROM mv_hexagon_res4;` / `res7`).
- [ ] `geo/geocodes-colombia.json` presente (viene en el repo).
- [ ] `INTERNAL_API_SECRET` idéntico en back y front.
- [ ] `NEXT_PUBLIC_USE_BACKEND=true`.
- [ ] Keycloak issuer alcanzable desde el front.
