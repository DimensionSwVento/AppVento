"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { svg2pdf } from "svg2pdf.js"; // Fase 1 PDF nativo: charts SVG → vector
import ReportSheet from "./ReportSheet";
import GeocodesDownloadButton from "./GeocodesDownloadButton";
import { useIsAdmin } from "../../Utils/useIsAdmin";
import { fetchMasterStatus, fetchEscenarios, fetchNormas, fetchVariableRanges, fetchReportCalcText, fetchReportContent, type AdminEscenario } from "../../Utils/admin/catalogApi";
import { dbField, AuditDataLabel } from "../../Utils/audit";
import {
  HEATMAP_DIMENSIONS,
  type HeatmapDimensionId,
} from "../../Utils/contexts/HeatmapDimensionContext";
import RadarChart from "./RadarChart";
import PieChart from "./PieChart";
import BarChart from "./BarChart";
import LineChartGrid from "./LineChartGrid";
import Gauge from "./Gauge";
import DivergingBars from "./DivergingBars";
import ReportBuilder from "./ReportBuilder";
import {
  useEconomic,
  useActiveEconomicVariables,
} from "../../Utils/contexts/EconomicContext";
import { useRegulatory } from "../../Utils/contexts/RegulatoryContext";
import {
  ECONOMIC_SCENARIOS,
  ECONOMIC_SERIES_COLORS,
  economicSeries,
} from "../../Utils/economic/economicScenarios";
import {
  defaultReportConfig,
  type ReportConfig,
} from "../../Utils/report/reportConfig";
import AreaMiniMap from "./AreaMiniMap";
import { useCachedImage } from "../../Utils/useCachedImage";
import { SNAPSHOT_KEY } from "../../Utils/h3/h3Resolution";
import { selectionNature } from "../../Utils/h3/hexClassification";
import { dimensionScore } from "../../Utils/report/heatmapPalette";
import { useAreaScores } from "../../Utils/report/useAreaScores";
import {
  areaVariableAverage,
  useAreaHexData,
} from "../../Utils/report/useAreaHexData";
import {
  USE_API_EMPLAZAMIENTO,
  USE_PLACEHOLDER_FALLBACK,
} from "../../Utils/projectData";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import {
  formatVariableValue,
  getInfoVarById,
} from "../../Utils/variables/informativeVariables";
import {
  VARIABLES,
  OPTIONAL_VARIABLES,
  getVariableById,
  isExcluyente,
  variableAppliesToNature,
  variablesByDimension,
  type DimensionId,
} from "../../Utils/variables/variablesCatalog";
import {
  CALC_SUMMARY_DEFAULTS,
  REPORT_CONTENT_DEFAULTS,
  type CalcSummaryText,
  type ReportContentText,
} from "../../Utils/report/reportTemplates";
import { weightFor } from "../../Utils/variables/variableWeights";
import {
  NORMA_ESTADO_META,
  REGULATORY_AUTHORITIES,
  REGULATORY_NORMS,
  normasSemaforo,
  type Norma,
} from "../../Utils/report/regulatoryNorms";
import {
  REPORT_SOURCE_LINKS,
  type ReportSourceLink,
} from "../../Utils/report/reportSources";
import { compactHexes } from "../../Utils/historial/hexCodec";
import { useToast } from "../ui/Toast";
import {
  useCaracteristicas,
  type CaracteristicasState,
} from "../../Utils/contexts/CaracteristicasContext";
import { useHistorial } from "../../Utils/historial/HistorialContext";
import { useClearFlow } from "../../Utils/draft/FlowDraftSync";

const fmtKm2 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

// Dimensiones puntuables del gráfico (radar/circular/barras).
const RADAR_DIMS: HeatmapDimensionId[] = [
  "tecnica",
  "ambiental",
  "social",
  "macroeconomica",
];

// Cuántas filas de tabla caben cómodamente en una hoja (mini-tablas).
// La PRIMERA hoja de una dimensión comparte espacio con las esquinas (score/peso),
// las variables que influyen y las excluyentes; la ÚLTIMA comparte con el "Resumen
// del cálculo" y las informativas → por eso los cupos son CONSERVADORES, para que
// ninguna hoja exceda el A4 (1123px) y el export no corte a mitad de fila. Si aún
// se corta, bajar más estos números (el precio es más hojas, no cortes).
// #3: bajados (6→4, 11→9) porque la 1ª hoja (radar+influyentes+tabla) y la última
// (resumen+informativas) excedían A4 → el export rebanaba a mitad de fila. Más
// hojas, pero ninguna tabla cortada.
// Filas por hoja REDUCIDAS (4.3): con la letra más grande caben menos filas por
// A4 sin cortar tablas; el informe usa más hojas (nos sobran).
const FIRST_SHEET_ROWS = 3;
const CONT_SHEET_ROWS = 6;

