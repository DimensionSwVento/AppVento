# Vento — Características del proyecto por sprint

> Complemento de [`historias-y-caracteristicas-por-sprint.md`](historias-y-caracteristicas-por-sprint.md) y [`caracteristicas-proyecto-detalle.md`](caracteristicas-proyecto-detalle.md). Resume cómo evolucionó la captura y el uso de las características del proyecto eólico. No reemplaza la definición oficial del modelo.

## Evolución

| Sprint | Evolución | Implementación / límites |
|---|---|---|
| 2 | Se incorpora una fase de características después de seleccionar el área y configurar variables. Se capturan emplazamiento, capacidad y perfil S/M/L. | Modo template; estado de flujo frontend preparado para el informe. La distancia al SIN se retira del formulario y pasa a ser variable geoespacial informativa. |
| 3 | El emplazamiento se deriva de la naturaleza mar/tierra de las celdas seleccionadas; el flujo de características se conecta al informe. | Persisten valores template de turbinas. La integración con datos reales no significa automáticamente que las características afecten el score. |
| 4 | Se integra catálogo persistente administrable, validaciones, persistencia/restauración del histórico y fixes de UX. | El backend puede reemplazar el catálogo S/M/L template. Si no está disponible, se documenta fallback para demo/template. |

## Comportamiento documentado en Sprint 4

- **Área:** suma de área de celdas H3 seleccionadas, en km², y se actualiza al cambiar la selección.
- **Emplazamiento:** onshore/offshore según celdas seleccionadas; no se permite mezclar tierra y mar. Al limpiar el área se restablece el tipo residual.
- **Tecnología offshore:** exige elegir fija o flotante cuando aplica; se limpia al cambiar a onshore o borrar la selección.
- **Capacidad:** entrada en MW con límites de interfaz documentados de 0,01 a 999,99 MW.
- **Categoría:** selector de perfil S/M/L; especificaciones de catálogo alimentan estimaciones de unidades y área esperada.
- **Cantidad estimada:** calculada automáticamente cuando hay área y perfil válidos; no es una entrada manual.
- **Validación de área/capacidad:** aviso no bloqueante si el área queda fuera de una banda esperada. Las bandas y la fórmula descritas en el código se consideran template hasta recibir confirmación técnica oficial.
- **Avance de fase:** requiere emplazamiento, subtipo offshore cuando corresponda, capacidad válida y perfil.
- **Estado:** el contexto de características permite mantener, restablecer y restaurar la configuración al reabrir un análisis.
- **Persistencia:** las características se incluyen en el payload del histórico; el PDF se vuelve a generar desde los parámetros guardados.

## Catálogo de aerogeneradores

La administración documentada incluye identificador, nombre/etiqueta, detalle y rangos de potencia, entre otros campos técnicos. Cuando las especificaciones del backend están disponibles, sustituyen los valores template para las categorías reconocidas. El modo backend no debe mezclar datos reales con placeholders de análisis.

## Límites que deben conservarse en cualquier derivado (DOCX, PDF o web)

1. Confirmar con datos/técnica los valores oficiales de área por turbina, espaciamiento y bandas por capacidad.
2. Confirmar la fórmula definitiva para estimar la cantidad de turbinas y la energía/área derivada.
3. La opción fija/flotante se captura como característica; no presentarla como factor del score si el modelo no la incorpora.
4. Mantener la distancia al SIN fuera del formulario: está definida como variable informativa geoespacial derivada por hexágono.
5. No afirmar que las características recalculan la idoneidad si no existe integración comprobada con el modelo multicriterio.

## Referencias

- [`docs/historial-cambios-por-sprint.md`](historial-cambios-por-sprint.md)
- [`docs/stories/scope-segunda-entrega.md`](stories/scope-segunda-entrega.md)
- [`docs/stories/scope-tercera-entrega.md`](stories/scope-tercera-entrega.md)
- [`docs/stories/scope-cuarta-entrega.md`](stories/scope-cuarta-entrega.md)
- [`docs/stories/feedback-cliente-v2.md`](stories/feedback-cliente-v2.md)
- [`docs/caracteristicas-proyecto-detalle.md`](caracteristicas-proyecto-detalle.md)
