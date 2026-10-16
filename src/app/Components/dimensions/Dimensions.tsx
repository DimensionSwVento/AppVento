"use client";

import { useEffect, useMemo, useState } from "react";
import DimensionCard from "./DimensionCard";
import EconomicModal from "./EconomicModal";
import RegulatoryModal from "./RegulatoryModal";
import { fetchMenuVariables, fetchNormas } from "../../Utils/admin/catalogApi";
import NextStepButton from "../ui/NextStepButton";
import {
  DIMENSIONS,
  OPTIONAL_VARIABLES,
  VARIABLES,
  isScorableDimension,
  variableAppliesToNature,
} from "../../Utils/variables/variablesCatalog";
import type { Dimension, Variable } from "../../Utils/variables/variablesCatalog";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import { useActiveEconomicVariables } from "../../Utils/contexts/EconomicContext";
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
  const [econOpen, setEconOpen] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const { selectedHexes } = useAprincipal();

  // Naturaleza mar/tierra de la selección (modo API emplazamiento): oculta las
  // variables que no aplican al emplazamiento (p.ej. batimetría en tierra).
  const nature = useMemo(
    () => (USE_API_EMPLAZAMIENTO ? selectionNature(selectedHexes) : "mixta"),
    [selectedHexes],
  );

  // Variables informativas del menú desde el catálogo de admin (catalogApi):
  // así lo que se crea/edita en /admin/variables (habilitar, ver en menú) se
  // refleja aquí. Semilla = las de hoy (OPTIONAL_VARIABLES) → sin parpadeo.
  const [menuVars, setMenuVars] = useState<Variable[]>(OPTIONAL_VARIABLES);
  useEffect(() => {
    let alive = true;
    fetchMenuVariables()
      .then((v) => alive && setMenuVars(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Normas regulatorias → variables informativas de la dimensión "regulatoria",
  // para que se muestren como switches en su DimensionCard igual que las demás
  // (informativas, no puntúan). Vienen del backend (InfoVariables / Admin·Normativa).
  const [normaVars, setNormaVars] = useState<Variable[]>([]);
  useEffect(() => {
    let alive = true;
    fetchNormas()
      .then((ns) =>
        alive &&
        setNormaVars(
          ns.map((n) => ({
            id: `norma:${n.id}`,
            masterId: n.id,
            dimension: "regulatoria" as const,
            criterio: "Marco normativo nacional",
            label: n.nombre,
            description: n.descripcion,
            noCalculo: true,
            iconKey: "lucide:Scale",
          })),
        ),
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // catalogReady: en modo backend, `VARIABLES` se hidrata desde BD; al cambiar,
  // recomputamos el menú para reflejar el catálogo vivo.
  const { catalogReady } = useVariables();
  const econActive = useActiveEconomicVariables();

  // Menú completo = variables de MODELO (switch BLOQUEADO, siempre activas) +
  // informativas (toggleables) + normas (regulatoria). Cada variable tiene su
  // switch; las del modelo salen como obligatorias (no se pueden desactivar),
  // petición cliente. Dedup: si una informativa duplica el masterId de una del
  // modelo, se omite (gana la del modelo, que es la que puntúa).
  const allVars = useMemo(() => {
    const modelReq: Variable[] = VARIABLES.map((v) =>
      v.required ? v : { ...v, required: true },
    );
    const modelMasters = new Set(
      VARIABLES.map((v) => v.masterId).filter((m) => m && m !== "NA"),
    );
    const infoUnique = menuVars.filter(
      (v) => v.masterId === "NA" || !modelMasters.has(v.masterId),
    );
    return [...modelReq, ...infoUnique, ...normaVars];
    // `catalogReady` fuerza recomputo tras hidratar `VARIABLES` desde BD.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuVars, normaVars, catalogReady]);

  const filteredByDimension = useMemo(() => {
    const map = new Map<string, Variable[]>();
    for (const d of DIMENSIONS) {
      map.set(
        d.id,
        allVars.filter(
          (v) =>
            v.dimension === d.id &&
            matches(query, v) &&
            variableAppliesToNature(v, nature),
        ),
      );
    }
    return map;
  }, [allVars, query, nature]);

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

        {/* Aviso PERSISTENTE (US-FB4): aclara que el toggle NO recalcula el
            modelo — antes salía una sola vez y era poco visible. */}
        <p className="flex items-start gap-2 rounded-md border-l-4 border-[#165170ff] bg-[#cce1eeff]/50 px-3 py-2.5 text-[12px] leading-snug text-gray-700">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#165170ff]">
            <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            Activar o desactivar variables aquí <strong>no recalcula el modelo</strong> — el
            puntaje de idoneidad ya viene calculado. Solo defines qué variables{" "}
            <strong>se muestran en el informe</strong> (y en el mapa, las que apliquen).
          </span>
        </p>

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
            // dimensiones estén siempre presentes en el menú (requisito de UX).
            if (vars.length === 0) {
              return <EmptyDimensionCard key={d.id} dimension={d} nature={nature} />;
            }
            // Botón del módulo DENTRO de la card (petición cliente): económica y
            // regulatoria llevan el disparador de su modal bajo sus switches.
            const footer =
              // Económica: el disparador del panel solo aparece si hay ≥1 variable
              // económica ACTIVA (planning: "si hay por lo menos una activar un panel").
              d.id === "macroeconomica" && econActive.length > 0 ? (
                <ModuleButton
                  onClick={() => setEconOpen(true)}
                  label="Ver análisis prospectivo"
                  icon="M4 19V5m0 14h16M8 15l3-3 2 2 4-5"
                />
              ) : d.id === "regulatoria" ? (
                <ModuleButton
                  onClick={() => setRegOpen(true)}
                  label="Ver marco normativo"
                  icon="M3 21h18M6 21V9l6-4 6 4v12M9 21v-6h6v6"
                />
              ) : undefined;
            return (
              <DimensionCard
                key={d.id}
                dimension={d}
                variables={vars}
                defaultOpen
                footer={footer}
              />
            );
          })}
        </div>
      </div>

      {econOpen && <EconomicModal onClose={() => setEconOpen(false)} />}
      {regOpen && <RegulatoryModal onClose={() => setRegOpen(false)} />}

      {/* Botón Siguiente paso fijo al fondo, sin bordes redondeados, sin padding/margen */}
      <div className="shrink-0">
        <NextStepButton />
      </div>
    </div>
  );
}

/**
 * Botón del módulo (económica/regulatoria) que abre su modal. Va DENTRO de la
 * DimensionCard, bajo los switches (petición cliente) — no como fila aparte.
 */
function ModuleButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#165170ff]/30 py-1.5 text-[12px] font-semibold text-[#165170ff] hover:bg-[#165170ff]/5"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      {label} →
    </button>
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
