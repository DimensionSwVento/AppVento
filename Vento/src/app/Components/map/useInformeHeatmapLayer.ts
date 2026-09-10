import { useMemo } from "react";
import { PolygonLayer } from "@deck.gl/layers";
import {
  cellToBoundary,
  cellToChildren,
  cellToLatLng,
  cellToParent,
  getResolution,
} from "h3-js";
import { dimensionHexScore, viridis } from "../../Utils/report/heatmapPalette";
import { useAreaHexData, backendScore } from "../../Utils/report/useAreaHexData";
import { USE_PLACEHOLDER_FALLBACK } from "../../Utils/projectData";

/**
 * Heatmap del informe (US06-HEAT-AC1): malla de hijos res-8 dentro del área
 * seleccionada, coloreada con un gradiente RADIAL desde el centroide del área
 * (más caliente en el centro, más frío en los bordes). Cada dimensión añade
 * una variación de ±15% del rango por hex para que el patrón no sea idéntico
 * entre dimensiones. Alpha 160 → deja ver las etiquetas del basemap debajo.
 */
export function useInformeHeatmapLayer(
  heatmapActive: boolean,
  selectedHexes: Set<string>,
  activeDimension: string | null,
) {
  // Datos reales por hex (compartidos con el informe). Fallback: placeholder.
  const areaData = useAreaHexData(selectedHexes, heatmapActive);

  const data = useMemo<{ h: string; baseScore: number }[]>(() => {
    if (!heatmapActive || selectedHexes.size === 0) return [];

    // 1) Centroide aproximado de la selección (promedio de lat/lng).
    let sumLat = 0;
    let sumLng = 0;
    for (const h of selectedHexes) {
      const [lat, lng] = cellToLatLng(h);
      sumLat += lat;
      sumLng += lng;
    }
    const cLat = sumLat / selectedHexes.size;
    const cLng = sumLng / selectedHexes.size;

    // 2) Normalización a EXACTAMENTE res 8 + distancia de cada celda al centroide.
    // El heatmap y el popup responden siempre a res 8 (ni más fino ni más grueso),
    // independientemente de la resolución guardada/seleccionada:
    //   - res > 8  → celda padre res 8 (varias caen en la misma → dedup).
    //   - res == 8 → tal cual.
    //   - res < 8  → hijos res 8 (aquí caen las celdas compactadas res 6/7).
    // Así la compactación al guardar (celdas más gruesas) NO cambia el render.
    const cells: { h: string; dist: number }[] = [];
    const seen = new Set<string>();
    let maxDist = 0;
    for (const h of selectedHexes) {
      const res = getResolution(h);
      const cells8 =
        res > 8 ? [cellToParent(h, 8)] : res === 8 ? [h] : cellToChildren(h, 8);
      for (const c of cells8) {
        if (seen.has(c)) continue;
        seen.add(c);
        const [lat, lng] = cellToLatLng(c);
        const d = Math.hypot(lat - cLat, lng - cLng);
        if (d > maxDist) maxDist = d;
        cells.push({ h: c, dist: d });
      }
    }

    // 3) Normaliza a [0, 1] e INVIERTE (centro = 1, borde = 0).
    const denom = maxDist > 0 ? maxDist : 1;
    return cells.map((c) => ({ h: c.h, baseScore: 1 - c.dist / denom }));
  }, [heatmapActive, selectedHexes]);

  return useMemo(() => {
    // NUNCA devolvemos null: la capa siempre existe y solo togglea `visible`.
    // Así deck no la finaliza al salir del informe ni intenta re-inicializar
    // una instancia ya finalizada al volver ("finalized layer cannot be
    // reused" → mapa despintado). Mismo patrón que `selectedLayer`.
    const active = heatmapActive && data.length > 0;
    const dim = (activeDimension ?? "general") as string;
    // Color viridis del hex (o null = transparente). Relleno translúcido (20%),
    // SIN borde (el informe usa solo relleno; el borde se veía como una malla
    // azul sobre el heatmap).
    const colorFor = (d: { h: string; baseScore: number }): [number, number, number] | null => {
      const real = backendScore(areaData?.get(d.h), dim);
      let t: number;
      if (typeof real === "number") {
        t = real; // score real del backend (0..1): general→score_general, dim→scores[cat]
      } else if (USE_PLACEHOLDER_FALLBACK) {
        // Modo template: gradiente radial + ruido determinista por hex.
        const noise = (dimensionHexScore(dim, d.h) - 0.5) * 0.3;
        t = d.baseScore + noise;
      } else {
        // Modo API sin dato real (p.ej. AMB/MAC aún sin master): transparente.
        return null;
      }
      return viridis(Math.max(0, Math.min(1, t)));
    };
    return new PolygonLayer<{ h: string; baseScore: number }>({
      id: "informe-heatmap",
      data,
      visible: active,
      getPolygon: (d) => cellToBoundary(d.h, true),
      getFillColor: (d) => {
        const c = colorFor(d);
        return c ? [c[0], c[1], c[2], 51] : [0, 0, 0, 0];
      },
      filled: true,
      stroked: false,
      // US-FB3-03 (feedback item 8): ÚNICA capa pickable durante el informe.
      // gridTileLayer/selectedLayer van con visible:!heatmapActive y deck.gl no
      // hace picking sobre capas invisibles → sin esto onHover nunca recibía
      // objeto y el tooltip por hexágono no aparecía en la fase de informe.
      pickable: active,
      updateTriggers: { getFillColor: [dim, areaData] },
    });
  }, [heatmapActive, activeDimension, data, areaData]);
}
