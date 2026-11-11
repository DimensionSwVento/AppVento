import { useEffect, useMemo, useState } from "react";
import { PolygonLayer, IconLayer } from "@deck.gl/layers";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { fetchWindCells } from "../../Utils/map/mapLayerData";
import { colorForQuantile, type QuantileCuts } from "../../Utils/map/colorScale";
import { iconKeyToDataUri } from "../../Utils/map/iconRender";

/**
 * Capa de mapa para variables INFORMATIVAS (escala de color) y de PRESENCIA (area).
 *
 * NO toca el calor (`gridTileLayer`): es un componente SEPARADO que IMITA su patrón
 * (traer valores por bbox+res → `PolygonLayer` coloreado por valor por hex), con dos
 * variantes que solo cambian el `getFillColor` — tal como pidió el cliente:
 *   - "escala": choropleth por CUANTILES (claro→oscuro, `colorForQuantile`). Pinta
 *     toda celda con dato; el color sale de en qué cuantil cae su valor (cortes del
 *     backend, `GET /tiles/variable-quantiles`).
 *   - "area": color FIJO de la variable donde hay dato, TRANSPARENTE donde no
 *     ("área individual"), MÁS el ICONO de la variable sobre cada celda con dato.
 *
 * Reutiliza el MISMO fetch que el heatmap del informe (`fetchWindCells`) y la MISMA
 * geometría (`cellToBoundary`). La resolución se resume igual que el resto (las MVs
 * del backend devuelven celdas padre a `res`).
 */
type BBox = { west: number; south: number; east: number; north: number };

export interface VariableMapLayerArgs {
  variableId: string;
  kind: "escala" | "area";
  /** Color base de la variable (rampa de escala / relleno fijo / tinte del icono). */
  color: string;
  /** Icono de la variable (solo `area`). */
  iconKey: string;
  /** Cortes de cuantil del backend (solo `escala`). */
  cuts: QuantileCuts;
  bbox?: BBox;
  res: number;
  visible: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export function useVariableMapLayer({
  variableId,
  kind,
  color,
  iconKey,
  cuts,
  bbox,
  res,
  visible,
}: VariableMapLayerArgs) {
  const [cells, setCells] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    if (!visible) {
      setCells(null);
      return;
    }
    let alive = true;
    fetchWindCells(variableId, bbox, res)
      .then((m) => alive && setCells(m))
      .catch(() => alive && setCells(null));
    return () => {
      alive = false;
    };
  }, [variableId, bbox, res, visible]);

  return useMemo(() => {
    const data = cells
      ? [...cells.entries()].map(([h, value]) => ({ h, value }))
      : [];
    const [br, bg, bb] = hexToRgb(color);

    const getFillColor = (d: { h: string; value: number }): [number, number, number, number] => {
      if (kind === "escala") {
        const c = colorForQuantile(d.value, cuts, color);
        return c ? [c[0], c[1], c[2], 180] : [0, 0, 0, 0];
      }
      // area: presencia → color fijo donde hay dato; transparente si no lo trae.
      return d.value != null ? [br, bg, bb, 140] : [0, 0, 0, 0];
    };

    const poly = new PolygonLayer<{ h: string; value: number }>({
      id: `varmap-${variableId}-poly`,
      data,
      visible,
      getPolygon: (d) => cellToBoundary(d.h, true),
      getFillColor,
      filled: true,
      stroked: false,
      pickable: false,
      updateTriggers: { getFillColor: [kind, cuts, color] },
    });

    if (kind !== "area") return [poly];

    // area: icono de la variable en el centroide de cada celda con dato.
    const url = iconKeyToDataUri(iconKey, color);
    const iconData = data
      .filter((d) => d.value != null)
      .map((d) => {
        const [lat, lng] = cellToLatLng(d.h);
        return { lng, lat };
      });
    const icon = new IconLayer<{ lng: number; lat: number }>({
      id: `varmap-${variableId}-icons`,
      data: iconData,
      visible,
      getPosition: (d) => [d.lng, d.lat],
      getIcon: () => ({ id: variableId, url, width: 48, height: 48, anchorY: 24, mask: false }),
      getSize: 18,
      sizeUnits: "pixels",
      pickable: false,
      parameters: { depthCompare: "always" },
    });
    return [poly, icon];
  }, [cells, kind, cuts, color, iconKey, variableId, visible]);
}
