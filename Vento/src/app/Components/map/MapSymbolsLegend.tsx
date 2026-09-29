"use client";

import { useState } from "react";
import { MAP_SYMBOLS } from "../../Utils/map/mapSymbols";
import { colorForVariable } from "../../Utils/variables/dimensionColors";
import { modelVariableIds } from "../../Utils/variables/variablesCatalog";
import { iconKeyToDataUri } from "../../Utils/map/iconRender";
import {
  genericMapVariables,
  variableAppliesToNatureById,
} from "../../Utils/map/mapCatalogVariables";

/**
 * Leyenda-interruptor de los símbolos informativos del mapa (círculo + ícono).
 * Cada fila interpreta el símbolo y enciende/apaga su capa (`active` +
 * `onToggle`). Colapsable para no ocupar espacio. Ver `Utils/map/mapSymbols.ts`.
 */
export default function MapSymbolsLegend({
  active,
  onToggle,
  disabled,
  selected,
  nature,
  includeHeat,
}: {
  active: Set<string>;
  onToggle: (variableId: string) => void;
  /** Variables con "ver en mapa" desactivado en admin: se ocultan de la leyenda. */
  disabled?: Set<string>;
  /** Variables SELECCIONADAS en Dimensiones (activeVariables). Si se pasa, la
   *  leyenda solo lista las capas de esas variables (no todas las del mapa). */
  selected?: Set<string>;
  /** Naturaleza mar/tierra del área: filtra las variables que no aplican
   *  (p.ej. pastos marinos no aparece si la selección es tierra). */
  nature?: "mar" | "tierra" | "mixta" | "vacia";
  /** Incluir las variables `calor` en la lista (Dimensiones). En Informe el calor
   *  va por su desplegable, así que se deja en false. */
  includeHeat?: boolean;
}) {
  const [open, setOpen] = useState(true);
  // Filtro mar/tierra compartido con las capas del mapa (misma fuente única).
  const applies = (id: string) => variableAppliesToNatureById(id, nature);
  // Ítems del menú = capas CURADAS (`MAP_SYMBOLS`) + capas GENÉRICAS de catálogo
  // (cualquier variable enMapa con método area/interconectado que el usuario
  // active en Dimensiones, no solo las curadas). El VIENTO (`heat`) va en el
  // desplegable "Visualización en el mapa" del Informe, no aquí.
  const items: {
    variableId: string;
    label: string;
    icon: string;
    descripcion?: string;
  }[] = [];
  for (const s of MAP_SYMBOLS) {
    if (s.kind === "heat") continue;
    if (disabled?.has(s.variableId)) continue;
    if (selected && !selected.has(s.variableId)) continue;
    if (!applies(s.variableId)) continue; // filtro mar/tierra
    items.push({
      variableId: s.variableId,
      label: s.label,
      icon: s.icon, // ícono estático del símbolo curado (glifo)
      descripcion: s.descripcion,
    });
  }
  if (selected) {
    // FUENTE ÚNICA compartida con el mapa (`genericMapVariables`): mismo predicado
    // (enMapa + área/interconectado + no curada + no deshabilitada + filtro
    // mar/tierra), para que la modal y las capas del mapa no divergan.
    for (const { id, variable: v } of genericMapVariables(
      selected,
      disabled,
      nature,
      includeHeat,
    )) {
      items.push({
        variableId: id,
        label: v.label,
        // MISMO icono que pinta el mapa (icono de admin + borde grueso del color).
        // Si la variable no tiene `iconKey`, cae al pin/círculo con el borde de color.
        icon: iconKeyToDataUri(v.iconKey || "lucide:MapPin", colorForVariable(id)),
        descripcion: v.description,
      });
    }
  }
  if (items.length === 0) return null;
  const activeCount = items.filter((i) => active.has(i.variableId)).length;

  // Agrupa igual que la modal de "Variables seleccionadas": informativas arriba,
  // modelo plegado. Discriminador = `modelVariableIds()` (las ponderadas).
  const modelIds = new Set(modelVariableIds());
  const infoItems = items.filter((i) => !modelIds.has(i.variableId));
  const modelItems = items.filter((i) => modelIds.has(i.variableId));

  const renderRow = (s: (typeof items)[number]) => {
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
  };

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
        <div className="max-h-[46vh] overflow-y-auto pb-1.5">
          {/* Informativas arriba (lo que el usuario elige ver). */}
          <ul className="flex flex-col gap-0.5 px-1.5 pt-1">
            {infoItems.map(renderRow)}
          </ul>
          {/* Del modelo: plegadas (como la modal de variables seleccionadas). */}
          {modelItems.length > 0 && (
            <details className="group mt-1 border-t border-gray-100 px-1.5 pt-1">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1 text-[10px] font-semibold text-[#165170ff] hover:bg-gray-50">
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3 w-3 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                >
                  <path d="M7 5l6 5-6 5V5z" />
                </svg>
                Del modelo ({modelItems.length})
              </summary>
              <ul className="flex flex-col gap-0.5">{modelItems.map(renderRow)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
