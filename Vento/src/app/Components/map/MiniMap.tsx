"use client";

import { useMemo } from "react";
import { COLOMBIA_POLYGONS } from "../../Utils/h3/h3Resolution";

/**
 * Mini-mapa locator (tipo juego): silueta de Colombia a escala FIJA y un marcador
 * que indica DÓNDE se ubica el centro del mapa grande. Se sincroniza con el
 * DESLIZAMIENTO (el marcador sigue el centro), NO con el zoom (el marco de Colombia
 * no cambia de tamaño). Liviano (SVG), sin un segundo MapLibre.
 */
interface Props {
  /** Centro actual del mapa grande (del viewState). */
  center: { lng: number; lat: number };
}

// Extensión aproximada de Colombia (continental + un margen) para proyectar.
const W = -82.2;
const E = -66.5;
const S = -4.6;
const N = 13.6;
const VW = 100;
const VH = (VW * (N - S)) / (E - W); // mantiene proporción lng/lat

const projX = (lng: number) => ((lng - W) / (E - W)) * VW;
const projY = (lat: number) => ((N - lat) / (N - S)) * VH; // y invertida (norte arriba)

export default function MiniMap({ center }: Props) {
  // Silueta: cada polígono de Colombia como un path cerrado (proyectado a la caja).
  const paths = useMemo(
    () =>
      COLOMBIA_POLYGONS.map((poly) => {
        const d = poly
          .map(([lng, lat], i) => `${i === 0 ? "M" : "L"}${projX(lng).toFixed(1)},${projY(lat).toFixed(1)}`)
          .join(" ");
        return `${d} Z`;
      }),
    [],
  );

  const cx = Math.max(0, Math.min(VW, projX(center.lng)));
  const cy = Math.max(0, Math.min(VH, projY(center.lat)));

  return (
    <div className="pointer-events-none rounded-xl border-2 border-[#165170] bg-white/90 p-1 shadow-md backdrop-blur">
      <svg
        viewBox={`0 0 ${VW} ${VH.toFixed(1)}`}
        className="h-36 w-28"
        role="img"
        aria-label="Mini-mapa: ubicación en Colombia"
      >
        {paths.map((d, i) => (
          <path key={i} d={d} fill="#cce1ee" stroke="#165170" strokeWidth={0.6} />
        ))}
        {/* Marcador de ubicación (sigue el paneo). */}
        <circle cx={cx} cy={cy} r={3.2} fill="#165170" stroke="#fff" strokeWidth={1.2} />
      </svg>
    </div>
  );
}
