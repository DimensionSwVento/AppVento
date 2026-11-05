# Características del proyecto — detalle por sprint (front + back)

> Complemento detallado de [`historial-cambios-por-sprint.md`](historial-cambios-por-sprint.md). Describe la funcionalidad Características con base en el código y la documentación del repositorio. Los valores identificados como *template* son demostrativos/provisionales, no datos oficiales de ingeniería.

## Sprint 2 — Entrega 2: formulario inicial de características

Se incorporó la fase **Características del proyecto** al flujo de análisis, después de seleccionar el área y configurar las dimensiones.

### Frontend

- **Emplazamiento:** clasificación onshore/offshore derivada del área seleccionada. El flujo evita combinar hexágonos de tierra y mar. En los primeros entregables también se documentó la elección manual cuando no había un tipo detectado.
- **Capacidad nominal:** control de entrada en MW mediante cuatro ruedas/dígitos, con interacción de teclado y rueda del mouse. Se añadieron mensajes inline de validación técnica.
- **Perfil del aerogenerador:** categorías S/M/L con datos descriptivos. En la primera versión se presentó como selección de tamaño/perfil.
- **Distancia al SIN:** se menciona en el alcance inicial de Sprint 2; luego el feedback la retiró del formulario y la definió como variable informativa derivada por hexágono, no como característica capturada manualmente.

### Backend

- En Sprint 2 las características y los cálculos funcionaban en modo template; no se integraba todavía un catálogo persistente de aerogeneradores ni una API propia para guardar la configuración del proyecto.
- La configuración era estado del flujo frontend y se preparaba para su uso en el informe.

## Sprint 3 — Emplazamiento derivado de datos y flujo template completo

### Frontend

- El emplazamiento se vinculó a la naturaleza de los hexágonos del área (mar/tierra) y a la clasificación `aplicaEn` de variables.
- Se completó la conexión de las características con el informe y el modo template/backend. El formulario es parte de un flujo integral, aunque algunos valores todavía dependían de plantillas.
- Se mantuvieron como datos del proyecto la capacidad, categoría/perfil y características de aerogeneradores.

### Backend

- En esta etapa la BD real alimentaba principalmente el backend de análisis; las especificaciones del aerogenerador aún eran valores template en el frontend. La administración persistente de turbinas se incorporó después.

## Sprint 4 — Integración de catálogo, validaciones y fixes

### Frontend: comportamiento actual documentado

- **Área del proyecto:** suma el área de las celdas H3 seleccionadas (`cellArea`, km²); se recalcula cuando cambia la selección.
- **Tipo de emplazamiento:** se determina a partir de los hexágonos seleccionados. La selección no puede mezclar mar y tierra; la opción contraria queda deshabilitada en la interfaz. Si se borra el área, se limpia el tipo detectado residual. Si el tipo no está determinado, la interfaz permite elegirlo manualmente.
- **Tecnología offshore:** cuando el emplazamiento es offshore, se exige escoger flotante o fija. Si se cambia a onshore o se limpia el emplazamiento, el subtipo offshore se borra. La selección se captura y puede mostrarse en el informe, pero **no altera actualmente el score**; falta conectar esa elección con parámetros reales del modelo (p. ej., profundidad/costos).
- **Capacidad nominal:** entrada en MW con límites actuales de **0,01 a 999,99 MW** (`MIN_CAPACITY_MW` / `MAX_CAPACITY_MW`). El selector de cinco dígitos admite entrada numérica directa, flechas, botones y rueda; el paso decimal predeterminado de 0,05 MW es provisional (el cliente debe confirmar si será 0,05 o 0,10 MW). Un valor ausente, no finito o fuera de rango bloquea avanzar y muestra un error inline.
- **Categoría/perfil:** selección entre S, M y L. La categoría y su descripción/specs alimentan los cálculos de cantidad de unidades y área esperada.
- **Número estimado de aerogeneradores:** no es entrada manual; se calcula como `max(1, floor(área_km² / áreaPorAeroKm²))` cuando hay categoría y área válida; si no hay área o categoría, el cálculo devuelve cero.
- **Alerta de área vs. capacidad:** si el área no se encuentra en la banda calculada, aparece una advertencia no bloqueante. La banda template estima turbinas requeridas con `ceil(capacidadMW / potenciaRepresentativa)`, multiplica por el área por turbina y aplica tolerancia de 0,6×–1,6×. Sin categoría usa M como referencia. La alerta no deshabilita “Siguiente paso”.
- **Avance de fase:** bloqueado si falta emplazamiento, si falta la tecnología offshore cuando aplica, si la capacidad está fuera de rango o si falta categoría. La alerta de área/capacidad no se considera error bloqueante.
- **Estado de interfaz:** `CaracteristicasContext` conserva emplazamiento, tecnología offshore, capacidad, número estimado y categoría; ofrece `reset` y `restore`, esta última usada al restaurar un informe del histórico. El estado se comparte en contexto frontend, no se guarda por sí solo como una entidad de proyecto independiente.
- **Catálogo template:** `projectData.ts` contiene valores de ejemplo para S/M/L. Las potencias por categoría son S: 0,001–0,1 MW, M: 0,1–1 MW y L: desde 1 MW; las áreas por unidad (0,3/0,6/1,0 km²) y espaciamientos (300/500/800 m) son provisionales y deben validarse con el equipo técnico. No deben presentarse como parámetros oficiales.

