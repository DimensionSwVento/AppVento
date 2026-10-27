"use client";

import { createPortal } from "react-dom";
import type { ReactNode, RefObject } from "react";
import ReportConfigPanel from "./ReportConfigPanel";
import type { ReportConfig } from "../../Utils/report/reportConfig";

// Tamaño de hoja A4 @96dpi (coincide con ReportSheet).
const SHEET_W = 794;
const SHEET_H = 1123;

/**
 * Ventana de pantalla completa para configurar y previsualizar el informe
 * (US06-03/04). Grid de 2 columnas: 65% con el título + la vista en MALLA de las
 * hojas, 35% con las opciones cliqueables + Cancelar / Descargar. Se abre tanto
 * al "Previsualizar" como al "Descargar" desde la fase informe.
 */
export default function ReportBuilder({
  region,
  totalSheets,
  sheets,
  scale,
  mallaRef,
  config,
  scorableDims,
  onPatch,
  onToggleDim,
  onCancel,
  onDownload,
  isExporting,
}: {
  region?: string | null;
  totalSheets: number;
  sheets: ReactNode[];
  scale: number;
  mallaRef: RefObject<HTMLDivElement | null>;
  config: ReportConfig;
  scorableDims: { id: string; label: string }[];
  onPatch: (patch: Partial<ReportConfig>) => void;
  onToggleDim: (id: string) => void;
  onCancel: () => void;
  onDownload: () => void;
  isExporting: boolean;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-100">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[65%_35%]">
        {/* ── Izquierda (65%): título + malla de hojas ── */}
        <div className="flex min-h-0 flex-col">
          <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400">
                Informe de viabilidad
              </p>
              <h2 className="text-base font-bold text-[#165170ff]">
                Idoneidad eólica{region ? ` — ${region}` : ""}
              </h2>
            </div>
            <span className="text-xs text-gray-500">
              {totalSheets} {totalSheets === 1 ? "hoja" : "hojas"}
            </span>
          </header>
          <div className="flex-1 overflow-auto p-6">
            <div
              ref={mallaRef}
              className="flex flex-wrap content-start justify-center gap-5"
            >
              {sheets.map((sheet, i) => (
                <div
                  key={i}
                  className="shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10"
                  style={{ width: SHEET_W * scale, height: SHEET_H * scale }}
                >
                  <div
                    style={{
                      width: SHEET_W,
                      height: SHEET_H,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    {sheet}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Derecha (35%): opciones + acciones ── */}
        <aside className="flex min-h-0 flex-col border-l border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-3">
            <h3 className="text-sm font-bold text-[#165170ff]">
              Configuración del informe
            </h3>
            <p className="text-[11px] text-gray-500">
              Marca qué incluir; la vista se actualiza al instante.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <ReportConfigPanel
              vertical
              config={config}
              scorableDims={scorableDims}
              onPatch={onPatch}
              onToggleDim={onToggleDim}
            />
          </div>
          <div className="flex items-center gap-3 border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={isExporting}
              className="flex-1 rounded-full bg-[#165170ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e6a8c] disabled:opacity-50"
            >
              {isExporting ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
