"use client";

import { useMemo } from "react";
import { cellToBoundary, cellToChildren, getResolution } from "h3-js";
import { viridis, dimensionHexScore } from "../../Utils/report/heatmapPalette";
import { useAreaHexData } from "../../Utils/report/useAreaHexData";
import { USE_PLACEHOLDER_FALLBACK } from "../../Utils/projectData";

/**
 * Mini-mapa nativo (SVG) del ÁREA SELECCIONADA para el informe: hexágonos del
 * área coloreados por el score GENERAL. En vectores (no rasteriza el canvas WebGL
 * de deck.gl) — mismo enfoque que el radar del informe.
 *
 * Color por hex: en modo BACKEND, el `score_general` REAL del hex (o gris si el
 * back no lo entrega); en modo TEMPLATE, el placeholder `dimensionHexScore`. Sin
 * mixtura: nunca pinta template como si fuera real.
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
  // Datos reales del área (modo backend). Sirve para el color real por hex.
  const areaData = useAreaHexData(selectedHexes, true);

  // Expandir a res-8 (como el heatmap del mapa) para el look "enfocado".
  // Se guarda el hex ORIGEN (el seleccionado) para leer su score real del backend
  // (que viene keyeado por el hex seleccionado, no por sus hijos res-8).
  const cells = useMemo(() => {
    const out: { cell: string; source: string }[] = [];
    for (const h of selectedHexes) {
      const res = getResolution(h);
      if (res >= 8) out.push({ cell: h, source: h });
      else for (const c of cellToChildren(h, 8)) out.push({ cell: c, source: h });
    }
    return out;
  }, [selectedHexes]);

  const geom = useMemo(() => {
    if (cells.length === 0) return null;
    let minLat = Infinity,
      minLng = Infinity,
      maxLat = -Infinity,
      maxLng = -Infinity;
    const polys = cells.map(({ cell, source }) => {
      const boundary = cellToBoundary(cell) as [number, number][];
      for (const [lat, lng] of boundary) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
      return { h: cell, source, boundary };
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
      {polys.map(({ h, source, boundary }) => {
        // Modo backend: score_general REAL del hex (gris si el back no lo trae).
        // Modo template: placeholder. Sin mixtura.
        const real = areaData?.get(source)?.score_general;
        const pts = boundary
          .map(([lat, lng]) => project(lat, lng))
          .join(" ");
        let fill: string;
        if (typeof real === "number") {
          const [r, g, b] = viridis(Math.max(0, Math.min(1, real)));
          fill = `rgb(${r},${g},${b})`;
        } else if (USE_PLACEHOLDER_FALLBACK) {
          const [r, g, b] = viridis(
            Math.max(0, Math.min(1, dimensionHexScore("general", h))),
          );
          fill = `rgb(${r},${g},${b})`;
        } else {
          fill = "#cbd5e1"; // backend sin dato → gris, no template
        }
        return (
          <polygon key={h} points={pts} fill={fill} fillOpacity={0.9} />
        );
      })}
    </svg>
  );
}
