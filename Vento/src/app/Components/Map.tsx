"use client";

/**
 * Map — versión esencial del contrato:
 *   - Mapa base de Colombia (MapLibre + CartoDB Positron)
 *   - Cuadrícula H3 generada client-side a partir del polígono de Colombia
 *   - Renderizado por tiles (DeckGL TileLayer) — solo dibuja lo visible
 *   - Click en hexágono → toggle de selección
 *   - Sin API, sin heatmap
 *
 * Para activar el modo demo con heatmap importar `HeatmapDemo.tsx`.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { Map as MapGL, type MapRef } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { TileLayer } from "@deck.gl/geo-layers";
import { PolygonLayer } from "@deck.gl/layers";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { cellToBoundary, cellToLatLng, polygonToCells } from "h3-js";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { INITIAL_VIEW_STATE, MAX_BOUNDS, COLOMBIA_POLYGON } from "../Utils/h3Resolution";
import "maplibre-gl/dist/maplibre-gl.css";

try { luma.registerAdapters([webgl2Adapter]); } catch { /* ok */ }

// mismo mapeo que HeatmapDemo (h3TileIndex) para que la cuadrícula coincida visualmente
function zoomToH3Res(zoom: number): number {
  if (zoom >= 10) return 7;
  if (zoom >= 8) return 6;
  if (zoom >= 7) return 5;
  if (zoom >= 6) return 4;
  return 3;
}

// convertir tile z/x/y a bounding box [west, south, east, north]
function tileToBBox(z: number, x: number, y: number): [number, number, number, number] {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  const n2 = Math.PI - (2 * Math.PI * (y + 1)) / Math.pow(2, z);
  const west = (x / Math.pow(2, z)) * 360 - 180;
  const east = ((x + 1) / Math.pow(2, z)) * 360 - 180;
  const north = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const south = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n2) - Math.exp(-n2)));
  return [west, south, east, north];
}

const MIN_ZOOM = 5;
const MAX_ZOOM = 10;

// gris azulado
const SELECTED_FILL: [number, number, number, number] = [224, 215, 221, 100];
const SELECTED_BORDER: [number, number, number, number] = [70, 90, 120, 220];
const GRID_BORDER: [number, number, number, number] = [224, 215, 221, 100];

interface HexCell { h: string; }
interface CachedCell { h: string; lat: number; lng: number; }

// cache de cuadrícula Colombia por resolución, con lat/lng pre-calculados
const colombiaCellsCache = new Map<number, CachedCell[]>();

function getColombiaCells(resolution: number): CachedCell[] {
  const cached = colombiaCellsCache.get(resolution);
  if (cached) return cached;
  // h3-js polygonToCells con isGeoJson=true espera [lng, lat]
  const cells = polygonToCells(COLOMBIA_POLYGON as [number, number][], resolution, true);
  const result: CachedCell[] = cells.map((h) => {
    const [lat, lng] = cellToLatLng(h);
    return { h, lat, lng };
  });
  colombiaCellsCache.set(resolution, result);
  return result;
}

