"use client";

import { useEffect, useId, useRef, useState } from "react";
import { INFERNO_STOPS, VIRIDIS_STOPS, type Palette } from "./heatmap";

/**
 * US03-AC13 — Leyenda del heatmap.
 * Siempre visible junto al `PaletteToggle` cuando hay heatmap activo:
 * pill horizontal "Baja [rampa] Alta" con la paleta vigente.
 *
 * Incluye icono "?" al final: hover o click abre un popover explicando cómo
 * funciona el heatmap (agregado de variables activas, polaridad).
 */
export default function HeatmapLegend({ palette }: { palette: Palette }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const stops = palette === "inferno" ? INFERNO_STOPS : VIRIDIS_STOPS;
  const gradient = `linear-gradient(to right, ${stops
    .map(([t, [r, g, b]]) => `rgb(${r}, ${g}, ${b}) ${Math.round(t * 100)}%`)
    .join(", ")})`;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 shadow-md backdrop-blur-sm"
    >
      <span
        role="img"
        aria-label="Leyenda del heatmap: baja a alta viabilidad"
        className="flex items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          Baja
        </span>
        <span
          className="block h-2 w-24 rounded"
          style={{ backgroundImage: gradient }}
          aria-hidden="true"
        />
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          Alta
        </span>
      </span>
      <button
        type="button"
        aria-label="Cómo funciona el heatmap"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        ?
      </button>
      {open && (
        <div
          id={popoverId}
          role="tooltip"
          className="absolute top-full right-0 z-20 mt-2 w-64 rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/5"
        >
          <p className="text-sm font-semibold text-[#383838]">
            ¿Cómo funciona el heatmap?
          </p>
          <p className="mt-1 text-[11px] text-gray-600 leading-snug">
            Cada hex se colorea con el agregado de las variables activas. Las
            variables que <strong>suman</strong> a la viabilidad aumentan el
            score; las que <strong>restan</strong> (penalizadoras) lo bajan.
          </p>
          <p className="mt-2 text-[11px] text-gray-600 leading-snug">
            La paleta vigente (Inferno o Viridis) traduce el score a color:
            morado/oscuro = baja viabilidad, amarillo/cálido = alta viabilidad.
          </p>
        </div>
      )}
    </div>
  );
}
