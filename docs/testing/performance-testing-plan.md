# Plan de pruebas de performance — Vento

> Estado: 2026-11-02. Cubre frontend (Next.js + deck.gl) y backend (FastAPI +
> Postgres). Este documento es la referencia para el equipo, el encargado de los
> entornos y el trabajo del paper (atributo **Performance** del catálogo).

## 1. Objetivo

Medir de forma **repetible** y con evidencia:

1. Lo que siente el usuario en el navegador: carga inicial, fluidez del mapa y
   transiciones del flujo (selección → características → dimensiones → informe).
2. La capacidad real del API: latencia por endpoint, usuarios concurrentes,
   comportamiento bajo picos y recuperación.
3. El efecto de cada optimización con un **antes/después** en el mismo entorno.

La cifra oficial **no** se toma en un portátil de desarrollo: se toma en el
entorno de test con hardware y datos comparables a producción. Local sirve para
detectar regresiones relativas y para desarrollar.

## 2. Qué se mide (catálogo de pruebas)

| ID | Prueba | Herramienta | Dónde | Frecuencia | Criterio |
|---|---|---|---|---|---|
| `PERF-BE-01` | Línea base por endpoint (1 VU) | k6 `endpoints` | local / test | manual, nightly | SLO por endpoint |
| `PERF-BE-02` | Recorrido de usuario | k6 `journey smoke` | local / test | nightly | NFR-P2/P3 |
| `PERF-BE-03` | Carga esperada (20 VU, 5 min) | k6 `journey load` | test | weekly / pre-release | SLOs + error < 1 % |
| `PERF-BE-04` | Estrés (10→100 VU) | k6 `journey stress` | test | monthly | encontrar techo |
| `PERF-BE-05` | Pico y recuperación | k6 `journey spike` | test | pre-release | recupera sin errores |
| `PERF-BE-06` | Soak (30 min) | k6 `journey soak` | test | monthly | sin fuga/degradación |
| `PERF-FE-01` | Abrir mapa | Playwright `@smoke` | local / test / prod* | nightly + post-deploy | NFR-P2, LCP/TBT/CLS |
| `PERF-FE-02` | Zoom/paneo (FPS/jank) | Playwright `@interaction` | local / test | nightly | NFR-P3 |
| `PERF-FE-03` | Selección → Características → Dimensiones → Informe | Playwright `@flow` | local / test | weekly | transiciones < 2–5 s |
| `PERF-FE-04` | Primera vs segunda visita | Playwright `@bundle @cache` | local / test / prod* | weekly | NFR-P5/P6 |
| `PERF-FE-05` | PDF del informe | Playwright `@pdf` (opt-in) | test | pre-release | < 30 s total |
| `PERF-INF-01` | Smoke sintético post-deploy | Playwright `@smoke` | prod* | cada deploy | lectura OK |
| `PERF-INF-02` | RUM / monitoreo real | AccuWeb/Grafana o Web Vitals | prod | continuo | percentiles reales |

`*` En producción **solo lectura**: login, abrir mapa, una petición de detalle.
Nunca `load`/`stress`/`spike`/`soak` contra producción.

## 3. SLOs

Los NFR salen del PRD (`AppVento/_bmad-output/planning-artifacts/prd.md`). Los
demás son propuesta, pendientes de validar con el equipo.

| Métrica | Objetivo | Origen |
|---|---|---|
| Mapa listo (sin `/api` en vuelo) | p95 < 5 s | **NFR-P2** |
| Re-render al cambiar variable/filtro | p95 < 2 s | **NFR-P3** |
| TTI tras login | < 3 s | **NFR-P4** |
| JSON geoespacial por respuesta | < 10 MB | **NFR-P5** |
| Segunda visita (assets) | < 20 % de la 1ª descarga | **NFR-P6** |
| `variables-bulk` z12 / z10 / z8 / z6 | 1 / 1,5 / 2 / 3 s | propuesta por zoom |
| `area` (informe, solo backend) | p95 < 1,5 s | propuesta |
| `variables`, `detail`, `historico` | p95 < 300 ms | propuesta |
| `excluded` | p95 < 1 s | propuesta |
| `warmup` | p95 < 500 ms | propuesta |
| Errores HTTP | < 1 % | propuesta |
| JS de primera carga | < 1,8 MB comprimido | propuesta (medir y ajustar) |
| LCP / TBT / CLS / INP | 2,5 s / 300 ms / 0,1 / 200 ms | Core Web Vitals “good” |

