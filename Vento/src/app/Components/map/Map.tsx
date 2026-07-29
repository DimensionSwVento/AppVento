"use client";

/**
 * Map — versión esencial del contrato:
 *   - Mapa base de Colombia (MapLibre + CartoDB Positron)
 *   - Cuadrícula H3 generada client-side a partir del polígono de Colombia
 *   - Renderizado por tiles (DeckGL TileLayer) — solo dibuja lo visible
 *   - Click en hexágono → toggle de selección
 *   - Sin API, sin heatmap
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapGL, type MapRef } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { WebMercatorViewport } from "@deck.gl/core";
import { TileLayer } from "@deck.gl/geo-layers";
import { PolygonLayer } from "@deck.gl/layers";
import { Crosshair, Home, Trash2 } from "lucide-react";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { cellToBoundary, cellToLatLng, cellsToMultiPolygon, polygonToCells } from "h3-js";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import { useHeatmapDimension } from "../../Utils/contexts/HeatmapDimensionContext";
import { INITIAL_VIEW_STATE, MAX_BOUNDS, COLOMBIA_POLYGONS } from "../../Utils/h3/h3Resolution";
import { zoomToH3Res, tileToBBox, isInColombia } from "../../Utils/h3/mapGeo";
import { isHexBanned } from "../../Utils/h3/hexClassification";
import { MAX_SELECTION_GAP_KM, MIN_SELECTION_H3_RES } from "../../Utils/projectData";
import { useToast } from "../ui/Toast";
import HexValuesTooltip from "./HexValuesTooltip";
import HeatmapDimensionSwitches from "./HeatmapDimensionSwitches";
import HeatmapLegend from "./HeatmapLegend";
import InformativeVariablesList from "./InformativeVariablesList";
import SelectedVariablesChips from "../dimensions/SelectedVariablesChips";
import AreaDisplay from "./AreaDisplay";
import MapSearchBox from "./MapSearchBox";
import NextStepFloatingCard from "./NextStepFloatingCard";
import PhaseHintCard from "./PhaseHintCard";
import LoadingOverlay from "../ui/LoadingOverlay";
import { useInformeHeatmapLayer } from "./useInformeHeatmapLayer";
import { useMapSelection } from "./useMapSelection";
import "maplibre-gl/dist/maplibre-gl.css";

try { luma.registerAdapters([webgl2Adapter]); } catch { /* ok */ }

const MIN_ZOOM = 5;
const MAX_ZOOM = 14;

// gris azulado
const SELECTED_FILL: [number, number, number, number] = [224, 215, 221, 100];
const SELECTED_BORDER: [number, number, number, number] = [22, 81, 112, 200]; // brand #165170
// Grid de la cuadrícula H3 — alpha reducido para que no sature offshore.
const GRID_BORDER: [number, number, number, number] = [180, 175, 190, 55];
// Borde territorio colombiano — distintivo pero no invasivo
const TERRITORY_BORDER: [number, number, number, number] = [22, 81, 112, 160];
// hover — misma familia que selected pero más tenue (alpha bajo) para distinguirse
const HOVER_FILL: [number, number, number, number] = [224, 215, 221, 60];
const HOVER_BORDER: [number, number, number, number] = [70, 90, 120, 120];
// Zonas prohibidas / inviables — gris sólido, no seleccionables (BANNED_HEXES).
const BANNED_FILL: [number, number, number, number] = [130, 130, 130, 205];
const BANNED_BORDER: [number, number, number, number] = [110, 110, 110, 220];
interface HexCell { h: string; banned?: boolean; }

