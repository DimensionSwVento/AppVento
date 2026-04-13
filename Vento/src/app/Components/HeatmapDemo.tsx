"use client";

/**
 * HeatmapDemo — Componente DEMO con todas las features del mapa de calor:
 * tiles desde FastAPI, leyenda dinámica, selector de variables, popups,
 * congelar/descongelar, conteos por capa.
 *
 * NO se usa en el flujo del contrato. Importable si se quiere activar el modo
 * exploratorio (ver US-F-MAP-AB en futuros-sprints.md).
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Map as MapGL, type MapRef } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { TileLayer } from "@deck.gl/geo-layers";
import { PolygonLayer } from "@deck.gl/layers";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { cellToBoundary, cellToParent, cellToChildren, getResolution } from "h3-js";
import { useCachedImage } from "../Utils/useCachedImage";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import HexPopup from "./HexPopup";
import VariableSelector from "./VariableSelector";
import LayerInfo from "./LayerInfo";
import {
  INITIAL_VIEW_STATE,
  MAX_BOUNDS,
  SNAPSHOT_KEY,
} from "../Utils/h3Resolution";
import { API_BASE } from "../Utils/apiUrl";
import { authFetch } from "../Utils/authFetch";
import "maplibre-gl/dist/maplibre-gl.css";

function zoomToH3Res(zoom: number): number {
  if (zoom >= 10) return 7;
  if (zoom >= 8) return 6;
  if (zoom >= 7) return 5;
  if (zoom >= 6) return 4;
  return 3;
}

try { luma.registerAdapters([webgl2Adapter]); } catch { /* ok */ }

interface TileHex {
  h: string; s: number; t: string; la: number; ln: number; v?: number | null;
}

/** Variables negativas: alto valor = perjudicial para viabilidad eólica */
const NEGATIVE_VARS = ["soc_022_sr", "soc_025_er"];

/** Score general y positivas: transparente → azul → amarillo → verde */
function getColorByRatio(ratio: number): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, ratio));
  if (t < 0.05) return [180, 180, 180, 20];
  if (t < 0.33) return [30, 60, 160, 130];
  if (t < 0.66) return [240, 200, 20, 160];
  return [34, 160, 34, 180];
}

/** Negativas: transparente → azul → amarillo → rojo */
function getColorNegative(ratio: number): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, ratio));
  if (t < 0.05) return [180, 180, 180, 20];
  if (t < 0.33) return [30, 60, 160, 130];
  if (t < 0.66) return [240, 200, 20, 160];
  return [210, 40, 40, 180];
}

function getVariableColor(val: number | null | undefined, min: number, max: number, negative: boolean): [number, number, number, number] {
  if (val === null || val === undefined || isNaN(val)) return [180, 180, 180, 25];
  const range = max - min;
  if (range === 0) return [180, 180, 180, 80];
  const ratio = Math.max(0, Math.min(1, (val - min) / range));
  return negative ? getColorNegative(ratio) : getColorByRatio(ratio);
}

