"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Map as MapGL, type MapRef } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { TileLayer } from "@deck.gl/geo-layers";
import { PolygonLayer } from "@deck.gl/layers";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { cellToBoundary } from "h3-js";
import { useCachedImage } from "../Utils/useCachedImage";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import {
  INITIAL_VIEW_STATE,
  MAP_STYLE,
  MAX_BOUNDS,
  SNAPSHOT_KEY,
} from "../Utils/h3Resolution";
import "maplibre-gl/dist/maplibre-gl.css";

try { luma.registerAdapters([webgl2Adapter]); } catch { /* retry on mount */ }

// tipo de dato que devuelve la API /api/tiles/z/x/y
interface TileHex {
  h: string;   // h3_index
  s: number;   // score_general
  t: string;   // tipo_celda
  la: number;  // lat
  ln: number;  // lng
}

export default function MapView() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const { accion, selectedHexes, setSelectedHexes } = useAprincipal();
  const [mapReady, setMapReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);  // índice H3 listo en servidor
  const loading = !mapReady || !dataReady;
  const [mapState, setMapState] = useState<"active" | "frozen">("active");
  const [fullscreen, setFullscreen] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const { saveToCache, clearCache } = useCachedImage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);

  const shouldFreeze = accion !== "seleccion-area";

  // toggle selección de hexágono
  const toggleHex = useCallback((h3Index: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev);
      if (next.has(h3Index)) {
        next.delete(h3Index);
      } else {
        next.add(h3Index);
      }
      return next;
    });
  }, [setSelectedHexes]);

  // capa de tiles H3 — deck.gl maneja qué tiles cargar/descargar
  const tileLayer = useMemo(() => new TileLayer<TileHex>({
    id: "h3-tiles",
    data: "/api/tiles/{z}/{x}/{y}",
    minZoom: 2,
    maxZoom: 10,
    tileSize: 512,
    maxCacheSize: 64,
    maxRequests: 4,
    refinementStrategy: "best-available",
    getTileData: async (tile) => {
      const { x, y, z } = tile.index;
      const res = await fetch(`/api/tiles/${z}/${x}/${y}`, { signal: tile.signal });
      if (!res.ok) return [];
      return res.json();
    },
    renderSubLayers: (props) => {
      const { data, tile } = props;
      if (!data || !Array.isArray(data) || data.length === 0) return null;

      return [
        // capa base: bordes de hexágonos
        new PolygonLayer<TileHex>({
          id: `${props.id}-grid`,
          data,
          getPolygon: (d) => cellToBoundary(d.h, true),
          getFillColor: [180, 180, 180, 25],
          getLineColor: [204, 204, 204, 78],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          filled: true,
          stroked: true,
          pickable: true,
        }),
        // capa de selección: hexágonos seleccionados con relleno
        new PolygonLayer<TileHex>({
          id: `${props.id}-selected`,
          data: data.filter((d) => selectedHexes.has(d.h)),
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
      renderSubLayers: [selectedHexes.size],
    },
  }), [selectedHexes]);

  // warmup: pre-parsear el parquet en el servidor antes de pedir tiles
  useEffect(() => {
    fetch("/api/tiles/warmup")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ready") setDataReady(true);
      })
      .catch(() => setDataReady(true)); // si falla, dejar pasar igual

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

  const zoomIn = () => setViewState((v) => ({ ...v, zoom: Math.min(v.zoom + 1, 18) }));
  const zoomOut = () => setViewState((v) => ({ ...v, zoom: Math.max(v.zoom - 1, 2) }));

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

      {/* mapa congelado (snapshot) */}
      {mapState === "frozen" && snapshot ? (
        <>
          <img
            src={snapshot}
            alt="Mapa congelado"
            className="h-full w-full object-cover"
          />
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
              <button
                onClick={freeze}
                className="absolute top-3 right-3 z-10 rounded bg-gray-800 px-3 py-1.5 text-sm text-white shadow hover:bg-gray-900"
              >
                Congelar mapa
              </button>
              <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
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
              if (hex) toggleHex(hex.h);
            }}
            getTooltip={({ object }: { object?: TileHex }) =>
              object
                ? `H3: ${object.h}\nScore: ${(object.s * 100).toFixed(0)}%\nTipo: ${object.t}`
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
