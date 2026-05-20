"use client";

import { useVariables } from "../Utils/VariablesContext";
import type { Variable } from "../Utils/variablesCatalog";
import VariableTooltip from "./VariableTooltip";

export default function VariableSwitch({ variable }: { variable: Variable }) {
  const { isActive, toggleVariable } = useVariables();
  const active = isActive(variable.id);

  return (
    <div className="flex items-start gap-3 py-2">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={variable.label}
        onClick={() => toggleVariable(variable.id)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          active ? "bg-[#22c55e]" : "bg-gray-300"
        }`}
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
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
          {variable.description}
        </p>
      </div>
      <VariableTooltip variable={variable} />
    </div>
  );
}
