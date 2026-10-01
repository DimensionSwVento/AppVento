"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import ReportSheet from "./ReportSheet";
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
import ConfirmDialog from "../ui/ConfirmDialog";
import { SNAPSHOT_KEY } from "../../Utils/h3/h3Resolution";
import { selectionNature } from "../../Utils/h3/hexClassification";
import { dimensionScore } from "../../Utils/report/heatmapPalette";
import { useAreaScores } from "../../Utils/report/useAreaScores";
import {
  areaVariableAverage,
  normCode,
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
import { cellToChildren, cellToParent, getResolution } from "h3-js";
import { useToast } from "../ui/Toast";
import {
  useCaracteristicas,
  type CaracteristicasState,
} from "../../Utils/contexts/CaracteristicasContext";
import { useHistorial } from "../../Utils/historial/HistorialContext";

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
const FIRST_SHEET_ROWS = 6;
const CONT_SHEET_ROWS = 11;

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
      <table className="w-full border-collapse text-[9px]">
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
            className="absolute bottom-0 -translate-x-1/2 text-[9px] leading-none text-[#165170ff]"
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
        <div className="mt-0.5 text-center text-[8px] font-semibold text-[#165170ff]">
          Idoneidad general: {gen.toFixed(0)} / 100
        </div>
      )}
      <div className="mt-0.5 flex justify-between text-[8px] text-gray-500">
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
  // Rol admin: habilita la exportación de datos crudos por hexágono.
  const isAdmin = useIsAdmin();
  const reportRef = useRef<HTMLDivElement>(null);
  // #18: aviso previo a exportar "datos por hexágono" (nº hex × columnas; con
  // muchos hexágonos la imagen sale muy pesada → se recomienda con pocos).
  const [hexExportWarn, setHexExportWarn] = useState<{ n: number; c: number } | null>(null);
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
    if (config.chartType === "pie")
      return <PieChart data={axes} className="w-full max-w-[300px]" />;
    if (config.chartType === "bar")
      return <BarChart data={axes} className="w-full max-w-[320px]" />;
    if (axes.length >= 3)
      return <RadarChart axes={axes} className="w-full max-w-[280px]" />;
    return <BarChart data={axes} className="w-full max-w-[320px]" />;
  };

  // ── Construcción de las HOJAS del informe ──────────────────────────────
  const indexEntries: { n: number; title: string; page: number }[] = [
    { n: 1, title: "Resumen ejecutivo", page: 1 },
  ];
  const bodyContents: ReactNode[] = [];
  const addSection = (title: string, build: (n: number) => ReactNode[]) => {
    const n = indexEntries.length + 1;
    const page = bodyContents.length + 2; // la hoja 1 es el resumen
    indexEntries.push({ n, title, page });
    build(n).forEach((c) => bodyContents.push(c));
  };

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
        return pages.map((pr, pi) => (
          <div key={pi} className="flex h-full flex-col text-[10px]">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-bold text-[#165170ff]">
                {n}. Dimensión {dl}
                {pages.length > 1 ? ` (${pi + 1}/${pages.length})` : ""}
              </h3>
              <span className="rounded bg-[#cce1eeff] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#165170ff]">
                Puntúa
              </span>
            </div>

            {pi === 0 && (
              <>
                {/* Esquinas: score de la dimensión + peso sobre el índice general */}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border-2 border-[#165170ff] p-3 text-center">
                    <p className="text-[8px] font-semibold uppercase tracking-wide text-gray-500">
                      Score de la dimensión
                    </p>
                    <p className="text-4xl font-extrabold leading-none text-[#165170ff]">
                      {dimScore.toFixed(0)}
                    </p>
                    <p className="text-[8px] text-gray-400">de 100</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 text-center">
                    <p className="text-[8px] font-semibold uppercase tracking-wide text-gray-500">
                      Peso en el índice general
                    </p>
                    <p className="text-4xl font-extrabold leading-none text-gray-700">
                      {pesoDim.toFixed(0)}%
                    </p>
                    <p className="text-[8px] text-gray-400">
                      aporta {((dimScore * pesoDim) / 100).toFixed(1)} pts
                    </p>
                  </div>
                </div>

                {/* Variables que más influyen (barras suma/resta) */}
                {config.showInfluencers && influ.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
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
                <h4 className="mt-3 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                  Variables consideradas
                </h4>
                <MiniTable
                  columns={[
                    "Código",
                    "Variable",
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
                      <li key={r.label} className="text-[9px] leading-snug text-gray-600">
                        <b className="text-gray-700">{dbField(r.label)}:</b>{" "}
                        {dbField(r.description)}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* Detalle de variables EXCLUYENTES de la dimensión (US06-03) */}
            {pi === pages.length - 1 && config.showExcluyentes && excl.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-100 bg-red-50/50 p-2.5">
                <p className="text-[10px] font-bold text-red-700">
                  Variables excluyentes
                </p>
                <p className="text-[9px] text-red-500/90">
                  Restricciones duras: su presencia puede excluir el emplazamiento.
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {excl.map((e) => (
                    <li key={e.label} className="text-[9px] text-gray-700">
                      <b>{dbField(e.label)}:</b> {dbField(e.description)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Variables INFORMATIVAS de ESTA dimensión (no puntúan), TRAS su tabla
                (#10) — antes salían todas juntas en una hoja global al final. */}
            {pi === pages.length - 1 &&
              config.showInformative &&
              informativeRows.some((r) => r.dimension === d.id) && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/60 p-2.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-[#165170ff]">
                      Variables informativas
                    </p>
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-gray-600">
                      No puntúa
                    </span>
                  </div>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {informativeRows
                      .filter((r) => r.dimension === d.id)
                      .map((r) => (
                        <li key={r.id} className="text-[9px] leading-snug text-gray-700">
                          <b>{dbField(r.label)}</b>
                          {r.valueText ? <> — {dbField(r.valueText)}</> : null}
                          {r.description ? (
                            <span className="text-gray-500">: {dbField(r.description)}</span>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

            {pi === pages.length - 1 && config.showModelDetail && (
              <div className="mt-auto rounded-lg bg-gray-50 p-2.5">
                <p className="text-[10px] font-bold text-[#165170ff]">
                  Resumen del cálculo
                </p>
                {/* El modelo produce cada dimensión/global en escala 1–5 con una
                    fórmula de pesos (TEMPORAL — el cliente la ajusta). Aquí se
                    muestra el RESULTADO 1–5 y su normalización a 0–100. */}
                <p className="mt-0.5 font-mono text-[9px] text-gray-700">
                  Dimensión = {calcText.formulaDimension} ={" "}
                  <b>{(1 + (dimScore / 100) * 4).toFixed(1)}</b> (escala 1–5)
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-gray-700">
                  → normalizado (v−1)/4×100 = ({(1 + (dimScore / 100) * 4).toFixed(1)}−1)/4×100
                  = <b>{dimScore.toFixed(1)} / 100</b>
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-gray-700">
                  Índice general = {calcText.formulaGeneral} ={" "}
                  <b>{(1 + (scores.general / 100) * 4).toFixed(1)}</b> (1–5) → normalizado
                  = <b>{scores.general.toFixed(1)} / 100</b>
                </p>
                <p className="mt-1 text-[8px] italic leading-snug text-gray-500">
                  {calcText.metodologiaNota}
                </p>
                <AuditDataLabel
                  uses={[
                    "score por dimensión (criterios/*.parquet o master + pesos)",
                    "índice general (global.parquet o Σ peso_dim·score_dim)",
                    "pesos AHP (model_weight)",
                  ]}
                />
              </div>
            )}
          </div>
        ));
      });
    });

  // Hoja económica (informativa).
  if (showEconomica) {
    addSection("Dimensión económica (Inf.)", (n) => [
      <div key="eco" className="text-[10px]">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#165170ff]">
            {n}. Dimensión económica
          </h3>
          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-600">
            Informativa · no puntúa
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-600">
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
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-snug text-amber-800">
            {escActivo.impacto}
          </p>
        )}
        <AuditDataLabel uses={["serie económica por escenario/variable/año (economic_series)"]} />
        {/* Cómo interpretar (US04-02) */}
        <p className="mt-1 text-[9px] leading-snug text-gray-500">
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
        <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-800">
          Esta dimensión ayuda en la toma de decisiones pero <b>no se puntúa</b>{" "}
          en el modelo de idoneidad.
        </p>
        {/* Impuestos / incentivos clave del proyecto */}
        <h4 className="mt-3 text-[9px] font-bold uppercase tracking-wide text-gray-500">
          Impuestos e incentivos clave
        </h4>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {reportContent.incentivos.map((it) => (
            <div
              key={it.label}
              className="flex items-baseline justify-between rounded-md border border-gray-200 px-2 py-1.5"
            >
              <span className="text-[10px] text-gray-700">{dbField(it.label)}</span>
              <span className="text-[10px] font-semibold text-[#165170ff]">
                {dbField(it.value)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9px] italic text-gray-400">
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
    if (activeNormas.length > 0)
    addSection("Dimensión regulatoria (Inf.)", (n) => [
      <div key="reg" className="text-[10px]">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#165170ff]">
            {n}. Dimensión regulatoria
          </h3>
          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-600">
            Informativa · no puntúa
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-600">
          Marco normativo nacional aplicable al proyecto eólico.
        </p>
        <p className="mt-1 text-[9px] italic text-gray-500">
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
                    className="text-[8px] font-semibold"
                    style={{ color: m.color }}
                  >
                    {m.label}
                  </p>
                </div>
              );
            },
          )}
        </div>
        <h4 className="mt-4 text-[9px] font-bold uppercase tracking-wide text-gray-500">
          Normas aplicables al proyecto
        </h4>
        <ul className="mt-1 flex flex-col gap-1">
          {activeNormas.map((no) => {
            const m = NORMA_ESTADO_META[no.estado];
            return (
              <li
                key={no.id}
                className="flex items-start justify-between gap-2 border-b border-gray-100 pb-1"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-700">{dbField(no.nombre)}</p>
                  <p className="text-[9px] leading-snug text-gray-500">
                    {dbField(no.descripcion)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold"
                  style={{ backgroundColor: m.bg, color: m.color }}
                >
                  {m.label}
                </span>
              </li>
            );
          })}
        </ul>
        <h4 className="mt-3 text-[9px] font-bold uppercase tracking-wide text-gray-500">
          Autoridades competentes
        </h4>
        <ul className="mt-1 grid grid-cols-2 gap-1">
          {REGULATORY_AUTHORITIES.map((a) => (
            <li key={a.sigla} className="text-[9px] text-gray-600">
              <b>{dbField(a.sigla)}</b> — {dbField(a.nombre)}
            </li>
          ))}
        </ul>
      </div>,
    ]);
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
      const pages = chunk(globalInformative, 12);
      return pages.map((pr, pi) => (
        <div key={pi} className="text-[10px]">
          <h3 className="text-base font-bold text-[#165170ff]">
            {n}. Variables informativas
            {pages.length > 1 ? ` (${pi + 1}/${pages.length})` : ""}
          </h3>
          <p className="mt-0.5 text-[9px] text-gray-500">
            No puntúan en el modelo; aportan contexto. Se muestra su valor sobre
            el área y qué representa cada una.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {pr.map((r) => (
              <li key={r.id} className="border-b border-gray-100 pb-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-gray-700">{dbField(r.label)}</span>
                  <span className="shrink-0 font-mono text-[#165170ff]">
                    {dbField(`${r.valueText}${r.unit ? ` ${r.unit}` : ""}`)}
                  </span>
                </div>
                <p className="text-[9px] leading-snug text-gray-500">
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
    addSection("Fuentes de datos", (n) => [
      <div key="src" className="text-[10px]">
        <h3 className="text-base font-bold text-[#165170ff]">
          {n}. Fuentes de datos
        </h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="bg-[#165170ff] text-left text-white">
                <th className="px-2 py-1 font-semibold">Fuente</th>
                <th className="px-2 py-1 font-semibold">Versión</th>
                <th className="px-2 py-1 font-semibold">Enlace</th>
              </tr>
            </thead>
            <tbody>
              {sourceRows.map((s) => (
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

        {sourcesByDim.length > 0 && (
          <>
            <h4 className="mt-3 text-[9px] font-bold uppercase tracking-wide text-gray-500">
              Fuentes por dimensión
            </h4>
            <MiniTable
              columns={["Dimensión", "Fuentes consultadas"]}
              rows={sourcesByDim.map((s) => [s.label, s.fuentes.join(", ")])}
            />
          </>
        )}

        <p className="mt-2 text-[9px] italic leading-snug text-gray-500">
          {calcText.metodologiaNota}
        </p>

        {/* Trazabilidad: cómo verificar el informe de lo agregado a lo crudo. */}
        <div className="mt-3 rounded-lg border border-[#165170ff]/30 bg-[#cce1eeff]/25 p-2.5">
          <p className="text-[10px] font-bold text-[#165170ff]">
            Trazabilidad y verificación
          </p>
          <p className="mt-0.5 text-[9px] leading-snug text-gray-600">
            Este informe es verificable de arriba hacia abajo; cada nivel se
            calcula del siguiente:
          </p>
          <ol className="mt-1 flex flex-col gap-0.5 text-[9px] leading-snug text-gray-700">
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
          <p className="mt-1 text-[8px] italic leading-snug text-gray-500">
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
    addSection("Ponderación (verificación admin)", (n) => [
      <div key="wr" className="text-[10px]">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#165170ff]">
            {n}. Intervalos de ponderación
          </h3>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
            Solo admin · verificación
          </span>
        </div>
        <p className="mt-1 text-[9px] leading-snug text-gray-600">
          Peso (con signo), polaridad y rango de medición (min–max) por variable
          ponderada, para verificar la normalización y el cálculo. El rango es el
          REAL de la master ({varRanges && Object.keys(varRanges).length > 0
            ? "backend · hexagon_meta"
            : "sin backend → s/d"}); el peso viene de BD en modo backend.
        </p>
        <MiniTable
          columns={["Código", "Variable", "Peso", "Polaridad", "Intervalo (min–max)"]}
          rows={rows}
        />
      </div>,
    ]);
  }

  // Hoja de disclaimer.
  addSection("Disclaimer", (n) => [
    <div key="dis" className="text-[10px]">
      <h3 className="text-base font-bold text-[#165170ff]">
        {n}. {reportContent.disclaimerTitle}
      </h3>
      <p className="mt-2 leading-relaxed text-gray-600">{dbField(reportContent.disclaimerBody)}</p>
      <footer className="mt-6 border-t border-gray-200 pt-3 text-[9px] text-gray-400">
        Vento · ANH · EAFIT · Mavalan Software · {timestamp}
        {masterVersion ? ` · Datos: master ${masterVersion}` : ""}
      </footer>
    </div>,
  ]);

  // Hoja 1: índice (izq) + resumen ejecutivo (der).
  const summaryContent = (
    <div className="flex h-full gap-6 text-[11px]">
      <aside className="w-[36%] shrink-0 border-r border-gray-200 pr-4">
        <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
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
              <span className="font-mono text-gray-400">{e.page}</span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400">
          Informe de viabilidad
        </p>
        <h3 className="text-lg font-bold text-[#165170ff]">Proyecto eólico</h3>
        <p className="text-[11px] text-gray-600">
          {region ?? "Área seleccionada"} · {fmtKm2.format(area)} km²
        </p>
        {centroid && (
          <p className="font-mono text-[10px] text-gray-400">
            {formatCoordenadas(centroid)}
          </p>
        )}
        <p className="text-[10px] text-gray-400">{timestamp}</p>

        <h4 className="mt-4 text-[10px] font-bold uppercase tracking-wide text-gray-500">
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
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-lg border border-gray-200 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
              Índice de viabilidad
            </p>
            <Gauge value={scores.general} size={150} className="w-full max-w-[180px]" />
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
              Desempeño por dimensión
            </p>
            {selectedHexes.size > 0 ? (
              renderChart(chartAxes)
            ) : (
              <p className="py-6 text-[10px] text-gray-400">Sin área</p>
            )}
          </div>
        </div>

        <ul className="mt-3 flex flex-col gap-1">
          {chartAxes.map((a) => (
            <li key={a.label} className="flex items-center gap-2 text-[10px]">
              <span className="flex-1 text-gray-700">{a.label}</span>
              <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-[#165170ff]"
                  style={{ width: `${Math.max(0, Math.min(100, a.value))}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono font-semibold text-[#165170ff]">
                {a.value.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>

        {config.showInfluencers && topInfluencers.length > 0 && (
          <div className="mt-3">
            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
              Variables que más influyen
            </p>
            <div className="mt-1 flex justify-center">
              <DivergingBars
                bars={topInfluencers}
                width={420}
                className="w-full max-w-[420px]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const allContents: ReactNode[] = [summaryContent, ...bodyContents];
  const totalSheets = allContents.length;
  const sheets = allContents.map((c, i) => (
    <ReportSheet key={i} region={region} index={i} total={totalSheets}>
      {c}
    </ReportSheet>
  ));

  // Escala de las hojas en la malla del builder: tamaño real al capturar el PDF,
  // miniatura para la vista.
  const previewScale = capturing ? 1 : 0.42;

  // ── PDF: una HOJA = una PÁGINA A4 (captura por hoja) ───────────────────
  // #18: al pulsar "datos por hexágono" se muestra primero un aviso con el tamaño
  // (nº hex × columnas); con muchos hexágonos la imagen sale muy pesada. El export
  // real (handleDownloadHexTable) se dispara al confirmar.
  const requestHexTable = () => {
    const n = areaData?.size ?? 0;
    if (n === 0) {
      toast.error("No hay datos por hexágono para exportar (requiere backend).");
      return;
    }
    const c = VARIABLES.filter((v) => v.masterId !== "NA").length;
    setHexExportWarn({ n, c });
  };

  // Exportación ADMIN: imagen (PNG) de una tabla con una fila por hexId y los
  // datos de cada variable del modelo (columna = masterId). Requiere datos por
  // hex del backend (`areaData`). Aparece solo para admin en el informe final.
  const handleDownloadHexTable = async () => {
    if (!areaData || selectedHexes.size === 0) {
      toast.error("No hay datos por hexágono para exportar (requiere backend).");
      return;
    }
    const hexVal = (
      vars: Record<string, number> | undefined,
      masterId: string,
    ): number | null => {
      if (!vars || masterId === "NA") return null;
      // Match UNIVERSAL por código normalizado (ignora - _ y mayúsculas): casa la
      // clave del JSONB sea AMB_012_A, AMB-012-A, etc. (igual que hexVariableValue).
      const target = normCode(masterId);
      for (const key of Object.keys(vars)) {
        if (typeof vars[key] === "number" && normCode(key) === target) return vars[key];
      }
      return null;
    };
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Los datos por hexágono en BD SIEMPRE están a res 8. La selección puede estar
    // a otra resolución (el piso de selección es res 7, y al acercarse el zoom se
    // selecciona más fino, res > 8). Hay que normalizar a EXACTAMENTE res 8 —igual
    // que el heatmap del informe— o `areaData` (res 8) no casa y todo sale "—":
    //   res > 8  → celda padre res 8 (varias caen en la misma → dedup)
    //   res == 8 → tal cual
    //   res < 8  → hijos res 8 (celdas compactadas al guardar, res 6/7)
    const DATA_H3_RES = 8;
    const hexes = Array.from(
      new Set(
        Array.from(selectedHexes).flatMap((h) => {
          const res = getResolution(h);
          return res > DATA_H3_RES
            ? [cellToParent(h, DATA_H3_RES)]
            : res === DATA_H3_RES
              ? [h]
              : cellToChildren(h, DATA_H3_RES);
        }),
      ),
    )
      // Solo celdas con dato en BD (res 8): evita filas fantasma "—" al expandir
      // hijos de una selección compactada (res < 8).
      .filter((h) => areaData.has(h))
      .sort();
    if (hexes.length === 0) {
      toast.error("La selección no tiene datos por hexágono a res 8 en el backend.");
      return;
    }
    const cols = VARIABLES.filter((v) => v.masterId !== "NA");
    const thS =
      "padding:4px 6px;border:1px solid #cbd5e1;background:#165170;color:#fff;font-weight:600;white-space:nowrap;";
    const tdS =
      "padding:3px 6px;border:1px solid #e2e8f0;color:#334155;text-align:right;white-space:nowrap;";
    const idS =
      "padding:3px 6px;border:1px solid #e2e8f0;color:#0f172a;font-weight:700;white-space:nowrap;";

    let html = `<table style="border-collapse:collapse;font:11px/1.3 ui-monospace,monospace;">`;
    html += `<thead><tr><th style="${thS}text-align:left;">Hex ID</th>`;
    for (const v of cols)
      html += `<th style="${thS}" title="${esc(v.label)}">${esc(v.masterId)}</th>`;
    html += `</tr></thead><tbody>`;
    for (const hex of hexes) {
      const info = areaData.get(hex);
      html += `<tr><td style="${idS}">${esc(hex)}</td>`;
      for (const v of cols) {
        const val = hexVal(info?.variables, v.masterId);
        html += `<td style="${tdS}">${val != null ? Math.round(val * 1000) / 1000 : "—"}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;

    // Leyenda de FUENTES por variable (trazabilidad): cada columna (código) →
    // variable → fuente, para que el experto verifique cada valor en su SIG.
    const cellS = "padding:3px 6px;border:1px solid #e2e8f0;color:#334155;";
    let srcHtml = `<table style="border-collapse:collapse;font:10px/1.3 sans-serif;">`;
    srcHtml += `<thead><tr><th style="${thS}text-align:left;">Código</th><th style="${thS}text-align:left;">Variable</th><th style="${thS}text-align:left;">Fecha</th><th style="${thS}text-align:left;">Fuente</th></tr></thead><tbody>`;
    for (const v of cols) {
      const fuente =
        v.fuente && v.fuente !== "(sin definir)" ? v.fuente : "Por definir";
      srcHtml += `<tr><td style="${idS}">${esc(v.masterId)}</td><td style="${cellS}">${esc(v.label)}</td><td style="${cellS}">${esc(sourceVersion(v.fuente))}</td><td style="${cellS}">${esc(fuente)}</td></tr>`;
    }
    srcHtml += `</tbody></table>`;

    // Segunda tabla: valores PONDERADOS por hex (tabla `hexagon_variables_pon`).
    // Solo si el backend trae ponderadas (en template/sin backend va vacío).
    const hasPon = hexes.some((hx) => {
      const vp = areaData.get(hx)?.variables_pon;
      return vp && Object.keys(vp).length > 0;
    });
    let ponHtml = "";
    if (hasPon) {
      ponHtml = `<table style="border-collapse:collapse;font:11px/1.3 ui-monospace,monospace;">`;
      ponHtml += `<thead><tr><th style="${thS}text-align:left;">Hex ID</th>`;
      for (const v of cols)
        ponHtml += `<th style="${thS}" title="${esc(v.label)}">${esc(v.masterId)}</th>`;
      ponHtml += `</tr></thead><tbody>`;
      for (const hex of hexes) {
        const info = areaData.get(hex);
        ponHtml += `<tr><td style="${idS}">${esc(hex)}</td>`;
        for (const v of cols) {
          const val = hexVal(info?.variables_pon, v.masterId);
          ponHtml += `<td style="${tdS}">${val != null ? Math.round(val * 1000) / 1000 : "—"}</td>`;
        }
        ponHtml += `</tr>`;
      }
      ponHtml += `</tbody></table>`;
    }

    const wrap = document.createElement("div");
    wrap.setAttribute("data-pdf-ignore", "true");
    wrap.style.cssText =
      "position:fixed;left:-99999px;top:0;background:#fff;padding:16px;";
    wrap.innerHTML =
      `<div style="font:700 13px sans-serif;color:#165170;margin-bottom:8px;">` +
      `Datos crudos por hexágono — ${hexes.length} hex × ${cols.length} variables` +
      `${region ? ` · ${esc(region)}` : ""}</div>` +
      html +
      (ponHtml
        ? `<div style="font:700 12px sans-serif;color:#165170;margin:14px 0 6px;">Valores ponderados por hexágono</div>` +
          ponHtml
        : "") +
      `<div style="font:700 12px sans-serif;color:#165170;margin:14px 0 6px;">Fuentes por variable</div>` +
      srcHtml +
      `<div style="font:italic 9px sans-serif;color:#64748b;margin-top:8px;max-width:900px;">` +
      `Cada valor es el dato crudo de la variable en ese hexágono (clave H3). ` +
      `Verificable en SIG/QGIS hexágono por hexágono contra la fuente indicada. ` +
      `La "tabla general por área" del informe es el promedio de estos valores; ` +
      `el score de cada dimensión resulta de aplicarles los pesos del modelo.</div>`;
    document.body.appendChild(wrap);
    setIsExporting(true);
    setExportMsg(`Rasterizando ${hexes.length} hexágonos…`);
    try {
      // MEMORIA: una tabla de miles de filas a scale 2 llevaba el navegador a
      // varios GB. Escala adaptativa: 1 si el área es grande (>500 hex), 2 para
      // áreas pequeñas donde la nitidez importa y el costo es bajo.
      const scale = hexes.length > 500 ? 1 : 2;
      const canvas = await html2canvas(wrap, {
        scale,
        backgroundColor: "#ffffff",
      });
      const url = canvas.toDataURL("image/png");
      canvas.width = 0; // libera el canvas antes de disparar la descarga
      canvas.height = 0;
      const a = document.createElement("a");
      a.href = url;
      a.download = `datos-hex-${Date.now()}.png`;
      a.click();
      toast.success("Tabla de datos por hexágono descargada");
    } catch (e) {
      console.error("[hexTableExport]", e);
      toast.error("No se pudo generar la imagen de la tabla");
    } finally {
      document.body.removeChild(wrap);
      setIsExporting(false);
      setExportMsg("");
    }
  };

  const handleDownloadPdf = async () => {
    const root = reportRef.current;
    if (!root) return;
    setIsExporting(true);
    setError(null);
    setCapturing(true); // hojas a tamaño real para capturar nítido
    try {
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
      );
      await new Promise((r) => setTimeout(r, 80));

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

      // MEMORIA: html2canvas a scale 2 rasteriza 4× píxeles por hoja; sobre muchas
      // hojas el navegador llegaba a ~4 GB. Bajamos a 1.5 (nítido para A4) y, tras
      // convertir cada canvas a JPEG, lo LIBERAMOS (width/height=0) + cedemos un
      // tick al event loop para que el GC reclame antes de la siguiente hoja → el
      // pico se acota a ~1 canvas, no a todos a la vez.
      const CAPTURE_SCALE = 1.5;
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
          const data = canvas.toDataURL("image/jpeg", 0.9);
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
        nombre: region ? `Informe — ${region}` : "Informe de idoneidad",
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
        <p className="text-[10px] uppercase tracking-widest text-gray-400">
          Informe de viabilidad
        </p>
        <h2 className="text-lg font-bold text-[#165170ff]">
          Idoneidad eólica{region ? ` — ${region}` : ""}
        </h2>
        <p className="text-sm text-gray-600">
          {fmtKm2.format(area)} km² · {totalSheets}{" "}
          {totalSheets === 1 ? "hoja" : "hojas"}
        </p>
        <div className="mt-3 flex justify-center">
          <Gauge value={scores.general} size={170} className="max-w-[210px]" />
        </div>
        <ul className="mt-2 flex flex-col gap-1">
          {chartAxes.map((a) => (
            <li key={a.label} className="flex items-center gap-2 text-[11px]">
              <span className="flex-1 text-gray-700">{a.label}</span>
              <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-[#165170ff]"
                  style={{ width: `${Math.max(0, Math.min(100, a.value))}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono font-semibold text-[#165170ff]">
                {a.value.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        {/* Exportación de datos crudos por hexágono — SOLO admin. */}
        {isAdmin && (
          <button
            type="button"
            onClick={requestHexTable}
            disabled={isExporting}
            title="Descargar imagen de la tabla de datos por hexágono (todas las variables)"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM4 10h16M10 5v14" />
            </svg>
            Datos por hex (admin)
          </button>
        )}
        {hexExportWarn && (
          <ConfirmDialog
            title="Exportar datos por hexágono"
            confirmLabel="Generar imagen"
            message={
              <>
                La selección tiene <b>{hexExportWarn.n.toLocaleString("es-CO")}</b>{" "}
                hexágonos × <b>~{hexExportWarn.c}</b> columnas. Con muchos hexágonos
                la imagen puede salir <b>muy pesada</b> y tardar; se recomienda
                exportar con <b>pocos hexágonos</b>. ¿Generar la imagen?
              </>
            }
            onConfirm={() => {
              setHexExportWarn(null);
              void handleDownloadHexTable();
            }}
            onCancel={() => setHexExportWarn(null)}
          />
        )}
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
              <p className="text-center text-[11px] text-gray-400">
                {exportMsg || "Puede tardar unos segundos según el número de hojas."} No cierres la página.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