La fuente única de los SLO del backend es `AppVento---Backend/perf/k6/lib/slo.js`.
La del frontend es `AppVento/Vento/e2e-perf/lib/config.ts`.

## 4. Entornos

| Entorno | Uso | Datos | Números oficiales |
|---|---|---|---|
| **Local** | desarrollo, comparar antes/después relativo | parquet real ingerido en Docker | ❌ (máquina compartida, GPU variable) |
| **Test/staging** | cifra oficial, gates, nightly | réplica de producción (1,6 M hexes) | ✅ |
| **Producción** | solo smoke de lectura + RUM | reales | solo disponibilidad/latencia sintética |

### Estado actual (2026-11-02)

- `https://www.proyectovento.com` responde (prod). `/` da 200 con TTFB ~1,0 s
  desde una red externa; `/dashboard` redirige a login (302).
- **No hay URL de test/staging operativa**: `test.proyectovento.com`,
  `test-vento.proyectovento.com` y `staging.proyectovento.com` no responden.
  `Vento/.env.local` apunta a un entorno viejo
  (`test-vento.us-la-01.awcompute.com/identity`) que ya no resuelve; el backend
  de ese `.env` es una URL de Codespaces caducada.
- No hay environment de GitHub ni secretos de performance configurados.
- El deploy a `deploy-test` existe como rama, pero el job SSH de este repo solo
  despliega producción (`main`).

**Conclusión:** sin un entorno de test no se puede producir la cifra oficial ni
correr carga con seguridad. Hay que aprovisionarlo (ver §7).

## 5. Cómo se ejecuta

### Local

```bash
# Backend
cd AppVento---Backend
docker compose up -d db app
./perf/run.sh endpoints
./perf/run.sh journey smoke

# Frontend
cd ../AppVento/Vento
INTERNAL_API_SECRET=… npm run perf:e2e
npm run perf:report
```

> La ingesta ejecuta `ANALYZE hexagon` al final. Si la tabla viene de una versión
> anterior, corre `VACUUM ANALYZE hexagon;` antes de medir: sin estadísticas el
> planner puede elegir un seq scan y `excluded`/`variables-bulk` tardan decenas
> de segundos (fue un artefacto real del benchmark de octubre).

### Test

```bash
# 1) Login real y exportación de cookie (frontend)
cd AppVento/Vento
PERF_BASE_URL=https://<test> PERF_ENV=test PERF_USER=… PERF_PASSWORD=… \
  npx playwright test --config playwright.perf.config.ts --project=setup

# 2) Navegador
PERF_BASE_URL=https://<test> PERF_ENV=test npm run perf:e2e

# 3) API (k6) reutilizando la cookie
cd ../../AppVento---Backend
MODE=bff BASE_URL=https://<test> ENV_NAME=test STRICT=1 \
  COOKIE_FILE=../AppVento/Vento/e2e/.auth/perf.json \
  ./perf/run.sh journey load
```

### CI (GitHub Actions)

Workflow `AppVento---Backend/.github/workflows/performance.yml`:

- **Manual**: elegir entorno (`test`/`prod`), perfil y si corre navegador.
- **Nightly**: 06:00 UTC contra `vars.PERF_TEST_URL` (si no existe, se salta).
- Hace login con Playwright, corre frontend + k6 y publica el resumen en el
  **job summary** (no usa artifacts por la política de Actions de la org).
