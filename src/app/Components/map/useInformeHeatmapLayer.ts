import { useEffect, useMemo, useState } from "react";
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
import {
  fetchWindCells,
  windValueForHex,
  WIND_THRESHOLD,
} from "../../Utils/map/mapLayerData";
import {
  isVariableHeatmap,
  type HeatmapDimensionId,
} from "../../Utils/contexts/HeatmapDimensionContext";

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
  res: number = 8, // resolución del zoom (misma que grid/capas) → se resume por zoom
) {
  // La malla del heatmap se pinta a esta res (tope 8 = res del dato); antes fija en 8.
  const heatRes = Math.max(1, Math.min(8, Math.round(res)));
  // Datos reales por hex (compartidos con el informe). Fallback: placeholder.
  const areaData = useAreaHexData(selectedHexes, heatmapActive);

  // Si el desplegable eligió una capa POR VARIABLE (viento u otra variable con
  // `enMapa`), este heatmap deja de pintar el score de la dimensión y pinta el
  // valor normalizado de esa variable. Los valores reales por hex (res8, 0–1) se
  // traen aparte vía `/tiles/variable`; en template caen al placeholder de
  // `windValueForHex`. `windId` conserva el nombre por historia (hoy = cualquier
  // variable), pero el fetch/pintado son genéricos (`masterIdFor` traduce el id).
  const windId = isVariableHeatmap(activeDimension as HeatmapDimensionId | null)
    ? (activeDimension as string)
    : null;
  const [windCells, setWindCells] = useState<Map<string, number> | null>(null);
  // Reset al cambiar/apagar el viento → ajuste en RENDER (no en effect) para no
  // hacer setState síncrono dentro del effect (mismo patrón que en Map.tsx).
  const [prevWindId, setPrevWindId] = useState(windId);
  if (windId !== prevWindId) {
    setPrevWindId(windId);
    setWindCells(null);
  }
  useEffect(() => {
    if (!windId) return;
    let alive = true;
    // Acota la consulta al BBOX del área seleccionada (no el país entero) + res8:
    // el backend agrega/acota → sin OOM. Margen pequeño para cubrir los hijos res8
    // de los hexágonos del borde.
    let bbox:
      | { west: number; south: number; east: number; north: number }
      | undefined;
    if (selectedHexes.size > 0) {
      let w = Infinity,
        s = Infinity,
        e = -Infinity,
        n = -Infinity;
      for (const h of selectedHexes) {
        const [lat, lng] = cellToLatLng(h);
        if (lng < w) w = lng;
        if (lng > e) e = lng;
        if (lat < s) s = lat;
        if (lat > n) n = lat;
      }
      const m = 0.05;
      bbox = { west: w - m, south: s - m, east: e + m, north: n + m };
    }
    fetchWindCells(windId, bbox, heatRes)
      .then((m) => alive && setWindCells(m))
      .catch(() => alive && setWindCells(null));
    return () => {
      alive = false;
    };
  }, [windId, selectedHexes, heatRes]);

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
    // La malla se normaliza a `heatRes` (la res del ZOOM, tope 8) para que el
    // heatmap se RESUMA por zoom igual que el grid/capas (antes fijo en res 8 → se
    // veía desfasado). Según la res guardada de cada celda:
    //   - hres > heatRes  → celda padre a heatRes (varias caen en una → dedup).
    //   - hres == heatRes → tal cual.
    //   - hres < heatRes  → hijos a heatRes.
    const cells: { h: string; dist: number }[] = [];
    const seen = new Set<string>();
    let maxDist = 0;
    for (const h of selectedHexes) {
      const hres = getResolution(h);
      const cellsR =
        hres > heatRes
          ? [cellToParent(h, heatRes)]
          : hres === heatRes
            ? [h]
            : cellToChildren(h, heatRes);
      for (const c of cellsR) {
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
  }, [heatmapActive, selectedHexes, heatRes]);

  return useMemo(() => {
    // NUNCA devolvemos null: la capa siempre existe y solo togglea `visible`.
    // Así deck no la finaliza al salir del informe ni intenta re-inicializar
    // una instancia ya finalizada al volver ("finalized layer cannot be
    // reused" → mapa despintado). Mismo patrón que `selectedLayer`.
    const active = heatmapActive && data.length > 0;
    const dim = (activeDimension ?? "general") as string;
    // #1: score por celda de la MALLA (a la res del zoom). `areaData` viene a res8;
    // si la malla es más gruesa (zoom alejado), hay que PROMEDIAR las celdas res8
    // que caen bajo cada celda — antes se hacía `areaData.get(celdaPadre)` y fallaba
    // → el heatmap se DESPINTABA al alejar. Se calcula una vez por render iterando
    // `areaData` (acotado a la selección) y agrupando por el padre a la res de malla.
    const meshRes = data.length ? getResolution(data[0].h) : 8;
    const scoreByCell = new Map<string, { s: number; n: number }>();
    if (areaData && !windId) {
      for (const [h, info] of areaData) {
        const sc = backendScore(info, dim);
        if (typeof sc !== "number") continue;
        const key = getResolution(h) > meshRes ? cellToParent(h, meshRes) : h;
        const acc = scoreByCell.get(key);
        if (acc) {
          acc.s += sc;
          acc.n += 1;
        } else {
          scoreByCell.set(key, { s: sc, n: 1 });
        }
      }
    }
    // Color viridis del hex (o null = transparente). Relleno translúcido (20%),
    // SIN borde (el informe usa solo relleno; el borde se veía como una malla
    // azul sobre el heatmap).
    const colorFor = (d: { h: string; baseScore: number }): [number, number, number] | null => {
      // VIENTO: valor real por hex del backend (0–1) o placeholder de corredores
      // en template; `null` = no se pinta (backend sin dato para ese hex).
      if (windId) {
        const v = windValueForHex(windId, d.h, windCells);
        if (v == null || v < WIND_THRESHOLD) return null;
        return viridis(Math.max(0, Math.min(1, v)));
      }
      const acc = scoreByCell.get(d.h);
      const real = acc ? acc.s / acc.n : undefined;
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
      updateTriggers: { getFillColor: [dim, areaData, windId, windCells] },
    });
  }, [heatmapActive, activeDimension, data, areaData, windId, windCells]);
}
