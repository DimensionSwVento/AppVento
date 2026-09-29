/**
 * Cliente del catálogo de administración (US08-01/02/03). TODO viene de la API
 * (`/api/admin/catalog/*` → BFF → FastAPI). Mientras el backend no exista
 * (`USE_BACKEND=false`) opera sobre un STORE EN MEMORIA sembrado con los datos
 * template del catálogo, para que la UI de admin sea 100% funcional en dev y
 * quede lista para conectar. Cuando `NEXT_PUBLIC_USE_BACKEND=true`, cada método
 * llama al endpoint real.
 *
 * Contrato de endpoints (para implementar en backend): ver docs/api/admin-catalog.md
 */
import { USE_BACKEND, AEROGENERADORES } from "../projectData";
import {
  DIMENSIONS,
  OPTIONAL_VARIABLES,
  VARIABLES,
  type Variable,
  isExcluyente,
  replaceCatalogFromDb,
  patchCatalogVariable,
  iconForVariable,
  requiredForVariable,
  aplicaEnForVariable,
  mapKindForVariable,
  type MapKind,
} from "../variables/variablesCatalog";
import {
  REGULATORY_NORMS,
  type Norma,
  type NormaEstado,
} from "../report/regulatoryNorms";
import {
  ECONOMIC_SCENARIOS,
  PROJECTION_HORIZONS,
} from "../economic/economicScenarios";
import { applyDbWeights } from "../variables/variableWeights";
import {
  CALC_SUMMARY_DEFAULTS,
  REPORT_CONTENT_DEFAULTS,
  type CalcSummaryText,
  type ReportContentText,
} from "../report/reportTemplates";

const BASE = "/api/admin/catalog";

// ── Tipos ──────────────────────────────────────────────────────────────────
export type VariableTipo = "modelo" | "informativa";

export interface AdminVariable {
  id: string;
  label: string;
  dimension: string;
  dimensionLabel: string;
  tipo: VariableTipo;
  /** Habilitada. Las del modelo NO se pueden deshabilitar (siempre true). */
  enabled: boolean;
  enMapa: boolean;
  enMenu: boolean;
  excluyente: boolean;
  fuente: string;
  unidad: string;
  rango: string;
  descripcion: string;
  datasetVersion: string;
  datasetUpdatedAt: string;
  // ── Reales por-variable que ANTES estaban hardcodeados (variablesCatalog.ts /
  //    variableWeights.ts / mapLayerData.ts). Opcionales: el template no los trae
  //    y el seam cae al valor estático cuando faltan. ──
  masterId?: string;
  criterio?: string;
  subcriterio?: string;
  aplicaEn?: "mar" | "tierra" | "";
  noCalculo?: boolean;
  /** +1 suma / -1 resta / 0 no aporta al WLC. */
  polaridad?: number;
  /** |peso| en el cálculo multicriterio. */
  peso?: number;
  /** Método de visualización en el mapa: calor | interconectado | area. */
  mapKind?: MapKind;
  mapThreshold?: number;
  // ── Metadatos anidados (Fase 1): InfoVariables(2) ──
  emplazamiento?: "onshore" | "offshore" | "both";
  licencia?: string;
  url?: string;
  clase?: string;
  subcriterioId?: string;
  /** "Cómo se calcula" (método/fórmula, texto libre). Editable + ingestable. */
  metodoCalculo?: string;
  /** Ícono de la capa de mapa (`lucide:Name` / `tabler:key`). Asignable en admin. */
  iconKey?: string;
}

export interface AdminEscenario {
  id: string;
  label: string;
  description: string;
  /** Horizonte de proyección en años. */
  horizonte: number;
  /** Factor que modela la curva de la gráfica económica (antes hardcode). */
  mult?: number;
  /** Proyección ILUSTRATIVA (no definitiva) de impacto del escenario. */
  impacto?: string;
}

/** Aerogenerador por categoría (S/M/L). Potencia = RANGO REAL (Tabla 2 cliente);
 *  `potenciaMaxMW === 0` = sin tope (utility "1 MW o más"). Área/espaciamiento
 *  son TEMPLATE (el cliente no los envió). */
export interface AdminTurbine {
  id: string;
  label: string;
  detail: string;
  potenciaMinMW: number;
  potenciaMaxMW: number;
  areaPorAeroKm2: number;
  espaciamientoM: number;
}