- `strict=true` convierte la corrida en **gate** (falla si un SLO no se cumple).
  Por defecto mide y deja el semáforo en el resumen.

### Producción

- Post-deploy: `PERF_BASE_URL=https://www.proyectovento.com npm run perf:e2e:smoke`
  (solo lectura) con un usuario de prueba.
- Nunca `@flow`, `load`, `stress`, `spike` ni `soak` contra prod.
- Para diagnóstico real, usar RUM/logs de AccuWeb; el smoke sintético no
  representa a todos los usuarios.

## 6. Línea base y hallazgos (evidencia)

### Backend — local, 2026-10-20 (`feature/performance-testing`)

| Endpoint | p95 | Observación |
|---|---|---|
| `variables-bulk` z6 (país) | **48,2 s** | escaneo de ~1,6 M filas + agregación; el peor cuello |
| `variables-bulk` z8 | 13,0 s | idem |
| `variables-bulk` z10 | 5,4 s | idem |
| `variables-bulk` z12 | 203 ms | bbox pequeño |
| `area` | 55 ms | OK |
| `detail` | 20 ms | OK |
| `variables` | 21 ms | OK |
| `excluded` | 10 ms | OK (con índice parcial) |
| `warmup` | 50 ms | OK (conteo estimado) |
| `journey load` (20 VU) | 50 % errores | `variables-bulk` p95 57 s; el sistema se satura |

### Frontend — local, 2026-10-20

- `mapaListoMs`: 4,3–11,2 s; LCP 9,1–12,0 s; TBT 8,2–13,6 s (máquina con carga,
  GPU Intel; no representativo).
- Bundle inicial del dashboard: el chunk que concentraba deck.gl + MapLibre +
  jsPDF/html2canvas pesaba ~3,25 MB sin comprimir. Tras mover
  jsPDF/html2canvas/svg2pdf a import dinámico: ~2,51 MB, y el total de JS del
  dashboard quedó en ~3,95 MB raw (~1,25 MB gzip). En el navegador, el JS
  inicial medido bajó a ~1,49 MB comprimido.
- 4 llamadas idénticas al catálogo de variables en la primera carga → ahora 2
  (caché + coalescing en `catalogApi`).
- El BFF descartaba `Cache-Control` del backend → el navegador no cacheaba datos
  del mapa. Ahora se reenvía la política de caché y se añade gzip en FastAPI.

**Validación del arnés (2026-11-02, local):** los tests `@smoke`, `@flow` y
`@cache` ejecutan de punta a punta con login real. En la segunda visita, JS/CSS
descargados = **0 %** (NFR-P6 ✅) y el JS inicial transferido ≈ **1,49 MB**
(propuesta < 1,8 MB ✅). Los tiempos de mapa/flujo locales **no** se reportan:
la máquina estaba compartida con la corrida RQ2 del paper y el mapa tardó 20–75 s
(CPU/DB saturadas). Esa cifra solo vale en test con hardware comparable.

> Los tiempos locales **no** son la cifra del paper/informe: se usan para
> detectar regresiones y priorizar. La medición oficial va en test.

## 7. Lo que necesitamos del encargado (checklist)

1. **URL de test/staging** con TLS válido y accesible desde GitHub Actions
   (o allowlist de las IPs de los runners).
2. **Paridad con producción**: misma topología (Next + FastAPI privado +
   Postgres), mismos workers/RAM y datos de volumen comparable (1,6 M hexes).
   Si no hay paridad, documentar las diferencias y no comparar cifras absolutas.
3. **Keycloak de test** (realm/cliente separados de prod) y dos usuarios:
   - `perf-user` (rol `user`) para el flujo normal.
   - `perf-admin` (rol `admin`) solo si se prueba administración.
   Sin MFA para estos usuarios y sesión suficientemente larga.
