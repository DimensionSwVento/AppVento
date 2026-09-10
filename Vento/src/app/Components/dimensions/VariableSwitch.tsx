"use client";

import { useVariables } from "../../Utils/contexts/VariablesContext";
import { colorForVariable } from "../../Utils/variables/dimensionColors";
import { VariableIcon } from "../../Utils/variables/variableIcons";
import VariableTooltip from "./VariableTooltip";
import type { Variable } from "../../Utils/variables/variablesCatalog";

/**
 * Fila de variable dentro de una `DimensionCard`.
 * - Switch a la izquierda (deshabilitado y siempre on si la variable es obligatoria)
 * - Label + descripción al centro
 * - Badge de color con el ícono encima (color de dimensión + ícono Figura 3)
 *   a la derecha en lugar del antiguo dot
 */
export default function VariableSwitch({ variable }: { variable: Variable }) {
  const { isActive, toggleVariable } = useVariables();
  const active = isActive(variable.id);
  const required = Boolean(variable.required);
  const color = colorForVariable(variable.id);

  return (
    <div className="flex items-start gap-3 py-2">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={variable.label}
        aria-disabled={required}
        disabled={required}
        title={required ? "Variable obligatoria" : undefined}
        onClick={() => toggleVariable(variable.id)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          active ? "bg-[#22c55e]" : "bg-gray-300"
        } ${required ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold text-[#393939ff] leading-tight">
            {variable.label}
            {required && (
              <span className="ml-1 text-[10px] font-normal text-gray-400 uppercase tracking-wide">
                obligatoria
              </span>
            )}
          </p>
          {/* US04-AC2 — ℹ con definición + polaridad (suma/resta idoneidad). */}
          <VariableTooltip variable={variable} />
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
          {variable.description}
        </p>
      </div>
      <span
        aria-hidden="true"
        title={`Color e ícono de ${variable.label}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-sm ring-1 ring-white/60"
        style={{ backgroundColor: color }}
      >
        <VariableIcon variableId={variable.id} className="h-4 w-4 text-white" strokeWidth={2.2} />
      </span>
    </div>
  );
}
