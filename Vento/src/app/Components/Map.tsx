"use client";

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

// zoom → resolución H3 (mismo que h3TileIndex.ts server-side)
function zoomToH3Res(zoom: number): number {
  if (zoom >= 10) return 7;
  if (zoom >= 8) return 6;
  if (zoom >= 7) return 5;
  if (zoom >= 6) return 4;
  if (zoom >= 5) return 3;
  return 2;
}
import "maplibre-gl/dist/maplibre-gl.css";

try { luma.registerAdapters([webgl2Adapter]); } catch { /* retry on mount */ }

interface TileHex {
  h: string;
  s: number;
  t: string;
  la: number;
  ln: number;
  v?: number | null;  // valor de variable filtrada (AC2)
}

// gradiente por ratio [0-1] — azul (bajo) → amarillo (medio) → rojo (alto)
function getColorByRatio(ratio: number): [number, number, number, number] {
  if (ratio > 0.66) return [220, 50, 50, 160];
  if (ratio > 0.33) return [240, 180, 50, 140];
  return [50, 130, 220, 120];
}

// gradiente para variable filtrada — normaliza valor entre min/max
function getVariableColor(val: number | null | undefined, min: number, max: number): [number, number, number, number] {
  if (val === null || val === undefined || isNaN(val)) return [180, 180, 180, 25];
  const range = max - min;
  if (range === 0) return [180, 180, 180, 80];
  const ratio = Math.max(0, Math.min(1, (val - min) / range));
  if (ratio > 0.66) return [220, 50, 50, 160];
  if (ratio > 0.33) return [240, 180, 50, 140];
  return [50, 130, 220, 120];
}

