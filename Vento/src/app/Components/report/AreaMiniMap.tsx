"use client";

import { useMemo } from "react";
import { cellToBoundary, cellToChildren, getResolution } from "h3-js";
import { viridis, dimensionHexScore } from "../../Utils/report/heatmapPalette";

/**
 * Mini-mapa nativo (SVG) del ÁREA SELECCIONADA para el informe (sprint 3):
 * captura "enfocada" de los hexágonos del área coloreados por el score
 * GENERAL. Se dibuja en vectores (no rasteriza el canvas WebGL de deck.gl,
 * que sale en blanco/borroso) — mismo enfoque que el radar del informe.
 *
 * El color por hex usa el placeholder `dimensionHexScore("general", hex)`
 * mientras no haya datos reales; cuando la API entregue el general por hex,
 * se cambia esa fuente aquí (mismo seam que el heatmap del mapa).
 */
export default function AreaMiniMap({
  selectedHexes,
  className,
  width = 320,
  height = 220,
}: {
  selectedHexes: Set<string>;
  className?: string;
  width?: number;
  height?: number;
}) {
  // Expandir a res-8 (como el heatmap del mapa) para el look "enfocado".
  const cells = useMemo(() => {
    const out: string[] = [];
    for (const h of selectedHexes) {
      const res = getResolution(h);
      if (res >= 8) out.push(h);
      else out.push(...cellToChildren(h, 8));
    }
    return out;
  }, [selectedHexes]);

  const geom = useMemo(() => {
    if (cells.length === 0) return null;
    let minLat = Infinity,
      minLng = Infinity,
      maxLat = -Infinity,
      maxLng = -Infinity;
    const polys = cells.map((h) => {
      // cellToBoundary(h) → [[lat, lng], ...]
      const boundary = cellToBoundary(h) as [number, number][];
      for (const [lat, lng] of boundary) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
      return { h, boundary };
    });
    return { polys, minLat, minLng, maxLat, maxLng };
  }, [cells]);

  if (!geom) return null;

  const PAD = 8;
  const { polys, minLat, minLng, maxLat, maxLng } = geom;
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = maxLng - minLng || 1e-6;
  // Escala uniforme para no deformar (a esta escala la distorsión por latitud
  // es despreciable frente a la claridad de mantener proporción 1:1).
  const scale = Math.min(
    (width - 2 * PAD) / spanLng,
    (height - 2 * PAD) / spanLat,
  );
  const offX = (width - spanLng * scale) / 2;
  const offY = (height - spanLat * scale) / 2;
  const project = (lat: number, lng: number): string =>
    `${(offX + (lng - minLng) * scale).toFixed(1)},${(
      offY +
      (maxLat - lat) * scale
    ).toFixed(1)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Mapa del área seleccionada coloreado por idoneidad general"
    >
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="8"
        fill="#eef2f5"
      />
      {polys.map(({ h, boundary }) => {
        const t = Math.max(0, Math.min(1, dimensionHexScore("general", h)));
        const [r, g, b] = viridis(t);
        const pts = boundary
          .map(([lat, lng]) => project(lat, lng))
          .join(" ");
        return (
          <polygon
            key={h}
            points={pts}
            fill={`rgb(${r},${g},${b})`}
            fillOpacity={0.9}
          />
        );
      })}
    </svg>
  );
}
