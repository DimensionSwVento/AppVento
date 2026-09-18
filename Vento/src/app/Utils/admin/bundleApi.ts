/**
 * Cliente del MOTOR DE INGESTA POR CLASES (docs/spec/ingesta-clases-conciliacion.md).
 * BFF `/api/admin/bundle/*` → FastAPI. Requiere backend (inspecciona parquets del
 * servidor); sin `USE_BACKEND` devuelve un plan vacío con aviso.
 */
import { USE_BACKEND } from "../projectData";

const BASE = "/api/admin/bundle";

/** Clases posibles de una columna (paleta; extensible por conciliación). */
export const COLUMN_KINDS = [
  "variable_modelo",
  "variable_informativa",
  "alerta",
  "excluyente",
  "criterio",
  "subcriterio",
  "global",
  "bandera",
  "campo",
  "clave",
  "ignorar",
] as const;
export type ColumnKind = (typeof COLUMN_KINDS)[number] | string;

export type ColumnEstado = "ok" | "propuesto" | "pendiente";

export interface PlanColumn {
  name: string;
  tipo_dato: string;
  kind: ColumnKind | null;
  estado: ColumnEstado;
  match: string | null;
  destino: string | null;
  usos: string;
}

export interface PlanFile {
  path: string;
  rows?: number;
  columns?: number;
  error?: string;
}

export interface BundlePlan {
  root: string;
  files: PlanFile[];
  columns: PlanColumn[];
  summary: { total: number; conocidas: number; propuestas: number; pendientes: number };
  error?: string;
}

export interface RegistryColumn {
  name: string;
  baseCode: string;
  kind: ColumnKind;
  targetRef: string;
  usos: string;
  tipoDato: string;
  estado: "ok" | "pendiente" | "ignorada";
  nota: string;
}

export interface ApplyResult {
  rows: number;
  emplazamiento: string;
  files: string[];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const EMPTY_PLAN: BundlePlan = {
  root: "",
  files: [],
  columns: [],
  summary: { total: 0, conocidas: 0, propuestas: 0, pendientes: 0 },
  error: "Requiere backend conectado (USE_BACKEND) para inspeccionar los parquets.",
};

/**
 * Sube los archivos ARRASTRADOS desde el PC del admin al servidor (multipart) y
 * devuelve la carpeta temporal (`root`) donde quedaron, para pasarla a /plan y
 * /apply. Preserva la ruta relativa (carpetas) vía `webkitRelativePath`.
 */
export async function uploadBundle(
  files: FileList | File[],
  onProgress?: (pct: number) => void,
): Promise<{ root: string; files: number }> {
  const fd = new FormData();
  for (const f of Array.from(files)) {
    fd.append("files", f);
    // ruta relativa si vino de una carpeta; si no, el nombre suelto.
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
    fd.append("paths", rel && rel.length > 0 ? rel : f.name);
  }
  // XHR (no fetch) para reportar PROGRESO real de subida: en bundles grandes
  // (cientos de MB) el botón giraba "a ciegas" sin decir si avanzaba. Con
  // upload.onprogress mostramos el % subido; onload/onerror dan feedback claro.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Respuesta inválida del servidor tras subir."));
        }
        return;
      }
      let msg = `Error ${xhr.status}`;
      try {
        const e = JSON.parse(xhr.responseText);
        msg = e.detail || e.error || msg;
      } catch {
        /* respuesta no-JSON (p.ej. 413 de nginx) */
        if (xhr.status === 413) msg = "El archivo excede el tamaño permitido por el servidor (413).";
      }
      reject(new Error(msg));
    };
    xhr.onerror = () =>
      reject(new Error("No se pudo conectar con el servidor (revisa tamaño máximo / timeout del proxy)."));
    xhr.ontimeout = () => reject(new Error("La subida tardó demasiado (timeout)."));
    xhr.send(fd);
  });
}

/** FASE A: clasifica las columnas del bundle en `root` (carpeta del servidor). */
export async function fetchBundlePlan(root: string): Promise<BundlePlan> {
  if (!USE_BACKEND) return EMPTY_PLAN;
  return api<BundlePlan>(`/plan`, { method: "POST", body: JSON.stringify({ root }) });
}

/** Registro columna→clase. `estado` opcional: ok|pendiente|ignorada. */
export async function fetchRegistryColumns(estado?: string): Promise<RegistryColumn[]> {
  if (!USE_BACKEND) return [];
  const qs = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  return api<RegistryColumn[]>(`/columns${qs}`);
}

/** Concilia/crea una columna del registro. Lanza si falla (aviso en el panel). */
export async function reconcileColumn(
  name: string,
  patch: Partial<Omit<RegistryColumn, "name" | "baseCode">>,
): Promise<RegistryColumn> {
  return api<RegistryColumn>(`/columns/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Ingesta UPSERT del bundle (interfaz; no destructiva). Lanza si hay pendientes. */
export async function applyBundle(
  root: string,
  emplazamiento: "onshore" | "offshore" = "onshore",
): Promise<ApplyResult> {
  return api<ApplyResult>(`/apply`, {
    method: "POST",
    body: JSON.stringify({ root, emplazamiento }),
  });
}
