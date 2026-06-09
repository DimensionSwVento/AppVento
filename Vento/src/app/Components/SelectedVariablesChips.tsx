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
import { getIconByVariableId } from "../Utils/variableIcons";
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
const PILL_VISIBLE_LIMIT = 4;

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

  // Cuando se abre el detalle de una variable, colapsa el panel a pill para
  // dejar más espacio al popover; el usuario puede re-expandir tocando la pill.
  useEffect(() => {
    if (infoVarId) setExpanded(false);
  }, [infoVarId]);

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
          variables={variables}
          onNavigate={(id) => setInfoVarId(id)}
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
      className="flex w-60 flex-col items-start gap-2 rounded-2xl border border-[#eae9e9ff] shadow-lg shadow-[#cacacbff] px-4 py-3 bg-white"
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
      <span className="flex flex-wrap items-center gap-2" aria-hidden="true">
        {variables.slice(0, PILL_VISIBLE_LIMIT).map((v) => {
          const Icon = getIconByVariableId(v.id);
          return (
            <span
              key={v.id}
              className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white shadow"
              style={{ backgroundColor: colorForVariable(v.id) }}
            >
              <Icon className="h-4 w-4 text-white" strokeWidth={2.2} />
            </span>
          );
        })}
        {variables.length > PILL_VISIBLE_LIMIT && (
          <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-gray-200 px-2 text-xs font-semibold text-gray-700 ring-2 ring-white shadow">
            +{variables.length - PILL_VISIBLE_LIMIT}
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
      className="w-60 max-h-[28rem] overflow-y-scroll [scrollbar-gutter:stable] rounded-lg bg-white border border-[#eae9e9ff] shadow-lg shadow-[#cacacbff]"
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
                aria-label={`Ver detalle de ${v.label}`}
                title="Ver detalle"
                className="group flex flex-1 items-center gap-3 text-left cursor-pointer"
              >
                {(() => {
                  const Icon = getIconByVariableId(v.id);
                  return (
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md shadow-sm"
                      style={{ backgroundColor: colorForVariable(v.id) }}
                    >
                      <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
                    </span>
                  );
                })()}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[#393939] leading-tight">
                    {v.label}
                    {required && (
                      <span className="ml-1 text-[9px] font-normal text-gray-400 uppercase tracking-wide">
                        obligatoria
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                    <span>{dimensionShortLabel(v.dimension)}</span>
                    <span aria-hidden="true" className="text-gray-300">
                      ·
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center gap-0.5 text-[10px] text-[#165170ff] opacity-70 group-hover:opacity-100"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3 w-3"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Ver detalle
                    </span>
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

type InfoTab =
  | "resumen"
  | "calculo"
  | "fuente"
  | "relevancia"
  | "rango";

const INFO_TABS: { id: InfoTab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "calculo", label: "Cómo se calcula" },
  { id: "fuente", label: "Fuente de datos" },
  { id: "relevancia", label: "Relevancia" },
  { id: "rango", label: "Rango e interpretación" },
];

function InfoPopover({
  variableId,
  variables,
  onNavigate,
  onClose,
}: {
  variableId: string;
  variables: Variable[];
  onNavigate: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const variable = getVariableById(variableId);
  const [activeTab, setActiveTab] = useState<InfoTab>("resumen");

  const currentIndex = variables.findIndex((v) => v.id === variableId);
  const total = variables.length;
  const canNavigate = total > 1 && currentIndex >= 0;
  const prevVar = canNavigate
    ? variables[(currentIndex - 1 + total) % total]
    : null;
  const nextVar = canNavigate
    ? variables[(currentIndex + 1) % total]
    : null;

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
      ? "Suma a prefactibilidad"
      : w < 0
        ? "Resta a prefactibilidad"
        : "No aporta al cálculo";
  const polarityClass =
    w > 0
      ? "text-green-700 bg-green-50"
      : w < 0
        ? "text-red-700 bg-red-50"
        : "text-gray-600 bg-gray-100";

  const Icon = getIconByVariableId(variable.id);
  const bg = colorForVariable(variable.id);

  return (
    <div
      id="selected-vars-info"
      ref={ref}
      role="tooltip"
      className="absolute bottom-4 left-4 z-20 w-[36rem] max-w-[calc(100%-2rem)] rounded-lg bg-white shadow-xl ring-1 ring-black/5"
    >
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-bold text-[#383838]">
          Detalle de la variable seleccionada
        </h3>
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
      <div className="flex">
        <nav
          aria-label="Secciones de detalle"
          className="w-44 shrink-0 border-r border-gray-200 py-2"
        >
          <ul className="flex flex-col">
            {INFO_TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    aria-current={active ? "page" : undefined}
                    className={`block w-full border-l-[3px] px-4 py-2 text-left text-[12px] transition-colors ${
                      active
                        ? "border-[#165170ff] bg-gray-50 font-semibold text-[#165170ff]"
                        : "border-transparent text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex-1 min-w-0 p-4">
          {activeTab === "resumen" ? (
            <div>
              <header className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md shadow-sm"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="h-6 w-6 text-white" strokeWidth={2.2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#383838] leading-tight">
                    {variable.label}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-0.5">
                    {dimensionShortLabel(variable.dimension)}
                  </p>
                </div>
              </header>
              <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-[11px] leading-snug">
                <dt className="font-semibold text-gray-500">ID</dt>
                <dd className="font-mono text-gray-700 break-all">
                  {variable.id}
                </dd>
                <dt className="font-semibold text-gray-500">En el área</dt>
                <dd className="text-gray-500">
                  —{" "}
                  <span className="text-[10px] italic text-gray-400">
                    (pendiente datos)
                  </span>
                </dd>
              </dl>
              <p className="mt-3 text-xs text-gray-600 leading-snug">
                {variable.description}
              </p>
              <span
                className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${polarityClass}`}
              >
                {polarityLabel}
              </span>
            </div>
          ) : (
            <div className="flex h-full min-h-[8rem] flex-col items-center justify-center text-center text-xs text-gray-400">
              <p className="font-semibold uppercase tracking-wide">
                {INFO_TABS.find((t) => t.id === activeTab)?.label}
              </p>
              <p className="mt-1 italic">Disponible en el sprint 3</p>
            </div>
          )}
        </div>
      </div>
      {canNavigate && prevVar && nextVar && (
        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={() => onNavigate(prevVar.id)}
            aria-label={`Anterior variable: ${prevVar.label}`}
            className="rounded border border-[#165170ff] px-3 py-1.5 text-xs font-semibold text-[#165170ff] hover:bg-[#165170ff]/5"
          >
            Anterior variable
          </button>
          <button
            type="button"
            onClick={() => onNavigate(nextVar.id)}
            aria-label={`Siguiente variable: ${nextVar.label}`}
            className="rounded bg-[#165170ff] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f3d57]"
          >
            Siguiente variable
          </button>
        </footer>
      )}
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
