import { useMemo } from "react";
import { PolygonLayer } from "@deck.gl/layers";
import {
  cellToBoundary,
  cellToChildren,
  cellToLatLng,
  getResolution,
} from "h3-js";
import { dimensionHexScore, viridis } from "../../Utils/report/heatmapPalette";
import { useAreaHexData } from "../../Utils/report/useAreaHexData";
import { USE_PLACEHOLDER_FALLBACK } from "../../Utils/projectData";

/** id de dimensión del frontend → categoría del backend. */
const DIM_TO_CAT: Record<string, string> = {
  tecnica: "TEC",
  ambiental: "AMB",
  socioeconomica: "SOE",
  economica: "MAC",
  regulatoria: "REG",
};

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

    // 2) Expansión a res-8 + distancia de cada hijo al centroide.
    const cells: { h: string; dist: number }[] = [];
    let maxDist = 0;
    for (const h of selectedHexes) {
      const res = getResolution(h);
      const children = res >= 8 ? [h] : cellToChildren(h, 8);
      for (const c of children) {
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
    if (!heatmapActive || data.length === 0) return null;
    const dim = activeDimension as string;
    const cat = DIM_TO_CAT[dim];
    return new PolygonLayer<{ h: string; baseScore: number }>({
      id: "informe-heatmap",
      data,
      getPolygon: (d) => cellToBoundary(d.h, true),
      getFillColor: (d) => {
        const info = areaData?.get(d.h);
        let t: number;
        if (info && cat && typeof info.scores[cat] === "number") {
          t = info.scores[cat]; // score real del backend (0..1)
        } else if (USE_PLACEHOLDER_FALLBACK) {
          // Placeholder: gradiente radial + ruido determinista por hex.
          const noise = (dimensionHexScore(dim, d.h) - 0.5) * 0.3;
          t = d.baseScore + noise;
        } else {
          t = d.baseScore; // solo gradiente radial neutro (sin datos fake)
        }
        const [r, g, b] = viridis(Math.max(0, Math.min(1, t)));
        // Alpha bajo (sprint 3): los hexes no deben tapar el relieve/mapa de
        // abajo — se busca ver el basemap a través del heatmap.
        return [r, g, b, 110];
      },
      filled: true,
      stroked: false,
      // US-FB3-03 (feedback item 8): ÚNICA capa pickable durante el informe.
      // gridTileLayer/selectedLayer van con visible:!heatmapActive y deck.gl no
      // hace picking sobre capas invisibles → sin esto onHover nunca recibía
      // objeto y el tooltip por hexágono no aparecía en la fase de informe.
      pickable: true,
      updateTriggers: { getFillColor: [dim, areaData] },
    });
  }, [heatmapActive, activeDimension, data, areaData]);
}
