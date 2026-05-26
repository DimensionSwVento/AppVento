"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useVariables } from "../Utils/VariablesContext";
import {
  DIMENSIONS,
  getVariableById,
  type DimensionId,
  type Variable,
} from "../Utils/variablesCatalog";
import { colorForVariable } from "../Utils/dimensionColors";
import { weightFor } from "../Utils/variableWeights";

/** Label corto de la dimensión para el subtítulo (sin el prefijo "Dimensión "). */
function dimensionShortLabel(id: DimensionId): string {
  const d = DIMENSIONS.find((x) => x.id === id);
  if (!d) return id;
  const stripped = d.label.replace(/^Dimensi[oó]n\s+/i, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * US04-AC4 — Indicador de variables seleccionadas + selector de info.
 *
 * Tres componentes visuales coordinados:
 *  1. **Pill compacta** en top-left del mapa: dots de color de las primeras
 *     variables + chevron-down. Click en cualquier parte → expande.
 *  2. **Panel expandido** en top-left: título "Seleccionar variable" + lista
 *     con dot + nombre + ✕ deselect (solo no-obligatorias). Chevron-up cierra.
 *  3. **Info popover** en top-right: se abre al hacer click sobre un item del
 *     panel. Muestra descripción + polaridad. Cierre propio.
 */
const PILL_VISIBLE_LIMIT = 3;

export default function SelectedVariablesChips() {
  const { activeVariables, toggleVariable, clearNonRequired } = useVariables();
  // Default: panel desplegado. El chevron-up del panel lo colapsa a pill;
  // click sobre la pill vuelve a abrir el panel. Se reemplazan entre sí.
  const [expanded, setExpanded] = useState(true);
  const [infoVarId, setInfoVarId] = useState<string | null>(null);

  const variables = useMemo<Variable[]>(
    () =>
      Array.from(activeVariables)
        .map((id) => getVariableById(id))
        .filter((v): v is Variable => Boolean(v)),
    [activeVariables],
  );

  if (variables.length === 0) return null;

  return (
    <>
      <div className="absolute top-3 right-3 z-10">
        {expanded ? (
          <PanelExpanded
            variables={variables}
            onCollapse={() => setExpanded(false)}
            onSelectInfo={(id) => setInfoVarId(id)}
            onDeselect={(id) => toggleVariable(id)}
            onClear={clearNonRequired}
            activeInfoId={infoVarId}
          />
        ) : (
          <PillCompact
            variables={variables}
            expanded={false}
            onToggle={() => setExpanded(true)}
          />
        )}
      </div>

      {infoVarId && (
        <InfoPopover
          variableId={infoVarId}
          onClose={() => setInfoVarId(null)}
        />
      )}
    </>
  );
}

function PillCompact({
  variables,
  expanded,
  onToggle,
}: {
  variables: Variable[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const visible = variables.slice(0, PILL_VISIBLE_LIMIT);
  const hiddenCount = variables.length - visible.length;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        expanded
          ? "Variables seleccionadas en el mapa — cerrar lista"
          : "Variables seleccionadas en el mapa — abrir lista"
      }
      aria-expanded={expanded}
      className="flex flex-col items-start gap-2 rounded-2xl border border-[#eae9e9ff] shadow-lg shadow-[#cacacbff] px-4 py-3  bg-white"
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#383838]">
        Variables seleccionadas en el mapa
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="h-3.5 w-3.5 text-gray-400"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <span className="flex items-center gap-2" aria-hidden="true">
        {visible.map((v) => (
          <span
            key={v.id}
            className="block h-8 w-8 rounded-full ring-2 ring-white shadow"
            style={{ backgroundColor: colorForVariable(v.id) }}
          />
        ))}
        {hiddenCount > 0 && (
          <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-gray-200 px-2 text-xs font-semibold text-gray-700 ring-2 ring-white shadow">
            +{hiddenCount}
          </span>
        )}
      </span>
    </button>
  );
}

function PanelExpanded({
  variables,
  onCollapse,
  onSelectInfo,
  onDeselect,
  onClear,
  activeInfoId,
}: {
  variables: Variable[];
  onCollapse: () => void;
  onSelectInfo: (id: string) => void;
  onDeselect: (id: string) => void;
  onClear: () => void;
  activeInfoId: string | null;
}) {
  const titleId = useId();
  const hasClearable = variables.some((v) => !v.required);

  // Panel "fijo": no se cierra por click fuera ni por ESC, sólo por chevron-up
  // o re-click sobre la pill (manejado por el padre). Sin listeners globales.

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      className="w-60 max-h-[70vh] overflow-y-auto rounded-lg bg-white border border-[#eae9e9ff] shadow-lg shadow-[#cacacbff]"
    >
      <header
        onClick={onCollapse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCollapse();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Cerrar lista"
        className="sticky top-0 flex items-center justify-between gap-2 px-4 py-3 bg-white border-b border-gray-300 rounded-t-lg cursor-pointer hover:bg-gray-50"
      >
        <h3 id={titleId} className="text-base font-bold text-[#383838]">
          Variables seleccionadas
        </h3>
        <div className="flex items-center gap-3">
          {hasClearable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs font-semibold text-[#165170ff] hover:underline"
            >
              Limpiar
            </button>
          )}
          <ChevronUp />
        </div>
      </header>
      <ul className="flex flex-col divide-y divide-gray-300">
        {variables.map((v) => {
          const required = Boolean(v.required);
          const isInfoActive = activeInfoId === v.id;
          return (
            <li
              key={v.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${
                isInfoActive ? "bg-gray-50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectInfo(v.id)}
                aria-label={`Información de ${v.label}`}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span
                  aria-hidden="true"
                  className="block h-10 w-10 shrink-0 rounded-md shadow-sm"
                  style={{ backgroundColor: colorForVariable(v.id) }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[#393939] leading-tight">
                    {v.label}
                    {required && (
                      <span className="ml-1 text-[9px] font-normal text-gray-400 uppercase tracking-wide">
                        obligatoria
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    {dimensionShortLabel(v.dimension)}
                  </span>
                </span>
              </button>
              {!required && (
                <button
                  type="button"
                  onClick={() => onDeselect(v.id)}
                  aria-label={`Deseleccionar ${v.label}`}
                  className="shrink-0 text-gray-400 hover:text-red-600"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InfoPopover({
  variableId,
  onClose,
}: {
  variableId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const variable = getVariableById(variableId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!variable) return null;
  const w = weightFor(variable.id);
  const polarityLabel =
    w > 0
      ? "Suma a viabilidad"
      : w < 0
        ? "Resta a viabilidad"
        : "No aporta al cálculo";
  const polarityClass =
    w > 0
      ? "text-green-700 bg-green-50"
      : w < 0
        ? "text-red-700 bg-red-50"
        : "text-gray-600 bg-gray-100";

  return (
    <div
      id="selected-vars-info"
      ref={ref}
      role="tooltip"
      className="absolute top-3 left-3 z-20 w-64 rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/5 max-md:top-12"
    >
      <header className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-bold text-[#383838] leading-tight">
          {variable.label}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar información"
          className="shrink-0 text-gray-400 hover:text-gray-700"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </header>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">
        {variable.dimension}
      </p>
      <p className="mt-1 text-xs text-gray-600 leading-snug">
        {variable.description}
      </p>
      <span
        className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${polarityClass}`}
      >
        {polarityLabel}
      </span>
    </div>
  );
}

function ChevronUp() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-6 w-6 text-gray-700"
    >
      <path
        fillRule="evenodd"
        d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.94l-3.71 3.83a.75.75 0 11-1.08-1.04l4.25-4.39a.75.75 0 011.08 0l4.25 4.39a.75.75 0 01-.02 1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
