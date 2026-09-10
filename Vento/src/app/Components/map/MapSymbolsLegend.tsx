"use client";

import { useState } from "react";
import { MAP_SYMBOLS } from "../../Utils/map/mapSymbols";

/**
 * Leyenda-interruptor de los símbolos informativos del mapa (círculo + ícono).
 * Cada fila interpreta el símbolo y enciende/apaga su capa (`active` +
 * `onToggle`). Colapsable para no ocupar espacio. Ver `Utils/map/mapSymbols.ts`.
 */
export default function MapSymbolsLegend({
  active,
  onToggle,
  disabled,
}: {
  active: Set<string>;
  onToggle: (variableId: string) => void;
  /** Variables con "ver en mapa" desactivado en admin: se ocultan de la leyenda. */
  disabled?: Set<string>;
}) {
  const [open, setOpen] = useState(true);
  // Solo símbolos habilitados para mapa (respeta el toggle de admin, US08-01).
  const symbols = MAP_SYMBOLS.filter((s) => !disabled?.has(s.variableId));
  if (symbols.length === 0) return null;
  const activeCount = symbols.filter((s) => active.has(s.variableId)).length;

  return (
    <div className="rounded-md border border-[#eae9e9ff] bg-white/95 shadow-lg shadow-[#cacacbff]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
          Capas del mapa{activeCount > 0 ? ` · ${activeCount}` : ""}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul className="flex max-h-[46vh] flex-col gap-0.5 overflow-y-auto px-1.5 pb-1.5">
          {symbols.map((s) => {
            const on = active.has(s.variableId);
            return (
              <li key={s.variableId}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(s.variableId)}
                  title={s.descripcion}
                  className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors ${
                    on ? "bg-[#cce1eeff]/50" : "hover:bg-gray-50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.icon}
                    alt=""
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 ${on ? "" : "opacity-40 grayscale"}`}
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-[10px] leading-tight ${
                      on ? "font-semibold text-[#165170ff]" : "text-gray-600"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                      on ? "border-[#165170ff] bg-[#165170ff]" : "border-gray-300 bg-white"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