export default function MapView() {
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

  // AC2: variable filtrada
  const [activeVar, setActiveVar] = useState<string | null>(null);
  const [varRange, setVarRange] = useState<{ min: number; max: number } | null>(null);

  // AC3: popup
  const [popup, setPopup] = useState<{ h3: string; x: number; y: number } | null>(null);

  // info de capa — conteos globales desde el servidor
  const currentRes = zoomToH3Res(viewState.zoom);
  const [layerCounts, setLayerCounts] = useState({ total: 0, selected: 0, aboveThreshold: 0 });

  const shouldFreeze = accion !== "seleccion-area";

  // conteos globales desde el servidor (todos los hex de la capa, no solo visibles)
  useEffect(() => {
    if (!dataReady) return;
    const selectedArr = Array.from(selectedHexes);
    const params = new URLSearchParams({ zoom: String(Math.round(viewState.zoom)) });
    if (activeVar) params.set("var", activeVar);
    if (selectedArr.length > 0) params.set("selected", selectedArr.join(","));

    fetch(`${API_BASE}/api/tiles/counts?${params}`)
      .then((r) => r.json())
      .then(setLayerCounts)
      .catch(() => {});
  }, [dataReady, viewState.zoom, selectedHexes.size, activeVar]);

  // cargar rango de la variable seleccionada
  useEffect(() => {
    if (!activeVar) { setVarRange(null); return; }
    fetch(`${API_BASE}/api/tiles/variables`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.variables?.find((v: { name: string }) => v.name === activeVar);
        if (found?.range) setVarRange(found.range);
      })
      .catch(() => {});
  }, [activeVar]);

  // selección jerárquica: al seleccionar un hex, se agregan sus hijos (res 8)
  // y se marca la cadena de padres como "parcialmente seleccionados"
  const DATA_RES = 8; // resolución de los datos originales del parquet

  const toggleHex = useCallback((h3Index: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev);
      const res = getResolution(h3Index);

      if (next.has(h3Index)) {
        // deseleccionar: quitar este hex + todos sus hijos
        next.delete(h3Index);
        if (res < DATA_RES) {
          try {
            const children = cellToChildren(h3Index, DATA_RES);
            for (const child of children) next.delete(child);
          } catch { /* ignorar si no puede expandir */ }
        }
      } else {
        // seleccionar: agregar este hex + todos sus hijos hasta res 8
        next.add(h3Index);
        if (res < DATA_RES) {
          try {
            const children = cellToChildren(h3Index, DATA_RES);
            for (const child of children) next.add(child);
          } catch { /* ignorar */ }
        }
      }
      return next;
    });
  }, [setSelectedHexes]);

  // determinar si un hex visible tiene ancestros/descendientes seleccionados
  // (para marcar padres con borde diferente)
  const getHexSelectionState = useCallback((h3Index: string): "selected" | "ancestor" | "none" => {
    if (selectedHexes.has(h3Index)) return "selected";

    // verificar si algún padre está seleccionado (este hex es descendiente)
    const res = getResolution(h3Index);
    for (let r = res - 1; r >= 0; r--) {
      try {
        const parent = cellToParent(h3Index, r);
        if (selectedHexes.has(parent)) return "selected";
      } catch { break; }
    }

    // verificar si algún hijo está seleccionado (este hex es ancestro)
    if (res < DATA_RES) {
      try {
        const children = cellToChildren(h3Index, Math.min(res + 1, DATA_RES));
        for (const child of children) {
          if (selectedHexes.has(child)) return "ancestor";
        }
      } catch { /* ignorar */ }
    }

    return "none";
  }, [selectedHexes]);

  // capa de tiles H3
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
      const res = await fetch(url, { signal: tile.signal });
      if (!res.ok) return [];
      return res.json();
    },
    renderSubLayers: (props) => {
      const { data } = props;
      if (!data || !Array.isArray(data) || data.length === 0) return null;

      const hexes = data as unknown as TileHex[];
      const hasVar = activeVar && varRange;

      // clasificar hexágonos por estado de selección
      const selected: TileHex[] = [];
      const ancestors: TileHex[] = [];
      for (const d of hexes) {
        const state = getHexSelectionState(d.h);
        if (state === "selected") selected.push(d);
        else if (state === "ancestor") ancestors.push(d);
      }

      return [
        // capa base: todos los hexágonos, coloreados por variable o gris
        new PolygonLayer<TileHex>({
          id: `${props.id}-grid`,
          data: hexes,
          getPolygon: (d) => cellToBoundary(d.h, true),
          getFillColor: hasVar
            ? ((d: TileHex) => getVariableColor(d.v, varRange.min, varRange.max))
            : ((d: TileHex) => getColorByRatio(d.s)),
          getLineColor: [204, 204, 204, 78],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          filled: true,
          stroked: true,
          pickable: true,
        }),
        // capa ancestros: padres/abuelos de hex seleccionados — borde naranja
        new PolygonLayer<TileHex>({
          id: `${props.id}-ancestor`,
          data: ancestors,
          getPolygon: (d) => cellToBoundary(d.h, true),
          getFillColor: [255, 165, 0, 40],
          getLineColor: [255, 165, 0, 200],
          getLineWidth: 1,
          lineWidthMinPixels: 2,
          filled: true,
          stroked: true,
          pickable: false,
        }),
        // capa selección directa: hex seleccionados — fill azul
        new PolygonLayer<TileHex>({
          id: `${props.id}-selected`,
          data: selected,
          getPolygon: (d) => cellToBoundary(d.h, true),
          getFillColor: [0, 180, 255, 140],
          getLineColor: [0, 180, 255, 220],
          getLineWidth: 1,
          lineWidthMinPixels: 2,
          filled: true,
          stroked: true,
          pickable: false,
        }),
      ];
    },
    updateTriggers: {
      renderSubLayers: [selectedHexes.size, activeVar, varRange],
      getTileData: [activeVar],
    },
  }), [selectedHexes, activeVar, varRange]);

  // warmup + fullscreen listener
  useEffect(() => {
    fetch(`${API_BASE}/api/tiles/warmup`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ready") setDataReady(true);
      })
      .catch(() => setDataReady(true));

    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // freeze/unfreeze según la fase activa
  useEffect(() => {
    if (shouldFreeze && mapState === "active") {
      freeze();
    } else if (!shouldFreeze && mapState === "frozen") {
      unfreeze();
    }
  }, [shouldFreeze]);

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

  const MIN_ZOOM = 4;  // res 2-3 — vista Colombia completa
  const MAX_ZOOM = 10; // res 7 — máximo detalle con datos disponibles
  const zoomIn = () => setViewState((v) => ({ ...v, zoom: Math.min(v.zoom + 1, MAX_ZOOM) }));
  const zoomOut = () => setViewState((v) => ({ ...v, zoom: Math.max(v.zoom - 1, MIN_ZOOM) }));

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative h-full w-full ${fullscreen ? "bg-black" : ""}`}>
      {/* overlay de carga */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-lg">... cargando mapa</p>
        </div>
      )}

      {/* AC3: popup de hexágono */}
      {popup && (
        <HexPopup
          h3Index={popup.h3}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
        />
      )}

      {/* mapa congelado (snapshot) */}
      {mapState === "frozen" && snapshot ? (
        <>
          <img src={snapshot} alt="Mapa congelado" className="h-full w-full object-cover" />
          <button
            onClick={unfreeze}
            className="absolute top-3 right-3 z-10 rounded bg-blue-600 px-3 py-1.5 text-sm text-white shadow hover:bg-blue-700"
          >
            Reactivar mapa
          </button>
        </>
      ) : (
        <>
          {!loading && (
            <>
              {/* AC2: selector de variable */}
              <VariableSelector selected={activeVar} onSelect={setActiveVar} />

              <button
                onClick={freeze}
                className="absolute top-3 right-3 z-10 rounded bg-gray-800 px-3 py-1.5 text-sm text-white shadow hover:bg-gray-900"
              >
                Congelar mapa
              </button>
              <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
                <LayerInfo
                  resolution={currentRes}
                  total={layerCounts.total}
                  selectedCount={layerCounts.selected}
                  aboveThresholdCount={layerCounts.aboveThreshold}
                />
                <button
                  onClick={zoomIn}
                  className="flex h-8 w-8 items-center justify-center rounded bg-white text-lg font-bold text-black shadow hover:bg-gray-100"
                  title="Acercar"
                >
                  +
                </button>
                <button
                  onClick={zoomOut}
                  className="flex h-8 w-8 items-center justify-center rounded bg-white text-lg font-bold text-black shadow hover:bg-gray-100"
                  title="Alejar"
                >
                  -
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex h-8 w-8 items-center justify-center rounded bg-white text-black shadow hover:bg-gray-100"
                  title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                  {fullscreen ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6 1v4H2M10 1v4h4M6 15v-4H2M10 15v-4h4" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
          <DeckGL
            style={{ position: "relative", width: "auto", height: "100%" }}
            viewState={viewState}
            onViewStateChange={({ viewState: vs }) =>
              setViewState(vs as typeof INITIAL_VIEW_STATE)
            }
            controller={true}
            layers={dataReady ? [tileLayer] : []}
            onClick={(info) => {
              const hex = info.object as TileHex | undefined;
              if (!hex) { setPopup(null); return; }

              // si el hex ya está seleccionado → mostrar popup (AC3)
              if (selectedHexes.has(hex.h)) {
                setPopup({ h3: hex.h, x: info.x ?? 0, y: info.y ?? 0 });
              } else {
                // si no está seleccionado → seleccionar
                setPopup(null);
                toggleHex(hex.h);
              }
            }}
            getTooltip={({ object }: { object?: TileHex }) =>
              object
                ? `H3: ${object.h}\nViabilidad: ${(object.s * 100).toFixed(1)}%\nTipo: ${object.t}${object.v != null ? `\nVar: ${object.v.toFixed(2)}` : ""}`
                : null
            }
          >
            <MapGL
              ref={mapRef}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              maxBounds={MAX_BOUNDS}
              canvasContextAttributes={{ preserveDrawingBuffer: true }}
              onLoad={() => setMapReady(true)}
            />
          </DeckGL>
        </>
      )}
    </div>
  );
}
