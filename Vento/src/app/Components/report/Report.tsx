"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2 } from "lucide-react";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { calcAreaKm2 } from "../../Utils/report/areaCalc";
import {
  formatCoordenadas,
  formatReportTimestamp,
  getCentroid,
  getRegion,
} from "../../Utils/report/reportData";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  HEATMAP_DIMENSIONS,
  useHeatmapDimension,
  type HeatmapDimensionId,
} from "../../Utils/contexts/HeatmapDimensionContext";
import RadarChart from "./RadarChart";
import AreaMiniMap from "./AreaMiniMap";
import { useCachedImage } from "../../Utils/useCachedImage";
import { SNAPSHOT_KEY } from "../../Utils/h3/h3Resolution";
import { dimensionScore } from "../../Utils/report/heatmapPalette";
import { useAreaScores } from "../../Utils/report/useAreaScores";
import {
  areaVariableAverage,
  useAreaHexData,
} from "../../Utils/report/useAreaHexData";
import { USE_PLACEHOLDER_FALLBACK } from "../../Utils/projectData";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import {
  formatVariableValue,
  getInfoVarById,
} from "../../Utils/variables/informativeVariables";
import {
  DIMENSIONS,
  getVariableById,
  variablesByDimension,
  variablesBySource,
  type Variable,
} from "../../Utils/variables/variablesCatalog";
import {
  DISCLAIMER_BODY,
  DISCLAIMER_TITLE,
  REPORT_SOURCES,
  WEIGHT_BALANCING_NOTE,
} from "../../Utils/report/reportTemplates";
import { weightFor } from "../../Utils/variables/variableWeights";
import { compactHexes } from "../../Utils/historial/hexCodec";
import { useToast } from "../ui/Toast";
import {
  useCaracteristicas,
  type CaracteristicasState,
} from "../../Utils/contexts/CaracteristicasContext";
import { useHistorial } from "../../Utils/historial/HistorialContext";

const fmtKm2 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

// Ejes puntuables del radar (US06-01): 4 dimensiones. Regulatoria y "general"
// quedan fuera (Regulatoria es informativa — US-FB3-06).
const RADAR_DIMS: HeatmapDimensionId[] = [
  "tecnica",
  "ambiental",
  "social",
  "macroeconomica",
];

