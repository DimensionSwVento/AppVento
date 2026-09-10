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
import { USE_BACKEND } from "../projectData";
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
}

export interface AdminEscenario {
  id: string;
  label: string;
  description: string;
  /** Horizonte de proyección en años. */
  horizonte: number;
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
    out.push(a ? { ...v, enMapa: a.enMapa } : v);
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
