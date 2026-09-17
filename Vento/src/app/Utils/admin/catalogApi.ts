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
  /** Cómo se pinta en el mapa: heatmap | zona | "". */
  mapKind?: "heatmap" | "zona" | "";
  mapThreshold?: number;
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

// ── VARIABLES / DATASETS (US08-01) ───────────────────────────────────────────
export async function fetchVariables(tipo: VariableTipo): Promise<AdminVariable[]> {
  // Sin mixtura: en modo BACKEND se usa SOLO la API (si falla, lanza — no cae a
  // template). En modo TEMPLATE se usa SOLO el store. Nunca a medias.
  if (USE_BACKEND) return api<AdminVariable[]>(`/variables?tipo=${tipo}`);
  return variablesStore.filter((v) => v.tipo === tipo);
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
      noCalculo: true,
      excluyente: a.excluyente,
      iconKey: "lucide:Info",
    });
  }
  return out;
}

/**
 * Hidrata los pesos reales del WLC (`weightFor`) desde el catálogo de BD:
 * `polaridad`×`peso` por variable. Sin backend (o si falla) NO hace nada → el
 * template `variableWeights.ts` sigue mandando. Llamar una vez al montar la app.
 */
export async function hydrateVariableWeights(): Promise<void> {
  if (!USE_BACKEND) return;
  try {
    const [modelo, inf] = await Promise.all([
      fetchVariables("modelo"),
      fetchVariables("informativa"),
    ]);
    applyDbWeights(
      [...modelo, ...inf].map((v) => ({
        id: v.id,
        polaridad: v.polaridad,
        peso: v.peso,
      })),
    );
  } catch {
    /* backend caído → se mantiene el template */
  }
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
  if (USE_BACKEND)
    return api<AdminVariable>(`/variables/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  variablesStore = variablesStore.map((v) =>
    v.id === id
      ? { ...v, ...patch, enabled: v.tipo === "modelo" ? true : (patch.enabled ?? v.enabled) }
      : v,
  );
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

// ── FUENTES DE DATOS + INGESTA DE DOCS (admin) ────────────────────────────────
// Registro de DÓNDE se guarda cada doc (master parquet + CSV/JSON del catálogo) y
// re-ingesta a demanda. En template devuelve un registro estático demostrativo.
export interface DataSource {
  id: string;
  label: string;
  kind: "parquet" | "csv" | "json";
  /** Ruta/URL donde se guarda la fuente (p.ej. el parquet de la master). */
  location: string;
  rows: number;
  status: "ok" | "error" | "pending";
  ingestedAt: string | null;
  notes: string;
}

const _sourcesTemplate: DataSource[] = [
  { id: "master", label: "Master (parquet de hexágonos)", kind: "parquet", location: "back_elements/data/master_variables.h3.parquet", rows: 0, status: "pending", ingestedAt: null, notes: "" },
  { id: "variables", label: "Catálogo de variables (InfoVariables 1/2/3)", kind: "json", location: "infrastructure/data/variables_seed.json", rows: 91, status: "ok", ingestedAt: null, notes: "" },
  { id: "normas", label: "Normas regulatorias", kind: "csv", location: "infrastructure/data/normas_seed.csv", rows: 7, status: "ok", ingestedAt: null, notes: "" },
  { id: "escenarios", label: "Escenarios económicos", kind: "csv", location: "infrastructure/data/escenarios_seed.csv", rows: 3, status: "ok", ingestedAt: null, notes: "" },
  { id: "turbines", label: "Aerogeneradores (S/M/L)", kind: "csv", location: "infrastructure/data/turbines_seed.csv", rows: 3, status: "ok", ingestedAt: null, notes: "" },
];

export async function fetchDataSources(): Promise<DataSource[]> {
  if (USE_BACKEND) return api<DataSource[]>(`/sources`);
  return _sourcesTemplate.map((s) => ({ ...s }));
}

/** (Re)ingiere un doc por su id. Lanza si falla (para avisar en el panel). */
export async function requestIngest(sourceId: string): Promise<DataSource> {
  if (USE_BACKEND) {
    return api<DataSource>(`/ingest/${sourceId}`, { method: "POST" });
  }
  const s = _sourcesTemplate.find((x) => x.id === sourceId)!;
  return { ...s, status: "ok" };
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
