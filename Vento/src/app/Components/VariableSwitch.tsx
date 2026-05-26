"use client";

import { useVariables } from "../Utils/VariablesContext";
import { colorForVariable } from "../Utils/dimensionColors";
import type { Variable } from "../Utils/variablesCatalog";

/**
 * Fila de variable dentro de una `DimensionCard`.
 * - Switch a la izquierda (deshabilitado y siempre on si la variable es obligatoria)
 * - Label + descripción al centro
 * - Dot de color (color asignado a la variable) a la derecha en lugar del ℹ
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
        <p className="text-sm font-semibold text-[#393939ff] leading-tight">
          {variable.label}
          {required && (
            <span className="ml-1 text-[10px] font-normal text-gray-400 uppercase tracking-wide">
              obligatoria
            </span>
          )}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
          {variable.description}
        </p>
      </div>
      <span
        aria-hidden="true"
        title={`Color asignado a ${variable.label}`}
        className="block h-3.5 w-3.5 shrink-0 mt-0.5 rounded-full ring-2 ring-white shadow-sm"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
