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
import { WebMercatorViewport } from "@deck.gl/core";
import { TileLayer } from "@deck.gl/geo-layers";
import { PolygonLayer } from "@deck.gl/layers";
import { Crosshair, Home, Trash2 } from "lucide-react";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { cellToBoundary, cellToChildren, cellToLatLng, cellsToMultiPolygon, getResolution, polygonToCells } from "h3-js";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { useVariables } from "../Utils/VariablesContext";
import { useHeatmapDimension } from "../Utils/HeatmapDimensionContext";
import { dimensionHexScore, viridis } from "../Utils/heatmapPalette";
import { INITIAL_VIEW_STATE, MAX_BOUNDS, COLOMBIA_POLYGONS } from "../Utils/h3Resolution";
import { canAddHexToSelection } from "../Utils/hexClassification";
import { type Place } from "../Utils/geocoder";
import HexValuesTooltip from "./HexValuesTooltip";
import HeatmapDimensionSwitches from "./HeatmapDimensionSwitches";
import HeatmapLegend from "./HeatmapLegend";
import InformativeVariablesList from "./InformativeVariablesList";
import SelectedVariablesChips from "./SelectedVariablesChips";
import AreaDisplay from "./AreaDisplay";
import MapSearchBox from "./MapSearchBox";
import NextStepFloatingCard from "./NextStepFloatingCard";
import PhaseHintCard from "./PhaseHintCard";
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
const SELECTED_BORDER: [number, number, number, number] = [22, 81, 112, 200]; // brand #165170
// Grid de la cuadrícula H3 — alpha reducido para que no sature offshore.
const GRID_BORDER: [number, number, number, number] = [180, 175, 190, 55];
// Borde territorio colombiano — distintivo pero no invasivo
const TERRITORY_BORDER: [number, number, number, number] = [22, 81, 112, 160];
// hover — misma familia que selected pero más tenue (alpha bajo) para distinguirse
const HOVER_FILL: [number, number, number, number] = [224, 215, 221, 60];
const HOVER_BORDER: [number, number, number, number] = [70, 90, 120, 120];
interface HexCell { h: string; }

/**
 * Ray-casting point-in-polygon. `ring` viene en formato `[lng, lat][]`
 * (igual que GeoJSON y `COLOMBIA_POLYGONS`). Costo: O(N) por vértices del ring.
 */
