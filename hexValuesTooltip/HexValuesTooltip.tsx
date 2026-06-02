"use client";

import { useMemo, useState } from "react";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { useVariables } from "../Utils/VariablesContext";
import {
  DIMENSIONS,
  getVariableById,
  type Variable,
} from "../Utils/variablesCatalog";
import { colorForVariable } from "../Utils/dimensionColors";
import { getIconByVariableId } from "../Utils/variableIcons";
import {
  dimensionScore,
  generalScore,
  valueForSelection,
} from "./placeholderValues";

/**
 * Tooltip que se despliega sobre el mapa cuando hay hexes seleccionados.
 *
 * Muestra (con valores placeholder hasta US03-AC6):
 *  - Puntaje general del área
 *  - Puntaje por cada una de las 5 dimensiones
 *  - Valor placeholder para cada variable informativa activa
 *
 * Si hay > 1 hexágono seleccionado, los valores se interpretan como promedio.
 *
 * El alto del tooltip está acotado y aparece scrollbar cuando hay muchas
 * variables activas — no se limita el número de switches en la subpágina.
 *
 * Dos estados (mismo patrón que `SelectedVariablesChips`):
 *  - Pill compacta (por defecto): título + puntaje general + 1 variable destacada + chevron ▼
 *  - Panel expandido: puntajes completos + lista de variables
 */
export default function HexValuesTooltip() {
  const { selectedHexes } = useAprincipal();
  const { activeVariables } = useVariables();
  const [expanded, setExpanded] = useState(false);

  const variables = useMemo<Variable[]>(
    () =>
      Array.from(activeVariables)
        .map((id) => getVariableById(id))
        .filter((v): v is Variable => Boolean(v)),
    [activeVariables],
  );

  if (selectedHexes.size === 0) return null;

  const count = selectedHexes.size;
  const subtitle =
    count === 1 ? "1 hexágono seleccionado" : `${count} hexágonos (promedio)`;
  const featured = variables[0] ?? null;
  const general = generalScore(selectedHexes);

  return (
    <div className="absolute top-[20rem] right-[0.6rem] z-10">
      {expanded ? (
        <ExpandedTooltip
          variables={variables}
          subtitle={subtitle}
          general={general}
          onCollapse={() => setExpanded(false)}
          hexes={selectedHexes}
        />
      ) : (
        <PillTooltip
          general={general}
          featured={featured}
          subtitle={subtitle}
          onExpand={() => setExpanded(true)}
          hexes={selectedHexes}
        />
      )}
    </div>
  );
}

function PillTooltip({
  general,
  featured,
  subtitle,
  onExpand,
  hexes,
}: {
  general: string;
  featured: Variable | null;
  subtitle: string;
  onExpand: () => void;
  hexes: Set<string>;
}) {
  const FeaturedIcon = featured ? getIconByVariableId(featured.id) : null;
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label="Ver detalle de valores del área"
      aria-expanded={false}
      className="flex w-[15rem] flex-col items-stretch gap-1.5 rounded-2xl border border-[#eae9e9ff] bg-white px-4 py-3 shadow-lg shadow-[#cacacbff]"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#383838]">
          Valores del área
        </span>
        <ChevronDown />
      </span>
      <span className="text-[10px] text-gray-500 text-left -mt-1">
        {subtitle}
      </span>
      <span className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-600">
          General
        </span>
        <span className="font-mono text-sm font-bold text-[#165170ff]">
          {general}
        </span>
      </span>
      {featured && FeaturedIcon && (
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded shadow-sm"
            style={{ backgroundColor: colorForVariable(featured.id) }}
          >
            <FeaturedIcon className="h-3 w-3 text-white" strokeWidth={2.4} />
          </span>
          <span className="flex-1 min-w-0 truncate text-left text-[11px] text-gray-700">
            {featured.label}
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#165170ff]">
            {valueForSelection(featured.id, hexes)}
          </span>
        </span>
      )}
    </button>
  );
}

function ExpandedTooltip({
  variables,
  subtitle,
  general,
  onCollapse,
  hexes,
}: {
  variables: Variable[];
  subtitle: string;
  general: string;
  onCollapse: () => void;
  hexes: Set<string>;
}) {
  return (
    <div
      role="region"
      aria-label="Valores del área seleccionada"
      className="flex w-56 max-h-[22rem] flex-col overflow-y-scroll [scrollbar-gutter:stable] rounded-lg border border-[#eae9e9ff] bg-white shadow-lg shadow-[#cacacbff]"
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
        aria-label="Cerrar detalle de valores"
        className="sticky top-0 flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 cursor-pointer hover:bg-gray-50"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#383838]">Valores del área</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <ChevronUp />
      </header>

      <section className="border-b border-gray-200 px-3 py-2">
        <p className="text-[9px] uppercase tracking-wide text-gray-500 mb-1.5">
          Puntajes
        </p>
        <ScoreRow label="General" value={general} strong />
        {DIMENSIONS.map((d) => {
          const stripped = d.label.replace(/^Dimensi[oó]n\s+/i, "");
          const niceName =
            stripped.charAt(0).toUpperCase() + stripped.slice(1);
          return (
            <ScoreRow
              key={d.id}
              label={niceName}
              value={dimensionScore(d.id, hexes)}
            />
          );
        })}
      </section>

      {variables.length > 0 && (
        <section className="px-3 py-2">
          <p className="text-[9px] uppercase tracking-wide text-gray-500 mb-1.5">
            Variables ({variables.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {variables.map((v) => {
              const Icon = getIconByVariableId(v.id);
              return (
                <li key={v.id} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded shadow-sm"
                    style={{ backgroundColor: colorForVariable(v.id) }}
                  >
                    <Icon className="h-3 w-3 text-white" strokeWidth={2.4} />
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[11px] text-gray-700">
                    {v.label}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-[#165170ff]">
                    {valueForSelection(v.id, hexes)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="border-t border-gray-100 px-3 py-1.5 text-[9px] italic text-gray-400">
        Valores placeholder — datos reales pendientes (US03-AC6)
      </p>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4 text-gray-500"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronUp() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4 text-gray-500"
    >
      <path
        fillRule="evenodd"
        d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.94l-3.71 3.83a.75.75 0 11-1.08-1.04l4.25-4.39a.75.75 0 011.08 0l4.25 4.39a.75.75 0 01-.02 1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ScoreRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span
        className={`text-[11px] ${
          strong ? "font-bold text-[#383838]" : "text-gray-600"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-[11px] ${
          strong ? "font-bold text-[#165170ff]" : "font-semibold text-gray-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
