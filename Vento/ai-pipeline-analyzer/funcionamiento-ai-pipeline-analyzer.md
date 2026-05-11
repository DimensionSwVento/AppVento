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

## US extraidas y criterios QA

**Criterios base por atributo:** `P` Processing: flujo/operacion deterministica con test. `A` Availability: ruta, build o servicio responde/degrada controladamente. `S` Security: acceso, tokens, secretos o dependencias protegidos. `DQ` Data Quality: datos/configuracion espacial validos. `U` Usability: interfaz clara, accesible y en espanol cuando aplique. `T` Traceability: evidencia reproducible en logs/reportes/config versionada. `R` Resilience: fallo manejado sin estado corrupto.

| US | Historia | Criterios de aceptacion QA aplicables |
| --- | --- | --- |
| US-MONO | Estructura monorepo | T: estructura y scripts versionados; A: servicios levantan de forma reproducible; P: build/test ejecutables desde scripts. |
| US-ENV | Variables de entorno | S: secretos fuera de Git; T: variables documentadas; A: build y servicios arrancan con valores requeridos. |
| US-DDD | Backend clean architecture | P: casos de uso con tests; A: health/endpoints disponibles; S: tokens OIDC validados; DQ: esquema geoespacial versionado. |
| US-KEY | Integracion Keycloak | S: roles `admin`/`analista` y tokens correctos; A: login/registro disponibles; R: recuperacion y expiracion gestionadas. |
| US-CI | Pipeline CI + deploy | T: logs/reportes por ejecucion; S: audit y secrets scan; A: build/deploy gate ejecutan antes de promover. |
| US01 | Login via Keycloak | S: flujo OIDC seguro; A: redireccion a dashboard tras login; U: errores de credenciales claros; R: fallo de auth vuelve a login. |
| US-AUTH-GUARD | Proteccion de rutas | S: rutas protegidas y RBAC; A: redirecciones controladas; R: token expirado no rompe sesion; U: mensaje de sesion expirada. |
| US03 | Mapa base + H3 | P: mapa, zoom, pan y seleccion H3 funcionan; DQ: H3 valido sobre Colombia; U: spinner/error claro; A: carga inicial aceptable. |
| US03-AC6 | Ingesta `.h3.parquet` | DQ: conteos, rangos, nulos y duplicados validados; P: transformacion reproducible; T: proceso de actualizacion documentado. |
| US03-AC1 | Mapa de calor | P: coloreo por `score_general`; DQ: valores consistentes; U: leyenda clara y escala visible. |
| US03-AC2 | Filtrado por variable | P: re-render por variable; U: selector comprensible; A: render menor a 2s segun criterio original. |
| US03-AC3 | Popup hexagono | U: popup muestra score, variables e H3; P: click abre/cierra correctamente; DQ: datos del hexagono coinciden con seleccion. |
| US03-AC5 | Hexagonos no disponibles | DQ: `tipo_celda=excluida` tratado aparte; U: estilo diferenciado; P: no son seleccionables ni calculables. |
| US03-AC4 | Dato central en hexagono | U: valor legible por zoom; P: cambia con filtro; DQ: valor corresponde al dato activo. |
| US03-AC9 | Panel de control | U: leyenda, selector e indicador visibles; P: cambios actualizan mapa y leyenda; DQ: metadatos/rangos consistentes. |
| US-CACHE | Cache geoespacial | A: segunda visita usa cache; R: invalidacion por hash evita datos obsoletos; T: version de datos trazable. |
| US03-AC7 | Metadata de variables | DQ: fuente/vigencia disponibles; U: metadata accesible en UI; T: origen de datos documentado. |
| US08 | CRUD usuarios admin | S: solo admin accede; U: tabla, busqueda y errores claros; R: errores Keycloak/duplicados controlados; T: cambios auditables. |
| US03-AC1-FIX01 | Colores + leyenda | U: gradiente comunica impacto; DQ: variable positiva/negativa clasificada; P: leyenda cambia con variable. |
| US-KEY-01 | Realm/client Keycloak | S: realm, client PKCE y roles correctos; T: `realm-export.json` versionado; A: redirects dev/prod configurados. |
| US-FB-01 | Keycloak en espanol + politicas | U: pantallas y mensajes en espanol; S: password policy; A: boton inicio/retorno disponible. |
| US-FB-02 | Confirmacion post-registro | U: confirmacion y CTA claros; S: no crea sesion sin login; R: errores/cancelacion manejados. |
| US-FB-03 | Expiracion de sesion | R: modal y sign-out controlado; A: redireccion a login; U: mensaje comprensible; S: token expirado no autoriza. |
| US-FB-04 | Territorio colombiano completo | DQ: poligonos y bounds incluyen archipielago; P: seleccion funciona en islas; U: borde no oculta hexagonos. |
| US-FB-05 | Admin roles visibles | S: rol visible y modificable solo por admin; U: badges/selectores claros; P: cambio se refleja sin recargar. |
| US-FB-06 | Email al asignar admin | R: fallo SMTP no rompe asignacion; S: feature flag y permisos; T: evento/email registrable. |
| US-DOC-01 | Documentacion tecnica | T: auth, testing y stack documentados; S: estrategia auth auditable; A: pruebas y pipeline explicados. |

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

- Seguridad ya contempla `npm audit --audit-level=high --json` y `gitleaks` mediante `qa:security`; en ejecucion local puede quedar en `ERROR` si faltan runtime o scanner.
- El build produce evidencia de disponibilidad en logs, aunque el reporte por atributo la complementa principalmente con suites Vitest.
