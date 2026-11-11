import { useEffect, useMemo, useState } from "react";
import { PolygonLayer, IconLayer } from "@deck.gl/layers";
import { cellToBoundary, cellToLatLng, polygonToCells } from "h3-js";
import { isInColombia } from "../../Utils/h3/mapGeo";
import {
  fetchWindCells,
  fetchCatalogCells,
  windValueForHex,
} from "../../Utils/map/mapLayerData";
import { colorForQuantile, type QuantileCuts } from "../../Utils/map/colorScale";
import { iconKeyToDataUri } from "../../Utils/map/iconRender";
import { USE_BACKEND } from "../../Utils/projectData";

/**
 * Capa de mapa para variables INFORMATIVAS (escala de color) y de PRESENCIA (area).
 *
 * NO toca el calor (`gridTileLayer`): es un componente SEPARADO que IMITA su patrón
 * (valores por hex → `PolygonLayer` coloreado por valor), con dos variantes que solo
 * cambian el color — como pidió el cliente:
 *   - "escala": choropleth por CUANTILES (claro→oscuro, `colorForQuantile`). Valores
 *     continuos: backend `fetchWindCells`; en TEMPLATE, campo placeholder determinista
 *     (`windValueForHex`) sobre las celdas del bbox. Cortes de cuantil del backend
 *     (`/tiles/variable-quantiles`) o, en template, cortes uniformes sobre 0–1.
 *   - "area": color FIJO de la variable donde HAY dato, TRANSPARENTE donde no, + ICONO.
 *     Presencia: backend/template vía `fetchCatalogCells` (ya cae a placeholder sin backend).
 *
 * En TEMPLATE (sin backend) dibuja con DATOS TEMPLATE, igual que el calor.
 */
type BBox = { west: number; south: number; east: number; north: number };

export interface VariableMapLayerArgs {
  variableId: string;
  kind: "escala" | "area";
  /** Color base de la variable (rampa de escala / relleno fijo / tinte del icono). */
  color: string;
  /** Icono de la variable (solo `area`). */
  iconKey: string;
  /** Cortes de cuantil del backend (solo `escala`); vacío → cortes uniformes (template). */
  cuts: QuantileCuts;
  bbox?: BBox;
  res: number;
  visible: boolean;
}

/** Cortes uniformes para 5 bandas sobre un valor 0–1 (modo template, sin cuantiles reales). */
const TEMPLATE_CUTS: QuantileCuts = [0.2, 0.4, 0.6, 0.8];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

/** Celdas H3 a `res` dentro del bbox, filtradas a Colombia (para el campo template). */
function cellsInBbox(bbox: BBox, res: number): string[] {
  const poly: [number, number][] = [
    [bbox.west, bbox.south],
    [bbox.east, bbox.south],
    [bbox.east, bbox.north],
    [bbox.west, bbox.north],
  ];
  const out: string[] = [];
  for (const h of polygonToCells(poly, res, true)) {
    const [lat, lng] = cellToLatLng(h);
    if (isInColombia(lat, lng)) out.push(h);
  }
  return out;
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
  // escala → valores por hex; area → celdas de presencia. Solo se usa el del `kind`.
  const [valueCells, setValueCells] = useState<Map<string, number> | null>(null);
  const [areaCells, setAreaCells] = useState<string[] | null>(null);

  // Reset en RENDER (no en el effect) al cambiar variable/res/kind o al ocultarse:
  // evita setState SÍNCRONO en el cuerpo del effect (react-hooks/set-state-in-effect).
  const resetKey = `${variableId}:${kind}:${res}:${visible}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setValueCells(null);
    setAreaCells(null);
  }

  useEffect(() => {
    if (!visible || !USE_BACKEND) return; // template no hace fetch (se calcula en el memo)
    let alive = true;
    if (kind === "escala") {
      fetchWindCells(variableId, bbox, res)
        .then((m) => alive && setValueCells(m))
        .catch(() => alive && setValueCells(null));
    } else {
      fetchCatalogCells(variableId, res, bbox)
        .then((c) => alive && setAreaCells(c))
        .catch(() => alive && setAreaCells(null));
    }
    return () => {
      alive = false;
    };
  }, [variableId, kind, bbox, res, visible]);

  return useMemo(() => {
    if (!visible) return [];
    const [br, bg, bb] = hexToRgb(color);

    // ── ESCALA DE COLOR (valores continuos → banda de cuantil) ──────────────────
    if (kind === "escala") {
      let data: { h: string; value: number }[] = [];
      if (USE_BACKEND) {
        data = valueCells
          ? [...valueCells.entries()].map(([h, value]) => ({ h, value }))
          : [];
      } else if (bbox) {
        // Template: campo placeholder determinista sobre las celdas del bbox.
        for (const h of cellsInBbox(bbox, res)) {
          const v = windValueForHex(variableId, h, null);
          if (v != null) data.push({ h, value: v });
        }
      }
      const effCuts = cuts.length ? cuts : TEMPLATE_CUTS;
      return [
        new PolygonLayer<{ h: string; value: number }>({
          id: `varmap-${variableId}-escala`,
          data,
          visible,
          getPolygon: (d) => cellToBoundary(d.h, true),
          getFillColor: (d) => {
            const c = colorForQuantile(d.value, effCuts, color);
            return c ? ([c[0], c[1], c[2], 180] as [number, number, number, number]) : [0, 0, 0, 0];
          },
          filled: true,
          stroked: false,
          pickable: false,
          updateTriggers: { getFillColor: [effCuts, color] },
        }),
      ];
    }

    // ── AREA (presencia → color fijo + icono) ───────────────────────────────────
    const cells = USE_BACKEND ? (areaCells ?? []) : cellsInBbox(bbox ?? { west: -82, south: -5, east: -66, north: 13 }, res)
      // Template: usa la presencia placeholder (campo > 0.6 → "área individual" rala).
      .filter((h) => (windValueForHex(variableId, h, null) ?? 0) > 0.6);
    const areaData = cells.map((h) => ({ h }));
    const poly = new PolygonLayer<{ h: string }>({
      id: `varmap-${variableId}-area`,
      data: areaData,
      visible,
      getPolygon: (d) => cellToBoundary(d.h, true),
      getFillColor: [br, bg, bb, 140],
      filled: true,
      stroked: false,
      pickable: false,
    });
    const url = iconKeyToDataUri(iconKey, color);
    const iconData = cells.map((h) => {
      const [lat, lng] = cellToLatLng(h);
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
  }, [valueCells, areaCells, kind, cuts, color, iconKey, variableId, visible, bbox, res]);
}
