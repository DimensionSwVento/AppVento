"use client";

/**
 * Modal "Dimensión económica – Escenarios de mercado" (US04-02). Se abre desde
 * el menú (dimensión Económica → "Análisis prospectivo"). Permite elegir la
 * capacidad nominal, el escenario y el horizonte, agregar/quitar variables de la
 * gráfica, comparar escenarios y decidir si la sección económica entra al
 * informe PDF. Deja claro que esta dimensión NO puntúa el índice de viabilidad.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  fetchEscenarios,
  type AdminEscenario,
} from "../../Utils/admin/catalogApi";
import {
  CAPACIDADES_NOMINALES,
  useActiveEconomicVariables,
  useEconomic,
} from "../../Utils/contexts/EconomicContext";
import {
  BASE_YEAR,
  ECONOMIC_SCENARIOS,
  ECONOMIC_SERIES_COLORS,
  PROJECTION_HORIZONS,
  economicSeries,
} from "../../Utils/economic/economicScenarios";
import LineChart from "../report/LineChart";

export default function EconomicModal({ onClose }: { onClose: () => void }) {
  const econVars = useActiveEconomicVariables();
  const {
    capacidadNominal,
    setCapacidadNominal,
    escenarioId,
    setEscenario,
    horizonYears,
    setHorizonYears,
    chartHidden,
    toggleChartVar,
    showAllChartVars,
    compareMode,
    setCompareMode,
    addToReport,
    setAddToReport,
    reset,
  } = useEconomic();

  // Escenarios desde la API de admin (catalogApi) — así los que se crean/editan
  // en /admin/escenarios aparecen aquí. Fallback a los template si aún no cargan.
  const [escenarios, setEscenarios] = useState<AdminEscenario[]>([]);
  useEffect(() => {
    let alive = true;
    fetchEscenarios()
      .then((e) => alive && setEscenarios(e))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const escList = escenarios.length ? escenarios : ECONOMIC_SCENARIOS;
  // Escenario activo (para su `mult` de curva y su proyección `impacto`).
  const escActivo = escList.find((e) => e.id === escenarioId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = econVars.filter((v) => !chartHidden.has(v.id));
  const series =
    compareMode && shown.length > 0
      ? escList.map((sc, i) => ({
          label: `${shown[0].label} · ${sc.label}`,
          color: ECONOMIC_SERIES_COLORS[i % ECONOMIC_SERIES_COLORS.length],
          points: economicSeries(sc.id, shown[0].id, horizonYears, capacidadNominal, sc.mult),
        }))
      : shown.map((v, i) => ({
          label: v.label,
          color: ECONOMIC_SERIES_COLORS[i % ECONOMIC_SERIES_COLORS.length],
          points: economicSeries(escenarioId, v.id, horizonYears, capacidadNominal, escActivo?.mult),
        }));

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
          <div>
            <h3 className="text-base font-bold text-[#165170ff]">
              Dimensión económica – Escenarios de mercado
            </h3>
            <p className="text-[11px] text-gray-500">
              Análisis prospectivo (no puntúa en el índice de viabilidad).
            </p>
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
          {econVars.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">
              Activa al menos una <b>variable económica</b> en el menú de
              dimensiones para ver su proyección.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {/* 1. Capacidad nominal */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-700">
                  1. Escenario de capacidad nominal
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CAPACIDADES_NOMINALES.map((mw) => (
                    <button
                      key={mw}
                      type="button"
                      onClick={() => setCapacidadNominal(mw)}
                      aria-pressed={capacidadNominal === mw}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        capacidadNominal === mw
                          ? "border-[#165170ff] bg-[#165170ff] text-white"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {mw} MW
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Horizonte + escenario */}
              <div className="flex flex-wrap gap-4">
                <label className="flex flex-col gap-1 text-[11px] text-gray-600">
                  2. Horizonte de análisis
                  <select
                    value={horizonYears}
                    onChange={(e) => setHorizonYears(Number(e.target.value))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-[#1B4F6A]"
                  >
                    {PROJECTION_HORIZONS.map((y) => (
                      <option key={y} value={y}>
                        {y} años ({BASE_YEAR}–{BASE_YEAR + y})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-gray-600">
                  Escenario
                  <select
                    value={escenarioId}
                    onChange={(e) => setEscenario(e.target.value)}
                    disabled={compareMode}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-[#1B4F6A] disabled:opacity-50"
                  >
                    {escList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Proyección ILUSTRATIVA del escenario activo (dato editable en
                  /admin/escenarios · no definitivo). */}
              {!compareMode && escActivo?.impacto && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
                  {escActivo.impacto}
                </p>
              )}

              {/* 3. Variables a graficar */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">
                    3. Variables para visualizar en la gráfica
                  </p>
                  <button
                    type="button"
                    onClick={showAllChartVars}
                    className="text-[11px] font-semibold text-[#165170ff] hover:underline"
                  >
                    Seleccionar todas
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {econVars.map((v) => {
                    const active = !chartHidden.has(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleChartVar(v.id)}
                        aria-pressed={active}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                          active
                            ? "border-[#165170ff] bg-[#cce1eeff]/50 text-[#165170ff]"
                            : "border-gray-200 text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Proyección */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">
                    4. Proyección del escenario seleccionada
                  </p>
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-600">
                    <input
                      type="checkbox"
                      checked={compareMode}
                      onChange={(e) => setCompareMode(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#165170]"
                    />
                    Comparar escenarios
                  </label>
                </div>
                <div className="flex justify-center rounded-lg border border-gray-100 bg-gray-50/40 p-2">
                  {series.length > 0 ? (
                    <LineChart series={series} width={620} height={280} className="w-full max-w-[620px]" />
                  ) : (
                    <p className="py-8 text-center text-[11px] text-gray-400">
                      Agrega al menos una variable a la gráfica.
                    </p>
                  )}
                </div>
                {compareMode && shown.length > 0 && (
                  <p className="mt-1 text-[10px] italic text-gray-400">
                    Comparando escenarios para «{shown[0].label}».
                  </p>
                )}
                <p className="mt-1 text-[10px] italic text-gray-400">
                  Proyección ilustrativa (datos template hasta integrar la fuente
                  oficial).
                </p>
              </div>

              {/* 5. Incluir en el informe */}
              <label className="flex cursor-pointer items-center gap-2 border-t border-gray-100 pt-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={addToReport}
                  onChange={(e) => setAddToReport(e.target.checked)}
                  className="h-4 w-4 accent-[#165170]"
                />
                Incluir esta sección en el informe PDF
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Restablecer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#165170ff] px-5 py-1.5 text-xs font-semibold text-white hover:bg-[#1e6a8c]"
          >
            Guardar configuración
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
