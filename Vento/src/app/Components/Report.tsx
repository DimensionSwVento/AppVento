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

const fmtKm2 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const fmtPct = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

const PLACEHOLDER_DIMENSIONS = [
  { id: "ambiental", label: "Promedio dimensión ambiental", value: 0 },
  { id: "tecnica", label: "Promedio dimensión técnica", value: 0 },
  { id: "regulatoria", label: "Promedio dimensión regulatoria", value: 0 },
  {
    id: "socioeconomica",
    label: "Promedio dimensión socioeconómica",
    value: 0,
  },
  { id: "macroeconomica", label: "Dimensión macroeconómica", value: 0 },
];

export default function Report() {
  const { selectedHexes } = useAprincipal();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);

  const area = useMemo(() => calcAreaKm2(selectedHexes), [selectedHexes]);
  const centroid = useMemo(() => getCentroid(selectedHexes), [selectedHexes]);
  const region = useMemo(() => getRegion(selectedHexes), [selectedHexes]);

  // Placeholders hasta que llegue el modelo multicriterio y US04-AC1
  const variablesActivasCount = 0;
  const variablesEvaluadasCount = 0;
  const resultadoPreliminar = 0;
  const timestamp = useMemo(() => formatReportTimestamp(), []);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    setError(null);
    try {
      await exportElementToPdf(
        reportRef.current,
        `informe-vento-${Date.now()}.pdf`,
      );
    } catch {
      setError("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold text-[#393939ff]">
        Consulta y descarga el resultado preliminar
      </h2>

      <div
        ref={reportRef}
        className="rounded-2xl bg-white shadow-sm flex flex-col"
      >
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          aria-expanded={previewOpen}
          aria-controls="report-preview-body"
          className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left hover:bg-gray-50"
        >
          <span className="text-sm font-bold text-[#383838]">
            Previsualización del informe
          </span>
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
          <div
            id="report-preview-body"
            className="flex flex-col gap-4 border-t border-gray-200 p-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Región" value={region ?? "—"} />
              <Field
                label="Coordenadas"
                value={centroid ? formatCoordenadas(centroid) : "—"}
              />
              <Field
                label="Área total seleccionada"
                value={`${fmtKm2.format(area)} km²`}
              />
              <Field
                label="Cantidad de variables activas"
                value={String(variablesActivasCount)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PLACEHOLDER_DIMENSIONS.map((d) => (
                <Field
                  key={d.id}
                  label={d.label}
                  value={`${fmtPct.format(d.value)}%`}
                />
              ))}
              <Field
                label="Total variables evaluadas"
                value={String(variablesEvaluadasCount)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-[#383838]">
                Resultado preliminar:
              </p>
              <p className="text-xs text-gray-600">
                Este es el valor total que representa el promedio de evaluación
                de todos los valores analizados, según el punto seleccionado en
                el mapa y las definiciones seleccionadas, de acuerdo a las
                variables evaluadas.
              </p>
              <div className="rounded-md bg-gray-100 px-3 py-2">
                <span className="text-2xl font-bold text-[#165170ff]">
                  {fmtPct.format(resultadoPreliminar)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">
          Selecciona el formato
        </p>
        <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
          <span className="text-sm text-[#393939ff]">
            Informe vento – {timestamp}
          </span>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="rounded-full bg-[#165170ff] px-3 py-1 text-xs text-white hover:bg-[#1e6a8c] disabled:opacity-50"
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[0.8rem] font-bold text-[#383838]">{label}</p>
      <div className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-[#393939ff]">
        {value}
      </div>
    </div>
  );
}
