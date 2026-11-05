# Vento — Historias y características por sprint

> Anexo derivado de [`historial-cambios-por-sprint.md`](historial-cambios-por-sprint.md) y de los scopes y feedbacks de [`stories/`](stories/). Consolida las historias de usuario (HU), sus características principales, prioridad y estado documentado. No sustituye los criterios de aceptación completos de cada scope.
>
> **Convención:** US01–US09 identifican épicas o módulos; los identificadores como US03-P2, US04-AC1 o US-FB2-01 corresponden a historias/subhistorias. Se distingue lo planeado de lo efectivamente entregado. Los estados reflejan la documentación consultada y pueden variar entre planning y cierre.

## Resumen

| Sprint / fase | Enfoque | Stories y funcionalidades principales | Estado documentado |
|---|---|---|---|
| 1 — abril 2026 | Cimientos de plataforma | Acceso Keycloak, mapa H3, administración inicial, backend e infraestructura | Entrega 1; funcionalidades core implementadas. Algunos AC de autenticación/infra quedaron parciales o dependientes de servicios externos. |
| Estabilización — feedback v1 | Correcciones post despliegue | Localización, sesión, registro, territorio, roles, email y documentación | 7 HUs consolidadas; entregadas con SMTP temporal en la notificación. |
| 2 — mayo–junio 2026 | Flujo de análisis | Selección de área, dimensiones/variables, características del proyecto, informe y mapa de calor | Scope 2 cerrado; datos/modelo reales y ciertos insumos se mantuvieron como dependencias. |
| Feedback ronda 2 | Usabilidad y cartografía | Guía de navegación, cartografía IGAC, transición H3, polish de interfaz y logout | 5 HUs declaradas cerradas. |
| 3 — julio 2026 | Template completo | Catálogo definitivo, informe, onboarding, histórico, UX, mapa y ajustes de datos | Entrega 3 en modo template; la integración de datos reales quedó condicionada a insumos. |
| 4 — septiembre 2026 y fixes posteriores | PDF profesional, datos editables y administración | Informe configurable/multipágina, catálogo/admin, características, capas y mejoras UX | Entrega de septiembre más fixes oct–nov; algunos fixes, datos oficiales e integraciones externas siguen pendientes o pospuestos. |
| 5 — planeado | Transparencia y nuevas capacidades | Trazabilidad del modelo, turbinas con datos del cliente, basemap satelital, mapa por dimensión y análisis prospectivo | Planeado; no iniciado según el historial. |

---

## Sprint 1 — Acceso, mapa e infraestructura

### Historias principales

| ID | Historia y características | Prioridad / estado |
|---|---|---|
| US-MONO, US-ENV, US-DDD, US-CI, US-KEY / US-KEY-01 | Fundación técnica: configuración, backend FastAPI con arquitectura limpia, integración Keycloak, validación de tokens y automatización CI/CD. La propuesta original de monorepo se adaptó a repositorios separados. | Requisitos transversales; implementación real descrita en el historial y `project-status.md`, con algunos AC parciales. |
| US01 | Login institucional mediante Keycloak/OIDC, gestión de credenciales por el proveedor de identidad y acceso al dashboard. | Alta; núcleo implementado. Recuperación/email depende de SMTP. |
| US-AUTH-GUARD | Protección de rutas y validación de sesión/token en frontend y backend. | Crítica; implementada parcialmente según el estado del proyecto. |
| US03 | Mapa base de Colombia, navegación, conversión de clic a índice H3 y visualización de la selección. | Crítica; implementada. |
| US03-AC6 | Ingesta y validación de datos geoespaciales para servir información asociada a hexágonos. | Crítica; la integración completa del modelo/dataset real se mantuvo como dependencia. |
| US03-AC1, US03-AC2, US03-AC3, US03-AC5, US03-AC4, US03-AC9 | Mapa de calor/variable, popup con valores e ID H3, representación de celdas no disponibles, valor central y controles/leyenda. | Varias características de la propuesta inicial fueron adaptadas, reemplazadas o quedaron parciales; consultar el estado actualizado en el scope. |
| US-CACHE, US03-AC7 | Caché geoespacial y metadatos de fuente/vigencia de variables. | Parcial o pendiente en el inventario inicial. |
| US08 | Administración de usuarios y roles. | Media; gestión entregada, con evolución posterior de la UI de administración. |

