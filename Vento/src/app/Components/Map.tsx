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
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { cellToBoundary, cellToChildren, cellToLatLng, getHexagonEdgeLengthAvg, getResolution, polygonToCells } from "h3-js";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { useHeatmapDimension } from "../Utils/HeatmapDimensionContext";
import { dimensionHexScore, viridis } from "../Utils/heatmapPalette";
import { INITIAL_VIEW_STATE, MAX_BOUNDS, COLOMBIA_POLYGONS } from "../Utils/h3Resolution";
import HexValuesTooltip from "./HexValuesTooltip";
import HeatmapDimensionSwitches from "./HeatmapDimensionSwitches";
import HeatmapLegend from "./HeatmapLegend";
import InformativeVariablesList from "./InformativeVariablesList";
import "maplibre-gl/dist/maplibre-gl.css";

try { luma.registerAdapters([webgl2Adapter]); } catch { /* ok */ }

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

// gris azulado
const SELECTED_FILL: [number, number, number, number] = [224, 215, 221, 100];
const SELECTED_BORDER: [number, number, number, number] = [70, 90, 120, 220];
const GRID_BORDER: [number, number, number, number] = [224, 215, 221, 100];
// Borde territorio colombiano — distintivo pero no invasivo
const TERRITORY_BORDER: [number, number, number, number] = [22, 81, 112, 160];
// hover — misma familia que selected pero más tenue (alpha bajo) para distinguirse
const HOVER_FILL: [number, number, number, number] = [224, 215, 221, 60];
const HOVER_BORDER: [number, number, number, number] = [70, 90, 120, 120];
const HOVER_TEXT_COLOR: [number, number, number, number] = [70, 90, 120, 220];
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
  const { accion, selectedHexes, setSelectedHexes } = useAprincipal();
  const { activeDimension } = useHeatmapDimension();
  const heatmapActive = accion === "informe" && activeDimension !== null;
  const [mapReady, setMapReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);

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

  const toggleHex = useCallback((h3Index: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev);
      if (next.has(h3Index)) next.delete(h3Index);
      else next.add(h3Index);
      return next;
    });
  }, [setSelectedHexes]);

  // capa de cuadrícula con tiles — solo renderiza lo visible, cachea por tile.
  // Cuando el heatmap del informe está activo, oculto la malla entera para
  // no superponer bordes de hexágonos sobre el mapa de calor.
  const gridTileLayer = useMemo(() => new TileLayer<HexCell>({
    id: "colombia-grid-tiles",
    visible: !heatmapActive,
    minZoom: 2,
    maxZoom: 14,
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
  }), [heatmapActive]);

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
  // Cuando el heatmap del informe está activo se oculta por completo (sin
  // relleno gris ni borde) para no superponer bordes de hexes sobre el heatmap.
  const selectedLayer = useMemo(() => new PolygonLayer<HexCell>({
    id: "selected-hexes",
    visible: !heatmapActive,
    data: selectedArr,
    getPolygon: (d) => cellToBoundary(d.h, true),
    getFillColor: SELECTED_FILL,
    getLineColor: SELECTED_BORDER,
    getLineWidth: 1,
    lineWidthMinPixels: 2,
    filled: true,
    stroked: true,
    pickable: false,
  }), [selectedArr, heatmapActive]);

  // Heatmap del informe (US06-HEAT): malla de hijos res-8 dentro del área
  // seleccionada (US06-HEAT-AC1) coloreados por un gradiente RADIAL desde
  // el centroide de la selección — más caliente en el centro, más frío en
  // los bordes. Cada dimensión añade una pequeña variación de fase usando
  // el hash placeholder, para que el patrón no sea idéntico entre
  // dimensiones (alrededor del 15% del rango).
  const informeHeatmapData = useMemo<
    { h: string; baseScore: number }[]
  >(() => {
    if (!heatmapActive || selectedHexes.size === 0) return [];

    // 1) Centroide aproximado de la selección (promedio de lat/lng).
    let sumLat = 0;
    let sumLng = 0;
    for (const h of selectedHexes) {
      const [lat, lng] = cellToLatLng(h);
      sumLat += lat;
      sumLng += lng;
    }
    const cLat = sumLat / selectedHexes.size;
    const cLng = sumLng / selectedHexes.size;

    // 2) Expansión a res-8 + distancia de cada hijo al centroide.
    const cells: { h: string; dist: number }[] = [];
    let maxDist = 0;
    for (const h of selectedHexes) {
      const res = getResolution(h);
      const children = res >= 8 ? [h] : cellToChildren(h, 8);
      for (const c of children) {
        const [lat, lng] = cellToLatLng(c);
        const d = Math.hypot(lat - cLat, lng - cLng);
        if (d > maxDist) maxDist = d;
        cells.push({ h: c, dist: d });
      }
    }

    // 3) Normaliza a [0, 1] y INVIERTE (centro = 1, borde = 0).
    const denom = maxDist > 0 ? maxDist : 1;
    return cells.map((c) => ({
      h: c.h,
      baseScore: 1 - c.dist / denom,
    }));
  }, [heatmapActive, selectedHexes]);

  const informeHeatmapLayer = useMemo(() => {
    if (!heatmapActive || informeHeatmapData.length === 0) return null;
    const dim = activeDimension as string;
    return new PolygonLayer<{ h: string; baseScore: number }>({
      id: "informe-heatmap",
      data: informeHeatmapData,
      getPolygon: (d) => cellToBoundary(d.h, true),
      getFillColor: (d) => {
        // Pequeña variación por (dim, hex) — ±15% del rango — para que
        // cada dimensión no muestre exactamente el mismo patrón radial.
        const noise = (dimensionHexScore(dim, d.h) - 0.5) * 0.3;
        const t = Math.max(0, Math.min(1, d.baseScore + noise));
        const [r, g, b] = viridis(t);
        return [r, g, b, 220];
      },
      // Sin borde por celda res-8 — quedaría una malla densísima. El borde
      // del área completa lo sigue dibujando `selectedLayer`.
      filled: true,
      stroked: false,
      pickable: false,
      updateTriggers: { getFillColor: [dim] },
    });
  }, [heatmapActive, activeDimension, informeHeatmapData]);

  // H3 ID label solo en hexágonos seleccionados — últimos 7 chars
  // Tamaño en metros proporcional al hex → el texto nunca sale del hexágono.
  // sizeMinPixels/MaxPixels evitan textos ilegibles o gigantes a zooms extremos.
  // Se oculta cuando el heatmap está activo (los IDs hex distraen del color).
  const selectedLabelLayer = useMemo(() => {
    if (selectedArr.length === 0 || heatmapActive) return null;
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
  }, [selectedArr, heatmapActive]);

  // capa de hover — relleno gris transparente del hex bajo el cursor
  // En mobile no hay cursor real (touch) → se deshabilita
  const hoverFillLayer = useMemo(() => {
    if (!hoveredHex || isMobile) return null;
    return new PolygonLayer<HexCell>({
      id: "hover-fill",
      data: [{ h: hoveredHex }],
      getPolygon: (d) => cellToBoundary(d.h, true),
      getFillColor: HOVER_FILL,
      getLineColor: HOVER_BORDER,
      getLineWidth: 1,
      lineWidthMinPixels: 2,
      filled: true,
      stroked: true,
      pickable: false,
    });
  }, [hoveredHex, isMobile]);

  // símbolo "+" en el centro del hex hovered (solo desktop)
  const hoverPlusLayer = useMemo(() => {
    if (!hoveredHex || isMobile) return null;
    const [lat, lng] = cellToLatLng(hoveredHex);
    return new TextLayer<HexCell>({
      id: "hover-plus",
      data: [{ h: hoveredHex }],
      getPosition: () => [lng, lat],
      getText: () => "+",
      getSize: 28,
      getColor: HOVER_TEXT_COLOR,
      fontFamily: "sans-serif",
      fontWeight: "bold",
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      pickable: false,
    });
  }, [hoveredHex]);

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

      {!isMobile && (
        <HexValuesTooltip
          hex={hoveredHex}
          x={hoverPos?.x ?? null}
          y={hoverPos?.y ?? null}
        />
      )}

      {accion === "informe" && (
        <>
          <div className="absolute top-3 left-3 z-10">
            <HeatmapLegend />
          </div>
          <div className="absolute top-3 right-3 z-10 flex w-44 flex-col gap-3">
            <HeatmapDimensionSwitches />
            <div className="max-h-[40vh] overflow-y-auto">
              <InformativeVariablesList />
            </div>
          </div>
        </>
      )}

      <DeckGL
        style={{ position: "relative", width: "auto", height: "100%" }}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(clampViewState(vs as typeof INITIAL_VIEW_STATE))}
        controller={true}
        layers={[gridTileLayer, territoryBorderLayer, informeHeatmapLayer, selectedLayer, selectedLabelLayer, hoverFillLayer, hoverPlusLayer]}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
        onHover={(info) => {
          const cell = info.object as HexCell | undefined;
          setHoveredHex(cell ? cell.h : null);
          setHoverPos(
            cell && typeof info.x === "number" && typeof info.y === "number"
              ? { x: info.x, y: info.y }
              : null,
          );
        }}
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
