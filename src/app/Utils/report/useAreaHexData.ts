"use client";
import { useEffect, useState } from "react";
import { USE_BACKEND } from "../projectData";

export type AreaHexInfo = { score_general: number; scores: Record<string, number> };
export type AreaHexMap = Map<string, AreaHexInfo>;

type AreaHexRow = {
  h3_index: string;
  score_general: number;
  scores: Record<string, number>;
};

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
          });
        }
      }
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
