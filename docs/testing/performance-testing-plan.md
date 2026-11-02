# Plan de pruebas de performance — Vento

> Documento de referencia para la medición de performance del frontend
> (Next.js + deck.gl) y del backend (FastAPI + PostgreSQL). Define qué se mide,
> con qué criterios, en qué entornos y cómo se reporta la evidencia.
>
> Estado: 2026-11-02. La adopción se hará por fases; ver
> [`performance-testing-roadmap.md`](performance-testing-roadmap.md).

## 1. Objetivo

Medir de forma repetible y con evidencia:

1. Lo que siente el usuario en el navegador: carga inicial, fluidez del mapa y
   transiciones del flujo (selección → características → dimensiones → informe).
2. La capacidad del API: latencia por endpoint, concurrencia, picos y
   recuperación.
3. El efecto de cada optimización con una comparación antes/después en el mismo
   entorno.

La cifra oficial se toma en un entorno de test con hardware y datos comparables
a producción. El entorno local sirve para desarrollo y comparaciones relativas;
no se reporta como cifra oficial.

## 2. Alcance

**Incluido**

- API del mapa: tiles, detalle, área, variables, excluidos, histórico y capas
  por variable.
- Navegador: carga del dashboard, interacción con el mapa, flujo guiado y caché
  entre visitas.
- Capacidad: carga sostenida, estrés, picos y soak.
- Evidencia reproducible: comando, commit, entorno, fecha y resultados.

**Excluido por ahora**

- Pruebas de carga contra producción.
- Optimización estructural de `variables-bulk` (preagregación por resolución).
- RUM/APM de usuarios reales.
- Pruebas de PDF completo como parte de la suite automática.
- NFR-P1 (render de ~30 000 hexágonos) como prueba dedicada.
- Corrección de tests heredados que ya fallan en `develop`.

## 3. Principios

- **Test es la referencia oficial.** Local solo compara antes/después.
- **Producción solo lectura.** Nunca `load`, `stress`, `spike` ni `soak` contra
  producción.
- **Un cambio, una medición.** Cada optimización se valida con la misma suite,
  la misma máquina y los mismos datos.
- **La evidencia manda.** Un resultado sin commit, entorno y fecha no se
  reporta.
- **Los SLOs no se ajustan para hacer pasar una corrida.** Se ajustan solo con
  evidencia y acuerdo del equipo.

## 4. Catálogo de pruebas

| ID | Prueba | Herramienta | Dónde | Frecuencia | Criterio |
|---|---|---|---|---|---|
| `PERF-BE-01` | Línea base por endpoint (1 VU) | k6 `endpoints` | local / test | manual, nightly | SLO por endpoint |
| `PERF-BE-02` | Recorrido de usuario | k6 `journey smoke` | local / test | nightly | NFR-P2/P3 |
| `PERF-BE-03` | Carga esperada (20 VU, 5 min) | k6 `journey load` | test | semanal / pre-release | SLOs + error < 1 % |
| `PERF-BE-04` | Estrés (10→100 VU) | k6 `journey stress` | test | mensual | encontrar el techo |
| `PERF-BE-05` | Pico y recuperación | k6 `journey spike` | test | pre-release | recupera sin errores |
| `PERF-BE-06` | Soak (30 min) | k6 `journey soak` | test | mensual | sin fuga ni degradación |
| `PERF-FE-01` | Abrir mapa | Playwright `@smoke` | local / test / prod* | nightly + post-deploy | NFR-P2, LCP/TBT/CLS |
| `PERF-FE-02` | Zoom/paneo (FPS/jank) | Playwright `@interaction` | local / test | nightly | NFR-P3 |
| `PERF-FE-03` | Selección → Características → Dimensiones → Informe | Playwright `@flow` | local / test | semanal | transiciones < 2–5 s |
| `PERF-FE-04` | Primera vs segunda visita | Playwright `@bundle @cache` | local / test / prod* | semanal | NFR-P5/P6 |
| `PERF-FE-05` | PDF del informe | Playwright `@pdf` | test | pre-release | < 30 s total |
| `PERF-INF-01` | Smoke sintético post-deploy | Playwright `@smoke` | prod* | cada deploy | lectura OK |
| `PERF-INF-02` | RUM / monitoreo real | AccuWeb/Grafana o Web Vitals | prod | continuo | percentiles reales |

`*` En producción solo lectura: login, abrir mapa y una petición de detalle.

## 5. SLOs

| Métrica | Objetivo | Origen |
|---|---|---|
| Mapa listo (sin `/api` en vuelo) | p95 < 5 s | NFR-P2 |
| Re-render al cambiar variable/filtro | p95 < 2 s | NFR-P3 |
| TTI tras login | < 3 s | NFR-P4 |
| JSON geoespacial por respuesta | < 10 MB | NFR-P5 |
| Segunda visita (assets) | < 20 % de la 1ª descarga | NFR-P6 |
| `variables-bulk` z12 / z10 / z8 / z6 | 1 / 1,5 / 2 / 3 s | propuesta por zoom |
| `area` (informe, solo backend) | p95 < 1,5 s | propuesta |
| `variables`, `detail`, `historico` | p95 < 300 ms | propuesta |
| `excluded` | p95 < 1 s | propuesta |
| `warmup` | p95 < 500 ms | propuesta |
| Errores HTTP | < 1 % | propuesta |
| JS de primera carga | < 1,8 MB comprimido | propuesta |
| LCP / TBT / CLS / INP | 2,5 s / 300 ms / 0,1 / 200 ms | Core Web Vitals “good” |

La fuente única de los SLO del backend será `perf/k6/lib/slo.js`; la del frontend,
`Vento/e2e-perf/lib/config.ts`.

## 6. Entornos

