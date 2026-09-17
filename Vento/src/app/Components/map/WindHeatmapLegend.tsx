"use client";

/**
 * Mini-leyenda del heatmap de VIENTO (velocidad/densidad). Versión compacta (~1/4
 * de la leyenda de idoneidad): solo explica cómo leer la escala Viridis
 * (izq = menos, der = más). Aparece únicamente cuando un heatmap de viento está
 * encendido (ver Map: `windHeatId`).
 */

// Viridis horizontal: de púrpura (bajo) a amarillo (alto).
const VIRIDIS_H =
  "linear-gradient(to right, " +
  "rgb(68,1,84), rgb(72,35,116), rgb(64,67,135), rgb(52,94,141), " +
  "rgb(41,120,142), rgb(32,144,140), rgb(34,167,132), rgb(68,190,112), " +
  "rgb(121,209,81), rgb(189,222,38), rgb(253,231,36))";

export default function WindHeatmapLegend({ label }: { label: string }) {
  return (
    <div className="pointer-events-none rounded-lg bg-white/95 px-2 py-1.5 shadow-sm ring-1 ring-black/5">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-1">
        <span className="text-[8px] text-gray-500">menos</span>
        <span
          aria-hidden="true"
          className="h-2 w-16 rounded-full"
          style={{ backgroundImage: VIRIDIS_H }}
        />
        <span className="text-[8px] text-gray-500">más</span>
      </div>
    </div>
  );
}