export type { Norma, NormaEstado };

// ── Helpers de mapeo template ────────────────────────────────────────────────
function dimLabel(id: string): string {
  return (
    DIMENSIONS.find((d) => d.id === id)?.label.replace(/^Dimensi[oó]n\s+/i, "") ??
    id
  );
}

function toAdminVar(v: Variable, tipo: VariableTipo): AdminVariable {
  return {
    id: v.id,
    label: v.label,
    dimension: v.dimension,
    dimensionLabel: dimLabel(v.dimension),
    tipo,
    enabled: true,
    enMapa: !!v.enMapa,
    enMenu: tipo === "informativa",
    excluyente: isExcluyente(v),
    fuente: v.fuente && v.fuente !== "(sin definir)" ? v.fuente : "Por definir",
    unidad: "índice 0–100",
    rango: "0–100 (normalizado)",
    descripcion: v.description,
    datasetVersion: "v1.0",
    datasetUpdatedAt: "2024",
  };
}

// ── Stores en memoria (fallback sin backend) ─────────────────────────────────
let variablesStore: AdminVariable[] = [
  ...VARIABLES.map((v) => toAdminVar(v, "modelo")),
  ...OPTIONAL_VARIABLES.map((v) => toAdminVar(v, "informativa")),
];
let normasStore: Norma[] = REGULATORY_NORMS.map((n) => ({ ...n }));
let escenariosStore: AdminEscenario[] = ECONOMIC_SCENARIOS.map((s) => ({
  ...s,
  horizonte: PROJECTION_HORIZONS[1],
}));

// ── fetch helper ─────────────────────────────────────────────────────────────
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── CONFIG EDITABLE: "Resumen del cálculo" del informe (US08 · #2B) ───────────
// Solo DESCRIPTIVO: el admin edita el texto/fórmulas que se IMPRIMEN en el
// informe; no recalcula el score (lo precalcula el backend). Clave en app_config.
const CALC_TEXT_KEY = "report_calc_text";
// Store en memoria para modo template (sin backend): persiste durante la sesión.
let calcTextStore: CalcSummaryText = { ...CALC_SUMMARY_DEFAULTS };

/** Texto del "Resumen del cálculo" (override de BD fusionado sobre los defaults). */
export async function fetchReportCalcText(): Promise<CalcSummaryText> {
  if (USE_BACKEND) {
    const raw = await api<Partial<CalcSummaryText>>(`/config/${CALC_TEXT_KEY}`);
    return { ...CALC_SUMMARY_DEFAULTS, ...(raw ?? {}) };
  }
  return { ...calcTextStore };
}

/** Persiste el texto del "Resumen del cálculo" (PUT admin) y lo devuelve fusionado. */
export async function updateReportCalcText(
  text: CalcSummaryText,
): Promise<CalcSummaryText> {
  if (USE_BACKEND) {
    const raw = await api<Partial<CalcSummaryText>>(`/config/${CALC_TEXT_KEY}`, {
      method: "PATCH",
      body: JSON.stringify(text),
    });
    return { ...CALC_SUMMARY_DEFAULTS, ...(raw ?? {}) };
  }
  calcTextStore = { ...text };
  return { ...calcTextStore };
}

// ── CONFIG EDITABLE: contenido del informe (disclaimer + incentivos · #3) ─────
const REPORT_CONTENT_KEY = "report_content";
let reportContentStore: ReportContentText = { ...REPORT_CONTENT_DEFAULTS };

/** Disclaimer + incentivos del informe (override de BD sobre los defaults). */
export async function fetchReportContent(): Promise<ReportContentText> {
  if (USE_BACKEND) {
    const raw = await api<Partial<ReportContentText>>(`/config/${REPORT_CONTENT_KEY}`);
    return {
      ...REPORT_CONTENT_DEFAULTS,
      ...(raw ?? {}),
      // `incentivos` es array: si el override no lo trae, conserva el default.
      incentivos:
        raw?.incentivos && raw.incentivos.length > 0
          ? raw.incentivos
          : REPORT_CONTENT_DEFAULTS.incentivos,
    };
  }
  return { ...reportContentStore };
}

/** Persiste el contenido editable del informe (PATCH admin). */
export async function updateReportContent(
  content: ReportContentText,
): Promise<ReportContentText> {
  if (USE_BACKEND) {
    const raw = await api<Partial<ReportContentText>>(`/config/${REPORT_CONTENT_KEY}`, {
      method: "PATCH",
      body: JSON.stringify(content),
    });
    return {
      ...REPORT_CONTENT_DEFAULTS,
      ...(raw ?? {}),
      incentivos:
        raw?.incentivos && raw.incentivos.length > 0
          ? raw.incentivos
          : content.incentivos,
    };
  }
  reportContentStore = { ...content };
  return { ...reportContentStore };
}

// ── ACTUALIZADOR DE METADATOS (CSV/XLSX) + jerarquía (Fase 1 rediseño) ────────

// El actualizador AUTODETECTA el tipo de doc (un solo drag): catálogo
// InfoVariables o panel económico. La respuesta se discrimina por `tipo`.
export interface MetadataPlanCatalog {
  tipo: "infovariables";
  perfil: string;
  sheet: string | null;
  rows: number;
  mapped: { header: string; destino: string; transform: string }[];
  unmapped: { header: string }[];
  summary: { total: number; mapeadas: number; sin_mapear: number };
}
export interface MetadataPlanEconomic {
  tipo: "economic";
  sheets: { sheet: string; rol: "meta" | "curada" | "solo-bd" | "input" }[];
  total: number;
  curadas: number;
}
export type MetadataPlan = MetadataPlanCatalog | MetadataPlanEconomic;

export interface HierarchyVariable {
  id: string; masterId: string; label: string; descripcion: string;
  fuente: string; licencia: string; url: string; emplazamiento: string;
  enMapa: boolean; tipo: string; clase: string; iconKey: string;
  peso: number; polaridad: number;
}
export interface HierarchySubcriterio {
  id: string; code: string; nombre: string; definicion: string;
  variables: HierarchyVariable[];
}
export interface HierarchyCriterio {
  id: string; code: string; nombre: string; definicion: string;
  peso: number; subcriterios: HierarchySubcriterio[];
}
export interface HierarchyDimension {
  id: string; nombre: string; definicion: string; puntua: boolean;
  criterios: HierarchyCriterio[];
}

/** Sube un CSV/XLSX de metadatos → ruta temporal del server. Multipart (sin
 *  Content-Type JSON: el navegador pone el boundary). */
export async function uploadMetadata(file: File): Promise<{ path: string; filename: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/metadata/upload`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Error ${res.status}`);
  }
  return res.json();
}

