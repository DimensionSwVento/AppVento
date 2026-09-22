"use client";
import { useEffect, useState } from "react";
import { USE_BACKEND } from "../projectData";
import { setBannedData, setEsOffshoreData } from "../h3/hexClassification";

export type AreaHexInfo = {
  score_general: number;
  /** Scores por DIMENSIÓN/categoría (claves `TEC`/`AMB`/`SOE`/`SOC`/`MAC`/`REG`), 0–1. */
  scores: Record<string, number>;
  /**
   * Valores por VARIABLE individual. Clave = **código de la master = `masterId`**
   * del catálogo (`TEC-004-T`, `AMB-005-A`). ⚠️ Confirmar con backend el FORMATO
   * EXACTO de la clave: si el parquet la trae como `TEC_001`/`TEC_001_sv001` (guion
   * bajo) hay que normalizar guion↔guion_bajo antes de casar. Valor: confirmar si
   * viene normalizado 0–1 (para el "puntaje 0–100") o crudo (para informativas).
   */
  variables?: Record<string, number>;
  /** Valores PONDERADOS por variable (tabla `hexagon_variables_pon`), misma clave
   *  que `variables`. Para el "descargar crudos" del informe. */
  variables_pon?: Record<string, number>;
  /** `"disponible"` | `"excluida"` — zona excluida (inviable) → no seleccionable. */
  tipo_celda?: string;
  /**
   * Mar (1) / tierra (0). ⚠️ Su **nombre de columna real aún no está definido**
   * (`es_offshore` es provisional); llegará como una variable consultable más.
   * Seam listo: al agregarla el backend, ajustar el nombre aquí y en `fetchArea`.
   */
  es_offshore?: number;
};
export type AreaHexMap = Map<string, AreaHexInfo>;

type AreaHexRow = {
  h3_index: string;
  score_general: number;
  scores: Record<string, number>;
  variables?: Record<string, number>;
  variables_pon?: Record<string, number>;
  tipo_celda?: string;
  es_offshore?: number;
};

/**
 * Promedio del valor de UNA variable sobre el área, desde el campo `variables`
 * del backend. `code` = código de la master (= `masterId` del catálogo).
 *
 * Devuelve el promedio tal cual viene del backend (`null` si esa variable no
 * está → el consumidor cae a su placeholder). ⚠️ Confirmar con backend: (a) el
 * FORMATO exacto de la clave (si es `TEC_001` en vez de `TEC-004-T`, normalizar
 * aquí antes de leer); (b) si el valor viene 0–1 (para "puntaje 0–100", habría
 * que ×100) o crudo (informativas con unidad).
 */
/**
 * id de dimensión del frontend → clave(s) de `scores` del backend.
 * El backend usa MAYÚSCULA (`TEC`/`AMB`/`SOE`/`MAC`/`REG`); `social` llega como
 * `SOE` (a veces `SOC`) → se prueban ambas. `general` NO va en `scores`: usa el
 * campo aparte `score_general`.
 */
const DIM_TO_CATS: Record<string, string[]> = {
  tecnica: ["TEC"],
  ambiental: ["AMB"],
  social: ["SOE", "SOC"],
  macroeconomica: ["MAC"],
  regulatoria: ["REG"],
};

/**
 * Score real del backend (0..1) para (hex, dimensión), o `undefined` si no hay
 * dato (p.ej. `general` usa `score_general`; `AMB`/`MAC` aún sin master).
 */
export function backendScore(
  info: AreaHexInfo | undefined,
  dim: string,
): number | undefined {
  if (!info) return undefined;
  if (dim === "general")
    return typeof info.score_general === "number" ? info.score_general : undefined;
  for (const c of DIM_TO_CATS[dim] ?? []) {
    if (typeof info.scores?.[c] === "number") return info.scores[c];
  }
  return undefined;
}

/**
 * `masterId` del catálogo → código de variable del backend.
 * El catálogo usa guiones y a veces un sufijo de dimensión (`TEC-004-T`,
 * `AMB-005-A`, `SOC-001-SE`); el backend usa guion bajo y sin ese sufijo
 * (`TEC_004`, `SOE_001`). Ej.: `SOE-001`→`SOE_001`, `TEC-004-T`→`TEC_004`,
 * `SOC-001-SE`→`SOC_001`, `TEC-016`→`TEC_016`.
 */