4. **Credenciales como secretos de GitHub** en el repo del backend:
   `PERF_USER`, `PERF_PASSWORD`. Variables: `PERF_TEST_URL`,
   `PERF_PROD_URL` (opcional), `PERF_FRONT_BRANCH` (opcional).
5. **Autorización de carga en test**: ventana acordada, contacto durante la
   prueba y confirmación de que test está aislado de prod (BD y Keycloak).
6. **Monitoreo durante la prueba**: CPU/RAM del front y del back, conexiones y
   cache-hit de Postgres, errores 5xx de nginx. Acceso de lectura o captura.
7. **Producción**: usuario de solo lectura para el smoke y autorización para
   ejecutarlo después de cada deploy. No se pide permiso para carga.
8. **Acceso al backend privado** (opcional): URL interna + `INTERNAL_API_SECRET`
   o un token de servicio, si se quiere medir FastAPI sin pasar por el BFF.
9. **Presupuesto/ventana** para el nightly y las corridas de estrés.
10. Confirmar que la política de Actions permite `npm`, `npx playwright install`
    y Docker en el runner (las actions de marketplace ya están restringidas).

El mensaje listo para enviar está en
[`performance-testing-ops-request.md`](performance-testing-ops-request.md).

## 8. Fases y prioridades

| Fase | Qué | Estado |
|---|---|---|
| 0 | Arnés k6 + Playwright, SLOs, línea base local | ✅ hecho (2026-10-20) |
| 1 | Corregir medición/SLOs, guardas, caché de catálogo, gzip, split del PDF, ANALYZE en ingesta | ✅ aplicado; validar en test |
| 2 | Aprovisionar test + línea base oficial + nightly | ⏳ bloqueado por §7 |
| 3 | Optimización estructural de `variables-bulk` (preagregación por res) | ⏳ propuesta |
| 4 | RUM + smoke post-deploy + revisión mensual de SLOs | ⏳ |

### Fase 3 — la optimización que más mueve la aguja

`variables-bulk` a zoom país escanea ~1,6 M filas con JSONB ancho. Un caché en
proceso de TTL corto (implementado en Fase 1) ayuda a requests repetidos, pero
**el primer usuario sigue pagando el escaneo** y cada worker lo recalcula (el
`--max-requests 200` de gunicorn recicla workers y tira la caché). La solución
estructural es preagregar por resolución (res 4–6) en una tabla angosta al ingerir
la master, o migrar a `h3-pg` + vistas materializadas. Se decide con la medición
de test.

## 9. Coordinación con el paper

- El **atributo Performance** del catálogo de calidad se evidencia con estas
  pruebas. Los resultados pueden alimentar RQ1 (cobertura) y la sección de
  validación, pero **el paper lo edita el otro agente**; no se tocan sus ramas.
- Mientras corre RQ2 (corpus/timing), no se ejecutan benchmarks locales pesados:
  comparten CPU, Keycloak (`:8080`) y Postgres (`:55432`). Las corridas oficiales
  van en test/GitHub, no en la máquina de desarrollo.
- Los JSON/MD de `perf/results` y `perf-results` son la evidencia reproducible
  (commit + entorno + fecha). No se reportan números locales como oficiales.

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Test no representativo (menos RAM/datos) | exigir paridad o documentar diferencias; no comparar absolutos |
| Correr carga en prod por error | guarda en `run.sh` + `ENV_NAME=prod` + workflow solo smoke |
| Cookie caduca a mitad de la corrida | re-exportar; para cargas largas usar `MODE=direct`/token |
| GPU software distorsiona FPS/TBT | la suite imprime el renderer y avisa |
| Un solo run es ruidoso | `--repeat-each` + medianas (`perf:report`) |
| SLOs rojos bloquean el nightly | por defecto mide; `strict=true` solo cuando el equipo lo decida |
| Cambios de datos entre corridas | registrar commit + versión de master; reiniciar baseline tras ingesta |