/** Clasifica las columnas del doc (qué se mapea / qué se omite). `name` = nombre
 *  original del archivo (para nombrar el panel de un CSV económico). */
export async function planMetadata(
  path: string, perfil = "infovariables", sheet?: string, name?: string,
): Promise<MetadataPlan> {
  return api<MetadataPlan>(`/metadata/plan`, {
    method: "POST",
    body: JSON.stringify({ path, perfil, sheet, name }),
  });
}

/** Aplica el doc (autodetecta): upsert de la jerarquía + variables (catálogo) o
 *  ingesta del panel económico → economic_series. Discriminado por `tipo`. */
export interface MetadataApplyCatalog {
  tipo: "infovariables";
  dimensiones: number; criterios: number; subcriterios: number;
  variables: number; normas: number;
}
export interface MetadataApplyEconomic {
  tipo: "economic";
  panels: number; rows: number; sheets: string[]; only_curated: boolean;
}
export type MetadataApplyResult = MetadataApplyCatalog | MetadataApplyEconomic;
export async function applyMetadata(
  path: string, perfil = "infovariables", sheet?: string, name?: string,
): Promise<MetadataApplyResult> {
  return api<MetadataApplyResult>(`/metadata/apply`, {
    method: "POST",
    body: JSON.stringify({ path, perfil, sheet, name }),
  });
}

/** Catálogo anidado dimensión→criterio→subcriterio→variable. `emplazamiento`
 *  (onshore|offshore) filtra las variables. Vacío en template o sin backend. */
export async function fetchHierarchy(
  emplazamiento?: "onshore" | "offshore",
): Promise<HierarchyDimension[]> {
  if (!USE_BACKEND) return [];
  const q = emplazamiento ? `?emplazamiento=${emplazamiento}` : "";
  try {
    return await api<HierarchyDimension[]>(`/hierarchy${q}`);
  } catch {
    return [];
  }
}

// ── ECONÓMICA macro (Fase 3): series reales del bundle CGE ────────────────────

