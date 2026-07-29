"use client";

import { useState } from "react";
import VariableSwitch from "./VariableSwitch";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import {
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
  const { activeCountByDimension, totalByDimension } = useVariables();
  const active = activeCountByDimension(dimension.id);
  const total = totalByDimension(dimension.id);
  // Regulatoria pasó a ser informativa (US-FB3-05 / feedback item 11): sus
  // variables se pueden seleccionar como contexto pero no puntúan en el score.
  const informative = !isScorableDimension(dimension.id);

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
      {open && (
        <div
          id={`dim-${dimension.id}-body`}
          className="px-3 pb-2 divide-y divide-gray-100"
        >
          {variables.map((v) => (
            <VariableSwitch key={v.id} variable={v} />
          ))}
        </div>
      )}
    </div>
  );
}