// Color por dimensión para el radar (hex para que svg2pdf lo pinte bien en el PDF;
// alineado con los hues de dimensionColors.ts: técnica=azul, ambiental=verde,
// social=naranja, macroeconómica=magenta, regulatoria=morado).
const RADAR_DIM_HEX: Record<string, string> = {
  tecnica: "#2f6fb0",
  ambiental: "#2f9e52",
  social: "#d98324",
  macroeconomica: "#c0398f",
  regulatoria: "#8b5cf6",
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Trocea `arr` reservando `first` elementos para el primer bloque (hoja pesada:
 * comparte espacio con esquinas/influyentes/excluyentes) y `rest` para los
 * siguientes (hojas de continuación, solo tabla). Evita que la primera hoja se
 * desborde y se corte a mitad de fila.
 */
function chunkFirstThen<T>(arr: T[], first: number, rest: number): T[][] {
  if (arr.length <= first) return [arr];
  const out: T[][] = [arr.slice(0, first)];
  for (let i = first; i < arr.length; i += rest) out.push(arr.slice(i, i + rest));
  return out;
}

/**
 * Vigencia/versión del dato de una variable, derivada de su fuente (para la
 * columna "Fecha" de las tablas verificables). Coincidencia laxa con
 * REPORT_SOURCE_LINKS. Si no hay match NO se inventa un año: se marca "s/v"
 * (sin versión confirmada) para no mostrar una fecha demo como si fuera real
 * — la vigencia real llega con las fuentes del backend (datos-requeridos §9).
 */
function sourceVersion(fuente?: string): string {
  if (!fuente || fuente === "(sin definir)" || fuente === "—") return "s/f";
  const f = fuente.toLowerCase();
  const hit = REPORT_SOURCE_LINKS.find((s) => {
    const key = s.fuente.toLowerCase().split(/[ /]/)[0];
    return f.includes(key) || s.fuente.toLowerCase().includes(f.split(/[ /]/)[0]);
  });
  return hit?.version ?? "s/v";
}

/** Tabla compacta reutilizable para las hojas del informe. */
function MiniTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#165170ff] text-left text-white">
            {columns.map((c) => (
              <th key={c} className="px-2 py-1 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t border-gray-100 align-top even:bg-gray-50/60"
            >
              {r.map((c, j) => (
                <td key={j} className="px-2 py-1 text-gray-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Franja de leyenda viridis + marcador del score GENERAL sobre la escala. */
function ViridisLegend({
  generalPct,
  lowPct,
  highPct,
}: {
  /** Score GENERAL (0–100) → marcador (palo) que se mueve sobre la barra. */
  generalPct?: number;
  /** Idoneidad (0–100) del hex MENOS apto de la selección → muesca fina. */
  lowPct?: number;
  /** Idoneidad (0–100) del hex MÁS apto de la selección → muesca fina. */
  highPct?: number;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const ticks: { pct: number; label: string }[] = [];
  if (typeof lowPct === "number") ticks.push({ pct: clamp(lowPct), label: "menor" });
  if (typeof highPct === "number") ticks.push({ pct: clamp(highPct), label: "mayor" });
  const gen = typeof generalPct === "number" ? clamp(generalPct) : null;
  return (
    <div className="mt-1">
      {/* Marcador del score GENERAL: triángulo que apunta a su posición en la
          barra (se mueve según el puntaje). */}
      <div className="relative h-2">
        {gen !== null && (
          <span
            className="absolute bottom-0 -translate-x-1/2 text-[11px] leading-none text-[#165170ff]"
            style={{ left: `${gen}%` }}
            title={`Idoneidad general: ${gen.toFixed(0)}`}
            aria-hidden="true"
          >
            ▼
          </span>
        )}
      </div>
      <div
        className="relative h-2.5 w-full rounded"
        style={{
          background:
            "linear-gradient(90deg,#440154,#3b528b,#21918c,#5ec962,#fde725)",
        }}
      >
        {/* Palo del score GENERAL: barra vertical marcada sobre el gradiente. */}
        {gen !== null && (
          <span
            className="absolute top-[-2px] h-[calc(100%+4px)] w-[3px] -translate-x-1/2 rounded-sm bg-[#165170ff] ring-1 ring-white"
            style={{ left: `${gen}%` }}
            title={`Idoneidad general: ${gen.toFixed(0)}`}
          />
        )}
        {/* Muescas finas del hex menos/más apto de la selección. */}
        {ticks.map((t) => (
          <span
            key={t.label}
            className="absolute top-[-1px] h-[calc(100%+2px)] w-[2px] -translate-x-1/2 rounded-sm bg-white ring-1 ring-black/50"
            style={{ left: `${t.pct}%` }}
            title={`${t.label}: ${t.pct.toFixed(0)}`}
          />
        ))}
      </div>
      {gen !== null && (
        <div className="mt-0.5 text-center text-[11px] font-semibold text-[#165170ff]">
          Idoneidad general: {gen.toFixed(0)} / 100
        </div>
      )}
      <div className="mt-0.5 flex justify-between text-[11px] text-gray-500">
        {/* Swatch en cada extremo → deja explícito qué color es el más bajo
            (morado #440154) y el más alto (amarillo #fde725) de la escala. */}
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: "#440154" }}
          />
          0 · menor idoneidad (morado)
        </span>
        <span className="flex items-center gap-1">
          100 · mayor idoneidad (amarillo)
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: "#fde725" }}
          />
        </span>
      </div>
    </div>
  );
}

export default function Report() {
  const { selectedHexes, restoredReportConfig, reportConfigNonce } =
    useAprincipal();
  const { activeVariables, catalogReady } = useVariables();
  const toast = useToast();
  const caracteristicas = useCaracteristicas();
  const { save: saveInforme } = useHistorial();
  const clearFlow = useClearFlow();
  // Rol admin: habilita la exportación de datos crudos por hexágono.
  const isAdmin = useIsAdmin();
  const reportRef = useRef<HTMLDivElement>(null);
  // #18: aviso previo a exportar "datos por hexágono" (nº hex × columnas; con
  // muchos hexágonos la imagen sale muy pesada → se recomienda con pocos).
  const [isExporting, setIsExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");        // "Hoja 2 de 8…"
  const [exportPct, setExportPct] = useState<number | null>(null); // 0–100 real
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ventana de configuración/previsualización a pantalla completa (ReportBuilder).
  const [builderOpen, setBuilderOpen] = useState(false);
  // Al capturar el PDF las hojas se renderizan a escala 1 (tamaño real).
  const [capturing, setCapturing] = useState(false);
  // EMPAQUETADO MEDIDO de las hojas (US06): el cuerpo del informe es una lista
  // plana de BLOQUES (`bodyContents`). Para no dejar huecos ni cortar, se miden
  // sus alturas reales (capa oculta + refs) y se agrupan varios bloques por hoja
  // A4 sin exceder el alto útil. `packs` = índices de bloque por hoja (null hasta
  // la 1ª medición → fallback 1-bloque-por-hoja). El preview y la captura del PDF
  // comparten estas mismas hojas, así que al empaquetar bien el preview queda
  // por-hoja Y el PDF sale nítido (cada hoja ≈ un A4, sin rebanar un canvas gigante).
  const [packs, setPacks] = useState<number[][] | null>(null);
  const measureRefs = useRef<(HTMLDivElement | null)[]>([]);

  // "Resumen del cálculo" del informe (editable desde admin, solo descriptivo).
  // Arranca con defaults e hidrata el override de BD (app_config·report_calc_text).
  const [calcText, setCalcText] = useState<CalcSummaryText>(CALC_SUMMARY_DEFAULTS);
  // Contenido editable del informe (disclaimer + incentivos, #3). Fallback a
  // defaults; el admin lo edita en /admin/report-text.
  const [reportContent, setReportContent] = useState<ReportContentText>(
    REPORT_CONTENT_DEFAULTS,
  );
  useEffect(() => {
    let alive = true;
    fetchReportCalcText()
      .then((t) => alive && setCalcText(t))
      .catch(() => {});
    fetchReportContent()
      .then((c) => alive && setReportContent(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Configuración del informe (US06-03): qué dimensiones/secciones/gráfico
  // incluir. Gobierna la previsualización, el PDF (US06-04) y lo guardado.
  const scorableDims = useMemo(
    () =>
      HEATMAP_DIMENSIONS.filter((d) => d.scorable && d.id !== "general").map(
        (d) => ({ id: d.id as string, label: d.label }),
      ),
    [],
  );
  const [config, setConfig] = useState<ReportConfig>(() =>
    defaultReportConfig(scorableDims.map((d) => d.id)),
  );
  const patchConfig = (patch: Partial<ReportConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));
  // Rehidrata la config al abrir un informe del histórico (emitida por
  // HistorialList → AccionPrincipalContext). Patrón "ajustar estado en render"
  // (sin effect): el nonce re-dispara aunque la config sea equivalente.
  const [prevConfigNonce, setPrevConfigNonce] = useState(reportConfigNonce);
  if (reportConfigNonce !== prevConfigNonce) {
    setPrevConfigNonce(reportConfigNonce);
    if (restoredReportConfig) setConfig(restoredReportConfig);
  }
  const toggleDim = (id: string) =>
    setConfig((c) => ({ ...c, dims: { ...c.dims, [id]: !c.dims[id] } }));

  // Screenshot del mapa (capturado en la fase informe por Map.tsx vía SNAPSHOT_KEY).
  const { loadFromCache } = useCachedImage();
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);
  // Versión de la master con la que se generan estos datos (trazabilidad).
  const [masterVersion, setMasterVersion] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchMasterStatus()
      .then((s) => alive && setMasterVersion(s.current?.version ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  // Escenarios económicos (con `mult`/`impacto` de BD; fallback template). Deben
  // coincidir con el panel para que el PDF refleje la misma curva/proyección.
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

  // Normas del marco normativo: se traen del catálogo (InfoVariables/Admin·
  // Normativa) para que el informe muestre las MISMAS que el modal, no el
  // template. Semilla = template → sin parpadeo mientras carga.
  const [normas, setNormas] = useState<Norma[]>(REGULATORY_NORMS);
  useEffect(() => {
    let alive = true;
    fetchNormas()
      .then((n) => alive && n.length > 0 && setNormas(n))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Intervalos (min–max) REALES por variable desde el backend (hexagon_meta) —
  // solo para la sección de verificación admin. Vacío si no es admin / template.
  const [varRanges, setVarRanges] = useState<
    Record<string, { min: number; max: number }>
  >({});
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    fetchVariableRanges()
      .then((r) => alive && setVarRanges(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAdmin]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      loadFromCache(SNAPSHOT_KEY).then((url) => {
        if (alive) setMapSnapshot(url);
      });
    load();
    const id = setTimeout(load, 1600);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [loadFromCache, selectedHexes]);

  // Al cambiar el área es un informe distinto → permitir guardar de nuevo.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSaved(false), [selectedHexes]);

  const area = useMemo(() => calcAreaKm2(selectedHexes), [selectedHexes]);
  const centroid = useMemo(() => getCentroid(selectedHexes), [selectedHexes]);
  const region = useMemo(() => getRegion(selectedHexes), [selectedHexes]);
  const timestamp = useMemo(() => formatReportTimestamp(), []);

  // Puntajes agregados (general + por dimensión).
  const scores = useAreaScores(selectedHexes);
  // Datos por hexágono (valor por variable del área).
  const areaData = useAreaHexData(selectedHexes, true);

  // Idoneidad (0–100) del hex MENOS y MÁS apto de la selección → muescas en la
  // barra viridis. Solo con datos reales por hex (backend); sin ellos, sin muescas.
  const idoneidadRange = useMemo(() => {
    if (!areaData || areaData.size === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const info of areaData.values()) {
      const s = info.score_general;
      if (typeof s !== "number") continue;
      const pct = s * 100;
      if (pct < min) min = pct;
      if (pct > max) max = pct;
    }
    return min <= max ? { min, max } : null;
  }, [areaData]);

  // Naturaleza mar/tierra del área (filtra variables que no aplican).
  const nature = useMemo(
    () => (USE_API_EMPLAZAMIENTO ? selectionNature(selectedHexes) : "mixta"),
    [selectedHexes],
  );

  // Ejes del gráfico por dimensión, filtrados por la config.
  const chartAxes = useMemo(
    () =>
      RADAR_DIMS.filter((id) => config.dims[id]).map((id) => ({
        label: HEATMAP_DIMENSIONS.find((d) => d.id === id)?.label ?? id,
        value: scores.byDim[id] ?? 0,
        // Color por dimensión (hex PDF-safe; svg2pdf no siempre resuelve hsl).
        // Cada dimensión del radar se pinta con su propio color.
        color: RADAR_DIM_HEX[id] ?? "#165170",
      })),
    [scores, config.dims],
  );

  // Variables que MÁS INFLUYEN (ranking por |peso|, con dirección + magnitud).
  const topInfluencers = useMemo(() => {
    const scored = VARIABLES.filter((v) => variableAppliesToNature(v, nature))
      .map((v) => ({ v, w: weightFor(v.id) }))
      .filter((x) => x.w !== 0)
      .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
      .slice(0, 5);
    const maxW = Math.max(...scored.map((x) => Math.abs(x.w)), 1);
    return scored.map(({ v, w }) => ({
      id: v.id,
      label: v.label,
      sube: w > 0,
      mag: Math.abs(w) / maxW,
    }));
  }, [nature]);

  // Variables que más influyen POR DIMENSIÓN (para las hojas de dimensión).
  const dimInfluencers = (dimId: string) => {
    const scored = VARIABLES.filter(
      (v) =>
        v.dimension === dimId && !v.noCalculo && variableAppliesToNature(v, nature),
    )
      .map((v) => ({ v, w: weightFor(v.id) }))
      .filter((x) => x.w !== 0)
      .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
      .slice(0, 6);
    const maxW = Math.max(...scored.map((x) => Math.abs(x.w)), 1);
    return scored.map(({ v, w }) => ({
      label: v.label,
      sube: w > 0,
      mag: Math.abs(w) / maxW,
    }));
  };

  // #36: DESGLOSE del radar por SUBCRITERIO de la dimensión. Cada eje = un
  // subcriterio (promedio del puntaje de sus variables puntuables); se adjunta el
  // ORIGEN (las variables que lo componen) para ver el panorama amplio. Usa el
  // mismo `puntaje` por variable que la tabla/diverging bars (dato ya consumido).
  const dimSubcriterioAxes = (dimId: string) => {
    const color = RADAR_DIM_HEX[dimId] ?? "#165170";
    const groups = new Map<string, { vals: number[]; vars: string[] }>();
    for (const r of dimTable(dimId)) {
      if (r.tipo !== "Puntúa" || r.puntaje == null) continue;
      const key = r.criterio; // "Criterio › Subcriterio" (o solo "Criterio")
      const g = groups.get(key) ?? { vals: [], vars: [] };
      g.vals.push(r.puntaje);
      g.vars.push(r.label);
      groups.set(key, g);
    }
    // Etiqueta corta del eje = último segmento (el subcriterio) para no saturar.
    const short = (label: string) => {
      const parts = label.split("›");
      return (parts[parts.length - 1] || label).trim();
    };
    return [...groups.entries()].map(([full, g]) => ({
      label: short(full),
      full,
      value: g.vals.reduce((a, b) => a + b, 0) / g.vals.length,
      color,
      vars: g.vars,
    }));
  };

  // Variables informativas activas con su valor sobre el área.
  const informativeRows = useMemo(() => {
    const rows: {
      id: string;
      label: string;
      unit: string;
      valueText: string;
      description: string;
      dimension: string;
    }[] = [];
    for (const id of activeVariables) {
      const meta = getInfoVarById(id);
      if (!meta) continue;
      const catVar = getVariableById(id);
      const masterId = catVar?.masterId ?? "NA";
      const apiVal = areaVariableAverage(areaData, selectedHexes, masterId);
      // Valor a mostrar: el REAL crudo del backend TAL CUAL (+ su unidad). Sin
      // dato real → en template, valor sintético de referencia; en backend sin
      // dato, vacío (nunca cifras fabricadas cuando el backend está prendido).
      const valueText =
        apiVal != null
          ? Number.isInteger(apiVal)
            ? apiVal.toString()
            : apiVal.toFixed(2)
          : USE_PLACEHOLDER_FALLBACK && selectedHexes.size > 0
            ? formatVariableValue(
                parseFloat(dimensionScore(id, selectedHexes)) / 100,
                meta.unit,
              )
            : "";
      rows.push({
        id: meta.id,
        label: meta.label,
        unit: meta.unit,
        valueText,
        // Detalle (P1): la descripción "qué es / cómo opera", igual que en la
        // pestaña Dimensiones (la `Variable` del catálogo la trae; `InfoVar` no).
        description: catVar?.description ?? "",
        // Dimensión (para mostrar las informativas TRAS la tabla de su dimensión, #10).
        dimension: catVar?.dimension ?? "",
      });
    }
    return rows;
  }, [activeVariables, selectedHexes, areaData]);

  // Fuentes discriminadas por dimensión (solo las incluidas).
  const sourcesByDim = useMemo(() => {
    const norm = (f?: string) =>
      f && f !== "(sin definir)" ? f : "Fuente por definir";
    const dims: { id: string; label: string }[] = [
      ...scorableDims.filter((d) => config.dims[d.id]),
    ];
    if (config.showRegulatoria)
      dims.push({ id: "regulatoria", label: "Regulatoria" });
    return dims
      .map((d) => {
        const vars = variablesByDimension(d.id as DimensionId).filter((v) =>
          variableAppliesToNature(v, nature),
        );
        const fuentes = [
          ...new Set(vars.filter((v) => v.fuente).map((v) => norm(v.fuente))),
        ].sort((a, b) => a.localeCompare(b, "es"));
        return { label: d.label, fuentes };
      })
      .filter((x) => x.fuentes.length > 0);
  }, [config.dims, config.showRegulatoria, nature, scorableDims]);

  // Tabla "Fuentes de datos" del informe. En MODO TEMPLATE usa la lista curada
  // `REPORT_SOURCE_LINKS` (con versión editorial). En MODO BACKEND se DERIVA de
  // las variables reales del catálogo (fuente + url ← metadatos/BD): así no se
  // muestran fuentes hardcoded como si fueran las reales. La `version` no se
  // almacena por variable → enriquecimiento best-effort por nombre (o "s/v").
  const sourceRows = useMemo<ReportSourceLink[]>(() => {
    if (USE_PLACEHOLDER_FALLBACK) return REPORT_SOURCE_LINKS;
    const byFuente = new Map<string, string>(); // fuente → url (primera no vacía)
    for (const v of [...VARIABLES, ...OPTIONAL_VARIABLES]) {
      const f = (v.fuente ?? "").trim();
      if (!f || f === "(sin definir)") continue;
      if (!byFuente.get(f) && v.url) byFuente.set(f, v.url);
      else if (!byFuente.has(f)) byFuente.set(f, v.url ?? "");
    }
    return [...byFuente.entries()]
      .map(([fuente, url]) => ({
        fuente,
        version: sourceVersion(fuente),
        url:
          url ||
          REPORT_SOURCE_LINKS.find((s) =>
            fuente.toLowerCase().includes(s.fuente.toLowerCase().split(/[ /]/)[0]),
          )?.url ||
          "",
      }))
      .sort((a, b) => a.fuente.localeCompare(b.fuente, "es"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogReady]);

  // Dimensión económica (US04-02): serie(s) de proyección. Refleja el escenario,
  // la capacidad nominal y el modo "comparar escenarios" del panel (llega al PDF).
  const econ = useEconomic();
  const econVars = useActiveEconomicVariables();
  const escList = escenarios.length ? escenarios : ECONOMIC_SCENARIOS;
  const escActivo = escList.find((e) => e.id === econ.escenarioId);
  const econSeries = useMemo(() => {
    const shown = econVars.filter((v) => !econ.chartHidden.has(v.id));
    if (econ.compareMode && shown.length > 0) {
      return escList.map((sc, i) => ({
        label: `${shown[0].label} · ${sc.label}`,
        color: ECONOMIC_SERIES_COLORS[i % ECONOMIC_SERIES_COLORS.length],
        unit: getInfoVarById(shown[0].id)?.unit ?? "",
        points: economicSeries(sc.id, shown[0].id, econ.horizonYears, econ.capacidadNominal, sc.mult),
      }));
    }
    return shown.map((v, i) => ({
      label: v.label,
      color: ECONOMIC_SERIES_COLORS[i % ECONOMIC_SERIES_COLORS.length],
      unit: getInfoVarById(v.id)?.unit ?? "",
      points: economicSeries(econ.escenarioId, v.id, econ.horizonYears, econ.capacidadNominal, escActivo?.mult),
    }));
  }, [
    econVars,
    econ.chartHidden,
    econ.escenarioId,
    econ.horizonYears,
    econ.compareMode,
    econ.capacidadNominal,
    escList,
    escActivo,
  ]);
  const showEconomica =
    config.showEconomica && econ.addToReport && econVars.length > 0;

  // Dimensión regulatoria (US04-05): se incluye si el usuario lo eligió en el
  // panel regulatorio (informativa — no puntúa).
  const regulatory = useRegulatory();

  // Filas de la tabla por dimensión (variables ponderadas del modelo).
  const dimTable = (dimId: string) =>
    VARIABLES.filter(
      (v) => v.dimension === dimId && variableAppliesToNature(v, nature),
    ).map((v) => {
      const puntaje =
        selectedHexes.size === 0
          ? null
          : (areaVariableAverage(areaData, selectedHexes, v.masterId) ??
            (USE_PLACEHOLDER_FALLBACK
              ? parseFloat(dimensionScore(v.id, selectedHexes))
              : null));
      return {
        label: v.label,
        masterId: v.masterId,
        description: v.description,
        criterio: v.subcriterio
          ? `${v.criterio} › ${v.subcriterio}`
          : v.criterio,
        tipo: isExcluyente(v)
          ? "Excluyente"
          : v.noCalculo
            ? "Informativa"
            : "Puntúa",
        peso: weightFor(v.id),
        puntaje,
        fuente: v.fuente && v.fuente !== "(sin definir)" ? v.fuente : "—",
        fecha: sourceVersion(v.fuente),
      };
    });

  // Variables EXCLUYENTES por dimensión (restricciones duras) con su detalle.
  const dimExcluyentes = (dimId: string) =>
    VARIABLES.filter(
      (v) =>
        v.dimension === dimId &&
        isExcluyente(v) &&
        variableAppliesToNature(v, nature),
    ).map((v) => ({ label: v.label, description: v.description }));

  // Conmutador de gráfico según la config (radar/circular/barras).
  const renderChart = (axes: { label: string; value: number }[]) => {
    if (axes.length === 0) return null;
    // Tamaño legible (#cliente): al menos ~80% del ancho de hoja A4 (794px ≈ 640px).
    if (config.chartType === "pie")
      return <PieChart data={axes} className="w-full max-w-[640px]" />;
    if (config.chartType === "bar")
      return <BarChart data={axes} className="w-full max-w-[640px]" />;
    if (axes.length >= 3)
      return <RadarChart axes={axes} className="w-full max-w-[540px]" />;
    return <BarChart data={axes} className="w-full max-w-[640px]" />;
  };

  // ── Construcción de las HOJAS del informe ──────────────────────────────
  const indexEntries: {
    n: number;
    title: string;
    page: number;
    startBlock: number; // índice (en bodyContents) del 1er bloque de la sección
  }[] = [{ n: 1, title: "Resumen ejecutivo", page: 1, startBlock: -1 }];
  const bodyContents: ReactNode[] = [];
  const addSection = (title: string, build: (n: number) => ReactNode[]) => {
    const n = indexEntries.length + 1;
    const startBlock = bodyContents.length; // 1er bloque de ESTA sección
    const page = startBlock + 2; // fallback secuencial (se recalcula con packs)
    indexEntries.push({ n, title, page, startBlock });
    build(n).forEach((c) => bodyContents.push(c));
  };

  // HOJA PROPIA "Desempeño por dimensión" (radar + variables que más influyen):
  // se saca del resumen para que, al ser grande, NO se corte al rebanar la hoja 1.
  // Va justo después del resumen (es la primera sección del cuerpo). Cabe en un A4.
  if (
    selectedHexes.size > 0 &&
    (chartAxes.length > 0 ||
      (config.showInfluencers && topInfluencers.length > 0))
  ) {
    addSection("Desempeño por dimensión", (n) => [
      <div key="perf" className="text-[12px]">
        <h3 className="text-base font-bold text-[#165170ff]">
          {n}. Desempeño por dimensión
        </h3>
        <div className="mt-3 flex flex-col items-center rounded-lg border border-gray-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
            Score por dimensión (radar)
          </p>
          {renderChart(chartAxes)}
        </div>
        {config.showInfluencers && topInfluencers.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Variables que más influyen
            </p>
            <div className="mt-1 flex justify-center">
              <DivergingBars
                bars={topInfluencers}
                width={660}
                className="w-full max-w-[660px]"
              />
            </div>
          </div>
        )}
      </div>,
    ]);
  }

  // Hojas por dimensión puntuable: score + peso en esquinas, variables que
  // influyen, tabla y resumen del cálculo.
  const activeDimCount = scorableDims.filter((d) => config.dims[d.id]).length;
  const pesoDim = activeDimCount > 0 ? 100 / activeDimCount : 0;
  scorableDims
    .filter((d) => config.dims[d.id])
    .forEach((d) => {
      const rows = dimTable(d.id);
      if (rows.length === 0) return;
      const dl = d.label.replace(/^Dimensi[oó]n\s+/i, "");
      const dimScore = scores.byDim[d.id] ?? 0;
      const influ = dimInfluencers(d.id);
      const excl = dimExcluyentes(d.id);
      addSection(`Dimensión ${dl}`, (n) => {
        const pages = chunkFirstThen(rows, FIRST_SHEET_ROWS, CONT_SHEET_ROWS);
        // Bloques FINOS (cada uno ≤ A4) → el empaquetado medido los agrupa sin
        // huecos y SIN cortarlos. Antes todo iba en un bloque "h-full" que, al
        // superar el A4, se rebanaba a mitad de la lista/el resumen.
        const dimBlocks: ReactNode[] = [];

        // Un bloque por chunk de la tabla de variables puntuables.
        pages.forEach((pr, pi) => {
          dimBlocks.push(
            <div key={`tbl${pi}`} className="text-[12px]">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-bold text-[#165170ff]">
                  {n}. Dimensión {dl}
                  {pages.length > 1 ? ` (${pi + 1}/${pages.length})` : ""}
                </h3>
                <span className="rounded bg-[#cce1eeff] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#165170ff]">
                  Puntúa
                </span>
              </div>

              {pi === 0 && (
                <>
                  {/* Esquinas: score de la dimensión + peso sobre el índice general */}
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border-2 border-[#165170ff] p-3 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Score de la dimensión
                      </p>
                      <p className="text-4xl font-extrabold leading-none text-[#165170ff]">
                        {dimScore.toFixed(0)}
                      </p>
                      <p className="text-[11px] text-gray-400">de 100</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Peso en el índice general
                      </p>
                      <p className="text-4xl font-extrabold leading-none text-gray-700">
                        {pesoDim.toFixed(0)}%
                      </p>
                      <p className="text-[11px] text-gray-400">
                        aporta {((dimScore * pesoDim) / 100).toFixed(1)} pts
                      </p>
                    </div>
                  </div>

                  {/* Variables que más influyen (barras suma/resta) */}
                  {config.showInfluencers && influ.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Variables que más influyen
                      </p>
                      <div className="mt-1 flex justify-center">
                        <DivergingBars bars={influ} width={660} className="w-full max-w-[660px]" />
                      </div>
                    </div>
                  )}
                </>
              )}

              {config.showScoreDetail && (
                <>
                  <h4 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Variables consideradas
                  </h4>
                  <MiniTable
                    columns={[
                      "Código",
                      "Variable",
                      "Dimensión",
                      ...(config.showModelDetail ? ["Criterio"] : []),
                      "Tipo",
                      "Peso",
                      "Valor",
                      "Fecha",
                      "Fuente",
                    ]}
                    rows={pr.map((r) => [
                      dbField(r.masterId),
                      dbField(r.label),
                      dl, // #31: dimensión explícita por variable (además del título)
                      ...(config.showModelDetail ? [dbField(r.criterio)] : []),
                      dbField(r.tipo),
                      dbField(r.peso.toFixed(2)),
                      dbField(r.puntaje != null ? r.puntaje.toFixed(1) : "—"),
                      dbField(r.fecha),
                      dbField(r.fuente),
                    ])}
                  />
                  <AuditDataLabel
                    uses={[
                      "catálogo variable (label/criterio/tipo/fuente)",
                      "peso AHP (model_weight)",
                      "valor = promedio master del área",
                      "fecha = versión de fuente (data_source)",
                    ]}
                  />
                  {/* Detalle/descripción por variable (US "detalle interno del
                      modelo"): opt-in bajo showModelDetail para no saturar. */}
                  {config.showModelDetail && (
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {pr.map((r) => (
                        <li key={r.label} className="text-[11px] leading-snug text-gray-600">
                          <b className="text-gray-700">{dbField(r.label)}:</b>{" "}
                          {dbField(r.description)}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>,
          );
        });

        // #36: DESGLOSE por SUBCRITERIO — un radar COMPACTO + la lista de ORIGEN
        // (qué variables componen cada subcriterio). Ejes del radar: subcriterios si
        // hay ≥3; si no, las variables puntuables (cap 8) para que SIGA siendo radar
        // y no barras. Chart pequeño (max-w acotado) para que las fuentes no se
        // disparen ni crezca la hoja. Solo si hay ≥2 subcriterios con dato.
        const subcrit = dimSubcriterioAxes(d.id);
        if (config.showScoreDetail && subcrit.length >= 2) {
          const subColor = subcrit[0].color;
          const varAxes = dimTable(d.id)
            .filter((r) => r.tipo === "Puntúa" && r.puntaje != null)
            .slice(0, 8)
            .map((r) => ({ label: r.label, value: r.puntaje as number, color: subColor }));
          const axes = subcrit.length >= 3 ? subcrit : varAxes;
          dimBlocks.push(
            <div key="subradar" className="text-[12px]">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Desglose por subcriterio
              </h4>
              {/* Regla de escala: eje vertical azul Vento + líneas horizontales
                  SUAVES (pero contrastantes) a TODO el ancho de la hoja + números
                  en NEGRO. El radar/barras va centrado ENCIMA. */}
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-3 left-0 right-0">
                  {[100, 75, 50, 25, 0].map((val, i) => (
                    <div
                      key={val}
                      className="absolute left-0 right-0 flex items-center gap-1"
                      style={{ top: `${(i / 4) * 100}%` }}
                    >
                      <span className="w-6 shrink-0 text-right text-[9px] font-bold text-black">
                        {val}
                      </span>
                      <div
                        className="h-px flex-1"
                        style={{ backgroundColor: "rgba(22,81,112,0.18)" }}
                      />
                    </div>
                  ))}
                  {/* eje vertical azul Vento */}
                  <div
                    className="absolute inset-y-0"
                    style={{ left: 26, width: 2, backgroundColor: "#165170" }}
                  />
                </div>
                <div className="relative flex justify-center">
                  {axes.length >= 3 ? (
                    <RadarChart axes={axes} size={280} className="w-full max-w-[440px]" />
                  ) : (
                    <BarChart data={axes} width={360} className="w-full max-w-[420px]" />
                  )}
                </div>
              </div>
              {/* Origen: lista (viñetas) por subcriterio con sus variables debajo. */}
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {subcrit.map((s) => (
                  <li key={s.full} className="text-[11px] leading-snug text-gray-700">
                    <b style={{ color: s.color }}>{s.full}</b>{" "}
                    <span className="tabular-nums text-gray-500">
                      ({s.value.toFixed(0)} / 100)
                    </span>
                    <div className="text-gray-500">{s.vars.join(" · ")}</div>
                  </li>
                ))}
              </ul>
            </div>,
          );
        }

        // Variables EXCLUYENTES (bloque propio, troceado si la lista es larga).
        if (config.showExcluyentes && excl.length > 0) {
          chunk(excl, 16).forEach((part, ci) => {
            dimBlocks.push(
              <div
                key={`exc${ci}`}
                className="rounded-lg border border-red-100 bg-red-50/50 p-2.5 text-[12px]"
              >
                <p className="text-[12px] font-bold text-red-700">
                  Variables excluyentes{ci > 0 ? " (cont.)" : ""}
                </p>
                {ci === 0 && (
                  <p className="text-[11px] text-red-500/90">
                    Restricciones duras: su presencia puede excluir el emplazamiento.
                  </p>
                )}
                <ul className="mt-1 flex flex-col gap-0.5">
                  {part.map((e) => (
                    <li key={e.label} className="text-[11px] text-gray-700">
                      <b>{dbField(e.label)}:</b> {dbField(e.description)}
                    </li>
                  ))}
                </ul>
              </div>,
            );
          });
        }

        // Variables INFORMATIVAS de ESTA dimensión (no puntúan), TRAS su tabla
        // (#10). Bloque propio TROCEADO → una lista larga ya no desborda la hoja.
        const dimInfo = informativeRows.filter((r) => r.dimension === d.id);
        if (config.showInformative && dimInfo.length > 0) {
          chunk(dimInfo, 14).forEach((part, ci) => {
            dimBlocks.push(
              <div
                key={`inf${ci}`}
                className="rounded-lg border border-gray-200 bg-gray-50/60 p-2.5 text-[12px]"
              >
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-bold text-[#165170ff]">
                    Variables informativas{ci > 0 ? " (cont.)" : ""}
                  </p>
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    No puntúa
                  </span>
                </div>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {part.map((r) => (
                    <li key={r.id} className="text-[11px] leading-snug text-gray-700">
                      <b>{dbField(r.label)}</b>
                      {r.valueText ? <> — {dbField(r.valueText)}</> : null}
                      {r.description ? (
                        <span className="text-gray-500">: {dbField(r.description)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>,
            );
          });
        }

        // Resumen del cálculo (bloque propio; ya no se "pega" al fondo con mt-auto).
        if (config.showModelDetail) {
          dimBlocks.push(
            <div key="calc" className="rounded-lg bg-gray-50 p-2.5 text-[12px]">
              <p className="text-[12px] font-bold text-[#165170ff]">
                Resumen del cálculo
              </p>
              {/* El modelo produce cada dimensión/global en escala 1–5 con una
                  fórmula de pesos (TEMPORAL — el cliente la ajusta). Aquí se
                  muestra el RESULTADO 1–5 y su normalización a 0–100. */}
              <p className="mt-0.5 tabular-nums text-[11px] text-gray-700">
                Dimensión = {calcText.formulaDimension} ={" "}
                <b>{(1 + (dimScore / 100) * 4).toFixed(1)}</b> (escala 1–5)
              </p>
              <p className="mt-0.5 tabular-nums text-[11px] text-gray-700">
                → normalizado (v−1)/4×100 = ({(1 + (dimScore / 100) * 4).toFixed(1)}−1)/4×100
                = <b>{dimScore.toFixed(1)} / 100</b>
              </p>
              <p className="mt-0.5 tabular-nums text-[11px] text-gray-700">
                Índice general = {calcText.formulaGeneral} ={" "}
                <b>{(1 + (scores.general / 100) * 4).toFixed(1)}</b> (1–5) → normalizado
                = <b>{scores.general.toFixed(1)} / 100</b>
              </p>
              <p className="mt-1 text-[11px] italic leading-snug text-gray-500">
                {calcText.metodologiaNota}
              </p>
              <AuditDataLabel
                uses={[
                  "score por dimensión (criterios/*.parquet o master + pesos)",
                  "índice general (global.parquet o Σ peso_dim·score_dim)",
                  "pesos AHP (model_weight)",
                ]}
              />
            </div>,
          );
        }

        return dimBlocks;
      });
    });

  // Hoja económica (informativa).
  if (showEconomica) {
    addSection("Dimensión económica (Inf.)", (n) => [
      <div key="eco" className="text-[12px]">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#165170ff]">
            {n}. Dimensión económica
          </h3>
          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Informativa · no puntúa
          </span>
        </div>
        <p className="mt-1 text-[13px] text-gray-600">
          {econ.compareMode ? (
            <>
              <b>Comparación de escenarios</b> (base · optimista · conservador)
            </>
          ) : (
            <>
              Escenario <b>{escActivo?.label}</b>
            </>
          )}{" "}
          · capacidad nominal <b>{econ.capacidadNominal} MW</b> · proyección a{" "}
          {econ.horizonYears} años.
        </p>
        {econSeries.length > 0 && (
          <div className="mt-3 flex justify-center">
            {/* Small-multiples (#7): comparar escenarios = 1 gráfico; si no, se
                parte por unidad/≤3 series para no saturar. */}
            <LineChartGrid
              series={econSeries}
              chartWidth={econ.compareMode ? 600 : 300}
              chartHeight={econ.compareMode ? 300 : 190}
              maxPerChart={econ.compareMode ? Infinity : 3}
              className="max-w-[680px]"
            />
          </div>
        )}
        {!econ.compareMode && escActivo?.impacto && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-800">
            {escActivo.impacto}
          </p>
        )}
        <AuditDataLabel uses={["serie económica por escenario/variable/año (economic_series)"]} />
        {/* Cómo interpretar (US04-02) */}
        <p className="mt-1 text-[11px] leading-snug text-gray-500">
          {econ.compareMode ? (
            <>
              <b>Cómo interpretar:</b> cada línea es el mismo indicador bajo un
              escenario distinto para la capacidad seleccionada. Un escenario por
              encima de otro proyecta mayor valor; la brecha entre líneas indica la
              sensibilidad del proyecto al escenario de mercado.
            </>
          ) : (
            <>
              <b>Cómo interpretar:</b> cada línea es la proyección de un indicador
              a lo largo de los años bajo el escenario y la capacidad elegidos. La
              magnitud escala con la capacidad nominal del proyecto.
            </>
          )}
        </p>
        <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[12px] leading-snug text-amber-800">
          Esta dimensión ayuda en la toma de decisiones pero <b>no se puntúa</b>{" "}
          en el modelo de idoneidad.
        </p>
        {/* Impuestos / incentivos clave del proyecto */}
        <h4 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          Impuestos e incentivos clave
        </h4>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {reportContent.incentivos.map((it) => (
            <div
              key={it.label}
              className="flex items-baseline justify-between rounded-md border border-gray-200 px-2 py-1.5"
            >
              <span className="text-[12px] text-gray-700">{dbField(it.label)}</span>
              <span className="text-[12px] font-semibold text-[#165170ff]">
                {dbField(it.value)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] italic text-gray-400">
          Proyección e incentivos ilustrativos (datos template hasta integrar la
          fuente oficial).
        </p>
      </div>,
    ]);
  }

  // Hoja regulatoria (informativa) — semáforo + normas + autoridades.
  // Solo las normas ACTIVAS (prendidas en la card de Dimensiones) entran al
  // informe, igual que en el modal de marco normativo.
  if (config.showRegulatoria && regulatory.addToReport) {
    const activeNormas = normas.filter((no) => activeVariables.has(`norma:${no.id}`));
    const sem = normasSemaforo(activeNormas);
    // Si NO hay ninguna norma activa, no se agrega la hoja (antes salía el semáforo
    // con 0s). Mismo patrón de guarda de vacío que las informativas (#6).
    if (activeNormas.length > 0) {
    // #3: semáforo + lista de normas + autoridades NO siempre caben en una hoja →
    // se CHUNKEA la lista (semáforo en la 1ª; autoridades en la última) para que el
    // PDF no corte a mitad.
    const regPages = chunkFirstThen(activeNormas, 4, 8);
    addSection("Dimensión regulatoria (Inf.)", (n) =>
      (regPages.length ? regPages : [[]]).map((pageNormas, pi, arr) => (
        <div key={`reg-${pi}`} className="text-[12px]">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#165170ff]">
              {n}. Dimensión regulatoria{pi > 0 ? " (cont.)" : ""}
            </h3>
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              Informativa · no puntúa
            </span>
          </div>
          {pi === 0 && (
            <>
              <p className="mt-1 text-[13px] text-gray-600">
                Marco normativo nacional aplicable al proyecto eólico.
              </p>
              <p className="mt-1 text-[11px] italic text-gray-500">
                El estado de cada norma no es una evaluación jurídica del proyecto; la
                verificación normativa vinculante la realiza la autoridad competente.
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(["aplica", "tramite", "verificacion", "no-aplica"] as const).map(
                  (k) => {
                    const m = NORMA_ESTADO_META[k];
                    return (
                      <div
                        key={k}
                        className="rounded-lg border border-gray-100 p-2 text-center"
                        style={{ backgroundColor: m.bg }}
                      >
                        <p className="text-lg font-bold" style={{ color: m.color }}>
                          {sem[k]}
                        </p>
                        <p
                          className="text-[11px] font-semibold"
                          style={{ color: m.color }}
                        >
                          {m.label}
                        </p>
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}
          <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            Normas aplicables al proyecto{arr.length > 1 ? ` (${pi + 1}/${arr.length})` : ""}
          </h4>
          <ul className="mt-1 flex flex-col gap-1">
            {pageNormas.map((no) => {
              const m = NORMA_ESTADO_META[no.estado];
              return (
                <li
                  key={no.id}
                  className="flex items-start justify-between gap-2 border-b border-gray-100 pb-1"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-700">{dbField(no.nombre)}</p>
                    <p className="text-[11px] leading-snug text-gray-500">
                      {dbField(no.descripcion)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: m.bg, color: m.color }}
                  >
                    {m.label}
                  </span>
                </li>
              );
            })}
          </ul>
          {pi === arr.length - 1 && (
            <>
              <h4 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Autoridades competentes
              </h4>
              <ul className="mt-1 grid grid-cols-2 gap-1">
                {REGULATORY_AUTHORITIES.map((a) => (
                  <li key={a.sigla} className="text-[11px] text-gray-600">
                    <b>{dbField(a.sigla)}</b> — {dbField(a.nombre)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )),
    );
    }
  }

  // Hoja(s) de variables informativas seleccionadas que NO cuelgan de una
  // dimensión puntuable ya renderizada (esas salen tras su tabla, #10). Aquí caen
  // las informativas de dimensiones no puntuables (p.ej. económica) o no incluidas.
  const globalInformative = informativeRows.filter(
    (r) => !scorableDims.some((d) => d.id === r.dimension && config.dims[d.id]),
  );
  if (config.showInformative && globalInformative.length > 0) {
    addSection("Variables informativas", (n) => {
      // Con detalle (P1): menos por hoja porque cada una lleva su descripción.
      // #27: ordenadas por dimensión.
      const pages = chunk(
        [...globalInformative].sort((a, b) =>
          (a.dimension ?? "").localeCompare(b.dimension ?? "", "es"),
        ),
        8,
      );
      return pages.map((pr, pi) => (
        <div key={pi} className="text-[12px]">
          <h3 className="text-base font-bold text-[#165170ff]">
            {n}. Variables informativas
            {pages.length > 1 ? ` (${pi + 1}/${pages.length})` : ""}
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            No puntúan en el modelo; aportan contexto. Se muestra su valor sobre
            el área y qué representa cada una.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {pr.map((r) => (
              <li key={r.id} className="border-b border-gray-100 pb-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-gray-700">
                    {dbField(r.label)}
                    {/* #31: dimensión explícita por variable informativa */}
                    {r.dimension && (
                      <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-gray-500">
                        {HEATMAP_DIMENSIONS.find((dd) => dd.id === r.dimension)?.label ?? r.dimension}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-[#165170ff]">
                    {dbField(`${r.valueText}${r.unit ? ` ${r.unit}` : ""}`)}
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-gray-500">
                  {dbField(r.description)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ));
    });
  }

  // Hoja de fuentes de datos: tabla con versión + enlace, y el detalle por
  // dimensión (como antes).
  if (config.showSources) {
    // #3: la tabla de fuentes + los extras no caben en una hoja → se CHUNKEA la
    // tabla y los extras (fuentes por dim, metodología, trazabilidad) van en su
    // propia hoja final, para que el PDF no corte a mitad.
    const srcPages = chunk(sourceRows, 14);
    addSection("Fuentes de datos", (n) => [
      ...(srcPages.length ? srcPages : [[]]).map((pageRows, pi, arr) => (
        <div key={`src-${pi}`} className="text-[12px]">
          <h3 className="text-base font-bold text-[#165170ff]">
            {n}. Fuentes de datos{arr.length > 1 ? ` (${pi + 1}/${arr.length})` : ""}
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#165170ff] text-left text-white">
                  <th className="px-2 py-1 font-semibold">Fuente</th>
                  <th className="px-2 py-1 font-semibold">Versión</th>
                  <th className="px-2 py-1 font-semibold">Enlace</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr
                    key={s.fuente}
                    className="border-t border-gray-100 align-top even:bg-gray-50/60"
                  >
                    <td className="px-2 py-1 font-medium text-gray-700">
                      {dbField(s.fuente)}
                    </td>
                    <td className="px-2 py-1 text-gray-600">{dbField(s.version)}</td>
                    <td className="px-2 py-1">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-[#165170ff] underline"
                      >
                        {dbField(s.url)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )),
      <div key="src-extra" className="text-[12px]">
        <h3 className="text-base font-bold text-[#165170ff]">
          {n}. Fuentes de datos — verificación
        </h3>

        {sourcesByDim.length > 0 && (
          <>
            <h4 className="mt-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Fuentes por dimensión
            </h4>
            <MiniTable
              columns={["Dimensión", "Fuentes consultadas"]}
              rows={sourcesByDim.map((s) => [s.label, s.fuentes.join(", ")])}
            />
          </>
        )}

        <p className="mt-2 text-[11px] italic leading-snug text-gray-500">
          {calcText.metodologiaNota}
        </p>

        {/* Trazabilidad: cómo verificar el informe de lo agregado a lo crudo. */}
        <div className="mt-3 rounded-lg border border-[#165170ff]/30 bg-[#cce1eeff]/25 p-2.5">
          <p className="text-[12px] font-bold text-[#165170ff]">
            Trazabilidad y verificación
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-600">
            Este informe es verificable de arriba hacia abajo; cada nivel se
            calcula del siguiente:
          </p>
          <ol className="mt-1 flex flex-col gap-0.5 text-[11px] leading-snug text-gray-700">
            <li>
              <b>1. Índice general</b> = {calcText.formulaGeneral} — resumen
              ejecutivo.
            </li>
            <li>
              <b>2. Score por dimensión</b> = {calcText.formulaDimension} —
              página de cada dimensión.
            </li>
            <li>
              <b>3. Tabla por área/variable</b> (columna «Puntaje») = promedio del
              valor de cada variable sobre los hexágonos del área, con su fuente.
            </li>
            <li>
              <b>4. Datos crudos por hexágono</b> (exportables por admin) — con
              fuente por variable, verificables en SIG/QGIS hex por hexágono.
            </li>
          </ol>
          <p className="mt-1 text-[11px] italic leading-snug text-gray-500">
            Así el análisis es transparente y reproducible: reemplaza la consulta
            manual de múltiples fuentes por una evaluación auditable.
          </p>
        </div>
      </div>,
    ]);
  }

  // Verificación ADMIN (US-tester): intervalos de ponderación por variable —
  // peso, polaridad y rango min–max REAL de la master (backend hexagon_meta).
  // Solo admin, opt-in por la casilla del panel. No es para el usuario final.
  if (config.showWeightRanges && isAdmin) {
    const round = (x: number) => Math.round(x * 1000) / 1000;
    const rangeText = (masterId: string): string => {
      const k2 = masterId.replace(/-/g, "_");
      const k3 = k2.replace(/_[A-Z]+$/, "");
      const r = varRanges[masterId] ?? varRanges[k2] ?? varRanges[k3];
      return r ? `${round(r.min)} – ${round(r.max)}` : "s/d";
    };
    const rows = VARIABLES.filter((v) => v.masterId !== "NA").map((v) => {
      const w = weightFor(v.id);
      const pol = w > 0 ? "Suma (+)" : w < 0 ? "Resta (−)" : "—";
      return [
        dbField(v.masterId),
        dbField(v.label),
        w.toFixed(2),
        pol,
        rangeText(v.masterId),
      ];
    });
    // #3: ~60 variables NO caben en una hoja → se CHUNKEAN (una hoja por bloque),
    // igual que la tabla de dimensión, para que el PDF no corte la tabla a mitad.
    const wrPages = chunk(rows, 16);
    addSection("Ponderación (verificación admin)", (n) =>
      wrPages.map((pageRows, pi) => (
        <div key={`wr-${pi}`} className="text-[12px]">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#165170ff]">
              {n}. Intervalos de ponderación
              {wrPages.length > 1 ? ` (${pi + 1}/${wrPages.length})` : ""}
            </h3>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              Solo admin · verificación
            </span>
          </div>
          {pi === 0 && (
            <p className="mt-1 text-[11px] leading-snug text-gray-600">
              Peso (con signo), polaridad y rango de medición (min–max) por variable
              ponderada, para verificar la normalización y el cálculo. El rango es el
              REAL de la master ({varRanges && Object.keys(varRanges).length > 0
                ? "backend · hexagon_meta"
                : "sin backend → s/d"}); el peso viene de BD en modo backend.
            </p>
          )}
          <MiniTable
            columns={["Código", "Variable", "Peso", "Polaridad", "Intervalo (min–max)"]}
            rows={pageRows}
          />
        </div>
      )),
    );
  }

  // Hoja de disclaimer.
  addSection("Disclaimer", (n) => [
    <div key="dis" className="text-[12px]">
      <h3 className="text-base font-bold text-[#165170ff]">
        {n}. {reportContent.disclaimerTitle}
      </h3>
      <p className="mt-2 leading-relaxed text-gray-600">{dbField(reportContent.disclaimerBody)}</p>
      <footer className="mt-6 border-t border-gray-200 pt-3 text-[11px] text-gray-400">
        Vento · ANH · EAFIT · Mavalan Software · {timestamp}
        {masterVersion ? ` · Datos: master ${masterVersion}` : ""}
      </footer>
    </div>,
  ]);

  // ── EMPAQUETADO MEDIDO: agrupar bloques en hojas A4 (sin huecos ni cortes) ──
  // Alto útil del contenido de una hoja = A4 (1123px) menos cabecera/pie/padding
  // de ReportSheet. GAP = separación vertical entre bloques apilados (gap-6).
  const SHEET_CONTENT_H = 940; // ≈ 1123 − cabecera − pie − padding, con holgura
  const BLOCK_GAP = 24; // gap-6 entre bloques apilados
  const packBlocks = (heights: number[]): number[][] => {
    const out: number[][] = [];
    let cur: number[] = [];
    let curH = 0;
    heights.forEach((h, i) => {
      const add = cur.length === 0 ? h : curH + BLOCK_GAP + h;
      if (cur.length > 0 && add > SHEET_CONTENT_H) {
        out.push(cur);
        cur = [i];
        curH = h;
      } else {
        cur.push(i);
        curH = add;
      }
    });
    if (cur.length) out.push(cur);
    return out;
  };

  // Mide las alturas reales de los bloques (capa oculta de más abajo) y recalcula
  // el empaquetado. Sin deps: corre en cada commit mientras el builder está
  // abierto, pero sólo hace setState si el empaquetado CAMBIA → converge en 1-2
  // renders, sin bucle. Al cambiar la config (bloques distintos) se re-mide solo.
  const blockCount = bodyContents.length;
  // Sin deps A PROPÓSITO (ver arriba): debe re-medir en cada commit, también
  // cuando un bloque cambia de alto sin cambiar `blockCount`. El guard de setState
  // evita el bucle; fijar deps rompería la re-medición.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!builderOpen) return;
    const els = measureRefs.current;
    const heights: number[] = [];
    for (let i = 0; i < blockCount; i++) {
      const el = els[i];
      if (!el) return; // aún no montado → espera al siguiente commit
      heights.push(el.offsetHeight);
    }
    const next = packBlocks(heights);
    // Patrón medir-DOM-y-acomodar: se mide tras el commit y se reempaqueta; el
    // guard (solo setState si cambia) evita el bucle. La regla no aplica a este
    // caso de medición de layout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPacks((prev) =>
      prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  });

  // Empaquetado efectivo: el medido si es consistente con los bloques actuales;
  // si no (1ª vez o la config acaba de cambiar), fallback a 1 bloque por hoja.
  const effectivePacks: number[][] =
    packs && packs.reduce((a, g) => a + g.length, 0) === bodyContents.length
      ? packs
      : bodyContents.map((_, i) => [i]);

  // Página real de cada sección según el empaquetado (cover = pág. 1; 1ª hoja del
  // cuerpo = pág. 2). Se aplica ANTES de construir el resumen (que lista el TOC).
  {
    const blockToSheet = new Map<number, number>();
    effectivePacks.forEach((arr, s) =>
      arr.forEach((bi) => blockToSheet.set(bi, s)),
    );
    for (const e of indexEntries) {
      if (e.startBlock < 0) continue; // resumen (cover): página 1
      const s = blockToSheet.get(e.startBlock);
      if (s != null) e.page = s + 2;
    }
  }

  // Hoja 1: índice (izq) + resumen ejecutivo (der).
  const summaryContent = (
    <div className="text-[13px]">
      {/* Fila superior: TOC (izq) + cabecera y mapa (der). SIN h-full → el TOC no
          se estira a todo el alto; solo abarca lo que mida esta fila. */}
      <div className="flex gap-6">
      <aside className="w-[36%] shrink-0 border-r border-gray-200 pr-4">
        <h4 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-gray-500">
          Índice del informe
        </h4>
        <ol className="flex flex-col gap-2">
          {indexEntries.map((e) => (
            <li
              key={e.n}
              className="flex items-baseline justify-between gap-2 border-b border-gray-100 pb-1.5"
            >
              <span className="text-gray-700">
                {e.n}. {e.title}
              </span>
              <span className="tabular-nums text-gray-400">{e.page}</span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
          Informe de idoneidad
        </p>
        <h3 className="text-lg font-bold text-[#165170ff]">Proyecto eólico</h3>
        <p className="text-[13px] text-gray-600">
          {region ?? "Área seleccionada"} · {fmtKm2.format(area)} km²
        </p>
        {centroid && (
          <p className="tabular-nums text-[12px] text-gray-400">
            {formatCoordenadas(centroid)}
          </p>
        )}
        <p className="text-[12px] text-gray-400">{timestamp}</p>

        <h4 className="mt-4 text-[12px] font-bold uppercase tracking-wide text-gray-500">
          Resumen ejecutivo
        </h4>
        {config.showMap && (
          <>
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
              {mapSnapshot ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob URL en cache
                <img
                  src={mapSnapshot}
                  alt="Mapa de calor del área seleccionada"
                  className="max-h-72 w-full object-contain bg-white"
                />
              ) : (
                <AreaMiniMap selectedHexes={selectedHexes} className="w-full" />
              )}
            </div>
            <ViridisLegend
              generalPct={scores.general}
              lowPct={idoneidadRange?.min}
              highPct={idoneidadRange?.max}
            />
            <AuditDataLabel uses={["mapa de calor: score_general por hex (master/global.parquet)"]} />
          </>
        )}

        <AuditDataLabel
          uses={[
            "gauge = índice general (global.parquet)",
            "gráfico = score por dimensión (criterios/*)",
          ]}
        />
      </div>
      </div>

      {/* A ANCHO COMPLETO de la hoja (fuera de las 2 columnas): el cliente pidió
          que el radar y las barras sean grandes. Al sacarlos de la columna derecha
          (64%), además el "Índice del informe" deja de estirarse a full-height. */}
      <div className="mt-6">
        {/* Fila: Índice de idoneidad (izq, al ancho del índice ~36%) + barras por
            dimensión (der). El cliente pidió el gauge a la izquierda y las barras a
            su derecha; las barras van coloreadas por su dimensión. */}
        <div className="flex items-stretch gap-4">
          <div className="flex w-[36%] shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Índice de idoneidad
            </p>
            <div style={{ width: 180 }}>
              <Gauge value={scores.general} size={170} className="w-full" />
            </div>
            {/* #35: rango de idoneidad (mín/máx del área) junto al puntaje global. */}
            {idoneidadRange && (
              <p className="mt-1 text-center text-[11px] text-gray-500">
                Rango del área:{" "}
                <b>
                  {idoneidadRange.min.toFixed(0)}–{idoneidadRange.max.toFixed(0)}
                </b>{" "}
                / 100
              </p>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center rounded-lg border border-gray-200 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Score por dimensión
            </p>
            {/* #32: escala + unidad del puntaje por dimensión. */}
            <p className="text-[10px] text-gray-400">Escala 0–100 (índice de idoneidad)</p>
            <ul className="mt-2 flex flex-col gap-2">
              {chartAxes.map((a) => (
                <li key={a.label} className="flex items-center gap-2 text-[13px]">
                  <span className="flex-1 text-gray-700">{a.label}</span>
                  <div className="relative h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, a.value))}%`,
                        backgroundColor: a.color ?? "#165170",
                      }}
                    />
                  </div>
                  <span
                    className="w-16 text-right tabular-nums font-semibold"
                    style={{ color: a.color ?? "#165170" }}
                  >
                    {a.value.toFixed(1)}
                    <span className="font-normal text-gray-400"> /100</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* #33: SÍNTESIS EJECUTIVA — resumen de resultados por dimensión, al inicio. */}
        {selectedHexes.size > 0 && chartAxes.length > 0 && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Síntesis ejecutiva
            </p>
            <p className="mt-1 text-[12px] text-gray-700">
              El área analizada obtiene un índice de idoneidad global de{" "}
              <b>{scores.general.toFixed(1)} / 100</b>
              {idoneidadRange
                ? ` (rango del área ${idoneidadRange.min.toFixed(0)}–${idoneidadRange.max.toFixed(0)})`
                : ""}
              . Desempeño por dimensión:
            </p>
            <ul className="mt-1.5 flex flex-col gap-1 text-[12px] text-gray-700">
              {chartAxes.map((a) => {
                const band =
                  a.value >= 66
                    ? "idoneidad alta"
                    : a.value >= 33
                      ? "idoneidad media"
                      : "idoneidad baja";
                return (
                  <li key={a.label}>
                    <b style={{ color: a.color ?? "#165170" }}>{a.label}:</b>{" "}
                    {a.value.toFixed(1)} / 100 — {band}.
                  </li>
                );
              })}
            </ul>
          </div>
        )}

      </div>
    </div>
  );

  // HOJAS = cover (resumen) + una hoja por grupo del empaquetado medido. Varios
  // bloques por hoja (apilados con gap-6) → sin huecos ni cortes. El preview y la
  // captura del PDF iteran estas MISMAS hojas (selector [data-report-sheet]).
  const totalSheets = 1 + effectivePacks.length;
  const sheets = [
    <ReportSheet key="cover" region={region} index={0} total={totalSheets}>
      {summaryContent}
    </ReportSheet>,
    ...effectivePacks.map((group, s) => (
      <ReportSheet key={s} region={region} index={s + 1} total={totalSheets}>
        <div className="flex flex-col gap-6">
          {group.map((bi) => (
            <div key={bi}>{bodyContents[bi]}</div>
          ))}
        </div>
      </ReportSheet>
    )),
  ];

  // Capa OCULTA de medición: renderiza cada bloque del cuerpo al ancho útil de la
  // hoja (714px = 794 − padding px-10×2) con la misma fuente, para medir su alto
  // real (offsetHeight) y empaquetar. visibility:hidden conserva el layout (a
  // diferencia de display:none). Sólo se monta con el builder abierto.
  const measureLayer = builderOpen ? (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: -99999,
        top: 0,
        width: 714,
        visibility: "hidden",
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      {bodyContents.map((c, i) => (
        <div
          key={i}
          ref={(el) => {
            measureRefs.current[i] = el;
          }}
        >
          {c}
        </div>
      ))}
    </div>
  ) : null;

  // Escala de las hojas en la malla del builder: tamaño real al capturar el PDF,
  // miniatura para la vista.
  const previewScale = capturing ? 1 : 0.42;

  // ── PDF: una HOJA = una PÁGINA A4 (captura por hoja) ───────────────────

  const handleDownloadPdf = async () => {
    const root = reportRef.current;
    if (!root) return;
    setIsExporting(true);
    setError(null);
    setCapturing(true); // hojas a tamaño real para capturar nítido
    // FUENTE CONSISTENTE EN EL PDF: la app usa Geist (fuente VARIABLE de
    // next/font), que html2canvas renderiza mal → parte del texto caía a una
    // fuente de reserva (y sus cursivas se veían como "otra fuente"). Forzamos
    // Arial/Helvetica (fuente de sistema que html2canvas pinta siempre bien,
    // upright e itálica) en TODO el informe durante la captura, y coincide con
    // la Helvetica de los charts vectoriales (svg2pdf) → PDF tipográficamente
    // uniforme. Se revierte en el finally. `!important` para ganar a Tailwind.
    const fontOverride = document.createElement("style");
    fontOverride.textContent =
      '[data-report-sheet], [data-report-sheet] * { font-family: Helvetica, Arial, sans-serif !important; }';
    try {
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
      );
      await new Promise((r) => setTimeout(r, 80));
      // Espera a que las fuentes terminen de cargar (evita capturas con fallback).
      try {
        await document.fonts?.ready;
      } catch {
        /* fonts API ausente/antigua → seguir */
      }
      document.head.appendChild(fontOverride);

      const sheetEls = Array.from(
        root.querySelectorAll<HTMLElement>("[data-report-sheet]"),
      );
      if (sheetEls.length === 0) throw new Error("No hay hojas para exportar");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true, // deflate del stream → PDF más liviano (Fase 4)
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Metadatos del documento (Fase 4): título/autor/asunto → buscable e
      // identificable en gestores de archivos y visores de PDF.
      try {
        pdf.setProperties({
          title: `Informe de idoneidad eólica${region ? ` — ${region}` : ""}`,
          subject: "Evaluación multicriterio de idoneidad para energía eólica",
          author: "Vento",
          creator: "Vento",
          keywords: "eólica, idoneidad, MCDM, SIG, informe",
        });
      } catch (err) {
        console.warn("[pdfExport] setProperties falló:", err);
      }

      // NITIDEZ vs MEMORIA (#5): a scale 1.5 el A4 salía borroso ("imagen
      // estirada"). html2canvas a scale 2 rasteriza 4× píxeles/hoja (antes el
      // navegador llegaba a ~4 GB con muchas hojas). Como cada canvas se LIBERA
      // (width/height=0) + se cede un tick antes de la siguiente, el pico es de ~1
      // canvas → podemos subir a 2 para informes normales (≤12 hojas) y solo caer a
      // 1.5 en informes muy largos (defensa de memoria).
      // Cada hoja se captura por separado (A4 ≈ 1588×2246 px a escala 2, muy por
      // debajo del límite de canvas), así que escala 2 aguanta muchas hojas sin
      // pixelar. Antes bajaba a 1.5 pasadas 20 hojas y el desglose por dimensión
      // (#36) cruzaba ese umbral → pixelado. Umbral subido a 40.
      const CAPTURE_SCALE = totalSheets <= 40 ? 2 : 1.5;
      const SLICE_EPS_MM = 2; // franja mínima sobrante: no añade página casi vacía

      // Rasteriza una hoja a JPEG y LIBERA el canvas. `hideCharts` = oculta los
      // charts SVG (visibility) para dejar su hueco en blanco y pintarlos luego
      // como vector encima (Fase 1 PDF nativo). Devuelve el dataURL + dimensiones.
      const rasterSheet = async (el: HTMLElement, hideCharts: SVGSVGElement[]) => {
        const prev = hideCharts.map((c) => c.style.visibility);
        hideCharts.forEach((c) => (c.style.visibility = "hidden"));
        try {
          const canvas = await html2canvas(el, {
            scale: CAPTURE_SCALE,
            backgroundColor: "#ffffff",
            imageTimeout: 5000,
            ignoreElements: (n) =>
              (n as HTMLElement).getAttribute?.("data-pdf-ignore") === "true",
          });
          const data = canvas.toDataURL("image/jpeg", 0.95);
          const w = canvas.width;
          const h = canvas.height;
          canvas.width = 0; // libera YA: evita acumular canvases en RAM
          canvas.height = 0;
          return { data, w, h };
        } finally {
          hideCharts.forEach((c, k) => (c.style.visibility = prev[k]));
        }
      };

      // Capa de TEXTO SELECCIONABLE/BUSCABLE (Fase 3): dibuja texto INVISIBLE
      // (renderingMode "invisible") encima del raster, en la posición real de cada
      // nodo de texto (Range.getBoundingClientRect). Así el PDF es copiable/buscable
      // sin tocar lo que se ve — si algo se desalinea, es invisible (cero regresión
      // visual). Se salta texto dentro de charts (ya va vectorial) y de zonas
      // marcadas data-pdf-ignore. Best-effort: cualquier fallo se ignora.
      const PT_PER_MM = 72 / 25.4; // px→mm→pt para setFontSize
      const addTextLayer = (
        el: HTMLElement,
        sheetRect: DOMRect,
        pxToMm: number,
        basePage: number,
      ) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
          acceptNode(n) {
            if (!n.nodeValue || !n.nodeValue.trim())
              return NodeFilter.FILTER_REJECT;
            const p = n.parentElement;
            if (!p || p.closest('svg,[data-pdf-ignore="true"]'))
              return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        let node: Node | null;
        let count = 0;
        while ((node = walker.nextNode()) && count < 6000) {
          const txt = node.nodeValue!.replace(/\s+/g, " ").trim();
          if (!txt) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          const rect = range.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          const topMm = (rect.top - sheetRect.top) * pxToMm;
          const pageIdx = Math.max(0, Math.floor(topMm / pageH));
          const x = (rect.left - sheetRect.left) * pxToMm;
          const cs = window.getComputedStyle(node.parentElement!);
          const fsPx = parseFloat(cs.fontSize) || 10;
          // baseline ≈ borde inferior menos un pequeño descenso; y relativo a su página.
          const y =
            (rect.bottom - sheetRect.top) * pxToMm -
            pageIdx * pageH -
            fsPx * pxToMm * 0.2;
          pdf.setPage(Math.min(basePage + pageIdx, pdf.getNumberOfPages()));
          pdf.setFontSize(fsPx * pxToMm * PT_PER_MM);
          pdf.text(txt, x, y, {
            renderingMode: "invisible",
            baseline: "alphabetic",
          });
          count++;
        }
      };

      for (let i = 0; i < sheetEls.length; i++) {
        const el = sheetEls[i];
        setExportMsg(`Hoja ${i + 1} de ${sheetEls.length}…`);
        setExportPct(Math.round((i / sheetEls.length) * 100));
        // deja pintar el overlay/progreso antes del trabajo pesado (bloqueante).
        await new Promise((r) => setTimeout(r, 0));
        if (i > 0) pdf.addPage();

        const basePage = pdf.getNumberOfPages(); // 1ª página de ESTA hoja

        // Bookmark/índice navegable (Fase 4): una entrada por hoja apuntando a su
        // 1ª página. Toma el 1er encabezado del DOM como etiqueta, si no "Hoja N".
        // `outline` es un plugin de jsPDF sin tipos → acceso acotado + try/catch.
        try {
          const heading = el
            .querySelector("h1,h2,h3,[data-sheet-title]")
            ?.textContent?.trim();
          const label = (heading || `Hoja ${i + 1}`).slice(0, 80);
          const outline = (
            pdf as unknown as {
              outline?: {
                add: (
                  parent: unknown,
                  title: string,
                  options: { pageNumber: number },
                ) => unknown;
              };
            }
          ).outline;
          outline?.add(null, label, { pageNumber: basePage });
        } catch (err) {
          console.warn("[pdfExport] bookmark de hoja falló:", err);
        }

        const sheetRect = el.getBoundingClientRect();
        const pxToMm = pageW / sheetRect.width; // hoja escalada al ANCHO A4
        const charts = Array.from(
          el.querySelectorAll<SVGSVGElement>('svg[role="img"]'),
        );

        // Pinta un raster (dataURL) repartido en páginas por offset vertical si
        // es más alto que A4 (slicing) — no recorta contenido alto (#1).
        const addSlicedRaster = (data: string, w: number, h: number) => {
          const imgH = (h * pageW) / w;
          let position = 0;
          let heightLeft = imgH;
          pdf.addImage(data, "JPEG", 0, position, pageW, imgH);
          heightLeft -= pageH;
          // 2 mm ≈ 7 px @96dpi: no añade una página por una franja de redondeo.
          while (heightLeft > SLICE_EPS_MM) {
            position -= pageH;
            pdf.addPage();
            pdf.addImage(data, "JPEG", 0, position, pageW, imgH);
            heightLeft -= pageH;
          }
        };

        try {
          // RUTA VECTOR (Fase 2): funciona a CUALQUIER altura. Rasteriza la hoja
          // con los charts ocultos (slicing multipágina) y luego pinta cada chart
          // como VECTOR sobre la página que le toca (por su offset vertical).
          const { data, w, h } = await rasterSheet(el, charts);
          addSlicedRaster(data, w, h);

          for (const svg of charts) {
            const r = svg.getBoundingClientRect();
            const yGlobal = (r.top - sheetRect.top) * pxToMm;
            const pageIdx = Math.max(0, Math.floor(yGlobal / pageH));
            const x = (r.left - sheetRect.left) * pxToMm;
            const y = yGlobal - pageIdx * pageH; // offset dentro de su página
            const wmm = r.width * pxToMm;
            const hmm = r.height * pxToMm;
            // clamp: por redondeo el índice podría exceder las páginas creadas.
            pdf.setPage(Math.min(basePage + pageIdx, pdf.getNumberOfPages()));
            try {
              await svg2pdf(svg, pdf, { x, y, width: wmm, height: hmm });
            } catch (err) {
              // SIN fallback a html2canvas (es el motor lento que revienta prod):
              // si un chart falla en vector, se deja el hueco y se sigue. Se
              // prioriza descarga rápida y estable sobre rescatar un gráfico suelto.
              console.warn("[pdfExport] chart vector falló, se omite (sin fallback raster):", err);
            }
          }
          pdf.setPage(pdf.getNumberOfPages()); // vuelve a la última antes de seguir
        } catch (err) {
          // SIN reintento: si el raster base de la hoja falla, se registra y se
          // sigue (no reintentamos con html2canvas — es lo que ralentiza y
          // revienta prod). La hoja puede quedar vacía; se prioriza estabilidad.
          console.warn("[pdfExport] raster de hoja falló, se omite la hoja:", err);
        }

        // Capa de texto seleccionable encima (best-effort; no rompe si falla).
        try {
          addTextLayer(el, sheetRect, pxToMm, basePage);
          pdf.setPage(pdf.getNumberOfPages());
        } catch (err) {
          console.warn("[pdfExport] capa de texto seleccionable falló:", err);
        }
      }

      setExportMsg("Guardando el PDF…");
      setExportPct(100);
      pdf.save(`informe-vento-${Date.now()}.pdf`);
      toast.success("Informe descargado correctamente");
    } catch (e) {
      console.error("[pdfExport]", e);
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(`No se pudo generar el PDF: ${msg}`);
      toast.error(`No se pudo generar el PDF: ${msg}`);
    } finally {
      fontOverride.remove(); // quita el override de fuente de la captura
      setCapturing(false);
      setIsExporting(false);
      setExportMsg("");
      setExportPct(null);
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
        // #29: nombre autogenerado con LOCALIDAD + FECHA/HORA.
        nombre: `${region ?? "Idoneidad"} · ${new Date().toLocaleString("es-CO", {
          dateStyle: "short",
          timeStyle: "short",
        })}`,
        hexes: compactHexes(Array.from(selectedHexes)),
        variables: Array.from(activeVariables),
        caracteristicas: caracteristicasState,
        scores,
        region: region ?? null,
        areaKm2: area,
        reportConfig: config,
      });
      setSaved(true);
      toast.success("Informe guardado en el histórico");
    } catch {
      toast.error("No se pudo guardar el informe en el histórico");
    } finally {
      setIsSaving(false);
    }
  };

  // Vista inline de la fase informe (SIN editor): resumen + acciones. El editor
  // + la malla viven en la ventana de pantalla completa (ReportBuilder), que se
  // abre al Previsualizar o Descargar.
  const inline = (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-[12px] uppercase tracking-widest text-gray-400">
          Informe de idoneidad
        </p>
        <h2 className="text-lg font-bold text-[#165170ff]">
          Idoneidad eólica{region ? ` — ${region}` : ""}
        </h2>
        <p className="text-sm text-gray-600">
          {fmtKm2.format(area)} km² · {totalSheets}{" "}
          {totalSheets === 1 ? "hoja" : "hojas"}
        </p>

        {/* Modo template: herramienta de generación de la guía de geocodes (OSM). */}
        {USE_PLACEHOLDER_FALLBACK && <GeocodesDownloadButton />}

        {/* #34: acciones en la CABECERA del informe (antes estaban al final). */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#165170ff] px-4 py-1.5 text-xs font-semibold text-[#165170ff] hover:bg-[#cce1eeff]/40"
          >
            <Maximize2 size={14} /> Previsualizar
          </button>
          <button
            type="button"
            onClick={handleGuardarHistorial}
            disabled={isSaving || saved}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold disabled:opacity-70 ${
              saved
                ? "cursor-default border-emerald-500 text-emerald-600"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {saved ? "✓ Guardado" : isSaving ? "Guardando…" : "Guardar en histórico"}
          </button>
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="rounded-full bg-[#165170ff] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1e6a8c]"
          >
            Descargar PDF
          </button>
          {/* Limpiar: resetea selección, variables y características, borra el
              borrador guardado y vuelve al mapa limpio. */}
          <button
            type="button"
            onClick={clearFlow}
            title="Limpiar todo (selección, dimensiones y características) y volver al mapa"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
            </svg>
            Limpiar
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <Gauge value={scores.general} size={170} className="max-w-[210px]" />
        </div>
        <ul className="mt-2 flex flex-col gap-1">
          {chartAxes.map((a) => (
            <li key={a.label} className="flex items-center gap-2 text-[13px]">
              <span className="flex-1 text-gray-700">{a.label}</span>
              <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-[#165170ff]"
                  style={{ width: `${Math.max(0, Math.min(100, a.value))}%` }}
                />
              </div>
              <span className="w-10 text-right tabular-nums font-semibold text-[#165170ff]">
                {a.value.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );

  return (
    <>
      {inline}
      {measureLayer}
      {builderOpen && (
        <ReportBuilder
          region={region}
          totalSheets={totalSheets}
          sheets={sheets}
          scale={previewScale}
          mallaRef={reportRef}
          config={config}
          scorableDims={scorableDims}
          onPatch={patchConfig}
          onToggleDim={toggleDim}
          onCancel={() => setBuilderOpen(false)}
          onDownload={handleDownloadPdf}
          isExporting={isExporting}
        />
      )}

      {/* Overlay de carga durante la descarga del PDF: da feedback claro (antes
          "parecía no descargar nunca" porque html2canvas sobre varias hojas tarda).
          Va por PORTAL a <body>: si se renderiza dentro del árbol del informe, un
          ancestro con transform/filter ancla el `fixed` a la subpágina y el overlay
          queda "encerrado" en vez de cubrir toda la pantalla. */}
      {isExporting && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex w-72 flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#165170ff] border-t-transparent" />
              <p className="text-sm font-medium text-gray-700">Generando el informe PDF…</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#165170ff] transition-all duration-300"
                  style={{ width: exportPct != null ? `${exportPct}%` : "50%" }}
                />
              </div>
              <p className="text-center text-[13px] text-gray-400">
                {exportMsg || "Puede tardar unos segundos según el número de hojas."} No cierres la página.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
