# Funcionamiento del AI Pipeline Analyzer

El **AI Pipeline Analyzer** implementa la fase de analisis inteligente del protocolo descrito en `paper.md`: `Commit -> Build -> Test -> AI Analysis -> Deploy`. Su objetivo no es reemplazar las pruebas, sino interpretar sus evidencias por atributo de calidad y apoyar la decision de despliegue.

## Fases

| Fase | Funcion | Evidencia generada |
| --- | --- | --- |
| Commit | Un cambio en codigo o datos dispara el pipeline. | SHA del commit y metadatos de ejecucion. |
| Build | Compila el frontend Next.js y prepara el entorno. | `quality-evidence/logs/build.log`. |
| Test | Ejecuta lint, TypeScript, Vitest y agrupa pruebas por atributo. | `logs/lint.log`, `logs/typecheck.log`, `reports/vitest.json`, `reports/attribute-coverage.json/.md`. |
| AI Analysis | Lee resultados, logs y cobertura; detecta riesgos y genera feedback. | `ai/prompt.txt`, `ai/response.raw.json`, `ai/metadata.json`, `ai/pipeline-recommendation.json/.md`. |
| Deploy gate | Aplica la recomendacion `allow`, `warn` o `block`. | `decision/deployment-decision.json` y exit code del gate. |

## Atributos priorizados y evidencia frontend

De los trece atributos del paper, Vento prioriza siete para el frontend. El colector usa `quality-attributes.config.json` para mapear cada atributo contra suites Vitest.

| Atributo | Evidencia actual del frontend | Feedback esperado |
| --- | --- | --- |
| Processing | Pruebas de mapa, dashboard, contexto, sidebar y flujo de pasos. | Confirma ejecucion correcta de logica de interfaz GIS; sugiere agregar operaciones espaciales reales. |
| Availability | Health route, middleware, SessionGuard y rutas migradas a FastAPI. | Valida acceso basico y rutas disponibles; sugiere pruebas contractuales contra backend staging. |
| Security | Auth, middleware, RBAC, APIs admin y Keycloak admin. | Valida control de acceso; sugiere complementar con SAST/DAST o auditoria de dependencias. |
| Data Quality | Resolucion H3, limites territoriales y pruebas de mapa. | Valida configuracion espacial esperada; sugiere muestras reales, completitud y outliers. |
| Usability (Geospatial) | Mapa, sidebar, landing, registro, SessionGuard y NextStepButton. | Valida interacciones geoespaciales basicas; sugiere e2e y accesibilidad en viewport real. |
| Traceability & Auditability | Logs, reportes JSON/Markdown y salida del analyzer. | Garantiza evidencia reproducible por ejecucion. |
| Resilience | Expiracion de sesion, fallos de registro y notificaciones. | Valida manejo controlado de estados fallidos; sugiere fault injection de dependencias remotas. |

## Criterios de aceptacion

Los criterios salen del mapeo del paper: cada atributo tiene pruebas asociadas y evidencia esperada. En la implementacion, esos criterios se vuelven reglas ejecutables:

- Un atributo queda en `PASS` si tiene suites asociadas y cero assertions fallidas.
- Queda en `ATTENTION` si no hay evidencia asociada o si alguna assertion falla.
- La prioridad combina criticidad, tasa de fallo, cantidad de assertions y amplitud de suites.
- El gate bloquea si falla un atributo critico (`criticality = 5`) o si falla mas del 5% del total de pruebas.
- El gate advierte si faltan evidencias en atributos de criticidad alta (`>= 4`) o si un atributo critico no alcanza 100% de pass rate.

## Feedback de IA y decision de deploy

El analyzer construye un payload con metricas globales, evidencias por atributo, fallos y resumen de logs. Si existe `OPENROUTER_API_KEY`, consulta el modelo configurado; si no, usa un fallback heuristico deterministico con el mismo esquema JSON.

La respuesta incluye:

- evaluacion global del pipeline;
- riesgo por atributo (`low`, `medium`, `high`, `critical`);
- anomalias detectadas;
- pruebas sugeridas por atributo;
- prioridades para la siguiente iteracion;
- recomendacion de despliegue: `allow`, `warn` o `block`.

## Coherencia verificada

La evidencia frontend es coherente con el protocolo del paper: cubre los siete atributos priorizados, genera resultados, evidencias y feedback, y separa correctamente el alcance frontend de las pruebas GIS end-to-end del backend.

Salvedades encontradas:

- El paper menciona `npm audit --audit-level=high --json` como evidencia de seguridad, pero el workflow actual no ejecuta ese gate.
- El build produce evidencia de disponibilidad en logs, aunque el reporte por atributo solo agrega suites Vitest.

