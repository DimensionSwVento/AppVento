"use client";

/**
 * Modal "Dimensión regulatoria" (US04-05), informativo — NO puntúa. Se abre desde
 * el menú (dimensión Regulatoria → "Marco normativo"). Muestra el semáforo
 * normativo, las normas aplicables con etiquetas rápidas, autoridades competentes
 * e información normativa, y permite agregar la sección al informe PDF.
 * Las normas vienen de la API (`catalogApi.fetchNormas`), con fallback template.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRegulatory } from "../../Utils/contexts/RegulatoryContext";
import {
  NORMA_ESTADO_META,
  REGULATORY_AUTHORITIES,
  normasSemaforo,
  type NormaEstado,
} from "../../Utils/report/regulatoryNorms";
import { fetchNormas, type Norma } from "../../Utils/admin/catalogApi";

const INFO_NORMATIVA = [
  "Última actualización del marco: 2024",
  "Licencias ambientales vigentes (ANLA)",
  "Decretos reglamentarios del sector",
  "Documentos CONPES asociados",
  "Estado del marco PNSR",
];

export default function RegulatoryModal({ onClose }: { onClose: () => void }) {
  const { addToReport, setAddToReport, isNormaActive } = useRegulatory();
  const [allNormas, setAllNormas] = useState<Norma[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchNormas()
      .then((n) => alive && setAllNormas(n))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Solo las normas ACTIVAS (prendidas en la card de Dimensiones) entran al
  // semáforo, al listado y al informe.
  const normas = allNormas.filter((n) => isNormaActive(n.id));
  const hidden = allNormas.length - normas.length;
  const sem = normasSemaforo(normas);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(30,45,60,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#165170ff]">
              Dimensión regulatoria
            </h3>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Informativa · no puntúa
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-[11px] text-gray-500">
            Marco normativo nacional aplicable al proyecto eólico.
          </p>
          {/* Origen y lógica (para que no parezca arbitrario): de dónde salen las
              normas y por qué unas aparecen y otras no. */}
          <p className="mt-2 rounded-md bg-[#cce1eeff]/40 px-3 py-2 text-[11px] leading-snug text-gray-600">
            Estas normas son <b>informativas</b> (no puntúan). Provienen de las filas{" "}
            <code>REG…</code> de <b>InfoVariables</b> (actualizador de metadatos → tabla
            de normas) y se editan en <b>Admin · Normativa</b>. Solo se listan las que
            dejaste <b>activas</b> en la card «Regulatoria» de Dimensiones
            {hidden > 0 && (
              <> — hay <b>{hidden}</b> apagada(s) que no se incluyen en el informe</>
            )}
            .
          </p>

          {loading ? (
            <div className="flex justify-center p-10">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Semáforo normativo */}
              <p className="mt-3 mb-1.5 text-xs font-semibold text-gray-700">
                Semáforo normativo nacional
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(["aplica", "tramite", "verificacion", "no-aplica"] as NormaEstado[]).map(
                  (k) => {
                    const m = NORMA_ESTADO_META[k];
                    return (
                      <div
                        key={k}
                        className="rounded-lg border border-gray-100 p-2 text-center"
                        style={{ backgroundColor: m.bg }}
                      >
                        <p className="text-xl font-bold" style={{ color: m.color }}>
                          {sem[k]}
                        </p>
                        <p className="text-[9px] font-semibold" style={{ color: m.color }}>
                          {m.label}
                        </p>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Normas aplicables */}
              <p className="mt-4 mb-1.5 text-xs font-semibold text-gray-700">
                Normas aplicables al proyecto
              </p>
              <ul className="flex flex-col gap-1">
                {normas.map((n) => {
                  const m = NORMA_ESTADO_META[n.estado];
                  return (
                    <li
                      key={n.id}
                      className="flex items-start justify-between gap-2 border-b border-gray-100 pb-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-gray-800">
                          {n.nombre}
                        </p>
                        <p className="text-[10px] leading-snug text-gray-500">
                          {n.descripcion}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                        style={{ backgroundColor: m.bg, color: m.color }}
                      >
                        {m.label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Autoridades + info normativa */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-700">
                    Autoridades competentes
                  </p>
                  <ul className="flex flex-col gap-1">
                    {REGULATORY_AUTHORITIES.map((a) => (
                      <li key={a.sigla} className="text-[10px] text-gray-600">
                        <b>{a.sigla}</b> — {a.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-700">
                    Información normativa
                  </p>
                  <ul className="flex flex-col gap-1">
                    {INFO_NORMATIVA.map((i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#165170ff]" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer: agregar al informe */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={addToReport}
              onChange={(e) => setAddToReport(e.target.checked)}
              className="h-4 w-4 accent-[#165170]"
            />
            Agregar esta sección al informe PDF
          </label>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#165170ff] px-5 py-1.5 text-xs font-semibold text-white hover:bg-[#1e6a8c]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
