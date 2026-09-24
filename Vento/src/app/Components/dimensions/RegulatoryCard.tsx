"use client";

/**
 * Card de la dimensión REGULATORIA en la fase Dimensiones. La regulatoria es
 * informativa (no puntúa) igual que las otras variables informativas: cada norma
 * se puede PRENDER/APAGAR aquí, y solo las activas aparecen en el modal de marco
 * normativo y en el informe. Las normas vienen de la API (`fetchNormas`), que se
 * alimenta de InfoVariables (filas REG…) por el actualizador de metadatos y se
 * editan en /admin/normativa. Espejo visual de `DimensionCard`.
 */
import { useEffect, useState } from "react";
import { useRegulatory } from "../../Utils/contexts/RegulatoryContext";
import { NORMA_ESTADO_META } from "../../Utils/report/regulatoryNorms";
import { fetchNormas, type Norma } from "../../Utils/admin/catalogApi";

export default function RegulatoryCard({ onOpen }: { onOpen: () => void }) {
  const { isNormaActive, toggleNorma } = useRegulatory();
  const [open, setOpen] = useState(false);
  const [normas, setNormas] = useState<Norma[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchNormas()
      .then((n) => alive && setNormas(n))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const total = normas.length;
  const active = normas.filter((n) => isNormaActive(n.id)).length;
  const pct = total > 0 ? (active / total) * 100 : 0;

  return (
    <div className="rounded-md bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#165170ff]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V9l6-4 6 4v12M9 21v-6h6v6" />
          </svg>
          <span>
            Regulatoria — Marco normativo{" "}
            <span className="font-normal text-gray-500">
              {active}/{total || "—"}
            </span>
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
            informativa · no puntúa
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div
        className="mx-3 mb-1 h-1 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={active}
        aria-label={`${active} de ${total} normas activas`}
      >
        <div
          className="h-full rounded-full bg-[#165170ff] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {open && (
        <div className="px-3 pb-2">
          <p className="pb-1 pt-1 text-[11px] leading-snug text-gray-500">
            Marco normativo nacional aplicable. Prende o apaga cada norma: las
            activas aparecen en el modal de marco normativo y en el informe. Se
            editan en <span className="font-semibold">Admin · Normativa</span>.
          </p>

          {loading ? (
            <div className="flex justify-center p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent" />
            </div>
          ) : total === 0 ? (
            <p className="py-3 text-[11px] italic text-gray-400">
              Aún no hay normas cargadas. Súbelas por el actualizador de metadatos
              (filas <code>REG…</code> de InfoVariables) o créalas en Admin · Normativa.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {normas.map((n) => {
                const on = isNormaActive(n.id);
                const m = NORMA_ESTADO_META[n.estado];
                return (
                  <div key={n.id} className="flex items-start gap-3 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={n.nombre}
                      onClick={() => toggleNorma(n.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        on ? "bg-[#22c55e]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          on ? "translate-x-[18px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight text-[#393939ff]">
                        {n.nombre}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-gray-500">
                        {n.descripcion}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                      style={{ backgroundColor: m.bg, color: m.color }}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={onOpen}
            className="mt-2 w-full rounded-md border border-[#165170ff]/30 py-1.5 text-[12px] font-semibold text-[#165170ff] hover:bg-[#165170ff]/5"
          >
            Ver marco normativo completo →
          </button>
        </div>
      )}
    </div>
  );
}
