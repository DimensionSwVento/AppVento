"use client";

import { useMemo, useState } from "react";
import DimensionCard from "./DimensionCard";
import InformativeCatalog from "./InformativeCatalog";
import NextStepButton from "../ui/NextStepButton";
import {
  DIMENSIONS,
  isScorableDimension,
  variableAppliesToNature,
  optionalVariablesByDimension,
} from "../../Utils/variables/variablesCatalog";
import type { Dimension, Variable } from "../../Utils/variables/variablesCatalog";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { selectionNature } from "../../Utils/h3/hexClassification";
import { USE_API_EMPLAZAMIENTO } from "../../Utils/projectData";

function matches(query: string, v: Variable): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    v.label.toLowerCase().includes(q) ||
    v.description.toLowerCase().includes(q)
  );
}

export default function Dimensions() {
  const [query, setQuery] = useState("");
  const { selectedHexes } = useAprincipal();

  // Naturaleza mar/tierra de la selección (modo API emplazamiento): oculta las
  // variables que no aplican al emplazamiento (p.ej. batimetría en tierra).
  const nature = useMemo(
    () => (USE_API_EMPLAZAMIENTO ? selectionNature(selectedHexes) : "mixta"),
    [selectedHexes],
  );

  const filteredByDimension = useMemo(() => {
    const map = new Map<string, Variable[]>();
    for (const d of DIMENSIONS) {
      map.set(
        d.id,
        optionalVariablesByDimension(d.id).filter(
          (v) => matches(query, v) && variableAppliesToNature(v, nature),
        ),
      );
    }
    return map;
  }, [query, nature]);

  return (
    <div className="flex flex-col h-full">
      {/* Contenedor scrollable con scrollbar siempre visible */}
      <div
        className="flex-1 flex flex-col gap-3 px-4 pb-4 overflow-y-scroll"
        style={{ scrollbarGutter: "stable" }}
      >
        <h2 className="text-lg font-bold text-[#393939ff] mt-[60px]">
          Configura las variables de interés por cada dimensión
        </h2>

        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar variables"
            aria-label="Buscar variables"
            className="w-full rounded-md bg-white px-3 py-2 pr-9 text-sm text-[#393939ff] placeholder:text-gray-400 shadow-sm outline-none"
          />
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.32 4.16l3.26 3.26a1 1 0 01-1.42 1.42l-3.26-3.26A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {USE_API_EMPLAZAMIENTO && (nature === "mar" || nature === "tierra") && (
          <p className="rounded-md bg-white/70 px-3 py-1.5 text-[11px] leading-snug text-gray-600">
            Emplazamiento{" "}
            <strong className="text-[#165170ff]">
              {nature === "mar" ? "en el mar (offshore)" : "en tierra (onshore)"}
            </strong>
            : se ocultan las variables que no aplican a este emplazamiento.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {DIMENSIONS.map((d) => {
            const vars = filteredByDimension.get(d.id) ?? [];
            // Con búsqueda: una dimensión sin coincidencias desaparece.
            if (query.trim() && vars.length === 0) return null;
            // Sin búsqueda pero sin variables (regulatoria pendiente, o dimensión
            // vaciada por el filtro mar/tierra): se muestra igual para que las 5
            // dimensiones estén siempre presentes en el menú (petición reunión).
            if (vars.length === 0) {
              return <EmptyDimensionCard key={d.id} dimension={d} nature={nature} />;
            }
            return (
              <DimensionCard
                key={d.id}
                dimension={d}
                variables={vars}
                defaultOpen={Boolean(query.trim())}
              />
            );
          })}

        </div>
      </div>

      {/* Botón Siguiente paso fijo al fondo, sin bordes redondeados, sin padding/margen */}
      <div className="shrink-0">
        <NextStepButton />
      </div>
    </div>
  );
}

/**
 * Card mínima para una dimensión SIN variables visibles: regulatoria pendiente
 * o una dimensión vaciada por el filtro de emplazamiento (mar/tierra). Mantiene
 * las 5 dimensiones presentes en el menú.
 */
function EmptyDimensionCard({
  dimension,
  nature,
}: {
  dimension: Dimension;
  nature: "mar" | "tierra" | "mixta" | "vacia";
}) {
  const informative = !isScorableDimension(dimension.id);
  // Solo se muestra una nota cuando es INFORMACIÓN útil para el usuario: explicar
  // que el emplazamiento (mar/tierra) oculta variables. Nada de estado interno.
  const nota =
    nature === "mar" || nature === "tierra"
      ? `Sin variables aplicables al emplazamiento ${
          nature === "mar" ? "en el mar" : "en tierra"
        }.`
      : "";
  return (
    <div className="rounded-md bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="text-sm font-bold text-[#383838]">{dimension.label}</span>
        {informative && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
            informativa · no puntúa
          </span>
        )}
      </div>
      {nota && (
        <p className="px-3 pb-3 text-[11px] italic leading-snug text-gray-400">
          {nota}
        </p>
      )}
    </div>
  );
}