export default function MapView() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const { accion, selectedHexes, setSelectedHexes } = useAprincipal();
  const { activeVariables } = useVariables();
  const { activeDimension } = useHeatmapDimension();
  const toast = useToast();
  const canSelect = accion === "seleccion-area";
  // En fase de selección pero con el zoom demasiado lejano: los hexes son
  // solo-visualización (res < MIN_SELECTION_H3_RES) y no se pueden seleccionar.
  // Dispara el aviso "acércate" y ajusta el cursor.
  const selectionZoomTooFar =
    canSelect && zoomToH3Res(viewState.zoom) < MIN_SELECTION_H3_RES;
  const heatmapActive = accion === "informe" && activeDimension !== null;
  const [mapReady, setMapReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // True mientras DeckGL termina de cargar los tiles del nuevo viewport tras un
  // flyTo del search box. Se baja en `onViewportLoad` del TileLayer.
  const [isTilesLoading, setIsTilesLoading] = useState(false);
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

  // Selección de hexágonos + fly-to del buscador (comparten searchHexesRef).
  const { toggleHex, handlePlaceSelect, isFlyingRef } = useMapSelection({
    canSelect,
    viewState,
    selectedHexes,
    setViewState,
    clampViewState,
    setSelectedHexes,
    setIsTilesLoading,
    onRejectFar: () =>
      toast.info(
        `Solo puedes seleccionar hexágonos cercanos entre sí (máx ${MAX_SELECTION_GAP_KM} km). Acércate al área que ya elegiste.`,
      ),
  });

  // Al SALIR de la fase de selección hacia una fase "congelada" (dimensiones,
  // características, informe), encuadrar la selección: centrar + zoom a una
  // resolución que muestre toda el área, para que no quede perdida en el mapa.
  const prevAccionRef = useRef(accion);
  useEffect(() => {
    const prev = prevAccionRef.current;
    prevAccionRef.current = accion;
    if (prev !== "seleccion-area" || accion === "seleccion-area") return;
    if (selectedHexes.size === 0) return;

    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const h of selectedHexes) {
      const [lat, lng] = cellToLatLng(h);
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const pad = 1.6; // margen alrededor del área
    const zLng = Math.log2(360 / Math.max(0.01, (maxLng - minLng) * pad));
    const zLat = Math.log2(170 / Math.max(0.01, (maxLat - minLat) * pad));
    const zoom = Math.min(zLng, zLat);
    setViewState((v) =>
      clampViewState({
        ...v,
        longitude: (minLng + maxLng) / 2,
        latitude: (minLat + maxLat) / 2,
        zoom,
      }),
    );
  }, [accion, selectedHexes, clampViewState]);

  // capa de cuadrícula con tiles — solo renderiza lo visible, cachea por tile.
  // Cuando el heatmap del informe está activo, oculto la malla entera para
  // no superponer bordes de hexágonos sobre el mapa de calor.
  // isFlyingRef se lee dentro de callbacks de deck.gl (onViewportLoad) que
  // corren DESPUÉS del render; el linter no distingue el momento de ejecución.
  // eslint-disable-next-line react-hooks/refs
  const gridTileLayer = useMemo(() => new TileLayer<HexCell>({
    id: "colombia-grid-tiles",
    visible: !heatmapActive,
    minZoom: 2,
    maxZoom: 14,
    tileSize: 512,
    maxCacheSize: 64,
    maxRequests: 4,
    refinementStrategy: "best-available",
    onViewportLoad: () => {
      // Durante el slide del search, mantener el overlay visible hasta el
      // final del slide; el handler lo baja al terminar la fase 3.
      if (isFlyingRef.current) return;
      setIsTilesLoading(false);
    },
    getTileData: async (tile) => {
      const { x, y, z } = tile.index;
      const res = zoomToH3Res(z);
      const [west, south, east, north] = tileToBBox(z, x, y);
      const latMargin = (north - south) * 0.1;
      const lngMargin = (east - west) * 0.1;
      // Sólo se calculan los cells del bbox del tile y se valida cada uno
      // con point-in-polygon contra COLOMBIA_POLYGONS. Sin cache global de
      // Colombia: filosofía "sólo lo visible" — ver ADR-014.
      const tilePolygon: [number, number][] = [
        [west - lngMargin, south - latMargin],
        [east + lngMargin, south - latMargin],
        [east + lngMargin, north + latMargin],
        [west - lngMargin, north + latMargin],
        [west - lngMargin, south - latMargin],
      ];
      const tileCells = polygonToCells(tilePolygon, res, true);
      const result: HexCell[] = [];
      for (const h of tileCells) {
        const [lat, lng] = cellToLatLng(h);
        if (isInColombia(lat, lng)) result.push({ h, banned: isHexBanned(h) });
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
        // Prohibidos → gris sólido; resto → sin relleno (solo malla).
        getFillColor: (d) => (d.banned ? BANNED_FILL : [0, 0, 0, 0]),
        getLineColor: (d) => (d.banned ? BANNED_BORDER : GRID_BORDER),
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

  // Capa de seleccionados — relleno visible en seleccion/dimensiones/caracteristicas
  // (US03-AC12 punto 3). Se oculta cuando el heatmap del informe está activo
  // para no superponer el gris sobre la malla Viridis.
  // Heatmap multivariable definitivo vive en US06-HEAT (Informe), con
  // gradiente radial desde el centroide.
  const selectedLayer = useMemo(() => new PolygonLayer<HexCell>({
    id: "selected-hexes",
    visible: !heatmapActive,
    data: selectedArr,
    getPolygon: (d) => cellToBoundary(d.h, true),
    getFillColor: SELECTED_FILL,
    filled: true,
    stroked: false,
    pickable: false,
  }), [selectedArr, heatmapActive]);

  // Heatmap del informe (US06-HEAT) — ver useInformeHeatmapLayer.
  // US-FB3-03 (feedback item 8): el hook marca esta capa como la única
  // `pickable` durante el informe para que el tooltip por hexágono aparezca.
  const informeHeatmapLayer = useInformeHeatmapLayer(
    heatmapActive,
    selectedHexes,
    activeDimension,
  );

  // Bordes de la selección — comportamiento condicional por fase:
  // - En "seleccion-area": cada hex tiene su borde completo (grid de selección)
  // - En otras fases: sólo el contorno exterior (perímetro) del conjunto, usando
  //   `cellsToMultiPolygon` para fusionar bordes contiguos en una sola línea
  const selectedBordersLayer = useMemo(() => {
    if (selectedArr.length === 0) return null;
    // En heatmap del informe se oculta el contorno también — la mancha
    // Viridis ya delimita el área visualmente.
    if (heatmapActive) return null;
    if (canSelect) {
      return new PolygonLayer<HexCell>({
        id: "selected-hex-borders",
        data: selectedArr,
        getPolygon: (d) => cellToBoundary(d.h, true),
        getLineColor: SELECTED_BORDER,
        getLineWidth: 1,
        lineWidthMinPixels: 1.5,
        filled: false,
        stroked: true,
        pickable: false,
      });
    }
    // Fuera de selección: outline exterior del conjunto fusionado
    const polygons = cellsToMultiPolygon(
      selectedArr.map((c) => c.h),
      true,
    );
    const rings = polygons.flatMap((p) =>
      p.map((ring) => ({ polygon: ring as [number, number][] })),
    );
    return new PolygonLayer<{ polygon: [number, number][] }>({
      id: "selected-outline",
      data: rings,
      getPolygon: (d) => d.polygon,
      getLineColor: SELECTED_BORDER,
      getLineWidth: 2,
      lineWidthMinPixels: 2,
      filled: false,
      stroked: true,
      pickable: false,
    });
  }, [selectedArr, canSelect, heatmapActive]);

  // capa de hover — relleno gris transparente del hex bajo el cursor.
  // Sólo en fase "seleccion-area"; en otras fases no hay interacción que sugerir.
  const hoverFillLayer = useMemo(() => {
    // Sin hover cuando el zoom es demasiado lejano (nada seleccionable) ni
    // sobre zonas prohibidas — así el hover sólo sugiere lo que sí es clicable.
    if (!canSelect || !hoveredHex || isMobile || selectionZoomTooFar) return null;
    if (isHexBanned(hoveredHex)) return null;
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
  }, [canSelect, hoveredHex, isMobile, selectionZoomTooFar]);

  // El "+" en el hex hovered se removió: el `TextLayer` recreado por cada
  // cambio de hoveredHex disparaba un race en luma.gl
  // (`getUniformBlockIndex: Argument 1 is not an object`). El `hoverFillLayer`
  // de arriba (fill gris) sigue siendo el feedback de hover. Si se necesita
  // reintroducir el "+", usar PolygonLayer con dos rectángulos cruzados o
  // un IconLayer con SVG inline en vez de TextLayer.

  const zoomIn = () => setViewState((v) => clampViewState({ ...v, zoom: v.zoom + 1 }));
  const zoomOut = () => setViewState((v) => clampViewState({ ...v, zoom: v.zoom - 1 }));

  const hasSelection = selectedHexes.size > 0;

  // Zoom a la selección: fit view al bounding box de los hexes
  // seleccionados. El bbox se calcula sobre los vértices reales de cada hex
  // (cellToBoundary en formato GeoJSON [lng, lat]) y WebMercatorViewport.fitBounds
  // deriva center+zoom; se clampa a los límites/zoom permitidos del mapa.
  const zoomToSelection = useCallback(() => {
    if (selectedHexes.size === 0) return;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const h of selectedHexes) {
      for (const [lng, lat] of cellToBoundary(h, true)) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
    const el = containerRef.current;
    const width = el?.clientWidth || 800;
    const height = el?.clientHeight || 600;
    try {
      const { longitude, latitude, zoom } = new WebMercatorViewport({
        width,
        height,
      }).fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 80 },
      );
      setViewState((v) => clampViewState({ ...v, longitude, latitude, zoom }));
    } catch {
      // Fallback si fitBounds no puede resolver (p.ej. width/height 0):
      // centrar en el punto medio del bbox conservando el zoom actual.
      setViewState((v) =>
        clampViewState({
          ...v,
          longitude: (minLng + maxLng) / 2,
          latitude: (minLat + maxLat) / 2,
        }),
      );
    }
  }, [selectedHexes, clampViewState]);

  // US-FB3-02 AC2 — Reset a Colombia: vuelve a la vista inicial (INITIAL_VIEW_STATE).
  const resetView = useCallback(() => {
    setViewState(INITIAL_VIEW_STATE);
  }, []);

  // Borrar selección: limpia por completo selectedHexes. También
  // resetea los refs del search para que no queden hexes "huérfanos" del buscador
  // pendientes de deseleccionar por un cambio de resolución H3 posterior.
  const clearSelection = useCallback(() => {
    setSelectedHexes(new Set());
    searchHexesRef.current = new Set();
    searchH3ResRef.current = null;
  }, [setSelectedHexes]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { el.requestFullscreen(); setFullscreen(true); }
    else { document.exitFullscreen(); setFullscreen(false); }
  };

  return (
    <div ref={containerRef} className={`relative h-full w-full ${fullscreen ? "bg-black" : ""}`}>
      {!mapReady && <LoadingOverlay />}
      {/* Durante el fly-to: overlay translúcido (deja ver la animación por
          detrás, para que no parezca bugueado) + spinner brand estilizado.
          El slide es lento a propósito (carga tiles sin reventar el navegador). */}
      {mapReady && isTilesLoading && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex cursor-wait items-center justify-center bg-white/10 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin text-[#165170ff]">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-medium text-[#165170ff]">Buscando ubicación…</span>
          </div>
        </div>
      )}

      {/* Aviso "acércate para seleccionar": aparece en fase de selección
          cuando el zoom es demasiado lejano (hexes solo-visualización) y
          desaparece solo al acercarse a la resolución seleccionable. */}
      {mapReady && selectionZoomTooFar && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 shadow-md ring-1 ring-black/5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[#165170ff]">
              <circle cx="11" cy="11" r="7" />
              <path d="M11 8v6M8 11h6M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-medium text-[#165170ff]">
              Acércate para seleccionar el área
            </span>
          </div>
        </div>
      )}

      {/* Widgets fijos del mapa — visibles sólo en las fases donde aportan,
          para evitar superposición con paneles flotantes de cada fase
          (chips, leyenda heatmap, dropdown de dimensiones). */}
      {mapReady &&
        (accion === "seleccion-area" || accion === "caracteristicas") && (
          <AreaDisplay />
        )}
      {mapReady && accion === "seleccion-area" && (
        <MapSearchBox onSelect={handlePlaceSelect} />
      )}
      {mapReady && <NextStepFloatingCard />}
      {mapReady && <PhaseHintCard />}

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
          <div className="absolute bottom-9 right-4 z-10 flex flex-col items-end gap-2">
            <button
              onClick={zoomToSelection}
              disabled={!hasSelection}
              aria-label="Zoom a la selección"
              title={hasSelection ? "Zoom a la selección" : "Selecciona hexágonos para hacer zoom"}
              className="flex h-8 w-8 items-center justify-center rounded text-white shadow bg-[#165170ff] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Crosshair size={16} />
            </button>
            <button
              onClick={resetView}
              aria-label="Reset a Colombia"
              title="Reset a Colombia"
              className="flex h-8 w-8 items-center justify-center rounded text-white shadow bg-[#165170ff]"
            >
              <Home size={16} />
            </button>
            <button
              onClick={clearSelection}
              disabled={!hasSelection}
              aria-label="Borrar selección"
              title={hasSelection ? "Borrar selección" : "No hay selección para borrar"}
              className="flex h-8 w-8 items-center justify-center rounded text-white shadow bg-[#165170ff] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
            </button>

            {/* Separador visual entre la toolbar de selección y el zoom */}
            <div className="h-px w-6 bg-white/50 my-0.5 max-md:hidden" />

            {/* Zoom + fullscreen: solo desktop */}
            <div className="flex flex-col items-end gap-2 max-md:hidden">
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
          </div>
        </>
      )}

      {/* Tooltip de valores per-hex: SÓLO sobre el heatmap del informe.
          En otras fases el hex hover no aporta info (no hay valores aún). */}
      {!isMobile && heatmapActive && (
        <HexValuesTooltip
          hex={hoveredHex}
          x={hoverPos?.x ?? null}
          y={hoverPos?.y ?? null}
        />
      )}

      {accion === "dimensiones" && activeVariables.size > 0 && (
        <SelectedVariablesChips />
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
        layers={[gridTileLayer, territoryBorderLayer, informeHeatmapLayer, selectedLayer, selectedBordersLayer, hoverFillLayer]}
        // US-FB3-03 (feedback item 8): nunca "not-allowed". Fuera de la fase de
        // selección el hex NO es inerte — en el informe se consulta con el
        // tooltip —, y el cursor de "prohibido" (muy marcado en Firefox/Windows)
        // se leía como "el mapa está bloqueado". El cursor ahora refleja qué se
        // puede hacer sobre la capa pickable: "pointer" si el hex responde
        // (selección o tooltip del informe), "default" si sólo es decorativo.
        getCursor={({ isHovering }) => {
          if (!isHovering) return "grab";
          // Zoom lejano: invita a acercarse en vez de sugerir que es clicable.
          if (selectionZoomTooFar) return "zoom-in";
          // US-FB3-03 (item 8): nunca "not-allowed" — en el informe el hex se
          // consulta con tooltip y las zonas excluidas se explican con leyenda,
          // no se leen como "bloqueado". "pointer" si es seleccionable o
          // consultable en el heatmap; "grab" en el resto.
          return canSelect || heatmapActive ? "pointer" : "grab";
        }}
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
          // Zoom demasiado lejano para seleccionar: el click ACERCA el mapa
          // hacia el punto (como el botón +) en vez de no hacer nada / confundir
          // con la lupa. Al llegar a la resolución seleccionable ya se selecciona.
          if (selectionZoomTooFar) {
            const c = info.coordinate as [number, number] | undefined;
            setViewState((v) =>
              clampViewState({
                ...v,
                longitude: c ? c[0] : v.longitude,
                latitude: c ? c[1] : v.latitude,
                zoom: v.zoom + 2,
              }),
            );
            return;
          }
          const cell = info.object as HexCell | undefined;
          if (!cell) return;
          toggleHex(cell.h);
        }}
      >
        <MapGL
          ref={mapRef}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          canvasContextAttributes={{ preserveDrawingBuffer: true }}
          // Atribución sin el toggle "ⓘ" (que parecía botón muerto): texto fijo.
          attributionControl={{ compact: false }}
          onLoad={() => setMapReady(true)}
        />
      </DeckGL>
    </div>
  );
}