function pointInRing(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Filosofía "sólo lo visible": en vez de pre-computar las ~840k cells de
 * Colombia para res 8 (cache global), cada tile valida por sí mismo cada cell
 * de su bbox contra los polígonos del territorio. Sin estado global, sin
 * pre-warm, costo amortizado por tile. Ver ADR-014.
 */
function isInColombia(lat: number, lng: number): boolean {
  for (const polygon of COLOMBIA_POLYGONS) {
    if (pointInRing(lat, lng, polygon as [number, number][])) return true;
  }
  return false;
}

export default function MapView() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const { accion, selectedHexes, setSelectedHexes } = useAprincipal();
  const { activeVariables } = useVariables();
  const { activeDimension } = useHeatmapDimension();
  const canSelect = accion === "seleccion-area";
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

  // Hexes que vinieron de la última búsqueda del search box (y aún no han
  // sido tocados manualmente). Si el zoom cambia a otra resolución H3, sólo
  // estos hexes se deseleccionan; los seleccionados a mano se preservan.
  const searchHexesRef = useRef<Set<string>>(new Set());
  // Resolución H3 a la que se ancló la última selección por búsqueda.
  const searchH3ResRef = useRef<number | null>(null);
  // Simulación de drag programático del search: rAF token + flag activa.
  const flyToRafRef = useRef<number | null>(null);
  const isFlyingRef = useRef<boolean>(false);
  // Mirror de viewState para que el rAF lo lea fresco sin depender de cierre.
  const viewStateRef = useRef(viewState);
  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);
  // Cleanup en unmount: cancela cualquier slide en curso.
  useEffect(() => {
    return () => {
      if (flyToRafRef.current !== null) cancelAnimationFrame(flyToRafRef.current);
      isFlyingRef.current = false;
    };
  }, []);

  const toggleHex = useCallback((h3Index: string) => {
    if (!canSelect) return; // US03-AC12 — selección sólo en fase "seleccion-area"
    // Cualquier toggle manual saca al hex del set "vino del search":
    // pasa a tratarse como manual y deja de ser deseleccionable por zoom.
    searchHexesRef.current.delete(h3Index);
    setSelectedHexes((prev) => {
      const next = new Set(prev);
      if (next.has(h3Index)) {
        next.delete(h3Index);
        return next;
      }
      // Restricción US03-AC12: no mezclar onshore + offshore en la misma selección.
      // Si el nuevo hex no es del mismo tipo que los ya seleccionados, ignorar.
      if (!canAddHexToSelection(h3Index, prev)) return prev;
      next.add(h3Index);
      return next;
    });
  }, [canSelect, setSelectedHexes]);

  /** Determina un nivel de zoom razonable según el tipo de lugar OSM. */
  const zoomForPlaceType = (type: string, category: string): number => {
    if (category === "boundary" && type === "administrative") return 9;
    if (type === "city" || type === "town") return 11;
    if (type === "village" || type === "hamlet" || type === "suburb") return 12;
    if (type === "municipality" || type === "county") return 9;
    if (type === "state" || type === "region") return 7;
    return 10;
  };

  const handlePlaceSelect = useCallback((place: Place) => {
    const targetZoom = zoomForPlaceType(place.type, place.category);
    const targetH3Res = zoomToH3Res(targetZoom);

    // Pre-calcular los hexes del lugar a la resolución del destino. Se aplican
    // SOLO al final del slide para que el cambio de selección coincida con la
    // llegada de la cámara.
    const newSearchHexes = new Set<string>();
    if (place.polygons.length > 0) {
      for (const ring of place.polygons) {
        const cells = polygonToCells(ring, targetH3Res, true);
        for (const h of cells) newSearchHexes.add(h);
      }
    }

    // Cancelar cualquier slide previo en curso.
    if (flyToRafRef.current !== null) {
      cancelAnimationFrame(flyToRafRef.current);
      flyToRafRef.current = null;
    }

    // Snapshot del punto de inicio.
    const initial = { ...viewStateRef.current };
    const targetLat = place.lat;
    const targetLng = place.lng;

    // Zoom "seguro" durante el paneo: bajo (~res 3-4) para que cada tile tenga
    // pocos hexes y DeckGL los procese tile-a-tile como en un arrastre real.
    const SAFE_ZOOM = Math.min(initial.zoom, targetZoom, 5);
    // ~60fps → ~1.5s total de slide
    const PHASE_1 = 12; // zoom out hasta SAFE_ZOOM
    const PHASE_2 = 50; // pan a velocidad de drag
    const PHASE_3 = 25; // zoom in al destino
    const TOTAL = PHASE_1 + PHASE_2 + PHASE_3;

    isFlyingRef.current = true;
    setIsTilesLoading(true);

    let frame = 0;
    const tick = () => {
      if (!isFlyingRef.current) {
        flyToRafRef.current = null;
        return;
      }
      frame++;

      let lat: number;
      let lng: number;
      let z: number;

      if (frame <= PHASE_1) {
        // Fase 1: bajar zoom progresivamente hasta SAFE_ZOOM
        const t = frame / PHASE_1;
        lat = initial.latitude;
        lng = initial.longitude;
        z = initial.zoom + (SAFE_ZOOM - initial.zoom) * t;
      } else if (frame <= PHASE_1 + PHASE_2) {
        // Fase 2: paneo lateral a SAFE_ZOOM (como arrastre lento)
        const t = (frame - PHASE_1) / PHASE_2;
        lat = initial.latitude + (targetLat - initial.latitude) * t;
        lng = initial.longitude + (targetLng - initial.longitude) * t;
        z = SAFE_ZOOM;
      } else if (frame <= TOTAL) {
        // Fase 3: subir zoom al destino
        const t = (frame - PHASE_1 - PHASE_2) / PHASE_3;
        lat = targetLat;
        lng = targetLng;
        z = SAFE_ZOOM + (targetZoom - SAFE_ZOOM) * t;
      } else {
        // Fin del slide: aplicar selección y bajar overlay
        isFlyingRef.current = false;
        flyToRafRef.current = null;

        setViewState((v) =>
          clampViewState({
            ...v,
            latitude: targetLat,
            longitude: targetLng,
            zoom: targetZoom,
          }),
        );

        if (newSearchHexes.size > 0) {
          const prevSearch = searchHexesRef.current;
          setSelectedHexes((prev) => {
            const next = new Set(prev);
            for (const h of prevSearch) next.delete(h);
            for (const h of newSearchHexes) next.add(h);
            return next;
          });
          searchHexesRef.current = newSearchHexes;
          searchH3ResRef.current = targetH3Res;
        }

        setIsTilesLoading(false);
        return;
      }

      setViewState((v) =>
        clampViewState({ ...v, latitude: lat, longitude: lng, zoom: z }),
      );
      flyToRafRef.current = requestAnimationFrame(tick);
    };

    flyToRafRef.current = requestAnimationFrame(tick);
  }, [clampViewState, setSelectedHexes]);

  // Cuando el zoom cruza a otra resolución H3, deseleccionar SÓLO los hexes
  // venidos del search; los manuales se mantienen.
  // **Sólo aplica en fase `seleccion-area`** — en cualquier otra fase la
  // selección está bloqueada por US03-AC12 y no debe mutar por zoom.
  useEffect(() => {
    if (!canSelect) return;
    if (searchH3ResRef.current === null) return;
    const currentRes = zoomToH3Res(viewState.zoom);
    if (currentRes === searchH3ResRef.current) return;
    const toRemove = searchHexesRef.current;
    if (toRemove.size > 0) {
      setSelectedHexes((prev) => {
        const next = new Set(prev);
        for (const h of toRemove) next.delete(h);
        return next;
      });
    }
    searchHexesRef.current = new Set();
    searchH3ResRef.current = null;
  }, [canSelect, viewState.zoom, setSelectedHexes]);

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
        if (isInColombia(lat, lng)) result.push({ h });
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
        // Alpha 160 → deja ver las etiquetas y divisiones del basemap
        // (nombres de departamentos/municipios) debajo del heatmap.
        return [r, g, b, 160];
      },
      // Sin borde por celda res-8 — quedaría una malla densísima. El borde
      // del área completa lo sigue dibujando `selectedLayer`.
      filled: true,
      stroked: false,
      pickable: false,
      updateTriggers: { getFillColor: [dim] },
    });
  }, [heatmapActive, activeDimension, informeHeatmapData]);

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
    if (!canSelect || !hoveredHex || isMobile) return null;
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
  }, [canSelect, hoveredHex, isMobile]);

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
      {!mapReady && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-lg">... cargando mapa</p>
        </div>
      )}
      {mapReady && isTilesLoading && (
        // Overlay transparente: bloquea clicks pero deja ver el slide del mapa.
        // Pill "cargando mapa" arriba para feedback sin tapar la vista.
        <div className="absolute inset-0 z-30 pointer-events-auto cursor-wait">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 text-gray-700 text-sm font-medium px-4 py-2 rounded-full shadow-md">
            ... cargando mapa
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
        getCursor={({ isHovering }) => {
          if (!canSelect) return isHovering ? "not-allowed" : "grab";
          return isHovering ? "pointer" : "grab";
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
