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
export function areaVariableAverage(
  areaData: AreaHexMap | null,
  hexes: Set<string>,
  code: string,
): number | null {
  if (!areaData || !code || code === "NA") return null;
  let sum = 0;
  let n = 0;
  for (const h of hexes) {
    const v = areaData.get(h)?.variables?.[code];
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
