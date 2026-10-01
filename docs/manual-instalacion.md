# Manual de Instalación — Vento

> Puesta en marcha de **frontend**, **backend**, **base de datos** e **identidad**,
> con el **detalle completo de las variables de entorno** y de la **ingesta de datos**.
> Usa placeholders (`HOST`, `USUARIO`, `CLAVE`, `TU_DOMINIO`, secretos) — reemplázalos
> por los reales del gestor de secretos; **no** pongas credenciales en el repo.
> Fecha: 2026-10-01 · Autor: Mavalan Software

---

## 0. Prerrequisitos

| Componente | Requisito |
|------------|-----------|
| Frontend | Node.js (versión indicada por AccuWeb) + npm |
| Backend | Python 3.12 (o Docker) |
| Base de datos | PostgreSQL 14+ |
| Identidad | Keycloak (realm con roles `admin` y `analista`) |
| Datos | Parquet maestro (`data/master_variables.h3.parquet`) + InfoVariables.xlsx |

Orden recomendado: **BD → Keycloak → Backend (+ ingesta) → Frontend**.

---

## 1. Base de datos (PostgreSQL)

```bash
createdb NOMBRE_BD
# o: psql -c "CREATE DATABASE NOMBRE_BD;
#            CREATE USER USUARIO WITH PASSWORD 'CLAVE';
#            GRANT ALL PRIVILEGES ON DATABASE NOMBRE_BD TO USUARIO;"
```
- DSN (formato del backend): `postgresql+psycopg://USUARIO:CLAVE@HOST_BD:5432/NOMBRE_BD`
- `max_connections` ≥ `(DB_POOL_SIZE + DB_MAX_OVERFLOW) × workers` → con 2 workers = **40**.
- Tuning (server chico): `shared_buffers` ≈ 25 % RAM, `work_mem` suficiente para los bbox.

---

## 2. Identidad (Keycloak)

1. Crear **realm** (p.ej. `vento`) con **roles** `admin` y `analista`.
2. Crear **cliente** OIDC para el front (p.ej. `vento-web`): confidential, con los
   *redirect URIs* del dominio del front y el *client secret*.
3. El backend **solo verifica** el JWT (no emite): necesita el issuer, el JWKS y la audiencia.
4. Asignar el rol `admin` a quien administre (desde Keycloak o desde Vento → Gestión de usuarios).

---

## 3. Backend (FastAPI)

### 3.1 `.env` del backend (completo)

```dotenv
# ── Base de datos (requerido) ──
DATABASE_URL=postgresql+psycopg://USUARIO:CLAVE@HOST_BD:5432/NOMBRE_BD

# ── Datos ──
PARQUET_PATH=/app/data/master_variables.h3.parquet   # ruta del parquet maestro
HEXAGON_INGEST=copy                                   # copy (Postgres COPY, rápido) | orm (portable)
INGEST_MEM_CAP_MB=                                    # (opcional) tope de RAM del proceso de ingesta
OFFSHORE_VAR=                                         # código de la columna mar(1)/tierra(0); vacío = no se expone aún

# ── Autenticación (Keycloak — el backend VERIFICA, no emite) ──
KEYCLOAK_ISSUER=https://KEYCLOAK_HOST/realms/vento
KEYCLOAK_JWKS_URL=https://KEYCLOAK_HOST/realms/vento/protocol/openid-connect/certs  # default: {ISSUER}/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=account
JWT_ALGORITHMS=RS256

# ── BFF (secreto compartido Next → FastAPI) ──
INTERNAL_API_SECRET=<secreto-largo-aleatorio>         # mismo valor en el front; vacío = modo interno off

# ── CORS ──
CORS_ORIGINS=https://TU_DOMINIO                        # coma-separado; default http://localhost:3000

# ── Histórico ──
MAX_HISTORIAL_PER_USER=50

# ── Pool de BD (por worker) ──
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=15        # 5+15 = 20 conexiones/worker (× workers ≤ max_connections)
DB_POOL_TIMEOUT=30        # s esperando una conexión
DB_POOL_RECYCLE=1800      # recicla conexiones viejas (s)

# ── Concurrencia / caché ──
APP_THREAD_LIMIT=18       # threads anyio por worker (consultas BD concurrentes)
EXCLUDED_CACHE_TTL=300    # TTL (s) de la caché de /tiles/excluded

# ── Observabilidad (diagnóstico; dejar off en prod salvo incidente) ──
DEBUG_INFLIGHT=           # =1 activa /api/_debug/stats e /inflight
TRACE_REQUESTS=0          # =1 loguea cada request (entra/sale + duración)
INFLIGHT_WARN=12          # WARNING si ≥N peticiones en vuelo a la vez (apilamiento)
SLOW_REQUEST_MS=3000      # loguea las que tarden más de N ms
```
> En **dev** el backend carga `.env` automáticamente (python-dotenv). En **prod** las
> variables vienen del entorno/contenedor (no se usa `.env`).

### 3.2 Arranque — Docker (producción)
```bash
cd backend/AppVento---Backend
docker build -t vento-backend .
docker run -d --name vento-backend -p 8000:8000 --env-file .env vento-backend
```
El `docker-entrypoint.sh` aplica migraciones (`alembic upgrade head`), opcionalmente
ingiere el parquet, y arranca
`gunicorn main:app -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:8000 --timeout 120`.