| Entorno | Uso | Datos | Números oficiales |
|---|---|---|---|
| **Local** | desarrollo y comparación relativa | parquet real ingerido en Docker | No |
| **Test/staging** | cifra oficial, gates y ejecución programada | réplica de producción (~1,6 M hexágonos) | Sí |
| **Producción** | smoke de lectura + monitoreo real | reales | Solo disponibilidad/latencia sintética |

### Estado de partida

- Producción responde; el dashboard está protegido por autenticación.
- A la fecha no hay un entorno de test operativo con URL y usuario de prueba
  documentados en el repositorio.
- La línea base existente es local y preliminar; no sustituye la medición en
  test.

**Consecuencia:** sin entorno de test no se puede producir la cifra oficial ni
ejecutar carga con seguridad. La fase de validación en test queda condicionada a
su disponibilidad.

## 7. Ejecución

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
> anterior, ejecutar `VACUUM ANALYZE hexagon;` antes de medir: sin estadísticas
> el planner puede elegir un plan secuencial y los endpoints de mapa tardan
> decenas de segundos.

### Test

```bash
# 1) Login real y exportación de cookie
cd AppVento/Vento
PERF_BASE_URL=https://<test> PERF_ENV=test PERF_USER=… PERF_PASSWORD=… \
  npx playwright test --config playwright.perf.config.ts --project=setup

# 2) Suite de navegador
PERF_BASE_URL=https://<test> PERF_ENV=test npm run perf:e2e

# 3) API (k6) con la cookie exportada
cd ../../AppVento---Backend
MODE=bff BASE_URL=https://<test> ENV_NAME=test STRICT=1 \
  COOKIE_FILE=../AppVento/Vento/e2e/.auth/perf.json \
  ./perf/run.sh journey load
```

### Producción

- Post-deploy: `PERF_BASE_URL=https://www.proyectovento.com npm run perf:e2e:smoke`
  con un usuario de prueba de solo lectura.
- No ejecutar `@flow`, `load`, `stress`, `spike` ni `soak` contra producción.
- Para diagnóstico real, usar monitoreo/RUM y logs del proveedor.

### CI

El workflow `performance.yml` permite ejecución manual y programada contra test.
Requiere que exista en la rama por defecto del repositorio y que las variables y
secretos de CI estén configurados. Si no hay URL de test, la ejecución se omite.

## 8. Evidencia y reportes

Cada corrida deja:

- `perf/results/<fecha>_<test>_<perfil>_<entorno>.md` y `.json` (k6).
- `Vento/perf-results/<run>_<test>.json` y el resumen de medianas (Playwright).
- Metadatos: entorno, URL, commit, perfil, modo (medición o gate) y fecha.

Para comparar:

1. Repetir la corrida al menos 3 veces en la misma máquina y entorno.
2. Comparar medianas, no una corrida aislada.
3. Reportar p50/p95/p99, error rate y bytes transferidos.
4. Adjuntar evidencia al PR o al informe correspondiente.

## 9. Fases de adopción

| Fase | Qué | Estado |
|---|---|---|
| 0 | Arnés local, SLOs y línea base preliminar | Completado |
| 1 | Suite de medición y documentación | En curso |
| 2 | Mejoras de bajo riesgo (caché, gzip, bundle) | Planificado |
| 3 | Ingesta y migración de defaults | Planificado |
| 4 | Automatización en CI | Planificado |
| 5 | Optimización estructural de `variables-bulk` | Futuro |

El detalle, las ramas y los criterios de salida están en
[`performance-testing-roadmap.md`](performance-testing-roadmap.md).

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Test no representativo (menos RAM/datos) | exigir paridad o documentar diferencias; no comparar absolutos |
| Carga accidental en producción | guarda en `run.sh` + `ENV_NAME=prod`; solo smoke |
| Cookie caduca durante la corrida | re-exportar; para cargas largas usar token/directo |
| GPU por software distorsiona FPS/TBT | la suite reporta el renderer y advierte |
| Una corrida aislada es ruidosa | repetir y usar medianas |
| SLOs rojos bloquean la ejecución programada | por defecto mide; el gate es explícito |
| Datos distintos entre corridas | registrar commit y versión de la master |

## 11. Línea base preliminar

Los siguientes valores son locales y preliminares. No se reportan como cifra
oficial.

### Backend (local, 2026-10-20)

| Endpoint | p95 | Observación |
|---|---|---|
| `variables-bulk` z6 (país) | ~48 s | escaneo de ~1,6 M filas + agregación |
| `variables-bulk` z8 | ~13 s | mismo cuello |
| `variables-bulk` z10 | ~5,4 s | mismo cuello |
| `variables-bulk` z12 | ~203 ms | bbox pequeño |
| `area` | ~55 ms | dentro de presupuesto |
| `detail` | ~20 ms | dentro de presupuesto |
| `variables` | ~21 ms | dentro de presupuesto |
| `excluded` | ~10 ms | dentro de presupuesto |
| `warmup` | ~50 ms | dentro de presupuesto |
| `journey load` (20 VU) | 50 % errores | `variables-bulk` p95 ~57 s |

### Frontend (local)

- El chunk que concentraba deck.gl + MapLibre + jsPDF/html2canvas pesaba
  ~3,25 MB sin comprimir. El JS del dashboard quedó en ~3,95 MB raw
  (~1,25 MB gzip) tras separar las librerías de PDF.
- El JS inicial medido en navegador quedó en ~1,49 MB transferido.
- La segunda visita descarga 0 % de JS/CSS con caché HTTP correcta.
- Las llamadas duplicadas al catálogo de variables se redujeron de 4–5 a 2.

Los tiempos de mapa y de flujo local no son representativos cuando la máquina
está compartida con otras corridas; la medición oficial se hará en test.