### Características entregadas
- Autenticación Keycloak y roles de administrador/analista.
- Mapa basado en DeckGL, MapLibre y celdas H3; backend FastAPI y consultas por tiles.
- Interfaz adaptable, pruebas y despliegue inicial.
- Algunos requisitos originales cambiaron durante la implementación: por ejemplo, el mapa y la ingesta evolucionaron hacia procesamiento backend/tile-based.

## Estabilización — feedback cliente v1

| ID | Historia y características | Estado |
|---|---|---|
| US-FB-01 | Keycloak en español, navegación de regreso y política de contraseñas. | Listo. |
| US-FB-02 | Confirmación post-registro y retorno explícito a login. | Listo; resuelto en la aplicación, documentado en ADR-012. |
| US-FB-03 | Mensaje amigable y redirección al expirar la sesión. | Listo según el resumen de feedback. |
| US-FB-04 | Cobertura territorial extendida: costa, offshore, San Andrés y Providencia. | Listo según el resumen de feedback. |
| US-FB-05 | Visibilidad del rol y asignación/cambio de roles desde administración. | Listo. |
| US-FB-06 | Notificación por email al asignar rol de administrador. | Funcional con SendGrid temporal; SMTP definitivo y dominio siguen siendo externos. |
| US-DOC-01 | Documentación de autenticación, testing y validación del stack. | Listo. |

## Sprint 2 — Flujo de análisis (Scope 2)

| ID | Historia y características | Prioridad / estado |
|---|---|---|
| US03-P2 | Área seleccionada: cálculo reactivo de km² e idoneidad agregada, con estado vacío robusto y presentación adaptable. | Crítica; entregada con scores template cuando no hay datos reales. |
| US03-AC12 | Bloquear cambios de selección fuera de la fase de selección; conservar el área y adaptar bordes/feedback visual por fase. | Alta; entregada. |
| US04-AC1 | Catálogo de variables organizado por dimensiones, tarjetas colapsables, búsqueda, switches y contadores de selección. | Alta; entregada; la versión posterior consolidó y amplió el catálogo. |
| US04-AC2 | Definición accesible de variables, con descripción y explicación de si suma o resta a la idoneidad. | Alta; entregada. |
| US04-AC4 | Chips/panel de variables activas en el mapa y acceso al detalle de cada variable. | Alta; entregada y refinada posteriormente. |
| US05-AC1/02/03 | Características del proyecto: capacidad, perfil/categoría de aerogenerador y validaciones; el alcance de catálogo/modelos se ajustó tras conversación con el cliente. | Alta; formulario entregado; datos y catálogo reales evolucionaron en Sprint 4. |
| US06-AC3 | Previsualización del informe y descarga PDF con resultados, área, variables, características y marca institucional. | Crítica; entregada en el flujo de análisis. |
| US06-HEAT-AC1/02/03 | Heatmap limitado al área, agregado multivariable, control de paleta y leyenda contextual. | Reubicado a la experiencia del informe; consultar el scope para detalles de implementación. |

### Características del proyecto incorporadas al flujo
- El usuario configura capacidad nominal y perfil S/M/L; el área y el emplazamiento se derivan de la selección H3.
- El flujo valida datos antes de avanzar y prepara la configuración para incluirla en el informe.
- En esta etapa el análisis operaba en modo template; no debe interpretarse que esos inputs recalculaban el score real.

## Feedback ronda 2 — evaluación de terceros

| ID | Historia y características | Prioridad / estado |
|---|---|---|
| US-FB2-01 | CTA/guía que comunica el siguiente paso después de seleccionar el área. | Alta; declarada lista. |
| US-FB2-02 | Sustituir geometría simplificada por cartografía oficial IGAC, conservando la cobertura insular/marítima. | Crítica; declarada lista. |
| US-FB2-03 | Ajustes de layout de landing/dashboard y validación visual. | Media; declarada entregada. |
| US-FB2-04 | Transición visual al cambiar resolución H3 para suavizar el cambio de retícula. | Media; declarada lista. |
| US-FB2-05 | Icono y tooltip inequívocos para cerrar sesión. | Baja; declarada lista. |

