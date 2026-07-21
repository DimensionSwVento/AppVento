"use client";

import { useMemo, useRef, useState } from "react";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { calcAreaKm2 } from "../Utils/areaCalc";
import {
  formatCoordenadas,
  formatReportTimestamp,
  getCentroid,
  getRegion,
} from "../Utils/reportData";
import { exportElementToPdf } from "../Utils/pdfExport";
import {
  HEATMAP_DIMENSIONS,
  useHeatmapDimension,
} from "../Utils/HeatmapDimensionContext";
import {
  dimensionScore,
  generalScore,
} from "../Utils/heatmapPalette";
import { useVariables } from "../Utils/VariablesContext";
import {
  formatVariableValue,
  getInfoVarById,
} from "../Utils/informativeVariables";
import { variablesByDimension } from "../Utils/variablesCatalog";

const fmtKm2 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export default function Report() {
  const { selectedHexes } = useAprincipal();
  const { activeDimension } = useHeatmapDimension();
  const { activeVariables } = useVariables();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);

  // Variables de la dimensión Regulatoria — se muestran como bloque
  // informativo (US-FB3-05 / feedback item 11): contexto, sin score.
  const regulatoriaVars = useMemo(() => variablesByDimension("regulatoria"), []);

  const area = useMemo(() => calcAreaKm2(selectedHexes), [selectedHexes]);
  const centroid = useMemo(() => getCentroid(selectedHexes), [selectedHexes]);
  const region = useMemo(() => getRegion(selectedHexes), [selectedHexes]);
  const timestamp = useMemo(() => formatReportTimestamp(), []);

  // Puntajes placeholder por dimensión + general (mismo cálculo que el mapa).
  const scores = useMemo(() => {
    if (selectedHexes.size === 0)
      return { general: 0, byDim: {} as Record<string, number> };
    const byDim: Record<string, number> = {};
    for (const d of HEATMAP_DIMENSIONS) {
      if (d.id === "general") continue;
      byDim[d.id] = parseFloat(dimensionScore(d.id, selectedHexes));
    }
    return {
      general: parseFloat(generalScore(selectedHexes)),
      byDim,
    };
  }, [selectedHexes]);

  // Variables informativas activas con su valor promedio sobre el área.
  const informativeRows = useMemo(() => {
    const rows: {
      id: string;
      label: string;
      unit: string;
      color: string;
      valueText: string;
    }[] = [];
    for (const id of activeVariables) {
      const meta = getInfoVarById(id);
      if (!meta) continue;
      // El score promedio sobre los hexes seleccionados, usando dimensionScore
      // como hash determinista (mismo que el mapa para coherencia visual).
      const seedScore =
        selectedHexes.size === 0
          ? 0
          : parseFloat(dimensionScore(id, selectedHexes));
      rows.push({
        id: meta.id,
        label: meta.label,
        unit: meta.unit,
        color: meta.color,
        valueText: formatVariableValue(seedScore / 100, meta.unit),
      });
    }
    return rows;
  }, [activeVariables, selectedHexes]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    setError(null);
    try {
      await exportElementToPdf(
        reportRef.current,
        `informe-vento-${Date.now()}.pdf`,
      );
    } catch (e) {
      // Log la causa real (Tailwind v4 OKLCH + color-mix rompen html2canvas).
      console.error("[pdfExport]", e);
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(`No se pudo generar el PDF: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div ref={reportRef} className="flex flex-col gap-4 bg-white">
        {/* Cabecera con identidad de marca — visible en PDF */}
        <header className="rounded-t-2xl bg-[#165170ff] px-5 py-4 text-white">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
            Informe Vento
          </p>
          <h3 className="mt-1 text-xl font-bold">
            Análisis preliminar de prefactibilidad eólica
          </h3>
          <p className="mt-1 text-[11px] text-white/80">{timestamp}</p>
        </header>

        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          aria-expanded={previewOpen}
          aria-controls="report-preview-body"
          className="-mt-3 mx-5 flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50"
        >
          <span>{previewOpen ? "Ocultar" : "Mostrar"} previsualización</span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`h-4 w-4 text-gray-500 transition-transform ${
              previewOpen ? "rotate-180" : ""
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {previewOpen && (
          <div id="report-preview-body" className="flex flex-col gap-5 px-5 pb-5">
            {/* Resumen del área */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Resumen del área
              </h4>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <Stat label="Región" value={region ?? "—"} />
                <Stat
                  label="Coordenadas"
                  value={centroid ? formatCoordenadas(centroid) : "—"}
                  mono
                />
                <Stat
                  label="Área total"
                  value={`${fmtKm2.format(area)} km²`}
                  mono
                />
                <Stat
                  label="Variables activas"
                  value={String(activeVariables.size)}
                  mono
                />
              </dl>
            </section>

            {/* Resultado preliminar — número grande */}
            <section className="rounded-lg bg-[#cce1eeff]/40 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Resultado preliminar
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#165170ff]">
                  {scores.general.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-gray-500">/ 100</span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-gray-600">
                Promedio agregado de la evaluación de prefactibilidad para el
                área seleccionada, según las dimensiones y variables analizadas.
              </p>
            </section>

            {/* Puntajes por dimensión — sólo las dimensiones PUNTUABLES.
                "Regulatoria" queda fuera del score y se muestra como bloque
                informativo aparte (US-FB3-05 / feedback item 11). */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Puntajes de idoneidad por dimensión
              </h4>
              <ul className="mt-2 flex flex-col gap-1.5">
                {HEATMAP_DIMENSIONS.filter(
                  (d) => d.scorable && d.id !== "general",
                ).map((d) => {
                  const val = scores.byDim[d.id] ?? 0;
                  const isActive = activeDimension === d.id;
                  return (
                    <li
                      key={d.id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                        isActive ? "bg-[#cce1eeff]/40" : ""
                      }`}
                    >
                      <span className="flex-1 text-xs font-medium text-gray-700">
                        {d.label}
                      </span>
                      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-[#165170ff]"
                          style={{ width: `${Math.max(0, Math.min(100, val))}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-xs font-semibold text-[#165170ff]">
                        {val.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Regulatoria — bloque informativo (US-FB3-05 / feedback item 11).
                No puntúa: se listan sus variables como contexto, sin score. */}
            <section className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Regulatoria
                </h4>
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                  Informativa
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-gray-600">
                Contexto regulatorio del área. No se incluye en el cálculo del
                puntaje general.
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {regulatoriaVars.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-2 text-[11px] text-gray-700"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400"
                    />
                    <span className="min-w-0 truncate" title={v.description}>
                      {v.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Variables informativas seleccionadas */}
            {informativeRows.length > 0 && (
              <section>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Variables informativas seleccionadas ({informativeRows.length})
                </h4>
                <ul className="mt-2 grid grid-cols-2 gap-2">
                  {informativeRows.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: v.color }}
                      />
                      <span className="flex-1 min-w-0 truncate text-[11px] text-gray-700">
                        {v.label}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-[#165170ff]">
                        {v.valueText}
                        <span className="ml-0.5 text-[9px] font-normal text-gray-500">
                          {v.unit}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Pie de informe */}
            <footer className="border-t border-gray-200 pt-3 text-[10px] text-gray-400">
              <p>
                Valores placeholder en sprint 2 — el modelo multicriterio y la
                ingesta de datos reales se conectarán en sprint 3 (US03-AC6).
              </p>
              <p className="mt-1">
                Vento · ANH · EAFIT · Mavalan Software · {timestamp}
              </p>
            </footer>
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">
          Descarga del informe
        </p>
        <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
          <span className="text-sm text-[#393939ff]">
            Informe Vento — {timestamp}
          </span>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="rounded-full bg-[#165170ff] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1e6a8c] disabled:opacity-50"
          >
            {isExporting ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600 mt-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd
        className={`text-xs font-semibold text-[#393939ff] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </>
  );
}