export default function HeatmapDemo() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const { accion, selectedHexes, setSelectedHexes } = useAprincipal();
  const [mapReady, setMapReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const loading = !mapReady || !dataReady;
  const [mapState, setMapState] = useState<"active" | "frozen">("active");
  const [fullscreen, setFullscreen] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const { saveToCache, clearCache } = useCachedImage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);
  const [activeVar, setActiveVar] = useState<string | null>(null);
  const [varRange, setVarRange] = useState<{ min: number; max: number } | null>(null);
  const [popup, setPopup] = useState<{ h3: string; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const lastHoveredHex = useRef<{ h: string; x: number; y: number } | null>(null);
  const currentRes = zoomToH3Res(viewState.zoom);
  const [layerCounts, setLayerCounts] = useState({ total: 0, selected: 0, aboveThreshold: 0 });
  const shouldFreeze = accion !== "seleccion-area";

  useEffect(() => {
    authFetch(`${API_BASE}/api/tiles/warmup`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ready") setDataReady(true);
      })
      .catch(() => setDataReady(true));

    const onFsChange = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    const params = new URLSearchParams({ zoom: String(Math.round(viewState.zoom)) });
    if (activeVar) params.set("var", activeVar);
    const selectedArr = Array.from(selectedHexes);
    if (selectedArr.length > 0) params.set("selected", selectedArr.join(","));
    authFetch(`${API_BASE}/api/tiles/counts?${params}`)
      .then((r) => r.json())
      .then(setLayerCounts)
      .catch(() => {});
  }, [dataReady, viewState.zoom, selectedHexes.size, activeVar]);

  useEffect(() => {
    if (!activeVar) { setVarRange(null); return; }
    authFetch(`${API_BASE}/api/tiles/variables`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.variables?.find((v: { name: string }) => v.name === activeVar);
        if (found?.range) setVarRange(found.range);
      })
      .catch(() => {});
  }, [activeVar]);

  useEffect(() => {
    if (shouldFreeze && mapState === "active") freeze();
    else if (!shouldFreeze && mapState === "frozen") unfreeze();
  }, [shouldFreeze]);

  const toggleHex = useCallback((h3Index: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev);
      if (next.has(h3Index)) { next.delete(h3Index); } else { next.add(h3Index); }
      return next;
    });
  }, [setSelectedHexes]);

  const getHexSelectionState = useCallback((h3Index: string): "selected" | "ancestor" | "none" => {
    if (selectedHexes.has(h3Index)) return "selected";
    const res = getResolution(h3Index);
    for (let r = res - 1; r >= 3; r--) {
      try { if (selectedHexes.has(cellToParent(h3Index, r))) return "selected"; } catch { break; }
    }
    for (let r = res + 1; r <= 7; r++) {
      try {
        const children = cellToChildren(h3Index, r);
        for (const child of children) { if (selectedHexes.has(child)) return "ancestor"; }
      } catch { break; }
    }
    return "none";
  }, [selectedHexes]);

  const freeze = useCallback(async () => {
    const container = containerRef.current;
    if (!container || mapState === "frozen") return;
    const canvases = container.querySelectorAll("canvas");
    if (canvases.length === 0) return;
    const composite = document.createElement("canvas");
    composite.width = canvases[0].width;
    composite.height = canvases[0].height;
    const ctx = composite.getContext("2d");
    if (!ctx) return;
    canvases.forEach((c) => ctx.drawImage(c, 0, 0));
    const dataUri = composite.toDataURL("image/png");
    const objectUrl = await saveToCache(dataUri, SNAPSHOT_KEY);
    setSnapshot(objectUrl);
    setMapState("frozen");
  }, [mapState, saveToCache]);

  const unfreeze = useCallback(async () => {
    await clearCache(SNAPSHOT_KEY);
    setSnapshot(null);
    setMapState("active");
  }, [clearCache]);

  const MIN_ZOOM = 5;
  const MAX_ZOOM = 10;
  const clampViewState = useCallback((vs: typeof INITIAL_VIEW_STATE) => {
    const [west, south, east, north] = MAX_BOUNDS;
    return {
      ...vs,
      longitude: Math.max(west, Math.min(east, vs.longitude)),
      latitude: Math.max(south, Math.min(north, vs.latitude)),
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vs.zoom)),
    };
  }, []);

  const tileLayer = useMemo(() => new TileLayer<TileHex>({
    id: "h3-tiles",
    data: `${API_BASE}/api/tiles/{z}/{x}/{y}`,
    minZoom: 2,
    maxZoom: 10,
    tileSize: 512,
    maxCacheSize: 64,
    maxRequests: 4,
    refinementStrategy: "best-available",
    getTileData: async (tile) => {
      const { x, y, z } = tile.index;
      const url = activeVar
        ? `${API_BASE}/api/tiles/${z}/${x}/${y}?var=${encodeURIComponent(activeVar)}`
        : `${API_BASE}/api/tiles/${z}/${x}/${y}`;
      const res = await authFetch(url, { signal: tile.signal });
      if (!res.ok) return [];
      return res.json();
    },
    renderSubLayers: (props) => {
      const { data } = props;
      if (!data || !Array.isArray(data) || data.length === 0) return null;
      const hexes = data as unknown as TileHex[];
      const hasVar = activeVar && varRange;
      const isNeg = activeVar ? NEGATIVE_VARS.some((p) => activeVar.startsWith(p)) : false;
      const selected: TileHex[] = [];
      const ancestors: TileHex[] = [];
      for (const d of hexes) {
        const state = getHexSelectionState(d.h);
        if (state === "selected") selected.push(d);
        else if (state === "ancestor") ancestors.push(d);
      }
      return [
        new PolygonLayer<TileHex>({
          id: `${props.id}-grid`, data: hexes,
          getPolygon: (d) => cellToBoundary(d.h, true),
          getFillColor: hasVar
            ? ((d: TileHex) => getVariableColor(d.v, varRange.min, varRange.max, isNeg))
            : ((d: TileHex) => getColorByRatio(d.s)),
          getLineColor: [204, 204, 204, 78], getLineWidth: 1, lineWidthMinPixels: 1,
          filled: true, stroked: true, pickable: true,
        }),
        new PolygonLayer<TileHex>({
          id: `${props.id}-ancestor`, data: ancestors,
          getPolygon: (d) => cellToBoundary(d.h, true),
          getFillColor: [15, 30, 100, 50], getLineColor: [15, 30, 100, 180],
          getLineWidth: 1, lineWidthMinPixels: 2, filled: true, stroked: true, pickable: false,
        }),
        new PolygonLayer<TileHex>({
          id: `${props.id}-selected`, data: selected,
          getPolygon: (d) => cellToBoundary(d.h, true),
          getFillColor: [0, 180, 255, 140], getLineColor: [0, 180, 255, 220],
          getLineWidth: 1, lineWidthMinPixels: 2, filled: true, stroked: true, pickable: false,
        }),
      ];
    },
    updateTriggers: {
      renderSubLayers: [selectedHexes.size, activeVar, varRange],
      getTileData: [activeVar],
    },
  }), [selectedHexes, activeVar, varRange]);

  const zoomIn = () => setViewState((v) => clampViewState({ ...v, zoom: v.zoom + 1 }));
  const zoomOut = () => setViewState((v) => clampViewState({ ...v, zoom: v.zoom - 1 }));
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { el.requestFullscreen(); setFullscreen(true); }
    else { document.exitFullscreen(); setFullscreen(false); }
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${fullscreen ? "bg-black" : ""}`}
      onPointerDown={() => {
        longPressTriggered.current = false;
        longPressTimer.current = setTimeout(() => {
          const hovered = lastHoveredHex.current;
          if (hovered) {
            longPressTriggered.current = true;
            setPopup({ h3: hovered.h, x: hovered.x, y: hovered.y });
          }
        }, 500);
      }}
      onPointerUp={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
      onPointerLeave={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
    >
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-lg">... cargando mapa</p>
        </div>
      )}

      {popup && <HexPopup h3Index={popup.h3} x={popup.x} y={popup.y} onClose={() => setPopup(null)} />}

      {mapState === "frozen" && snapshot ? (
        <>
          <img src={snapshot} alt="Mapa congelado" className="h-full w-full object-cover" />
          <button onClick={unfreeze} className="absolute top-3 right-3 z-10 rounded bg-blue-600 px-3 py-1.5 text-sm text-white shadow hover:bg-blue-700">Reactivar mapa</button>
        </>
      ) : (
        <>
          {!loading && (
            <>
              <VariableSelector selected={activeVar} onSelect={setActiveVar} />
              <button onClick={freeze} className="absolute top-3 right-3 z-10 rounded bg-gray-800 px-3 py-1.5 text-sm text-white shadow hover:bg-gray-900">Congelar mapa</button>
              <div className="absolute bottom-4 left-3 z-10 rounded bg-black/70 px-3 py-2 text-xs text-white shadow backdrop-blur min-w-[130px]">
                <div className="mb-1 text-gray-400">{activeVar ? (NEGATIVE_VARS.some((p) => activeVar.startsWith(p)) ? "Impacto negativo" : "Impacto positivo") : "Viabilidad"}</div>
                {(activeVar && NEGATIVE_VARS.some((p) => activeVar.startsWith(p))) ? (
                  <>
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded" style={{ background: "rgb(210,40,40)" }} />Alto</div>
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded" style={{ background: "rgb(240,200,20)" }} />Medio</div>
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded" style={{ background: "rgb(30,60,160)" }} />Bajo</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded" style={{ background: "rgb(34,160,34)" }} />Alto</div>
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded" style={{ background: "rgb(240,200,20)" }} />Medio</div>
                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded" style={{ background: "rgb(30,60,160)" }} />Bajo</div>
                  </>
                )}
                <hr className="my-1 border-gray-600" />
                <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded" style={{ background: "rgb(0,180,255)" }} />Seleccionado</div>
                <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded" style={{ background: "rgb(15,30,100)" }} />Bajo umbral</div>
              </div>
              <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
                <LayerInfo resolution={currentRes} total={layerCounts.total} selectedCount={layerCounts.selected} aboveThresholdCount={layerCounts.aboveThreshold} />
                <button onClick={zoomIn} className="flex h-8 w-8 items-center justify-center rounded bg-white text-lg font-bold text-black shadow hover:bg-gray-100" title="Acercar">+</button>
                <button onClick={zoomOut} className="flex h-8 w-8 items-center justify-center rounded bg-white text-lg font-bold text-black shadow hover:bg-gray-100" title="Alejar">-</button>
                <button onClick={toggleFullscreen} className="flex h-8 w-8 items-center justify-center rounded bg-white text-black shadow hover:bg-gray-100" title={fullscreen ? "Salir" : "Pantalla completa"}>
                  {fullscreen ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v4H2M10 1v4h4M6 15v-4H2M10 15v-4h4" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>
                  )}
                </button>
              </div>
            </>
          )}
          <DeckGL
            style={{ position: "relative", width: "auto", height: "100%" }}
            viewState={viewState}
            onViewStateChange={({ viewState: vs }) => setViewState(clampViewState(vs as typeof INITIAL_VIEW_STATE))}
            controller={true}
            layers={dataReady ? [tileLayer] : []}
            onHover={(info) => {
              const hex = info.object as TileHex | undefined;
              if (hex) lastHoveredHex.current = { h: hex.h, x: info.x ?? 0, y: info.y ?? 0 };
              else lastHoveredHex.current = null;
            }}
            onClick={(info) => {
              if (longPressTriggered.current) { longPressTriggered.current = false; return; }
              const hex = info.object as TileHex | undefined;
              if (!hex) { setPopup(null); return; }
              setPopup(null);
              toggleHex(hex.h);
            }}
            getTooltip={({ object }: { object?: TileHex }) =>
              object ? `H3: ${object.h}\nViabilidad: ${(object.s * 100).toFixed(1)}%\nTipo: ${object.t}${object.v != null ? `\nVar: ${object.v.toFixed(2)}` : ""}` : null
            }
          >
            <MapGL
              ref={mapRef}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              canvasContextAttributes={{ preserveDrawingBuffer: true }}
              onLoad={() => setMapReady(true)}
            />
          </DeckGL>
        </>
      )}
    </div>
  );
}
