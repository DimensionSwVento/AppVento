import { useMemo } from "react";
import { PolygonLayer } from "@deck.gl/layers";
import {
  cellToBoundary,
  cellToChildren,
  cellToLatLng,
  getResolution,
} from "h3-js";
import { dimensionHexScore, viridis } from "../../Utils/report/heatmapPalette";

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
    return new PolygonLayer<{ h: string; baseScore: number }>({
      id: "informe-heatmap",
      data,
      getPolygon: (d) => cellToBoundary(d.h, true),
      getFillColor: (d) => {
        const noise = (dimensionHexScore(dim, d.h) - 0.5) * 0.3;
        const t = Math.max(0, Math.min(1, d.baseScore + noise));
        const [r, g, b] = viridis(t);
        return [r, g, b, 160];
      },
      filled: true,
      stroked: false,
      pickable: false,
      updateTriggers: { getFillColor: [dim] },
    });
  }, [heatmapActive, activeDimension, data]);
}