## Sprint 3 — Catálogo definitivo y recorrido template completo

### Historias del scope

| ID | Historia y características | Prioridad / estado |
|---|---|---|
| US06-01 | Radar SVG dinámico de dimensiones puntuables, reflejado en previsualización/PDF y seguro ante selección vacía. | Crítica; incorporado al producto. |
| US02-01/02/03 | Onboarding con modal/carrusel, navegación, cierre y opción de saltar. | Baja; parte de la experiencia entregada. |
| US07-01/02 | Guardar/listar análisis históricos y reabrir/eliminar informes regenerándolos desde sus parámetros. | Media; histórico implementado; límite documentado de 100 informes por usuario. |
| US09-01/02 | Toasts de confirmación y errores de validación reutilizables y accesibles. | Media; incorporados al flujo. |
| US03-01 | Validar mapa y selección sobre datos oficiales/reales, incluidos territorio, conteos y rendimiento. | Crítica; dependiente de dataset real. |
| US03-02 | Evitar selecciones H3 anidadas al cambiar de zoom; anclar selección a resolución mínima. | Alta; documentada como implementada. |
| US03-03 | Mostrar zonas vetadas y bloquear selección según datos/motivos. | Media; cableado preparado, población de datos y motivos pendiente. |
| US04-01 | Validar variables, pesos y scores con los datos del modelo real. | Alta; dependiente de datos y aval. |
| US05-01 | Negociar el alcance definitivo de las características del proyecto. | Alta; requiere acuerdo/insumos. |
| US01-01 | Configuración de SMTP de pago. | Alta; dependencia externa. |

### Feedback v2 relacionado

| ID | Historia y características | Estado documentado |
|---|---|---|
| US-FB3-01 | Distancia al SIN como variable informativa por hexágono; derivación de energía/área desde capacidad según fórmula acordada. | Parte del feedback del cierre de Scope 2; no confundir con una característica manual ni asumir fórmula oficial sin confirmación. |
| US-FB3-02 | Controles persistentes de zoom a selección, reset de vista y borrado de selección. | Feedback de Sprint 3. |
| US-FB3-03 | Corregir tooltip y cursor durante la revisión del informe, con cobertura cross-browser. | Feedback de Sprint 3. |
| US-FB3-04 | Entrada de capacidad por teclado y pasos configurables en decimales. | Feedback de Sprint 3. |
| US-FB3-05 | Ayuda para reabrir la guía/tutorial. | Feedback de Sprint 3. |
| US-FB3-06 | Regulatoria como dimensión informativa, excluida del score y presentada aparte. | Decisión incorporada al catálogo/informe. |

### Características destacadas de la entrega
- Catálogo definitivo documentado: 61 variables ponderadas y 30 informativas; cuatro dimensiones puntuables y Regulatoria informativa.
- Informe con radar, mapa/captura, ranking y fuentes; histórico que guarda parámetros y configuración, no el PDF.
- Separación entre modo template y backend para evitar presentar placeholders como datos reales.
- Backend desplegado con ingesta de datos y persistencia; la disponibilidad del modelo/dataset oficial seguía siendo una condición externa.

## Sprint 4 — Informe, datos editables, administración y refinamientos

