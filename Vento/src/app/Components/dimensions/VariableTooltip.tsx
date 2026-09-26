"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Variable } from "../../Utils/variables/variablesCatalog";
import { weightFor } from "../../Utils/variables/variableWeights";
import { dbField } from "../../Utils/audit";

/**
 * US04-AC2 — Tooltip accesible con la definición de la variable.
 * Click en ℹ abre un popover con:
 *  - Descripción de la variable
 *  - Indicador "Suma a idoneidad" / "Resta a idoneidad" (derivado del signo
 *    del peso en `variableWeights.ts`)
 * Cierra con ESC, click fuera o segundo click sobre el icono.
 */
export default function VariableTooltip({ variable }: { variable: Variable }) {
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

  const weight = weightFor(variable.id);
  const polarityLabel =
    weight > 0
      ? "Suma a idoneidad"
      : weight < 0
        ? "Resta a idoneidad"
        : "No aporta al cálculo";
  const polarityClass =
    weight > 0
      ? "text-green-700 bg-green-50"
      : weight < 0
        ? "text-red-700 bg-red-50"
        : "text-gray-600 bg-gray-100";

  return (
    <div ref={containerRef} className="relative shrink-0 mt-0.5">
      <button
        type="button"
        aria-label={`Información sobre ${variable.label}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((v) => !v)}
        className="text-gray-400 hover:text-gray-600"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div
          id={popoverId}
          role="tooltip"
          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/5"
        >
          <p className="text-sm font-semibold text-[#383838] leading-tight">
            {variable.label}
          </p>
          <p className="mt-1 text-xs text-gray-600 leading-snug">
            {dbField(variable.description)}
          </p>
          {/* Fuente de datos (US04: "visualización del detalle — fuente de datos"). */}
          {variable.fuente && variable.fuente !== "(sin definir)" && (
            <p className="mt-1 text-[10px] leading-snug text-gray-500">
              <span className="font-semibold text-gray-600">Fuente:</span>{" "}
              {variable.url ? (
                <a
                  href={variable.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#165170ff] underline"
                >
                  {dbField(variable.fuente)}
                </a>
              ) : (
                dbField(variable.fuente)
              )}
            </p>
          )}
          <span
            className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${polarityClass}`}
          >
            {polarityLabel}
          </span>
        </div>
      )}
    </div>
  );
}
