"use client";
import { useEffect, useState } from "react";
import { USE_BACKEND } from "../projectData";
import { setEsOffshoreData } from "../h3/hexClassification";

export type AreaHexInfo = {
  score_general: number;
  /** Scores por DIMENSIÓN/categoría (claves `TEC`/`AMB`/`SOE`/`SOC`/`MAC`/`REG`), 0–1. */
  scores: Record<string, number>;
  /**
   * Valores por VARIABLE individual (CRUDOS, sin normalizar), clave = código de
   * backend (`TEC_001`, `TEC_001_sv001`). OJO: ese código NO es el `masterId` del
   * catálogo del cliente (`TEC-004-T`) → hace falta un mapeo para casarlos.
   */
  variables?: Record<string, number>;
  /**
   * Mar (1) / tierra (0). ⚠️ HOY NO viene en el contrato de `/api/tiles/area`
   * (solo hay `tipo_celda`) y **su nombre de columna real aún no está definido**
   * (`es_offshore` es provisional). Seam listo: cuando el backend agregue la
   * columna, ajustar este nombre aquí y en `fetchArea`.
   */
  es_offshore?: number;
};
export type AreaHexMap = Map<string, AreaHexInfo>;

type AreaHexRow = {
  h3_index: string;
  score_general: number;
  scores: Record<string, number>;
  variables?: Record<string, number>;
  es_offshore?: number;
};

/**
 * Promedio del valor de UNA variable sobre el área, desde el campo `variables`
 * del backend. `code` = código de backend de la variable (`TEC_001`).
 *
 * ⚠️ Devuelve el valor CRUDO promediado (no 0–100): las columnas por variable
 * NO vienen normalizadas (solo los `scores` por dimensión sí). Y el `code` debe
 * ser el del backend, no el `masterId` del catálogo → hoy no casan sin un mapeo,
 * por eso cae a `null` y el consumidor usa su placeholder. Ver notas de integración.
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
            es_offshore: h.es_offshore,
          });
        }
      }
      // Alimenta el emplazamiento por dato: cada hex sabe si es mar/tierra por
      // la columna `es_offshore` del backend (0/1) → `isOffshoreHex` la usa.
      const offshore: [string, boolean][] = [];
      for (const [hex, info] of m) {
        if (typeof info.es_offshore === "number") {
          offshore.push([hex, info.es_offshore === 1]);
        }
      }
      if (offshore.length > 0) setEsOffshoreData(offshore);
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