export interface EconomicSeriesRow {
  panel: string; escenarioMw: number;
  cat1: string; cat2: string; cat3: string;
  anio: number; valor: number;
}

/** Serie de un panel económico (opcional filtrada por escenario_mw). Vacío en
 *  template o si aún no se ingirió el bundle económico. */
export async function fetchEconomicSeries(
  panel: string, escenarioMw?: number,
): Promise<EconomicSeriesRow[]> {
  if (!USE_BACKEND) return [];
  const q =
    `?panel=${encodeURIComponent(panel)}` +
    (escenarioMw != null ? `&escenario_mw=${escenarioMw}` : "");
  try {
    return await api<EconomicSeriesRow[]>(`/economic/series${q}`);
  } catch {
    return [];
  }
}

/** Escenarios de MW disponibles para un panel (para elegir el más cercano a la
 *  capacidad nominal). Vacío en template. */
export async function fetchEconomicScenarios(panel: string): Promise<number[]> {
  if (!USE_BACKEND) return [];
  try {
    return await api<number[]>(`/economic/scenarios?panel=${encodeURIComponent(panel)}`);
  } catch {
    return [];
  }
}

// Nota: el panel económico NO tiene su propio drag. El actualizador de metadatos
// autodetecta el panel_por_variable y rutea a /economic/apply (ver metadata_ingest
// en el back). La lectura del panel para la app está en fetchEconomicSeries/…

// ── VARIABLES / DATASETS (US08-01) ───────────────────────────────────────────
export async function fetchVariables(tipo: VariableTipo): Promise<AdminVariable[]> {
  // Sin mixtura: en modo BACKEND se usa SOLO la API (si falla, lanza — no cae a
  // template). En modo TEMPLATE se usa SOLO el store. Nunca a medias.
  if (USE_BACKEND) return api<AdminVariable[]>(`/variables?tipo=${tipo}`);
  return variablesStore.filter((v) => v.tipo === tipo);
}

/** Códigos REALES de la máster (claves de `hexagon.variables`) para el combobox
 *  de vinculación del admin. Vacío en template o si no hay máster ingerida. */
export async function fetchMasterCodes(): Promise<string[]> {
  if (!USE_BACKEND) return [];
  try {
    return await api<string[]>(`/master-codes`);
  } catch {
    return [];
  }
}

/**
 * Variables INFORMATIVAS efectivas para el MENÚ de dimensiones (US08-01):
 * el catálogo estático de hoy (campos ricos: icono, criterio, mar/tierra) con los
 * overrides de admin aplicados (habilitada / ver-en-menú / ver-en-mapa) MÁS las
 * informativas creadas en admin. Si no hay ediciones, devuelve EXACTAMENTE las de
 * hoy (`OPTIONAL_VARIABLES`), ni más ni menos.
 */
export async function fetchMenuVariables(): Promise<Variable[]> {
  const admin = await fetchVariables("informativa");
  const byId = new Map(admin.map((a) => [a.id, a]));
  const out: Variable[] = [];
  // 1) Estáticas de hoy con override de admin (ocultar si deshabilitada o fuera de menú).
  for (const v of OPTIONAL_VARIABLES) {
    const a = byId.get(v.id);
    byId.delete(v.id);
    if (a && (!a.enabled || !a.enMenu)) continue;
    // Preferir el dato de BD cuando viene (backend); si falta, template estático.
    out.push(
      a
        ? {
            ...v,
            enMapa: a.enMapa,
            description: a.descripcion || v.description,
            criterio: a.criterio || v.criterio,
            subcriterio: a.subcriterio || v.subcriterio,
            fuente: a.fuente || v.fuente,
            masterId: a.masterId || v.masterId,
          }
        : v,
    );
  }
  // 2) Informativas CREADAS en admin (no existían en el catálogo).
  for (const a of byId.values()) {
    if (!a.enabled || !a.enMenu) continue;
    out.push({
      id: a.id,
      masterId: "NA",
      dimension: a.dimension as Variable["dimension"],
      criterio: "Informativa",
      label: a.label,
      description: a.descripcion,
      fuente: a.fuente,
      enMapa: a.enMapa,
      // Emplazamiento de la informativa creada en admin (para el filtro mar/tierra).
      aplicaEn:
        a.emplazamiento === "offshore"
          ? "mar"
          : a.emplazamiento === "onshore"
            ? "tierra"
            : a.aplicaEn === "mar" || a.aplicaEn === "tierra"
              ? a.aplicaEn
              : aplicaEnForVariable(a.id),
      noCalculo: true,
      excluyente: a.excluyente,
      iconKey: "lucide:Info",
    });
  }
  return out;
}

