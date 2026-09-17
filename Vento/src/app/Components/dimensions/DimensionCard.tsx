"use client";

import { useEffect, useState } from "react";
import VariableSwitch from "./VariableSwitch";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import { dimensionBaseColor } from "../../Utils/variables/dimensionColors";
import {
  CRITERIO_DESCRIPTIONS,
  SUBCRITERIO_DESCRIPTIONS,
  groupByCriterio,
  isScorableDimension,
  type Dimension,
  type Variable,
} from "../../Utils/variables/variablesCatalog";

interface DimensionCardProps {
  dimension: Dimension;
  variables: Variable[];
  defaultOpen?: boolean;
}

export default function DimensionCard({
  dimension,
  variables,
  defaultOpen = false,
}: DimensionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Sincroniza con `defaultOpen` SIN effect (patrón "ajustar estado en render"
  // de React): al escribir en el buscador (defaultOpen→true) la card se ABRE
  // para mostrar las variables que matchean; al limpiar, colapsa. Sin esto, la
  // card montada colapsada no se reabría al filtrar.
  const [prevDefaultOpen, setPrevDefaultOpen] = useState(defaultOpen);
  if (defaultOpen !== prevDefaultOpen) {
    setPrevDefaultOpen(defaultOpen);
    setOpen(defaultOpen);
  }
  // El contador se deriva de la lista DINÁMICA que realmente se renderiza
  // (prop `variables`, que viene de fetchMenuVariables), no del catálogo
  // estático — si no, el "activas/total" no coincide con lo mostrado.
  const { isActive } = useVariables();
  const total = variables.length;
  const active = variables.filter((v) => isActive(v.id)).length;
  // Regulatoria pasó a ser informativa (US-FB3-05 / feedback item 11): sus
  // variables se pueden seleccionar como contexto pero no puntúan en el score.
  const informative = !isScorableDimension(dimension.id);
  // US04-AC1/AC3: color de la dimensión (swatch + barra) y % de progreso.
  const dimColor = dimensionBaseColor(dimension.id);
  const pct = total > 0 ? (active / total) * 100 : 0;

  if (variables.length === 0) return null;

  return (
    <div className="rounded-md bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`dim-${dimension.id}-body`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#383838]">
          {/* Swatch de color de la dimensión (US04-AC1) */}
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/5"
            style={{ backgroundColor: dimColor }}
          />
          <span>
            {dimension.label} -{" "}
            <span className="text-gray-500 font-normal">
              {active}/{total}
            </span>
          </span>
          {informative && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
              informativa · no puntúa
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {/* Barra de progreso por categoría (US04-AC3): variables activas/total. */}
      <div
        className="mx-3 mb-1 h-1 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={active}
        aria-label={`${active} de ${total} variables activas en ${dimension.label}`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: dimColor }}
        />
      </div>
      {open && (
        <div id={`dim-${dimension.id}-body`} className="px-3 pb-2">
          {dimension.description && (
            <p className="pb-1 pt-1 text-[11px] leading-snug text-gray-500">
              {dimension.description}
            </p>
          )}
          {groupByCriterio(variables).map((g) => (
            <div key={g.criterio} className="mt-2">
              {/* Criterio (grupo) */}
              <h4
                className="text-[11px] font-bold uppercase tracking-wide text-gray-600"
                title={CRITERIO_DESCRIPTIONS[g.criterio]}
              >
                {g.criterio}
              </h4>
              {g.subgrupos.map((sg) => (
                <div key={sg.subcriterio ?? "_none"} className="mt-1">
                  {/* Subcriterio (subgrupo) — solo si existe */}
                  {sg.subcriterio && (
                    <h5
                      className="pl-2 text-[10px] font-semibold text-gray-500"
                      title={SUBCRITERIO_DESCRIPTIONS[sg.subcriterio]}
                    >
                      {sg.subcriterio}
                    </h5>
                  )}
                  <div className="divide-y divide-gray-100">
                    {sg.variables.map((v) => (
                      <VariableSwitch key={v.id} variable={v} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
