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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapGL, type MapRef } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { TileLayer } from "@deck.gl/geo-layers";
import { PolygonLayer, TextLayer } from "@deck.gl/layers";
import { cellToBoundary, cellToLatLng, getHexagonEdgeLengthAvg, getResolution, isValidCell, polygonToCells } from "h3-js";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { INITIAL_VIEW_STATE, MAX_BOUNDS, COLOMBIA_POLYGONS } from "../Utils/h3Resolution";
import "maplibre-gl/dist/maplibre-gl.css";

// mismo mapeo que HeatmapDemo (h3TileIndex) para que la cuadrícula coincida visualmente
function zoomToH3Res(zoom: number): number {
  if (zoom >= 12) return 8;
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
const MAX_ZOOM = 14;
const GRID_FADE_MS = 260;
const GRID_REMAP_FALLBACK_MS = 650;

// gris azulado
const SELECTED_FILL: [number, number, number, number] = [224, 215, 221, 100];
const SELECTED_BORDER: [number, number, number, number] = [70, 90, 120, 220];
const GRID_BORDER: [number, number, number, number] = [224, 215, 221, 100];
const GRID_BORDER_REMAP: [number, number, number, number] = [224, 215, 221, 35];
// Borde territorio colombiano — distintivo pero no invasivo
const TERRITORY_BORDER: [number, number, number, number] = [22, 81, 112, 160];
// hover — misma familia que selected pero más tenue (alpha bajo) para distinguirse
const HOVER_FILL: [number, number, number, number] = [224, 215, 221, 60];
// H3 ID label dentro de los hexágonos seleccionados
const H3_LABEL_COLOR: [number, number, number, number] = [70, 90, 120, 255];
// últimos 7 chars del h3 index — suficientemente único y legible
function shortH3(h: string): string {
  return h.length > 7 ? "…" + h.slice(-7) : h;
}

interface HexCell { h: string; }
interface CachedCell { h: string; lat: number; lng: number; }

// cache de cuadrícula Colombia por resolución, con lat/lng pre-calculados
const colombiaCellsCache = new Map<number, CachedCell[]>();

function getValidHoveredHex(object: unknown): string | null {
  if (!object || typeof object !== "object" || !("h" in object)) return null;
  const h = (object as { h?: unknown }).h;
  return typeof h === "string" && isValidCell(h) ? h : null;
}

function getViewportH3Resolution(zoom: number): number {
  return zoomToH3Res(Math.round(zoom));
}

function getColombiaCells(resolution: number): CachedCell[] {
  const cached = colombiaCellsCache.get(resolution);
  if (cached) return cached;
  // h3-js polygonToCells con isGeoJson=true espera [lng, lat]
  // Se itera sobre todos los polígonos del territorio (continente + archipiélago)
  const seen = new Set<string>();
  const result: CachedCell[] = [];
  for (const polygon of COLOMBIA_POLYGONS) {
    const cells = polygonToCells(polygon as [number, number][], resolution, true);
    for (const h of cells) {
      if (seen.has(h)) continue;
      seen.add(h);
      const [lat, lng] = cellToLatLng(h);
      result.push({ h, lat, lng });
    }
  }
  colombiaCellsCache.set(resolution, result);
  return result;
}

export default function MapView() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const { selectedHexes, setSelectedHexes } = useAprincipal();
  const [mapReady, setMapReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isGridRemapping, setIsGridRemapping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);
  const previousH3ResolutionRef = useRef(getViewportH3Resolution(INITIAL_VIEW_STATE.zoom));
  const remapFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detecta mobile (< 768px = md breakpoint de Tailwind)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const clampViewState = useCallback((vs: typeof INITIAL_VIEW_STATE) => {
    const [west, south, east, north] = MAX_BOUNDS;
    return {
      ...vs,
      longitude: Math.max(west, Math.min(east, vs.longitude)),
      latitude: Math.max(south, Math.min(north, vs.latitude)),
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vs.zoom)),
    };
  }, []);

  const clearGridRemapFallback = useCallback(() => {
    if (!remapFallbackRef.current) return;
    clearTimeout(remapFallbackRef.current);
    remapFallbackRef.current = null;
  }, []);

  const startGridRemap = useCallback(() => {
    setIsGridRemapping(true);
    clearGridRemapFallback();
    remapFallbackRef.current = setTimeout(() => {
      remapFallbackRef.current = null;
      setIsGridRemapping(false);
    }, GRID_REMAP_FALLBACK_MS);
  }, [clearGridRemapFallback]);

  const updateViewState = useCallback((nextViewState: typeof INITIAL_VIEW_STATE) => {
    const clampedViewState = clampViewState(nextViewState);
    const nextH3Resolution = getViewportH3Resolution(clampedViewState.zoom);
    if (previousH3ResolutionRef.current !== nextH3Resolution) {
      previousH3ResolutionRef.current = nextH3Resolution;
      startGridRemap();
    }
    setViewState(clampedViewState);
  }, [clampViewState, startGridRemap]);

  useEffect(() => () => clearGridRemapFallback(), [clearGridRemapFallback]);

  const toggleHex = useCallback((h3Index: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev);
      if (next.has(h3Index)) next.delete(h3Index);
      else next.add(h3Index);
      return next;
    });
  }, [setSelectedHexes]);

  const gridLineColor = isGridRemapping ? GRID_BORDER_REMAP : GRID_BORDER;

  // capa de cuadrícula con tiles — solo renderiza lo visible, cachea por tile
  const gridTileLayer = useMemo(() => new TileLayer<HexCell>({
    id: "colombia-grid-tiles",
    minZoom: 2,
    maxZoom: 14,
    tileSize: 512,
    maxCacheSize: 64,
    maxRequests: 4,
    // Mantiene tiles cacheados cercanos mientras entra la nueva resolución H3.
    refinementStrategy: "best-available",
    onViewportLoad: () => {
      if (!isGridRemapping) return;
      setTimeout(() => setIsGridRemapping(false), GRID_FADE_MS);
    },
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
      return result;
    },
    renderSubLayers: (props) => {
      const data = props.data as unknown as HexCell[] | null;
      if (!data || data.length === 0) return null;
      return new PolygonLayer<HexCell>({
        id: `${props.id}-grid`,
        data,
        getPolygon: (d) => cellToBoundary(d.h, true),
        getFillColor: [0, 0, 0, 0],
        getLineColor: gridLineColor,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        filled: true,
        stroked: true,
        pickable: true,
        autoHighlight: !isMobile,
        highlightColor: HOVER_FILL,
        transitions: {
          getFillColor: GRID_FADE_MS,
          getLineColor: GRID_FADE_MS,
        },
      });
    },
    updateTriggers: {
      renderSubLayers: [gridLineColor, isMobile],
    },
  }), [gridLineColor, isGridRemapping, isMobile]);

  // Capa de borde del territorio colombiano (continente + archipiélago).
  // Pasa los polígonos sin relleno, solo contorno, para que el usuario vea hasta
  // dónde puede seleccionar en mar adentro e islas.
  const territoryBorderLayer = useMemo(() => new PolygonLayer<{ polygon: [number, number][] }>({
    id: "colombia-territory-border",
    data: COLOMBIA_POLYGONS.map((polygon) => ({ polygon })),
    getPolygon: (d) => d.polygon,
    getFillColor: [0, 0, 0, 0],
    getLineColor: TERRITORY_BORDER,
    getLineWidth: 2,
    lineWidthMinPixels: 1.5,
    lineWidthMaxPixels: 3,
    filled: false,
    stroked: true,
    pickable: false,
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

  // H3 ID label solo en hexágonos seleccionados — últimos 7 chars
  // Tamaño en metros proporcional al hex → el texto nunca sale del hexágono.
  // sizeMinPixels/MaxPixels evitan textos ilegibles o gigantes a zooms extremos.
  const selectedLabelLayer = useMemo(() => {
    if (selectedArr.length === 0) return null;
    return new TextLayer<HexCell>({
      id: "selected-labels",
      data: selectedArr,
      sizeUnits: "meters",
      getPosition: (d) => {
        const [lat, lng] = cellToLatLng(d.h);
        return [lng, lat];
      },
      getText: (d) => shortH3(d.h),
      // edge_length * 0.3 m → el texto ocupa ~70% del ancho del hex
      getSize: (d) => getHexagonEdgeLengthAvg(getResolution(d.h), "m") * 0.3,
      sizeMaxPixels: 18,
      getColor: H3_LABEL_COLOR,
      fontFamily: "monospace",
      fontWeight: "bold",
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      pickable: false,
    });
  }, [selectedArr]);

  const zoomIn = () => updateViewState({ ...viewState, zoom: viewState.zoom + 1 });
  const zoomOut = () => updateViewState({ ...viewState, zoom: viewState.zoom - 1 });
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

      {isGridRemapping && (
        <div
          role="status"
          aria-live="polite"
          data-testid="h3-remap-status"
          className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-md border border-[#cce1eeff] bg-white/95 px-3 py-2 text-xs font-semibold text-[#165170ff] shadow-lg shadow-black/10"
        >
          <span
            className="h-2 w-2 rounded-full bg-[#165170ff] motion-safe:animate-pulse"
            aria-hidden="true"
          />
          Actualizando retícula
        </div>
      )}

      {mapReady && (
        <>
          {/* Fullscreen: solo mobile, top-derecha */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded text-white shadow bg-[#165170ff] md:hidden"
            title={fullscreen ? "Salir" : "Pantalla completa"}
          >
            {fullscreen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v4H2M10 1v4h4M6 15v-4H2M10 15v-4h4" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>
            )}
          </button>
          {/* Zoom + fullscreen: solo desktop, apilados bottom-right */}
          <div className="absolute bottom-9 right-4 z-10 flex flex-col items-end gap-2 max-md:hidden">
            <button onClick={toggleFullscreen} className="flex h-6 w-6 items-center justify-center rounded text-white shadow bg-[#165170ff]" title={fullscreen ? "Salir" : "Pantalla completa"}>
              {fullscreen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v4H2M10 1v4h4M6 15v-4H2M10 15v-4h4" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>
              )}
            </button>
            <button onClick={zoomIn} className="flex h-6 w-6 items-center justify-center rounded text-lg font-bold text-white shadow bg-[#165170ff]" title="Acercar">+</button>
            <button onClick={zoomOut} className="flex h-6 w-6 items-center justify-center rounded text-lg font-bold text-white shadow bg-[#165170ff]" title="Alejar">-</button>
          </div>
        </>
      )}

      <DeckGL
        style={{ position: "relative", width: "auto", height: "100%" }}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => updateViewState(vs as typeof INITIAL_VIEW_STATE)}
        controller={true}
        layers={[gridTileLayer, territoryBorderLayer, selectedLayer, selectedLabelLayer]}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
        onClick={(info) => {
          const h = getValidHoveredHex(info.object);
          if (!h) return;
          toggleHex(h);
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