export default function Report() {
  const { selectedHexes } = useAprincipal();
  const { activeDimension } = useHeatmapDimension();
  const { activeVariables } = useVariables();
  const toast = useToast();
  const caracteristicas = useCaracteristicas();
  const { save: saveInforme } = useHistorial();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  // Previsualización a pantalla completa antes de descargar (sprint 3).
  const [fullscreen, setFullscreen] = useState(false);
  // Captura para el PDF: fuerza el render del informe COMPLETO (todas las
  // secciones) aunque el preview compacto muestre solo lo central.
  const [capturing, setCapturing] = useState(false);
  // Informe completo (todas las secciones) = a pantalla completa o al capturar
  // el PDF. El preview compacto solo muestra lo central (resumen, score, radar).
  const showFull = fullscreen || capturing;
  // Screenshot del mapa (capturado en la fase informe por Map.tsx vía SNAPSHOT_KEY).
  const { loadFromCache } = useCachedImage();
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      loadFromCache(SNAPSHOT_KEY).then((url) => {
        if (alive) setMapSnapshot(url);
      });
    load();
    // La captura en Map ocurre ~1.2 s tras entrar al informe; este reintento
    // trae la imagen fresca sin depender del orden de montaje ni mostrar una
    // captura vieja. Si no hay captura válida, queda el fallback SVG.
    const id = setTimeout(load, 1600);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [loadFromCache, selectedHexes]);

  // Al cambiar el área seleccionada es un informe distinto → permitir guardar de nuevo.
  useEffect(() => setSaved(false), [selectedHexes]);

  // Variables de la dimensión Regulatoria — se muestran como bloque
  // informativo (US-FB3-05 / feedback item 11): contexto, sin score.
  const regulatoriaVars = useMemo(() => variablesByDimension("regulatoria"), []);
  const sources = useMemo(() => variablesBySource(), []);

  const area = useMemo(() => calcAreaKm2(selectedHexes), [selectedHexes]);
  const centroid = useMemo(() => getCentroid(selectedHexes), [selectedHexes]);
  const region = useMemo(() => getRegion(selectedHexes), [selectedHexes]);
  const timestamp = useMemo(() => formatReportTimestamp(), []);

  // Puntajes agregados (general + por dimensión) — del backend (POST /tiles/area)
  // con fallback al placeholder local. Fuente única para barras, radar y snapshot.
  const scores = useAreaScores(selectedHexes);

  // Datos por hexágono del backend (fetch compartido/deduped). De aquí sale el
  // valor POR VARIABLE del área (columna `var_*`); si el backend no lo entrega,
  // se cae al placeholder cuando `USE_PLACEHOLDER_FALLBACK`.
  const areaData = useAreaHexData(selectedHexes, true);

  // Ejes del radar a partir de los puntajes por dimensión.
  const radarAxes = useMemo(
    () =>
      RADAR_DIMS.map((id) => ({
        label: HEATMAP_DIMENSIONS.find((d) => d.id === id)?.label ?? id,
        value: scores.byDim[id] ?? 0,
      })),
    [scores],
  );


  // Variables (ponderadas) que entran al puntaje + su score sobre el área.
  const scoreVariableRows = useMemo(() => {
    return Array.from(activeVariables)
      .map((id) => getVariableById(id))
      .filter((v): v is Variable => Boolean(v))
      .map((v) => ({
        id: v.id,
        label: v.label,
        dim:
          DIMENSIONS.find((d) => d.id === v.dimension)?.label.replace(
            /^Dimensi[oó]n\s+/i,
            "",
          ) ?? v.dimension,
        score:
          selectedHexes.size === 0
            ? null
            : (areaVariableAverage(areaData, selectedHexes, v.masterId) ??
              (USE_PLACEHOLDER_FALLBACK
                ? parseFloat(dimensionScore(v.id, selectedHexes))
                : null)),
      }));
  }, [activeVariables, selectedHexes, areaData]);

  // Variables que MÁS INFLUYEN en el resultado (US6): ranking por magnitud del
  // peso del modelo, con dirección (suma/resta a idoneidad). Placeholder por
  // |peso| hasta tener los pesos definitivos del modelo (mismo seam `weightFor`).
  const topInfluencers = useMemo(() => {
    return Array.from(activeVariables)
      .map((id) => {
        const v = getVariableById(id);
        return v ? { v, w: weightFor(id) } : null;
      })
      .filter((x): x is { v: Variable; w: number } => Boolean(x) && x!.w !== 0)
      .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
      .slice(0, 5)
      .map(({ v, w }) => ({
        id: v.id,
        label: v.label,
        sube: w > 0,
        mag: Math.abs(w),
      }));
  }, [activeVariables]);

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
      // Valor por variable del área: del backend (columna `var_*`) si existe;
      // si no, placeholder determinista (mismo hash que el mapa) cuando aplica.
      const masterId = getVariableById(id)?.masterId ?? "NA";
      const apiVal = areaVariableAverage(areaData, selectedHexes, masterId);
      const seedScore =
        apiVal != null
          ? apiVal
          : selectedHexes.size === 0 || !USE_PLACEHOLDER_FALLBACK
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
  }, [activeVariables, selectedHexes, areaData]);

  // Descarga del PDF: se CAPTURA el DOM del informe (mismo layout que la
  // previsualización extendida) con html2canvas-pro (soporta oklch de Tailwind
  // v4) y se pagina en A4 vertical. Así el PDF descargado ES la previsualización.
  const handleDownloadPdf = async () => {
    const node = reportRef.current;
    if (!node) return;
    setIsExporting(true);
    setError(null);
    const prevPreview = previewOpen;
    setPreviewOpen(true);
    setCapturing(true); // fuerza el informe completo en el DOM
    try {
      // Espera a que el DOM pinte todas las secciones + la imagen del mapa.
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
      );
      await new Promise((r) => setTimeout(r, 80));

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        ignoreElements: (el) => el.getAttribute("data-pdf-ignore") === "true",
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const brand: [number, number, number] = [22, 81, 112]; // #165170
      const margin = 10;
      const headerH = 12; // banda superior (cabecera)
      const footerH = 12; // banda inferior (pie)
      const contentTop = headerH;
      const contentBottom = pageH - footerH;
      const pageContentH = contentBottom - contentTop;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const totalPages = Math.max(1, Math.ceil(imgH / pageContentH));
      const headerRight = region
        ? `Idoneidad eólica — ${region}`
        : "Idoneidad eólica";

      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage();
        // Porción de esta página: la imagen se desplaza hacia arriba.
        pdf.addImage(
          imgData,
          "JPEG",
          margin,
          contentTop - p * pageContentH,
          imgW,
          imgH,
        );
        // Máscaras blancas: la imagen no invade la cabecera ni el pie.
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, contentTop, "F");
        pdf.rect(0, contentBottom, pageW, pageH - contentBottom, "F");
        // Cabecera: barra de marca + título + separador.
        pdf.setFillColor(brand[0], brand[1], brand[2]);
        pdf.rect(0, 0, pageW, 3.5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(brand[0], brand[1], brand[2]);
        pdf.text("INFORME VENTO", margin, 9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(150);
        pdf.text(headerRight, pageW - margin, 9, { align: "right" });
        pdf.setDrawColor(brand[0], brand[1], brand[2]);
        pdf.setLineWidth(0.4);
        pdf.line(margin, contentTop - 1.5, pageW - margin, contentTop - 1.5);
        // Pie: separador + número de página.
        pdf.setDrawColor(220);
        pdf.setLineWidth(0.2);
        pdf.line(margin, contentBottom + 2, pageW - margin, contentBottom + 2);
        pdf.setFontSize(7.5);
        pdf.setTextColor(150);
        pdf.text(`Página ${p + 1} de ${totalPages}`, pageW - margin, pageH - 5, {
          align: "right",
        });
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(brand[0], brand[1], brand[2]);
        pdf.text("Vento", margin, pageH - 5);
      }

      pdf.save(`informe-vento-${Date.now()}.pdf`);
      toast.success("Informe descargado correctamente");
    } catch (e) {
      console.error("[pdfExport]", e);
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(`No se pudo generar el PDF: ${msg}`);
      toast.error(`No se pudo generar el PDF: ${msg}`);
    } finally {
      setCapturing(false);
      setPreviewOpen(prevPreview);
      setIsExporting(false);
    }
  };

  const handleGuardarHistorial = async () => {
    if (selectedHexes.size === 0) {
      toast.error("Selecciona un área antes de guardar el informe");
      return;
    }
    setIsSaving(true);
    try {
      const caracteristicasState: CaracteristicasState = {
        tipoEmplazamiento: caracteristicas.tipoEmplazamiento,
        tipoTecnologiaOffshore: caracteristicas.tipoTecnologiaOffshore,
        capacidadMW: caracteristicas.capacidadMW,
        numAerogeneradores: caracteristicas.numAerogeneradores,
        categoriaAerogenerador: caracteristicas.categoriaAerogenerador,
      };
      await saveInforme({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        nombre: region ? `Informe — ${region}` : "Informe de idoneidad",
        // Compactados al guardar → mismo formato, payload más liviano (local + backend).
        hexes: compactHexes(Array.from(selectedHexes)),
        variables: Array.from(activeVariables),
        caracteristicas: caracteristicasState,
        scores,
        region: region ?? null,
        areaKm2: area,
      });
      setSaved(true);
      toast.success("Informe guardado en el histórico");
    } catch {
      toast.error("No se pudo guardar el informe en el histórico");
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[100] flex flex-col items-center gap-4 overflow-y-auto bg-gray-100 p-4 md:p-8"
          : "flex flex-col gap-4 p-4"
      }
    >
      {fullscreen && (
        <div className="flex w-full max-w-[800px] items-center justify-between border-b border-gray-200 pb-3">
          <p className="text-sm font-semibold text-[#165170ff]">
            Previsualización del informe
          </p>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Salir de pantalla completa
          </button>
        </div>
      )}
      <div
        ref={reportRef}
        style={capturing ? { width: 800, maxWidth: "none" } : undefined}
        className="relative flex w-full max-w-[800px] flex-col gap-4 rounded-xl bg-white shadow-md ring-1 ring-black/5"
      >
        {/* Expandir a pantalla completa — icono llamativo en la esquina del
            preview (sprint 3). Al abrir, el informe se renderiza en un PORTAL
            a document.body para escapar de la subpágina que lo confinaba. */}
        {!fullscreen && (
          <button
            type="button"
            data-pdf-ignore="true"
            onClick={() => {
              setFullscreen(true);
              setPreviewOpen(true);
            }}
            aria-label="Ver informe a pantalla completa"
            title="Pantalla completa"
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/50 backdrop-blur transition hover:bg-white/35"
          >
            <Maximize2 size={16} />
          </button>
        )}
        {/* Cabecera con identidad de marca — visible en PDF. */}
        <header className="rounded-t-2xl bg-[#165170ff] px-5 py-4 text-white">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
            Informe Vento
          </p>
          <h3 className="mt-1 text-xl font-bold">
            Análisis preliminar de idoneidad eólica
            {region ? ` — ${region}` : ""}
          </h3>
          {/* Contexto del informe: dónde, qué tan grande, cuántas variables */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/85">
            {centroid && (
              <span className="font-mono">{formatCoordenadas(centroid)}</span>
            )}
            <span>·</span>
            <span>{fmtKm2.format(area)} km² de área</span>
            <span>·</span>
            <span>{activeVariables.size} variables activas</span>
          </div>
          <p className="mt-1 text-[10px] text-white/60">{timestamp}</p>
        </header>

        <button
          type="button"
          data-pdf-ignore="true"
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

            {/* Mapa del área + panel de lectura (leyenda viridis). Va ENCIMA del
                resultado. La captura es vectorial (no rasteriza el canvas WebGL
                de deck.gl); color placeholder por hex hasta tener la API. */}
            {showFull && (
              <section>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Área seleccionada · idoneidad general
                </h4>
                <div className="mt-2 grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_1.4fr]">
                  {/* Info + leyenda de la escala de calor viridis */}
                  <div className="flex flex-col justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                    <p className="text-[11px] font-semibold text-[#165170ff]">
                      Cómo leer el mapa
                    </p>
                    <p className="text-[11px] leading-snug text-gray-600">
                      El área se colorea según su idoneidad general con la escala
                      viridis: tonos morados indican menor idoneidad y amarillos,
                      mayor. Los hexágonos morados intensos marcan zonas excluidas
                      (no aptas).
                    </p>
                    <div className="mt-1">
                      <div
                        className="h-3 w-full rounded"
                        style={{
                          background:
                            "linear-gradient(90deg,#440154,#3b528b,#21918c,#5ec962,#fde725)",
                        }}
                      />
                      <div className="mt-1 flex justify-between text-[9px] text-gray-500">
                        <span>0 · menor idoneidad</span>
                        <span>100 · mayor idoneidad</span>
                      </div>
                    </div>
                  </div>
                  {/* Captura del mapa (algo más pequeña para dejar sitio al panel) */}
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    {mapSnapshot ? (
                      // eslint-disable-next-line @next/next/no-img-element -- blob URL en cache, no un asset estático
                      <img
                        src={mapSnapshot}
                        alt="Captura del mapa del área seleccionada"
                        className="w-full object-cover"
                      />
                    ) : (
                      <AreaMiniMap
                        selectedHexes={selectedHexes}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              </section>
            )}

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
                Promedio agregado de la evaluación de idoneidad para el
                área seleccionada, según las dimensiones y variables analizadas.
              </p>
            </section>

            {/* Variables consideradas en el puntaje — tabla con borde azul Vento
                + el puntaje de esa área por variable (si hay datos). */}
            {scoreVariableRows.length > 0 && (
              <section>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Variables consideradas en el puntaje
                </h4>
                <div className="mt-2 overflow-hidden rounded-lg border-2 border-[#165170ff]">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#cce1eeff]/50 text-left text-[#165170ff]">
                        <th className="px-3 py-1.5 font-semibold">Variable</th>
                        <th className="px-3 py-1.5 font-semibold">Dimensión</th>
                        <th className="px-3 py-1.5 text-right font-semibold">
                          Puntaje
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreVariableRows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t border-[#165170ff]/25"
                        >
                          <td className="px-3 py-1.5 text-gray-700">
                            {r.label}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">{r.dim}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-[#165170ff]">
                            {r.score != null ? r.score.toFixed(1) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Puntajes por dimensión — sólo las dimensiones PUNTUABLES.
                "Regulatoria" queda fuera del score y se muestra como bloque
                informativo aparte (US-FB3-05 / feedback item 11). */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Puntajes de idoneidad por dimensión
              </h4>
              {selectedHexes.size > 0 && (
                <div className="mt-1 flex justify-center">
                  <RadarChart axes={radarAxes} className="w-full max-w-[300px]" />
                </div>
              )}
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

            {showFull && (
            <>
            {/* Variables que más influyen en el resultado (US6) — ranking por
                peso del modelo, con dirección (suma/resta a idoneidad). */}
            {topInfluencers.length > 0 && (
              <section>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Variables que más influyen en el resultado
                </h4>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {topInfluencers.map((r, i) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span className="w-4 shrink-0 text-right font-mono font-semibold text-gray-400">
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-gray-700">
                        {r.label}
                      </span>
                      <div className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-gray-200">
                        <span
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            r.sube ? "bg-emerald-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, r.mag * 100)}%` }}
                        />
                      </div>
                      <span
                        className={`w-14 shrink-0 text-right text-[10px] font-semibold ${
                          r.sube ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {r.sube ? "↑ suma" : "↓ resta"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[10px] italic leading-snug text-gray-400">
                  Influencia según el peso de cada variable en el modelo.
                </p>
              </section>
            )}

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
              {regulatoriaVars.length > 0 && (
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
              )}
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

            {/* Fuentes de datos — tabla fuente → variables */}
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Fuentes de datos
              </h4>
              <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="w-40 px-3 py-1.5 font-semibold">Fuente</th>
                      <th className="px-3 py-1.5 font-semibold">
                        Variables obtenidas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((s) => (
                      <tr
                        key={s.fuente}
                        className="border-t border-gray-100 align-top"
                      >
                        <td className="px-3 py-1.5 font-medium text-gray-700">
                          {s.fuente}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">
                          {s.variables.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] italic leading-snug text-gray-500">
                {WEIGHT_BALANCING_NOTE}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-gray-400">
                Fuentes institucionales de referencia:{" "}
                {REPORT_SOURCES.join(" · ")}
              </p>
            </section>

            {/* Aviso legal / disclaimer — texto template (reportTemplates.ts) */}
            <section className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                {DISCLAIMER_TITLE}
              </h4>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-600">
                {DISCLAIMER_BODY}
              </p>
            </section>

            {/* Pie de informe — logo de Vento en la esquina inferior */}
            <footer className="flex items-end justify-between gap-3 border-t border-gray-200 pt-3 text-[10px] text-gray-400">
              <div className="min-w-0">
                <p>Vento · ANH · EAFIT · Mavalan Software · {timestamp}</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- asset estático de marca */}
              <img
                src="/vento_logo.svg"
                alt="Vento"
                className="h-5 w-auto shrink-0 opacity-80"
              />
            </footer>
            </>
            )}
          </div>
        )}
      </div>

      <div className="w-full max-w-[800px]">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">
          Descarga del informe
        </p>
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm">
          <span className="truncate text-sm text-[#393939ff]">
            Informe Vento — {timestamp}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGuardarHistorial}
              disabled={isSaving || saved}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold disabled:opacity-70 ${
                saved
                  ? "border-emerald-500 text-emerald-600 cursor-default"
                  : "border-[#165170ff] text-[#165170ff] hover:bg-[#cce1eeff]/40"
              }`}
            >
              {saved ? "✓ Guardado" : isSaving ? "Guardando…" : "Guardar en histórico"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="rounded-full bg-[#165170ff] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1e6a8c] disabled:opacity-50"
            >
              {isExporting ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600 mt-2">
            {error}
          </p>
        )}
      </div>

    </div>
  );

  // En pantalla completa: portal a document.body para NO quedar atrapado en la
  // subpágina del informe (que está confinada a <40% del ancho con overflow).
  return fullscreen && typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
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