/**
 * Hidrata el CATÁLOGO real desde BD (modo backend): TEXTO/identidad por variable
 * (label, descripción, criterio, subcriterio, fuente, masterId) vía `applyDbCatalog`
 * y los PESOS del WLC (polaridad×peso) vía `applyDbWeights`. Un solo fetch para
 * ambos. Los valores estáticos del front quedan SOLO como template (modo demo).
 * Llamar una vez al montar la app (VariablesProvider).
 */
/** AdminVariable (DB) → Variable del catálogo. Ícono y `required` son UI → se
 *  conservan por id del catálogo estático; el resto viene VIVO del DB. */
function buildVariableFromDb(a: AdminVariable): Variable {
  return {
    id: a.id,
    masterId: a.masterId || "NA",
    dimension: a.dimension as Variable["dimension"],
    criterio: a.criterio || "",
    subcriterio: a.subcriterio || undefined,
    label: a.label,
    description: a.descripcion,
    fuente: a.fuente || undefined,
    licencia: a.licencia || undefined,
    url: a.url || undefined,
    enMapa: a.enMapa,
    // Emplazamiento real (onshore/offshore/both). Se deriva `aplicaEn` (mar/tierra):
    // offshore→mar, onshore→tierra, both→sin restricción. Fallback al snapshot del
    // catálogo estático (aplicaEnForVariable) mientras la master no puebla el dato
    // → así el filtro mar/tierra sigue operando (#9).
    aplicaEn:
      a.emplazamiento === "offshore"
        ? "mar"
        : a.emplazamiento === "onshore"
          ? "tierra"
          : a.aplicaEn === "mar" || a.aplicaEn === "tierra"
            ? a.aplicaEn
            : aplicaEnForVariable(a.id),
    // Ícono de BD (asignable en admin) prima; si no viene, el snapshot estático.
    iconKey: a.iconKey || iconForVariable(a.id),
    required: requiredForVariable(a.id),
    noCalculo: a.noCalculo ?? a.tipo === "informativa",
    excluyente: a.excluyente,
    // Datos por-variable editables/ingestables: en modo backend priman sobre el
    // template (unidad hardcoded, texto de "cómo se calcula" derivado). Vacío =
    // undefined → el consumidor cae a su fallback estático.
    unidad: a.unidad || undefined,
    rango: a.rango || undefined,
    metodoCalculo: a.metodoCalculo || undefined,
    // Método de mapa: BD manda; si falta, se deriva por defecto.
    mapKind: a.mapKind || mapKindForVariable(a.id),
  };
}

export async function hydrateCatalog(): Promise<void> {
  if (!USE_BACKEND) return;
  const [modelo, inf] = await Promise.all([
    fetchVariables("modelo"),
    fetchVariables("informativa"),
  ]);
  // Backend = catálogo VIVO del DB: reconstruye la lista (agrega las nuevas, quita
  // las que ya no están) → NADA hardcodeado se consume. Modular: si a futuro suben
  // más variables en la máster, aparecen solas. (Si el DB viniera vacío no
  // reemplaza — se llena al subir la máster.)
  replaceCatalogFromDb(modelo.map(buildVariableFromDb), inf.map(buildVariableFromDb));
  const all = [...modelo, ...inf];
  applyDbWeights(
    all.map((v) => ({ id: v.id, polaridad: v.polaridad, peso: v.peso })),
  );
}

/** IDs de variables (modelo + informativas) con "ver en mapa" DESACTIVADO (o
 *  deshabilitadas) en admin, para que el mapa respete el toggle en los símbolos
 *  que sí tienen datos/geometría (`MAP_SYMBOLS`). */
export async function fetchMapDisabledIds(): Promise<Set<string>> {
  const [modelo, inf] = await Promise.all([
    fetchVariables("modelo"),
    fetchVariables("informativa"),
  ]);
  return new Set(
    [...modelo, ...inf]
      .filter((a) => !a.enMapa || !a.enabled)
      .map((a) => a.id),
  );
}

