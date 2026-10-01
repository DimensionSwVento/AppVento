# Manual de Instalación — Vento

> Puesta en marcha de **frontend**, **backend**, **base de datos** e **identidad**.
> Audiencia: equipo de despliegue. Usa **placeholders** (`HOST`, `USUARIO`, `CLAVE`,
> `TU_DOMINIO`) — reemplázalos por los reales del gestor de secretos; **no** pongas
> credenciales en el repo.
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

---

## 1. Base de datos (PostgreSQL)

```bash
# Crear BD y usuario (ajusta nombres)
createdb NOMBRE_BD
# o: psql -c "CREATE DATABASE NOMBRE_BD; CREATE USER USUARIO WITH PASSWORD 'CLAVE'; GRANT ALL ON DATABASE NOMBRE_BD TO USUARIO;"
```
- DSN: `postgresql://USUARIO:CLAVE@HOST_BD:5432/NOMBRE_BD`
- Vigilar `max_connections` ≥ `(DB_POOL_SIZE + DB_MAX_OVERFLOW) × workers` (con 2 workers = 40).
- Tuning recomendado (server chico): `shared_buffers` ≈ 25 % RAM, `work_mem` suficiente;
  `VACUUM ANALYZE hexagon` tras cada ingesta.

---

## 2. Backend (FastAPI)

### Opción A — Docker (producción)
```bash
cd backend/AppVento---Backend
docker build -t vento-backend .
docker run -d --name vento-backend -p 8000:8000 \
  -e DATABASE_URL="postgresql://USUARIO:CLAVE@HOST_BD:5432/NOMBRE_BD" \
  -e APP_THREAD_LIMIT=18 -e DB_POOL_SIZE=5 -e DB_MAX_OVERFLOW=15 \
  vento-backend
```
El `docker-entrypoint.sh` aplica migraciones (`alembic upgrade head`) y arranca
`gunicorn main:app -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:8000 --timeout 120`.

### Opción B — local (dev)
```bash
cd backend/AppVento---Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### Variables de entorno (backend)
| Variable | Def. | Uso |
|----------|------|-----|
| `DATABASE_URL` | — | DSN de Postgres (requerido) |
| `APP_THREAD_LIMIT` | 18 | threads anyio por worker |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` / `DB_POOL_TIMEOUT` | 5 / 15 / 30 | pool por worker |
| `EXCLUDED_CACHE_TTL` | 300 | TTL (s) caché de `/tiles/excluded` |
| `DEBUG_INFLIGHT` | (off) | `=1` activa `/api/_debug/*` |
| `HEXAGON_INGEST` | copy | método de ingesta (`copy`/`orm`) |
| `PARQUET_PATH` | — | ruta del parquet maestro |
| (Keycloak) | — | issuer / audiencia / claves para validar el JWT |

### Ingesta de datos
1. Colocar el parquet en `data/master_variables.h3.parquet`.
2. Ingerir máster (hexágonos) y catálogo (variables/normas/escenarios) desde
   **Admin → Metadatos / Subir master**, o el tool de ingesta.
3. `VACUUM ANALYZE hexagon;` (mantiene `reltuples` al día para `warmup`).
4. Verificar con **`GET /api/admin/db/overview`** (columnas por tabla + qué variables
   quedaron en h3 vs catálogo vs máster).

---

## 3. Frontend (Next.js)

```bash
cd Vento
npm install
# Desarrollo
npm run dev            # http://localhost:3000
# Producción
npm run build && npm start
```

### Variables de entorno (frontend)
| Variable | Valor | Uso |
|----------|-------|-----|
| `NEXT_PUBLIC_USE_BACKEND` | `true` (prod) / `false` (template/demo) | enciende la API real |
| `AUTH_SECRET` | (secreto) | Auth.js (NextAuth v5) |
| `BACKEND_URL` / proxy | URL del backend | el BFF `/api/*` proxea aquí |
| (Keycloak) | issuer / client id / client secret | OIDC |

> En **modo backend** (`NEXT_PUBLIC_USE_BACKEND=true`) no hay fallback a template:
> dato real o vacío. El arranque loguea `[VENTO] MODO: BACKEND/TEMPLATE`.

### Despliegue en AccuWeb
Ver runbook detallado: `docs/ops/accuweb-runbook.md` (proveedor, build, variables,
cookies/SSL, incidentes).

---

## 4. Identidad (Keycloak)
- Realm con **roles** `admin` y `analista`.
- Cliente para el front (OIDC, redirect URIs del dominio).
- El backend valida el JWT emitido por Keycloak; el front (Auth.js) guarda la sesión
  en cookies `__Secure-authjs.session-token`.
- Dar a quien administre el rol `admin` (desde Keycloak o desde Vento → Gestión de usuarios).

---

## 5. Migraciones (Alembic)
```bash
cd backend/AppVento---Backend
alembic upgrade head          # aplica todas (incluye 0015 índice parcial excluidos)
# Para el índice SIN lock largo en una tabla ya cargada (opcional, cero-downtime):
#   CREATE INDEX CONCURRENTLY ix_hexagon_excluded ON hexagon (h3_index)
#     WHERE tipo_celda = 'excluida' OR score_general < 0;
#   luego: alembic stamp 0015_hexagon_excluded_index
```

---

## 6. Verificación post-instalación
```bash
# Backend arriba
curl -s https://TU_DOMINIO/api/health
# Capacidad / salud BD (desde el server o túnel; 5432 no suele ser público)
python backend/AppVento---Backend/tools/loadtest.py \
  --base "https://TU_DOMINIO" \
  --cookie "__Secure-authjs.session-token=VALOR" \
  --db-url "postgresql://USUARIO:CLAVE@HOST_BD:5432/NOMBRE_BD" --stage-secs 15
```
- Objetivo sano: BD `cache-hit > 99 %`, `variables-bulk` razonable, `warmup/excluded` < 10 ms.

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
> Son mitigaciones, no la solución: el fix real de capacidad es el rediseño de datos
> (Fase 2 h3-pg) + más RAM/workers.

---

## 8. Ramas / despliegue
| Repo | Trabajo | Producción |
|------|---------|------------|
| Front (`Vento`) | `Sprint_4--report_preconig` / `develop` | `deploy-prod` |
| Backend | `develop` | `main` |

- Backend prod consume **`main`** (no `develop`).
- Tras merge a prod: `alembic upgrade head` + `VACUUM ANALYZE` + build del front.
