"use client";

import { useMemo, useState } from "react";
import {
  DIMENSIONS,
  INFORMATIVE_VARIABLES,
  type InformativeVariable,
} from "../../Utils/variables/variablesCatalog";

/**
 * Panel desplegable con las VARIABLES INFORMATIVAS (Tabla 3 del cliente): solo
 * se visualizan/reportan, NO puntúan en el modelo. Se listan agrupadas por
 * dimensión, con su código, si se representan en mapa, su descripción y la idea
 * de visualización sugerida. Vive al final de la subpágina Dimensiones.
 */
export default function InformativeCatalog({ query }: { query: string }) {
  const [open, setOpen] = useState(false);

  const byDimension = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (v: InformativeVariable) =>
      !q ||
      v.label.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q);
    return DIMENSIONS.map((d) => ({
      dimension: d,
      vars: INFORMATIVE_VARIABLES.filter(
        (v) => v.dimension === d.id && match(v),
      ),
    })).filter((g) => g.vars.length > 0);
  }, [query]);

  const total = useMemo(
    () => byDimension.reduce((n, g) => n + g.vars.length, 0),
    [byDimension],
  );

  // Con búsqueda activa se auto-expande; sin resultados no se muestra.
  const expanded = open || Boolean(query.trim());
  if (query.trim() && total === 0) return null;

  return (
    <div className="rounded-md bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="informativas-body"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#383838]">
          <span>
            Variables informativas -{" "}
            <span className="font-normal text-gray-500">{total}</span>
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
            solo visualización · no puntúa
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-gray-500 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {expanded && (
        <div id="informativas-body" className="px-3 pb-3">
          <p className="pb-1 text-[11px] leading-snug text-gray-500">
            Estas variables no entran al cálculo de idoneidad; se muestran como
            capas o series de contexto para apoyar la interpretación.
          </p>
          {byDimension.map((g) => (
            <div key={g.dimension.id} className="mt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                {g.dimension.label.replace(/^Dimensi[oó]n\s+/i, "")}
              </h4>
              <ul className="mt-1 flex flex-col divide-y divide-gray-100">
                {g.vars.map((v, i) => (
                  <li key={`${v.masterId}-${i}`} className="py-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium text-gray-800">
                        {v.label}
                      </p>
                      {v.masterId !== "NA" && (
                        <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[9px] text-gray-500">
                          {v.masterId}
                        </span>
                      )}
                      {v.enMapa && (
                        <span className="rounded bg-[#cce1eeff]/60 px-1 py-0.5 text-[9px] font-semibold text-[#165170ff]">
                          en mapa
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-600">
                      {v.description}
                    </p>
                    {v.visualizacion && (
                      <p className="mt-0.5 text-[10px] italic leading-snug text-gray-400">
                        Visualización: {v.visualizacion}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
