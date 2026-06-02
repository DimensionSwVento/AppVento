"use client";

import type { Palette } from "./heatmap";

interface PaletteToggleProps {
  palette: Palette;
  onChange: (p: Palette) => void;
}

/**
 * US03-AC11 — Toggle entre paletas GIS para el heatmap.
 * Posicionado arriba del mapa, controla el color del heatmap clippeado (US03-AC10).
 */
export default function PaletteToggle({ palette, onChange }: PaletteToggleProps) {
  return (
    <div className="flex gap-1 rounded-full bg-white/95 p-1 shadow-md backdrop-blur-sm">
      <Option
        label="Inferno"
        active={palette === "inferno"}
        onClick={() => onChange("inferno")}
      />
      <Option
        label="Viridis"
        active={palette === "viridis"}
        onClick={() => onChange("viridis")}
      />
    </div>
  );
}

function Option({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-[#165170ff] text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
