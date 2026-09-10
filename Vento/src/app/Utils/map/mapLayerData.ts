"use client";

/**
 * SEAM de capas de mapa por variable en RES8 (V0 Sprint 4 — "verse en el mapa").
 *
 * Toda variable con "ver en mapa" se pinta como **hexágonos res8**:
 *  - `area` (protegidas, resguardos, nodos, puertos, vías…): hex de cobertura
 *    con **relleno suave** del color de la variable.
 *  - `heat` (velocidad / densidad de viento): hex coloreados en **viridis** y,
 *    para no contaminar la vista, **solo los que superan un umbral**.
 *
 * Hoy: placeholder DETERMINISTA (parche de hex res8 alrededor de los puntos de
 * `MAP_SYMBOLS`, con valor que decae para heat). Con `USE_BACKEND=true`: fetch a
 * `POST /api/tiles/variable` (contrato en memoria `map-res8-contract`). El valor
 * de heat sale del campo `variables[code]` de la máster (res8); la cobertura de
 * área = presencia de valor para esa variable.
 */
import { latLngToCell, cellToLatLng, gridDisk } from "h3-js";
import { MAP_SYMBOLS, type MapSymbol, type MapSymbolKind } from "./mapSymbols";
import { USE_BACKEND } from "../projectData";

/** Resolución H3 de las capas de ÁREA (cobertura localizada de la máster). */
export const MAP_LAYER_RES = 8;

/**
 * Umbral de display del heat de viento (0–1): por debajo el hex no se pinta.
 * Ahora en 0 → se pinta TODO de 0 para arriba (mapa de calor de toda Colombia,
 * para ver el alcance completo). El "no contaminar" lo da el relleno al 20%.
 * Real: `mapThreshold` por variable desde la máster (si se quiere recortar).
 */
export const WIND_THRESHOLD = 0;

/**
 * Valor de viento (0–1) de UN hexágono, a CUALQUIER resolución (el heat colorea
 * los hex que el grid ya muestra, que cambian de res con el zoom — no un set
 * fijo res8). Placeholder: campo de CORREDORES ("zanjas") determinista por la
 * posición del hex (centro cálido / bordes fríos). Real: valor de la máster
 * (`variables[code]`) del hex, agregado a la resolución mostrada.
 */
export function windValueForHex(variableId: string, h3Index: string): number {
  const [lat, lng] = cellToLatLng(h3Index);
  // Desfase por variable → velocidad y densidad no calcan idéntico.
  const off = variableId === "densidad-viento" ? 0.7 : 0;
  const theta = (lng * 2.1 + lat * 1.1 + off) * Math.PI;
  return Math.pow(Math.max(0, Math.sin(theta)), 1.4);
}

export interface MapLayerCell {
  /** Índice H3 res8. */
  h: string;
  /** Valor normalizado 0–1 (heat → intensidad viridis; area → cobertura). */
  value: number;
}

export interface MapLayerData {
  variableId: string;
  kind: MapSymbolKind;
  /** Color base de la variable (para relleno suave de `area`). */
  color: string;
  cells: MapLayerCell[];
  /** Umbral de display 0–1: por debajo NO se pinta (evita saturar el heat). */
  threshold: number;
}

/**
 * Placeholder de cobertura de una variable de ÁREA (protegidas, resguardos,
 * nodos…): hex alrededor de sus puntos (relleno suave). El viento NO usa esto
 * (es un mapa de calor que colorea los hex del grid — ver `windValueForHex`).
 * Real: los hex de cobertura vienen de la máster res8.
 */
function placeholderCells(s: MapSymbol): MapLayerCell[] {
  const acc = new Map<string, number>();
  for (const p of s.points) {
    const center = latLngToCell(p.lat, p.lng, MAP_LAYER_RES);
    for (const h of gridDisk(center, 4)) acc.set(h, 0.85);
  }
  return Array.from(acc, ([h, value]) => ({ h, value }));
}

/**
 * Devuelve los hex res8 (+valor) de la capa de una variable de mapa.
 * Real (`USE_BACKEND`): `POST /api/tiles/variable`. Template: placeholder.
 */
export async function fetchMapLayerCells(
  s: MapSymbol,
): Promise<MapLayerCell[]> {
  if (USE_BACKEND) {
    try {
      const res = await fetch(`/api/tiles/variable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: s.variableId, res: MAP_LAYER_RES }),
      });
      if (res.ok) {
        const rows = (await res.json()) as { h3_index: string; value: number }[];
        return rows.map((r) => ({ h: r.h3_index, value: r.value }));
      }
    } catch {
      /* cae a placeholder */
    }
  }
  return placeholderCells(s);
}

/** Metadatos de capa (kind/color) sin cargar los hex. */
export function mapLayerMeta(variableId: string): {
  kind: MapSymbolKind;
  color: string;
} | null {
  const s = MAP_SYMBOLS.find((x) => x.variableId === variableId);
  if (!s) return null;
  return { kind: s.kind, color: s.color };
}

export function symbolFor(variableId: string): MapSymbol | undefined {
  return MAP_SYMBOLS.find((x) => x.variableId === variableId);
}