export default function MapView() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const { selectedHexes, setSelectedHexes } = useAprincipal();
  const [mapReady, setMapReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);

  const clampViewState = useCallback((vs: typeof INITIAL_VIEW_STATE) => {
    const [west, south, east, north] = MAX_BOUNDS;
    return {
      ...vs,
      longitude: Math.max(west, Math.min(east, vs.longitude)),
      latitude: Math.max(south, Math.min(north, vs.latitude)),
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vs.zoom)),
    };
  }, []);

  const toggleHex = useCallback((h3Index: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev);
      if (next.has(h3Index)) next.delete(h3Index);
      else next.add(h3Index);
      return next;
    });
  }, [setSelectedHexes]);

  // capa de cuadrícula con tiles — solo renderiza lo visible, cachea por tile
  const gridTileLayer = useMemo(() => new TileLayer<HexCell>({
    id: "colombia-grid-tiles",
    minZoom: 2,
    maxZoom: 10,
    tileSize: 512,
    maxCacheSize: 64,
    maxRequests: 4,
    refinementStrategy: "best-available",
    getTileData: async (tile) => {
      const { x, y, z } = tile.index;
      const res = zoomToH3Res(z);
      const all = getColombiaCells(res);
      const [west, south, east, north] = tileToBBox(z, x, y);
      const latMargin = (north - south) * 0.1;
      const lngMargin = (east - west) * 0.1;
      const result: HexCell[] = [];
      for (const c of all) {
        if (
          c.lat >= south - latMargin &&
          c.lat <= north + latMargin &&
          c.lng >= west - lngMargin &&
          c.lng <= east + lngMargin
        ) {
          result.push({ h: c.h });
        }
      }
      return result as unknown as HexCell;
    },
    renderSubLayers: (props) => {
      const data = props.data as unknown as HexCell[] | null;
      if (!data || data.length === 0) return null;
      return new PolygonLayer<HexCell>({
        id: `${props.id}-grid`,
        data,
        getPolygon: (d) => cellToBoundary(d.h, true),
        getFillColor: [0, 0, 0, 0],
        getLineColor: GRID_BORDER,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        filled: true,
        stroked: true,
        pickable: true,
      });
    },
  }), []);

  const selectedArr = useMemo<HexCell[]>(
    () => Array.from(selectedHexes).map((h) => ({ h })),
    [selectedHexes]
  );

  // capa de seleccionados — top level, siempre visible (independiente de tiles)
  const selectedLayer = useMemo(() => new PolygonLayer<HexCell>({
    id: "selected-hexes",
    data: selectedArr,
    getPolygon: (d) => cellToBoundary(d.h, true),
    getFillColor: SELECTED_FILL,
    getLineColor: SELECTED_BORDER,
    getLineWidth: 1,
    lineWidthMinPixels: 2,
    filled: true,
    stroked: true,
    pickable: false,
  }), [selectedArr]);

  const zoomIn = () => setViewState((v) => clampViewState({ ...v, zoom: v.zoom + 1 }));
  const zoomOut = () => setViewState((v) => clampViewState({ ...v, zoom: v.zoom - 1 }));
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { el.requestFullscreen(); setFullscreen(true); }
    else { document.exitFullscreen(); setFullscreen(false); }
  };

  return (
    <div ref={containerRef} className={`relative h-full w-full ${fullscreen ? "bg-black" : ""}`}>
      {!mapReady && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-lg">... cargando mapa</p>
        </div>
      )}

      {mapReady && (
        <div className="absolute bottom-9 right-4 z-10 flex flex-col items-end gap-2">
          <button onClick={zoomIn} className="flex h-6 w-6 items-center justify-center rounded  text-lg font-bold text-white shadow bg-[#165170ff]" title="Acercar">+</button>
          <button onClick={zoomOut} className="flex h-6 w-6 items-center justify-center rounded  text-lg font-bold text-white shadow bg-[#165170ff]" title="Alejar">-</button>
          <button onClick={toggleFullscreen} className="flex h-6 w-6 items-center justify-center rounded  text-white shadow bg-[#165170ff]" title={fullscreen ? "Salir" : "Pantalla completa"}>
            {fullscreen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v4H2M10 1v4h4M6 15v-4H2M10 15v-4h4" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>
            )}
          </button>
        </div>
      )}

      <DeckGL
        style={{ position: "relative", width: "auto", height: "100%" }}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(clampViewState(vs as typeof INITIAL_VIEW_STATE))}
        controller={true}
        layers={[gridTileLayer, selectedLayer]}
        onClick={(info) => {
          const cell = info.object as HexCell | undefined;
          if (!cell) return;
          toggleHex(cell.h);
        }}
      >
        <MapGL
          ref={mapRef}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          canvasContextAttributes={{ preserveDrawingBuffer: true }}
          onLoad={() => setMapReady(true)}
        />
      </DeckGL>
    </div>
  );
}