| ID | Historia y características | Prioridad / estado |
|---|---|---|
| US06-03 | Preconfigurar el informe: dimensiones, variables, detalle del modelo, fuentes y tipo de gráfico; vista previa en vivo coherente con lo guardado/descargado. | Crítica; alcance principal del sprint. |
| US06-04 | PDF multipágina con índice, resumen ejecutivo, secciones por dimensión, fuentes y disclaimer. | Crítica; entregado como PDF nativo/vectorial en el historial. |
| US08-01 | Administración de variables y datasets, detalle editable y gestión de metadatos. | Alta; implementado con backend/BFF y herramientas de carga. |
| US08-02 | CRUD de normas regulatorias con etiquetas/estado y detalle para la sección informativa. | Media; funcionalidad de administración incorporada. |
| US08-03 | CRUD de escenarios económicos para alimentar el panel informativo. | Media; funcionalidad incorporada. |
| US08-04 | Confirmaciones de cambios de rol, downgrade reversible, desactivación honesta, feedback y búsqueda/filtros de usuarios. | Alta/media; fixes de administración del sprint. |
| US04-02 | Panel de información económica, escenarios, horizonte y posibilidad de agregar al informe; explícitamente no puntúa. | Alta; parte del scope de variables. |
| US04-03 | Detalle, mapa y catálogo de variables conectados a datos reales y a su disponibilidad de visualización. | Alta; condicionada a datasets oficiales. |
| US04-04 | Aviso no bloqueante si el área no coincide con la banda esperada para la capacidad. | Media; rangos oficiales pendientes; usar template con cautela. |
| US04-05 | Normas regulatorias informativas, etiquetas y opción de incluir sección en el informe. | Media; no afecta el score. |
| US09-03 | Unificar patrón del botón “Siguiente paso” y explicar qué falta para continuar. | Media; documentada como hecha. |
| US09-04 | Revisar el texto del disclaimer con EAFIT y mostrarlo al inicio/final. | Baja; aprobación del texto externa. |
| US03-04 | Revisar selección de área y opciones; selección por polígono/coordenadas en el historial de implementación. | Baja; documentada como hecha. |
| QA-04 | Pruebas técnicas del entorno y smoke test del recorrido/informe. | Transversal. |

### Refinamientos y características documentadas en los fixes de Sprint 4
- Informe/PDF: datos ordenados por dimensión, etiquetas informativas, escala de puntajes, síntesis ejecutiva, nombre sugerido, controles en cabecera y paginación mejorada.
- Características del proyecto: emplazamiento mar/tierra basado en H3, subtipo flotante/fija offshore, capacidad dentro de límites de UI, perfil S/M/L y número estimado de turbinas derivado; el avance depende de los campos requeridos.
- El catálogo persistente de aerogeneradores reemplaza los datos template cuando está disponible; fallback template para modo demo. Los valores de área, espaciamiento y fórmulas aún requieren validación oficial.
- Mapa: capas opt-in, colores e iconos consistentes, áreas anidadas y agrupación visual; ciertos cambios de rendimiento/capas se reportan aún como pendientes.
- La capacidad, emplazamiento y tecnología se guardan/restauran con el análisis, pero no se deben describir como factores del score sin integración confirmada con el modelo.

## Sprint 5 — trabajo planeado, no iniciado

| Historia / capacidad | Características esperadas | Estado |
|---|---|---|
| Transparencia y trazabilidad del modelo | Explicar cálculo, ponderaciones, fuentes, limitaciones y contribución al índice. | HU nueva planeada. |
| Turbinas (#26) | Descripción, combinaciones, potencia y campos faltantes usando valores provistos por el cliente. | HU nueva; necesita datos del cliente. |
| Basemap satelital | Incorporar una capa base satelital al mapa. | Planeado. |
| Mapa por dimensión en el informe | Consultar la distribución geográfica de cada dimensión. | Planeado. |
| Interpretación prospectiva | Añadir detalle interpretativo del análisis prospectivo. | Planeado. |

## Notas de interpretación y fuentes

1. Este anexo resume stories y características; los criterios completos y las dependencias están en cada scope enlazado desde [`docs/README.md`](README.md) y en la carpeta [`stories/`](stories/).
2. Una HU listada en un planning no equivale por sí sola a una funcionalidad entregada. Se señalan por separado alcance planeado, estado documentado y dependencias externas.
3. “Datos reales” se refiere a datos/modelo validados del equipo de investigación; un backend conectado o un catálogo editable no implica que todos los scores provengan del modelo definitivo.
4. La documentación de características del proyecto está ampliada en [`caracteristicas-proyecto-detalle.md`](caracteristicas-proyecto-detalle.md).
5. Fuentes principales: `stories/scope-primera-entrega.md`, `stories/scope-segunda-entrega.md`, `stories/feedback-cliente-v1.md`, `stories/feedback-1-round2.md`, `stories/scope-tercera-entrega.md`, `stories/feedback-cliente-v2.md`, `stories/scope-cuarta-entrega.md` e `historial-cambios-por-sprint.md`.