export function backendVarCode(masterId: string): string {
  return masterId.replace(/-/g, "_").replace(/_[A-Z]+$/, "");
}

/**
 * Valor CRUDO de UNA variable en UN hex, desde `variables` del backend. Si el
 * backend parte la variable en subvariables `code_svNNN` (p.ej. WPD por altura),
 * promedia las disponibles. `undefined` si no hay dato.
 */
export function hexVariableValue(
  info: AreaHexInfo | undefined,
  masterId: string,
): number | undefined {
  const vars = info?.variables;
  if (!vars) return undefined;
  const key = backendVarCode(masterId);
  const v = vars[key];
  if (typeof v === "number") return v;
  let s = 0;
  let k = 0;
  for (const vk of Object.keys(vars)) {
    const sv = vars[vk];
    if (vk.startsWith(`${key}_sv`) && typeof sv === "number") {
      s += sv;
      k += 1;
    }
  }
  return k > 0 ? s / k : undefined;
}

/** Promedio del valor crudo de una variable sobre el área (o `null`). */
export function areaVariableAverage(
  areaData: AreaHexMap | null,
  hexes: Set<string>,
  code: string,
): number | null {
  if (!areaData || !code || code === "NA") return null;
  let sum = 0;
  let n = 0;
  for (const h of hexes) {
    const v = hexVariableValue(areaData.get(h), code);
    if (typeof v === "number") {
      sum += v;
      n += 1;
    }
  }
  return n > 0 ? sum / n : null;
}

// Cache de una sola entrada (la selección actual): el informe y el heatmap
// comparten UN solo fetch en vez de pedir el área dos veces.
let _key = "";
let _promise: Promise<AreaHexMap> | null = null;

function keyOf(hexes: Set<string>): string {
  return Array.from(hexes).sort().join(",");
}

function fetchArea(hexes: Set<string>): Promise<AreaHexMap> {
  return fetch(`/api/tiles/area`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hexes: Array.from(hexes) }),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rows: AreaHexRow[]) => {
      const m: AreaHexMap = new Map();
      if (Array.isArray(rows)) {
        for (const h of rows) {
          m.set(h.h3_index, {
            score_general: h.score_general,
            scores: h.scores ?? {},
            variables: h.variables ?? {},
            variables_pon: h.variables_pon ?? {},
            tipo_celda: h.tipo_celda,
            es_offshore: h.es_offshore,
          });
        }
      }
      // Alimenta el emplazamiento (mar/tierra) y las zonas excluidas por DATO:
      // cada hex trae su columna → `isOffshoreHex` / `isHexBanned` las usan.
      const offshore: [string, boolean][] = [];
      const banned: [string, boolean][] = [];
      for (const [hex, info] of m) {
        if (typeof info.es_offshore === "number") {
          offshore.push([hex, info.es_offshore === 1]);
        }
        if (info.tipo_celda != null) {
          banned.push([hex, info.tipo_celda === "excluida"]);
        }
      }
      if (offshore.length > 0) setEsOffshoreData(offshore);
      if (banned.length > 0) setBannedData(banned);
      return m;
    });
}

/**
 * Datos por hexágono del área seleccionada (score general + scores por
 * dimensión) desde el backend (`POST /api/tiles/area`). Fuente ÚNICA compartida
 * por el informe (agregación) y el heatmap (color por hex).
 *
 * Devuelve `null` mientras carga / si el BFF o backend no responde (503/502) /
 * si aún no hay datos → los consumidores caen a su placeholder.
 */
export function useAreaHexData(
  selectedHexes: Set<string>,
  enabled = true,
): AreaHexMap | null {
  const [data, setData] = useState<AreaHexMap | null>(null);

  useEffect(() => {
    // Reset de datos al cambiar la selección antes de re-consultar el backend
    // (evita mostrar datos del área anterior mientras carga la nueva).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    // Modo template (sin API): no se consulta el backend → placeholder.
    if (!USE_BACKEND || !enabled || selectedHexes.size === 0) return;

    const key = keyOf(selectedHexes);
    if (key !== _key || !_promise) {
      _key = key;
      _promise = fetchArea(selectedHexes);
    }

    let cancelled = false;
    _promise
      .then((m) => {
        if (!cancelled) setData(m);
      })
      .catch(() => {
        if (_key === key) _promise = null; // permite reintentar en la próxima
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, selectedHexes]);

  return data;
}