/** Crea una variable INFORMATIVA nueva. */
export async function createInformativa(
  payload: Partial<AdminVariable> & { label: string; dimension: string },
): Promise<AdminVariable> {
  if (USE_BACKEND)
    return api<AdminVariable>(`/variables`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  const nueva: AdminVariable = {
    id: `inf-${Date.now()}`,
    label: payload.label,
    dimension: payload.dimension,
    dimensionLabel: dimLabel(payload.dimension),
    tipo: "informativa",
    enabled: true,
    enMapa: payload.enMapa ?? false,
    enMenu: payload.enMenu ?? true,
    excluyente: payload.excluyente ?? false,
    fuente: payload.fuente ?? "Por definir",
    unidad: payload.unidad ?? "índice 0–100",
    rango: payload.rango ?? "0–100",
    descripcion: payload.descripcion ?? "",
    datasetVersion: "v1.0",
    datasetUpdatedAt: "2024",
  };
  variablesStore = [nueva, ...variablesStore];
  return nueva;
}

/** Actualiza detalle / habilita-deshabilita / mapa-menú de una variable. */
export async function updateVariable(
  id: string,
  patch: Partial<AdminVariable>,
): Promise<AdminVariable> {
  if (USE_BACKEND) {
    const updated = await api<AdminVariable>(`/variables/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    // La BD es la fuente de verdad (ya persistió). Además refrescamos el CATÁLOGO
    // en memoria (lo que leen mapa/menú vía `getVariableById`) con la fila
    // autoritativa, para que el cambio de enMapa/método/icono se vea al instante
    // sin esperar a un re-hydrate completo. Simétrico a la cache de template.
    patchCatalogVariable(id, buildVariableFromDb(updated));
    return updated;
  }
  variablesStore = variablesStore.map((v) =>
    v.id === id
      ? { ...v, ...patch, enabled: v.tipo === "modelo" ? true : (patch.enabled ?? v.enabled) }
      : v,
  );
  // TEMPLATE = usa CACHE: refleja la edición también en el CATÁLOGO (`getVariableById`),
  // que es lo que leen el mapa/menú de capas. Sin esto, el toggle "en mapa"/método/icono
  // solo vivía en el store de admin y no se veía en el mapa hasta prender el backend.
  const cp: Partial<Variable> = {};
  if (patch.enMapa !== undefined) cp.enMapa = patch.enMapa;
  if (patch.mapKind !== undefined) cp.mapKind = patch.mapKind;
  if (patch.iconKey !== undefined) cp.iconKey = patch.iconKey;
  if (patch.unidad !== undefined) cp.unidad = patch.unidad;
  if (patch.rango !== undefined) cp.rango = patch.rango;
  if (patch.metodoCalculo !== undefined) cp.metodoCalculo = patch.metodoCalculo;
  if (patch.descripcion !== undefined) cp.description = patch.descripcion;
  if (patch.fuente !== undefined) cp.fuente = patch.fuente;
  if (patch.masterId !== undefined) cp.masterId = patch.masterId;
  if (patch.excluyente !== undefined) cp.excluyente = patch.excluyente;
  if (patch.aplicaEn === "mar" || patch.aplicaEn === "tierra") cp.aplicaEn = patch.aplicaEn;
  patchCatalogVariable(id, cp);
  return variablesStore.find((v) => v.id === id)!;
}

/** Actualiza el dataset asociado a una variable (nueva versión/carga). */
export async function updateDataset(
  id: string,
  version: string,
): Promise<AdminVariable> {
  if (USE_BACKEND)
    return api<AdminVariable>(`/datasets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ version }),
    });
  variablesStore = variablesStore.map((v) =>
    v.id === id ? { ...v, datasetVersion: version, datasetUpdatedAt: "hoy" } : v,
  );
  return variablesStore.find((v) => v.id === id)!;
}

