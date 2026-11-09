# Roadmap de adopción — pruebas de performance de Vento

> Plan de implementación progresiva del plan de performance. Cada ola se divide
> en PRs pequeños, con un riesgo acotado y criterios de salida explícitos. La
> rama de integración actual no se mergea completa: se usa como referencia para
> extraer los cambios por partes.
>
> Documento base: [`performance-testing-plan.md`](performance-testing-plan.md).

## 1. Principios de implementación

- **Un PR, un riesgo.** No se mezclan pruebas, cambios de runtime, migraciones de
  BD y automatización de CI en el mismo PR.
- **Cada PR sale de `develop`.** No se encadenan merges de la rama de integración.
- **La suite no bloquea el ciclo actual.** Las pruebas de performance se ejecutan
  manualmente o en un workflow propio; no se añaden gates a los PRs existentes
  hasta que el equipo lo apruebe.
- **Primero medir, después optimizar.** Las mejoras de rendimiento se priorizan
  con la línea base oficial, no con intuición.
- **Todo cambio de comportamiento se valida en test** antes de producción.

## 2. Olas y PRs

| Ola | PR | Repo | Rama propuesta | Alcance | Riesgo | Depende de |
|---|---|---|---|---|---|---|
| 1 | 1A | frontend | `perf/00-plan-docs` | Plan, SLOs, entornos y roadmap | Nulo | — |
| 1 | 1B | backend | `perf/01a-harness-k6` | Suite k6, SLOs, perfiles, `run.sh`, README/PLAN | Nulo en runtime | — |
| 1 | 1C | frontend | `perf/01b-harness-web` | Suite Playwright, métricas, reporte de medianas | Nulo en runtime | 1A |
| 2 | 2A | backend | `perf/02a-api-cache-gzip` | Gzip, cache headers, caché de capas, tests | Bajo | 1B |
| 2 | 2B | frontend | `perf/02b-web-bundle` | PDF bajo demanda, test del informe | Bajo | 1C |
| 2 | 2C | frontend | `perf/02c-web-cache` | Caché de catálogo, Cache-Control en BFF | Medio-bajo | 2B, test |
| 3 | 3A | backend | `perf/03-ingest-defaults` | `ANALYZE` en ingesta, migración de defaults | Operativo | 2A, ventana |
| 4 | 4A | backend | `perf/04-ci-performance` | Workflow manual + programado | Bajo | 1B, test |
| 5 | 5A | backend | `perf/05-bulk-preaggregation` | Preagregación de `variables-bulk` | Alto | Línea base oficial |

### 1A — Documentación

**Contenido**

- `performance-testing-plan.md`.
- `performance-testing-roadmap.md`.

**Criterio de salida**

- Documentos revisados y aprobados por el equipo.
- Sin cambios de código, configuración ni datos.
- Enlaces internos válidos.

**Rollback:** eliminar los documentos.

### 1B — Arnés backend

**Contenido**

- `perf/k6/endpoints.js`, `journey.js`, `lib/*`, perfiles y umbrales.
- `perf/run.sh`, `perf/README.md`, `perf/PLAN.md`.
- Sin cambios en `main.py`, routers, servicios ni base de datos.

**Criterio de salida**

- `./perf/run.sh endpoints` y `journey smoke` ejecutan en local.
- El resumen genera `.md` y `.json` con entorno, commit y SLO.
- `STRICT=0` mide y `STRICT=1` falla si no se cumple el SLO.
- `ruff` pasa.

**Rollback:** eliminar `perf/`.

### 1C — Arnés frontend

**Contenido**

- `Vento/e2e-perf/` (config, métricas, tests, reporte).
- `playwright.perf.config.ts` y scripts de `package.json`.
- Sin cambios en componentes, rutas API ni lógica de la app.

**Criterio de salida**

- `npx playwright test --config playwright.perf.config.ts --list` lista los tests.
- `@smoke` ejecuta en local con backend real.
- `npm run perf:report` genera el resumen de medianas.
- `tsc` y `eslint` pasan.

**Rollback:** eliminar `e2e-perf/`, la config y los scripts.

> La prueba `@cache` puede fallar antes de 2C porque todavía no se reenvía
> `Cache-Control` desde el BFF. No está enganchada al CI y se usa como línea
> base del problema.

### 2A — Backend de bajo riesgo

**Contenido**

- `GZipMiddleware` para respuestas JSON grandes.
- `Cache-Control` privado en endpoints de datos del mapa.
- Caché en proceso de `variables-bulk`/`variable` con TTL y tamaño acotado.
- Tests de caché y compresión.

**Criterio de salida**

- `ruff` y tests unitarios de la suite pasan.
- `excluded` y `variables` responden con `Cache-Control` y gzip cuando aplica.
- Una segunda petición idéntica de capas usa caché.
- Sin cambios de esquema ni migraciones.

**Rollback:** revertir el PR; no hay migración ni datos modificados.

### 2B — Bundle frontend

**Contenido**