### Backend y administración

- Se incorporó el catálogo persistente `catalog_turbine`, administrable desde **Administración → Aerogeneradores**. Incluye identificador, nombre/etiqueta, detalle, potencia mínima y máxima (MW), área por aerogenerador (km²) y espaciamiento (m).
- Operaciones disponibles para el catálogo: `GET /admin/catalog/turbines`, `POST /admin/catalog/turbines`, `PATCH /admin/catalog/turbines/{turbine_id}` y `DELETE /admin/catalog/turbines/{turbine_id}` (expuestas por el frontend como `/api/admin/catalog/turbines...` vía BFF). La lectura es para usuarios autenticados y las escrituras requieren administrador.
- El frontend solicita el catálogo al cargar Características. Para las categorías reconocidas S/M/L, las especificaciones recibidas reemplazan las template en los cálculos; el flujo de administración permite listar, crear, editar y eliminar elementos.
- En modo backend se consumen datos reales o vacíos, sin mezclarlos con placeholders de análisis. El catálogo template se usa para la demo/template; la descripción del código mantiene una degradación a template si falla la lectura del catálogo.
- Las características del proyecto también se incluyen en el payload de informes históricos. `POST /historico` guarda parámetros/configuración y no el PDF; el histórico permite restaurarlos al abrir un informe.

## Pendientes y límites que deben quedar explícitos

1. Confirmar con el equipo de datos/técnico los valores oficiales de área por turbina y espaciamiento; hoy son template.
2. Confirmar los rangos oficiales de área por capacidad y la fórmula definitiva de número de turbinas. La fórmula y tolerancia actuales son aproximaciones template.
3. Conectar flotante/fija con la profundidad, los costos y las restricciones del modelo; hoy es una característica capturada, no un factor del score.
4. Aclarar la diferencia entre el tamaño derivado de la capacidad (pequeño/mediano/grande) descrito en el inventario del cliente y el selector actual S/M/L; documentación de cliente y UI no siempre usan los mismos umbrales.
5. Mantener la distancia al SIN fuera del formulario de características: el feedback la define como variable informativa geoespacial, derivada por hexágono.
6. No describir estas características como inputs que recalculan el score si no existe integración con el modelo; el backend sirve catálogo/configuración e informes, mientras los scores provienen del modelo/master.

## Archivos de referencia

- Front: `Vento/src/app/Components/caracteristicas/Caracteristicas.tsx`, `Vento/src/app/Components/caracteristicas/MWPicker.tsx`, `Vento/src/app/Utils/contexts/CaracteristicasContext.tsx`, `Vento/src/app/Utils/projectData.ts`, `Vento/src/app/Utils/capacity.ts`.
- Administración: `Vento/src/app/admin/turbinas/page.tsx`, `Vento/src/app/Utils/admin/catalogApi.ts`.
- Contrato/datos: `docs/spec/inventario-datos-origen.md`, `docs/spec/datos-requeridos.md`, `docs/spec/variables-catalogo-definitivo.md`.
- Histórico/API: `docs/architecture/backend-api.md`, `docs/manuales/manual-tecnico.md`.

> Nota: este complemento detalla la sección de características que el historial por sprint resumía en pocas líneas. La historia de cambios debe conservar la atribución temporal (Sprint 2: formulario; Sprint 3: emplazamiento por dato/flujo; Sprint 4: catálogo editable y fixes) y distinguir lo implementado de lo pendiente.