// ── NORMAS (US08-02) ─────────────────────────────────────────────────────────
export async function fetchNormas(): Promise<Norma[]> {
  if (USE_BACKEND) return api<Norma[]>(`/normas`);
  return [...normasStore];
}
export async function createNorma(payload: Omit<Norma, "id">): Promise<Norma> {
  if (USE_BACKEND)
    return api<Norma>(`/normas`, { method: "POST", body: JSON.stringify(payload) });
  const nueva: Norma = { id: `norma-${Date.now()}`, ...payload };
  normasStore = [nueva, ...normasStore];
  return nueva;
}
export async function updateNorma(id: string, patch: Partial<Norma>): Promise<Norma> {
  if (USE_BACKEND)
    return api<Norma>(`/normas/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  normasStore = normasStore.map((n) => (n.id === id ? { ...n, ...patch } : n));
  return normasStore.find((n) => n.id === id)!;
}
export async function deleteNorma(id: string): Promise<void> {
  if (USE_BACKEND) {
    await api(`/normas/${id}`, { method: "DELETE" });
    return;
  }
  normasStore = normasStore.filter((n) => n.id !== id);
}

// ── ESCENARIOS (US08-03) ─────────────────────────────────────────────────────
export async function fetchEscenarios(): Promise<AdminEscenario[]> {
  if (USE_BACKEND) return api<AdminEscenario[]>(`/escenarios`);
  return [...escenariosStore];
}
export async function createEscenario(
  payload: Omit<AdminEscenario, "id">,
): Promise<AdminEscenario> {
  if (USE_BACKEND)
    return api<AdminEscenario>(`/escenarios`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  const nuevo: AdminEscenario = { id: `esc-${Date.now()}`, ...payload };
  escenariosStore = [nuevo, ...escenariosStore];
  return nuevo;
}
export async function updateEscenario(
  id: string,
  patch: Partial<AdminEscenario>,
): Promise<AdminEscenario> {
  if (USE_BACKEND)
    return api<AdminEscenario>(`/escenarios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  escenariosStore = escenariosStore.map((s) => (s.id === id ? { ...s, ...patch } : s));
  return escenariosStore.find((s) => s.id === id)!;
}
export async function deleteEscenario(id: string): Promise<void> {
  if (USE_BACKEND) {
    await api(`/escenarios/${id}`, { method: "DELETE" });
    return;
  }
  escenariosStore = escenariosStore.filter((s) => s.id !== id);
}

// ── TURBINAS / AEROGENERADORES (item 4) ───────────────────────────────────────
// Template = `AEROGENERADORES` de projectData.ts (S/M/L). Con backend, viene de
// la tabla `catalog_turbine` (editable en admin, persiste). El seam degrada al
// template si el backend cae.
const turbinesStore: AdminTurbine[] = (
  Object.keys(AEROGENERADORES) as (keyof typeof AEROGENERADORES)[]
).map((id) => ({
  id,
  label: AEROGENERADORES[id].label,
  detail: AEROGENERADORES[id].detail,
  potenciaMinMW: AEROGENERADORES[id].potenciaMinMW,
  potenciaMaxMW: AEROGENERADORES[id].potenciaMaxMW,
  areaPorAeroKm2: AEROGENERADORES[id].areaPorAeroKm2,
  espaciamientoM: AEROGENERADORES[id].espaciamientoM,
}));

export async function fetchTurbines(): Promise<AdminTurbine[]> {
  if (USE_BACKEND) return api<AdminTurbine[]>(`/turbines`);
  return [...turbinesStore];
}

/** Edita una turbina (solo admin). Lanza si falla (para avisar en el panel). */
export async function updateTurbine(
  id: string,
  patch: Partial<Omit<AdminTurbine, "id">>,
): Promise<AdminTurbine> {
  if (USE_BACKEND) {
    return api<AdminTurbine>(`/turbines/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }
  const t = turbinesStore.find((x) => x.id === id)!;
  Object.assign(t, patch);
  return t;
}

/** Crea una turbina (solo admin). Los specs son de ingeniería (no del cliente):
 *  se editan aquí. Lanza si el id ya existe (409). */
export async function createTurbine(
  body: Partial<AdminTurbine> & { label: string },
): Promise<AdminTurbine> {
  if (USE_BACKEND) {
    return api<AdminTurbine>(`/turbines`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  const id = (body.id || body.label).trim();
  const t: AdminTurbine = {
    id,
    label: body.label,
    detail: body.detail ?? "",
    potenciaMinMW: body.potenciaMinMW ?? 0,
    potenciaMaxMW: body.potenciaMaxMW ?? 0,
    areaPorAeroKm2: body.areaPorAeroKm2 ?? 0,
    espaciamientoM: body.espaciamientoM ?? 0,
  };
  turbinesStore.push(t);
  return t;
}

/** Borra una turbina (solo admin). */
export async function deleteTurbine(id: string): Promise<void> {
  if (USE_BACKEND) {
    await api(`/turbines/${id}`, { method: "DELETE" });
    return;
  }
  const i = turbinesStore.findIndex((x) => x.id === id);
  if (i >= 0) turbinesStore.splice(i, 1);
}

// ── RANGOS POR VARIABLE (verificación admin del informe) ──────────────────────
// (La pestaña "Fuentes de datos" se eliminó: re-ingería seeds y pisaba datos
//  curados en BD — ver #3. El informe deriva sus fuentes de las variables reales.)

/**
 * Rangos (min–max) REALES por variable desde el backend (`hexagon_meta`, vía
 * `GET /api/tiles/variables`). Para verificación admin en el informe. Clave =
 * nombre de columna de la master. Vacío en modo template (no hay backend) → la
 * sección admin muestra "s/d" en vez de inventar intervalos.
 */
export async function fetchVariableRanges(): Promise<
  Record<string, { min: number; max: number }>
> {
  if (!USE_BACKEND) return {};
  try {
    const res = await fetch(`/api/tiles/variables`);
    const data = await res.json();
    const out: Record<string, { min: number; max: number }> = {};
    for (const v of data?.variables ?? []) {
      if (v?.name && v?.range && typeof v.range.min === "number") {
        out[v.name] = { min: v.range.min, max: v.range.max };
      }
    }
    return out;
  } catch {
    return {};
  }
}

// ── ACTUALIZAR MASTER (US04-03 · admin) ──────────────────────────────────────
// Mismo patrón que el resto: con backend pega a /api/admin/master; en template
// opera sobre un store en memoria (los valores hardcode viven aquí, en el seam,
// para que conectar el back sea solo flipear USE_BACKEND).
const MASTER_BASE = "/api/admin/master";

export interface MasterVersion {
  id: string;
  version: string;
  status: "ready" | "updating" | "scheduled" | "failed";
  source: string | null;
  scheduledAt: string | null;
  appliedAt: string | null;
  hexCount: number;
  varCount: number;
  notes: string | null;
  createdAt: string;
}
export interface MasterStatus {
  current: MasterVersion | null;
  updating: boolean;
  scheduled: MasterVersion | null;
  warning: string;
}
export interface MasterUpdateInput {
  mode: "immediate" | "scheduled";
  scheduledAt?: string; // ISO, solo si scheduled
  source?: string; // ruta del parquet en el servidor (opcional)
}

// Advertencia (fuente única): el back la devuelve en status.warning; aquí el
// mismo texto para el modo template.
const MASTER_WARNING =
  "Actualizar la master puede dejar INCONSISTENTES los informes generados " +
  "mientras dura la ingesta. Prográmala en baja demanda si es posible.";

// Store template del estado de la master (hardcode centralizado).
let masterStatusStore: MasterStatus = {
  current: {
    id: "seed",
    version: "template (sin datos reales)",
    status: "ready",
    source: null,
    scheduledAt: null,
    appliedAt: null,
    hexCount: 0,
    varCount: 0,
    notes: null,
    createdAt: new Date(0).toISOString(),
  },
  updating: false,
  scheduled: null,
  warning: MASTER_WARNING,
};

async function masterApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MASTER_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMasterStatus(): Promise<MasterStatus> {
  if (USE_BACKEND) return masterApi<MasterStatus>(`/status`);
  return masterStatusStore;
}

export async function requestMasterUpdate(
  input: MasterUpdateInput,
): Promise<MasterVersion> {
  if (USE_BACKEND)
    return masterApi<MasterVersion>(`/update`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  // Template: simula la respuesta (inmediata → ready; programada → scheduled).
  const now = new Date();
  const mv: MasterVersion = {
    id: `tpl-${now.getTime()}`,
    version:
      input.mode === "scheduled" && input.scheduledAt
        ? new Date(input.scheduledAt).toISOString()
        : now.toISOString(),
    status: input.mode === "scheduled" ? "scheduled" : "ready",
    source: input.source ?? null,
    scheduledAt: input.mode === "scheduled" ? input.scheduledAt ?? null : null,
    appliedAt: input.mode === "scheduled" ? null : now.toISOString(),
    hexCount: 0,
    varCount: 0,
    notes: null,
    createdAt: now.toISOString(),
  };
  if (input.mode === "scheduled") masterStatusStore = { ...masterStatusStore, scheduled: mv };
  else masterStatusStore = { ...masterStatusStore, current: mv, scheduled: null };
  return mv;
}