### 3.3 Arranque — local (dev)
```bash
cd backend/AppVento---Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### 3.4 Ingesta de datos (detallada)
La ingesta es **destructiva por dataset** (reemplaza todo) y, en la máster, **atómica**
(`TRUNCATE`+`COPY` en una transacción).

1. **Máster (hexágonos):** coloca el parquet en `PARQUET_PATH` e ingiere desde
   **Admin → Subir master** (drag-and-drop) o el tool. `HEXAGON_INGEST=copy` usa `COPY`
   (rápido, streaming); `orm` es el fallback portable. En la misma transacción se
   recalcula `hexagon_meta` (min/max por variable).
2. **Catálogo (InfoVariables.xlsx):** **Admin → Metadatos** → `catalog_variable`
   (label, dimensión, criterio, fuente, licencia, método, `icon_key`, `enMapa`, pesos)
   + `parquet_column`.
3. **Normas** (regulatoria) y **escenarios** (económica): Admin → Normativa / Escenarios.
4. **Después de ingerir:** `VACUUM ANALYZE hexagon;` y verifica con
   **`GET /api/admin/db/overview`** (columnas por tabla + diff h3 ↔ catálogo ↔ máster).

---

## 4. Frontend (Next.js)

### 4.1 `.env` / `.env.local` del frontend (completo)

```dotenv
# ── Modo ──
NEXT_PUBLIC_USE_BACKEND=true          # true = API real | false = template/demo (sin backend)
NEXT_PUBLIC_API_URL=https://TU_DOMINIO # URL pública de la API (cliente)

# ── BFF (servidor Next → backend) ──
BACKEND_URL=http://HOST_BACKEND:8000   # destino interno del proxy /api/*
INTERNAL_API_SECRET=<secreto-largo-aleatorio>  # mismo valor que en el backend

# ── Auth.js (NextAuth v5) ──
AUTH_SECRET=<secreto-largo-aleatorio>  # firma de la sesión (openssl rand -base64 32)
AUTH_URL=https://TU_DOMINIO            # URL pública del front
AUTH_TRUST_HOST=true

# ── Cliente OIDC (Keycloak) ──
AUTH_KEYCLOAK_ID=vento-web             # client id
AUTH_KEYCLOAK_SECRET=<client-secret>   # client secret del cliente OIDC
AUTH_KEYCLOAK_ISSUER=https://KEYCLOAK_HOST/realms/vento

# ── Keycloak visible al cliente (logout, registro) ──
NEXT_PUBLIC_KEYCLOAK_URL=https://KEYCLOAK_HOST
NEXT_PUBLIC_KEYCLOAK_REALM=vento
NEXT_PUBLIC_KEYCLOAK_ISSUER=https://KEYCLOAK_HOST/realms/vento

# ── Correo (notificaciones, p.ej. al otorgar admin) ──
SENDGRID_API_KEY=<api-key>
SENDGRID_FROM_EMAIL=no-reply@TU_DOMINIO
```
> `NEXT_PUBLIC_*` se exponen al navegador (no poner secretos ahí). `AUTH_*`,
> `BACKEND_URL`, `INTERNAL_API_SECRET`, `SENDGRID_*` son **solo de servidor**.
> `INTERNAL_API_SECRET` debe ser **idéntico** en front y backend.

### 4.2 Arranque
```bash
cd Vento
npm install
npm run dev                 # dev → http://localhost:3000
npm run build && npm start  # producción
```
Al cargar, la consola loguea `[VENTO] MODO: BACKEND` o `TEMPLATE` (según
`NEXT_PUBLIC_USE_BACKEND`). Despliegue en AccuWeb: ver `docs/ops/accuweb-runbook.md`.

---

## 5. Migraciones (Alembic)
```bash
cd backend/AppVento---Backend
alembic upgrade head        # aplica todas (incluye 0015 índice parcial de excluidos)
# Cero-downtime sobre tabla ya cargada (opcional): crear el índice CONCURRENTLY a mano
#   CREATE INDEX CONCURRENTLY ix_hexagon_excluded ON hexagon (h3_index)
#     WHERE tipo_celda = 'excluida' OR score_general < 0;
#   luego: alembic stamp 0015_hexagon_excluded_index
```

---

## 6. Verificación post-instalación
```bash
curl -s https://TU_DOMINIO/api/health
# Capacidad / salud BD (desde el server o túnel; el 5432 no suele ser público)
python backend/AppVento---Backend/tools/loadtest.py \
  --base "https://TU_DOMINIO" \
  --cookie "__Secure-authjs.session-token=VALOR" \
  --db-url "postgresql://USUARIO:CLAVE@HOST_BD:5432/NOMBRE_BD" --stage-secs 15
```
Objetivo sano: BD `cache-hit > 99 %`, `variables-bulk` razonable, `warmup/excluded` < 10 ms.

---

## 7. Red de seguridad de memoria (server chico)
```bash
# Swap 4 GB persistente
sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
# earlyoom (mata el proceso correcto antes del OOM del kernel)
sudo apt-get update && sudo apt-get install -y earlyoom
sudo systemctl enable --now earlyoom
```
> Mitigaciones, no la solución: el fix real de capacidad es el rediseño de datos
> (Fase 2) + más RAM/workers.

---

## 8. Ramas / despliegue
| Repo | Trabajo | Producción |
|------|---------|------------|
| Front (`Vento`) | `Sprint_4--report_preconig` / `develop` | `deploy-prod` |
| Backend | `develop` | `main` |

Backend prod consume **`main`**. Tras merge a prod: `alembic upgrade head` +
`VACUUM ANALYZE hexagon` + build del front.
