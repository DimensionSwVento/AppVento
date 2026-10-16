"use client";

import { useMemo, useState } from "react";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import { dimensionHexScore } from "../../Utils/report/heatmapPalette";
import {
  useAreaHexData,
  areaVariableAverage,
} from "../../Utils/report/useAreaHexData";
import { USE_PLACEHOLDER_FALLBACK } from "../../Utils/projectData";
import {
  INFO_VARS,
  formatVariableValue,
} from "../../Utils/variables/informativeVariables";
import { getVariableById } from "../../Utils/variables/variablesCatalog";

/**
 * Lista de "variables informativas" mostradas en el flotante del Informe.
 *
 * El estado vive en el contexto global `VariablesContext` para que cualquier
 * variable añadida desde el botón "+" se refleje automáticamente en el
 * Report sidebar (sección "Variables informativas seleccionadas") y en el
 * PDF descargable. El usuario también puede haber seleccionado variables
 * en la subpágina Dimensiones — todas conviven en el mismo set.
 */
export default function InformativeVariablesList() {
  const { selectedHexes } = useAprincipal();
  const { activeVariables, toggleVariable } = useVariables();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Valor real del backend (modo API) o placeholder (solo modo template). En modo
  // API sin dato → "—" (no se muestra template como si fuera real).
  const areaData = useAreaHexData(selectedHexes, true);
  const visibleVars = useMemo(
    () =>
      INFO_VARS.filter((v) => activeVariables.has(v.id)).map((v) => {
        const masterId = getVariableById(v.id)?.masterId ?? "NA";
        const apiVal = areaVariableAverage(areaData, selectedHexes, masterId);
        let valueText: string;
        if (apiVal != null) {
          // Valor REAL crudo del backend, tal cual (no una cifra sintética).
          valueText = Number.isInteger(apiVal)
            ? apiVal.toString()
            : apiVal.toFixed(2);
        } else if (USE_PLACEHOLDER_FALLBACK && selectedHexes.size > 0) {
          let sum = 0;
          for (const h of selectedHexes) sum += dimensionHexScore(v.id, h);
          valueText = formatVariableValue(sum / selectedHexes.size, v.unit);
        } else {
          valueText = "—";
        }
        return { ...v, valueText };
      }),
    [activeVariables, selectedHexes, areaData],
  );

  const availableVars = useMemo(
    () => INFO_VARS.filter((v) => !activeVariables.has(v.id)),
    [activeVariables],
  );

  // `toggleVariable` del contexto añade si no está, quita si está. Las
  // variables `required` se ignoran al apagar (las protege el contexto).
  const addVar = (id: string) => {
    toggleVariable(id);
    setPickerOpen(false);
  };
  const removeVar = (id: string) => {
    toggleVariable(id);
  };

  if (selectedHexes.size === 0) return null;

  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Variables informativas
      </h3>

      <ul className="mt-2 flex flex-col divide-y divide-gray-200">
        {visibleVars.map((v) => {
          const Icon = v.Icon;
          return (
            <li
              key={v.id}
              className="group flex items-center gap-2 py-1.5 first:pt-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded shadow-sm"
                style={{ backgroundColor: v.color }}
              >
                <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[10px] leading-tight text-gray-700"
                  title={v.label}
                >
                  {v.label}
                </p>
                <p className="mt-0.5 font-mono text-[11px] font-semibold leading-tight text-[#165170ff]">
                  {v.valueText}
                  <span className="ml-0.5 text-[9px] font-normal text-gray-500">
                    {v.unit}
                  </span>
                </p>
              </div>
              {!getVariableById(v.id)?.required && (
                <button
                  type="button"
                  onClick={() => removeVar(v.id)}
                  aria-label={`Quitar ${v.label}`}
                  className="shrink-0 rounded text-gray-300 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 md:opacity-0"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                    <path
                      fillRule="evenodd"
                      d="M4.29 4.29a1 1 0 011.42 0L10 8.59l4.29-4.3a1 1 0 011.42 1.42L11.41 10l4.3 4.29a1 1 0 01-1.42 1.42L10 11.41l-4.29 4.3a1 1 0 01-1.42-1.42L8.59 10 4.29 5.71a1 1 0 010-1.42z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {availableVars.length > 0 && (
        <div className="mt-2 border-t border-gray-200 pt-2">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[#165170ff]/40 px-2 py-1 text-[10px] font-semibold text-[#165170ff] hover:bg-[#cce1eeff]/40"
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {pickerOpen ? "−" : "+"}
            </span>
            <span>
              {pickerOpen
                ? "Cerrar"
                : `Añadir variable (${availableVars.length})`}
            </span>
          </button>

          {pickerOpen && (
            <ul className="mt-2 flex flex-col gap-0.5 pr-0.5">
              {availableVars.map((v) => {
                const Icon = v.Icon;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => addVar(v.id)}
                      className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-gray-50"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded shadow-sm"
                        style={{ backgroundColor: v.color }}
                      >
                        <Icon
                          className="h-3 w-3 text-white"
                          strokeWidth={2.4}
                        />
                      </span>
                      <span
                        className="flex-1 min-w-0 truncate text-[10px] text-gray-700"
                        title={v.label}
                      >
                        {v.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