- Import dinámico de jsPDF/html2canvas/svg2pdf.
- Ajuste del test del informe para el nuevo camino de carga.

**Criterio de salida**

- `npm run build` pasa.
- El chunk principal reduce su tamaño respecto a la línea base.
- La generación de PDF sigue funcionando.
- Sin cambios de comportamiento de datos.

**Rollback:** revertir el PR.

### 2C — Caché frontend

**Contenido**

- Caché y coalescing del catálogo de variables.
- Reenvío de `Cache-Control` desde el BFF.
- Validación con la prueba `@cache`.

> El sprint 4 tiene pendiente la caché de capas del mapa (7.4). Antes de
> implementar este PR, confirmar el alcance con el equipo para no duplicar
> trabajo. Si la caché de capas ya está resuelta, 2C se limita a validar y medir
> la caché del catálogo/BFF.

**Criterio de salida**

- La primera carga reduce las llamadas repetidas al catálogo.
- La segunda visita no vuelve a descargar JS/CSS.
- Los datos no quedan obsoletos más allá del TTL acordado.
- Validado en test antes de producción.

**Rollback:** revertir el PR; el TTL se puede reducir como mitigación temporal.

### 3A — Ingesta

**Contenido**

- `ANALYZE hexagon` al final de la ingesta.
- Migración de `server_default` de `scores` y `emplazamiento`.
- Ajuste del modelo para nuevas bases.

**Criterio de salida**

- `alembic upgrade head` y `downgrade` funcionan en una base limpia.
- La ingesta completa funciona sin `NotNullViolation`.
- `excluded` usa estadísticas frescas tras la ingesta.
- Existe backup y ventana de despliegue acordada.

**Rollback:** `alembic downgrade` y restaurar backup si fuera necesario.

> Este PR toca esquema y secuencia de despliegue. No se mezcla con las mejoras de
> runtime.

### 4A — CI

**Contenido**

- Workflow manual + programado.
- Login con Playwright, ejecución de frontend y k6, resumen en job summary.
- Sin artifacts por la política de Actions de la organización.

**Criterio de salida**

- YAML válido.
- El workflow existe en la rama por defecto.
- Se ejecuta manualmente contra test.
- Si no hay URL de test, el job se omite sin fallar.
- `strict=true` funciona como gate opcional.

**Rollback:** eliminar el workflow y las variables/secretos.

### 5A — Optimización estructural

Solo se abre si la línea base oficial confirma que `variables-bulk` es el cuello
principal. Opciones:

- preagregación por resolución (res 4–6) en una tabla angosta;
- `h3-pg` + vistas materializadas;
- cambios de infraestructura (RAM/workers) si el cuello es la BD.

**Criterio de salida**

- Diseño revisado y medido antes/después.
- Sin regresión de resultados funcionales.
- Comparación con la línea base en test.

## 3. Roadmap de ejecución de pruebas

| Etapa | Dónde | Qué se ejecuta | Resultado |
|---|---|---|---|
| 0. Local | máquina de desarrollo | `endpoints`, `journey smoke`, `@smoke`, `@flow`, `@cache` | validación del arnés y comparación relativa |
| 1. Test read-only | test | `endpoints` + `journey smoke` ×3 | línea base oficial |
| 2. Test carga | test | `journey load` 20 VU, `stress`, `spike` | capacidad y techo |
| 3. Test soak | test | `journey soak` 30 min | estabilidad y fugas |
| 4. Prod | producción | solo `@smoke` post-deploy + RUM | disponibilidad real |
| 5. Optimización | test | repetir línea base antes/después | evidencia de mejora |

### Evidencia mínima por corrida

- Entorno, URL y fecha.
- Commit del producto.
- Perfil y modo (medición o gate).
- p50/p95/p99, error rate y bytes.
- Versión de la master de datos.

## 4. Dependencias operativas

- Entorno de test con URL estable y TLS.
- Usuario de prueba de solo lectura.
- Aislamiento de test respecto a producción (BD y Keycloak).
- Autorización y ventana para pruebas de carga en test.
- Monitoreo durante las corridas de carga.
- Variables y secretos de CI para el workflow.
- Usuario de solo lectura para el smoke de producción.

Ninguna prueba de carga se ejecuta en producción.

## 5. Exclusiones explícitas

- `load`, `stress`, `spike` y `soak` contra producción.
- Optimización de `variables-bulk` antes de tener la línea base oficial.
- RUM/APM como parte de esta suite.
- Prueba dedicada de PDF (`@pdf`).
- NFR-P1 (≈30 000 hexágonos) como escenario automático.
- Service worker/offline.
- Cambios de infraestructura sin evidencia.
- Corrección de tests heredados de `develop` que no pertenecen a performance.

## 6. Definición de terminado

Una ola se considera terminada cuando:

1. El PR está mergeado en `develop`.
2. Los criterios de salida se cumplen.
3. La evidencia está en el PR o en el informe.
4. No quedan cambios sin documentar.
5. El equipo conoce cómo ejecutar la suite.
