/**
 * Punto de entrada del feature `hexValuesTooltip` — autocontenido para
 * exportar a otra rama (siguiendo el patrón de `Vento/src/app/heatmap/`).
 *
 * El componente sólo necesita estar montado dentro del `<MapView>` y se
 * activa automáticamente cuando hay `selectedHexes.size > 0`.
 */

export { default as HexValuesTooltip } from "./HexValuesTooltip";

export {
  valueForSelection,
  qualitativeLabel,
  dimensionScore,
  generalScore,
} from "./placeholderValues";
