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
import { TileLayer, H3HexagonLayer } from "@deck.gl/geo-layers";
import { PolygonLayer, IconLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Crosshair, Home, Trash2 } from "lucide-react";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import {
  cellToBoundary,
  cellToLatLng,
  cellsToMultiPolygon,
  polygonToCells,
  cellToParent,
  cellToChildren,
  getResolution,
} from "h3-js";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import { useHeatmapDimension } from "../../Utils/contexts/HeatmapDimensionContext";
import { INITIAL_VIEW_STATE, MAX_BOUNDS, COLOMBIA_POLYGONS, SNAPSHOT_KEY } from "../../Utils/h3/h3Resolution";
import { useCachedImage } from "../../Utils/useCachedImage";
import { zoomToH3Res, tileToBBox, isInColombia } from "../../Utils/h3/mapGeo";
import { isHexBanned, bannedReason, setBannedData, selectionNature } from "../../Utils/h3/hexClassification";
import { MAX_SELECTION_GAP_KM, MIN_SELECTION_H3_RES, USE_BACKEND, USE_API_EMPLAZAMIENTO } from "../../Utils/projectData";
import { useToast } from "../ui/Toast";
import HexValuesTooltip from "./HexValuesTooltip";
import HeatmapDimensionSwitches from "./HeatmapDimensionSwitches";
import HeatmapLegend from "./HeatmapLegend";
import InformativeVariablesList from "./InformativeVariablesList";
import SelectedVariablesChips from "../dimensions/SelectedVariablesChips";
import AreaDisplay from "./AreaDisplay";
import MapSearchBox from "./MapSearchBox";
import NextStepFloatingCard from "./NextStepFloatingCard";
import LoadingOverlay from "../ui/LoadingOverlay";
import { useInformeHeatmapLayer } from "./useInformeHeatmapLayer";
import { useAreaHexData } from "../../Utils/report/useAreaHexData";
import {
  MAP_SYMBOLS,
  symbolPaths,
  type MapSymbolPoint,
  type SymbolPath,
} from "../../Utils/map/mapSymbols";
import MapSymbolsLegend from "./MapSymbolsLegend";
import { useMapSelection } from "./useMapSelection";
import { fetchMapDisabledIds } from "../../Utils/admin/catalogApi";
import {
  fetchMapLayerCells,
  fetchCatalogCells,
  fetchVariableCellsBBox,
  fetchExcludedCells,
  windValueForHex,
  WIND_THRESHOLD,
  type MapLayerCell,
} from "../../Utils/map/mapLayerData";
import { viridis } from "../../Utils/report/heatmapPalette";
import { getVariableById } from "../../Utils/variables/variablesCatalog";
import { colorForVariable } from "../../Utils/variables/dimensionColors";
import { iconKeyToDataUri } from "../../Utils/map/iconRender";
import {
  genericMapVariables,
  variableAppliesToNatureById,
} from "../../Utils/map/mapCatalogVariables";
import { AUDIT_DB } from "../../Utils/audit";
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

/** "#165170" → [22,81,112] (para relleno suave de las capas de variable `area`). */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Aristas de RED para capas `interconectado`: conecta cada punto con el MÁS
 * CERCANO (grafo vecino-más-cercano, deduplicado). O(n²), pero n es pequeño (≤12).
 */
function nearestNeighborEdges(
  pts: { lng: number; lat: number }[],
): { path: [number, number][] }[] {
  const edges: { path: [number, number][] }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < pts.length; i++) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const d =
        (pts[i].lat - pts[j].lat) ** 2 + (pts[i].lng - pts[j].lng) ** 2;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best < 0) continue;
    const key = i < best ? `${i}-${best}` : `${best}-${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({
      path: [
        [pts[i].lng, pts[i].lat],
        [pts[best].lng, pts[best].lat],
      ],
    });
  }
  return edges;
}

/**
 * Agrega valores res8 (0–1) a la resolución `res` del render (resumen de padres,
 * misma tecnología que el grid):
 *  - res < 8 → cada padre = promedio de sus hijos res8 presentes.
 *  - res == 8 → tal cual.
 *  - res > 8 → cada hijo hereda el valor de su padre res8.
 * Devuelve `Map<cellAtRes, value>` para colorear la rejilla como heatmap.
 */
function aggregateValuesToRes(
  res8: Map<string, number>,
  res: number,
): Map<string, number> {
  if (res === 8) return res8;
  const acc = new Map<string, { s: number; n: number }>();
  const add = (cell: string, v: number) => {
    const a = acc.get(cell) ?? { s: 0, n: 0 };
    a.s += v;
    a.n += 1;
    acc.set(cell, a);
  };
  for (const [h8, v] of res8) {
    try {
      if (res < 8) add(cellToParent(h8, res), v);
      else for (const c of cellToChildren(h8, res)) add(c, v);
    } catch {
      /* celda inválida → ignorar */
    }
  }
  const out = new Map<string, number>();
  for (const [cell, { s, n }] of acc) out.set(cell, s / n);
  return out;
}
// Zonas EXCLUIDAS / inviables — no seleccionables. Color viridis(0) (morado
// oscuro), coherente con la paleta de idoneidad. Fuentes: score global −1 del
// backend (tipo_celda="excluida", vía bannedStore) o el placeholder local.
const BANNED_FILL: [number, number, number, number] = [68, 1, 84, 205];
const BANNED_BORDER: [number, number, number, number] = [59, 1, 74, 230];
interface HexCell { h: string; banned?: boolean; owned?: boolean; value?: number; }

export default function MapView() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const { accion, selectedHexes, setSelectedHexes, focusNonce } =
    useAprincipal();
  const { activeVariables } = useVariables();
  const { activeDimension, setActiveDimension } = useHeatmapDimension();
  const toast = useToast();
  const canSelect = accion === "seleccion-area";
  // En fase de selección pero con el zoom demasiado lejano: los hexes son
  // solo-visualización (res < MIN_SELECTION_H3_RES) y no se pueden seleccionar.
  // Dispara el aviso "acércate" y ajusta el cursor.
  const selectionZoomTooFar =
    canSelect && zoomToH3Res(viewState.zoom) < MIN_SELECTION_H3_RES;
  const heatmapActive = accion === "informe" && activeDimension !== null;
  // El VIENTO (velocidad/densidad) ya NO se pinta sobre el grid: pasó a ser una
  // opción del desplegable "Visualización en el mapa" del Informe, recortado al
  // área seleccionada (ver `useInformeHeatmapLayer` + `HeatmapDimensionSwitches`).
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
  // Variable de CALOR activa que colorea la rejilla (ver `activeHeatVarId`). Se lee
  // por REF dentro del `getTileData` async del grid (definido antes); `heatVersion`
  // bumpea al cambiarla para remontar el TileLayer y refetchear los tiles.
  const activeHeatRef = useRef<string | null>(null);
  const [heatVersion, setHeatVersion] = useState(0);
  // DECOPLE malla↔backend (directiva): la rejilla se pinta con geometría de
  // cliente sin esperar al backend. Los datos de backend se aplican sin bloquear:
  //  - `heatCacheRef`: valores de calor por tile `${var}:${z}/${x}/${y}` → color.
  //  - `heatInflightRef`: evita disparar el mismo fetch de calor dos veces.
  //  - `heatBumpTimerRef`: un ÚNICO re-render diferido cuando llega el calor
  //    (evita cascada de remounts por cada tile que termina).
  const heatCacheRef = useRef<Map<string, Map<string, number>>>(new Map());
  const heatInflightRef = useRef<Set<string>>(new Set());
  const heatBumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detecta mobile (< 768px = md breakpoint de Tailwind)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Capa de EXCLUIDOS en UNA sola petición al montar (no por tile). Alimenta el
  // bannedStore → `isHexBanned` los marca en toda la malla, sin pedir `get_tile`
  // por cada tile. Si falla, cae al placeholder local sin romper el mapa.
  useEffect(() => {
    let alive = true;
    fetchExcludedCells().then((cells) => {
      if (alive && cells.length > 0) {
        setBannedData(cells.map((h) => [h, true] as [string, boolean]));
      }
    });
    return () => {
      alive = false;
    };
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
  const { toggleHex, selectPolygon, handlePlaceSelect, isFlyingRef, resetSearch } = useMapSelection({
    canSelect,
    viewState,
    selectedHexes,
    setViewState,
    clampViewState,
    setSelectedHexes,
    onRejectFar: () =>
      toast.info(
        `Solo puedes seleccionar hexágonos cercanos entre sí (máx ${MAX_SELECTION_GAP_KM} km). Acércate al área que ya elegiste.`,
      ),
  });

  // Selección por POLÍGONO (US03-04): el usuario pone puntos en el mapa (clic,
  // estilo Google Maps) o por coordenadas desde el buscador → al aplicar, los
  // hexágonos dentro del polígono quedan seleccionados.
  const [polygonMode, setPolygonMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const polygonActive = polygonMode && canSelect;
  const togglePolygonMode = useCallback(() => {
    setPolygonMode((m) => {
      const next = !m;
      if (!next) setPolygonPoints([]); // apagar → limpiar puntos
      return next;
    });
  }, [setPolygonMode, setPolygonPoints]);
  const applyPolygon = useCallback(() => {
    if (polygonPoints.length < 3) return;
    const n = selectPolygon(polygonPoints);
    setPolygonPoints([]);
    setPolygonMode(false);
    if (n > 0) toast.success(`${n} hexágonos seleccionados`);
    else toast.error("El polígono no cubrió hexágonos seleccionables");
  }, [polygonPoints, selectPolygon, toast, setPolygonMode, setPolygonPoints]);
  // Añade un vértice por COORDENADA (desde el buscador) y vuela ahí. Activa el
  // modo polígono para que se dibuje y se pueda aplicar.
  const addPolygonCoordinate = useCallback(
    (lng: number, lat: number) => {
      setPolygonMode(true);
      setPolygonPoints((pts) => [...pts, [lng, lat]]);
      setViewState((v) => clampViewState({ ...v, longitude: lng, latitude: lat }));
    },
    [clampViewState, setPolygonMode, setPolygonPoints, setViewState],
  );

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
    // Encuadre del mapa a la selección al salir de la fase de selección —
    // sincroniza el viewport (sistema externo) con el estado de la selección.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewState((v) =>
      clampViewState({
        ...v,
        longitude: (minLng + maxLng) / 2,
        latitude: (minLat + maxLat) / 2,
        zoom,
      }),
    );
  }, [accion, selectedHexes, clampViewState]);

  // Snapshot del mapa para el informe (sprint 3): compone TODOS los <canvas>
  // del contenedor (basemap MapLibre + capas deck/hexes) en uno solo y lo
  // cachea con SNAPSHOT_KEY. El informe lo muestra como <img> (screenshot real
  // del mapa, no un dibujo aparte). Porta el patrón de la demo previa; requiere
  // preserveDrawingBuffer en ambos canvas.
  const { saveToCache, clearCache } = useCachedImage();
  const captureSnapshot = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    // Ignora canvas de tamaño 0 (deck a veces expone uno transitorio en un
    // frame malo → provocaba "deck.gl: assertion failed" al leerlo).
    const all = Array.from(
      container.querySelectorAll<HTMLCanvasElement>("canvas"),
    ).filter((c) => c.width > 0 && c.height > 0);
    if (all.length === 0) return;
    // Componer en orden VISUAL, no de DOM: basemap (MapLibre) al fondo y las
    // capas de deck (hexes) ENCIMA. querySelectorAll ignora el z-index; si el
    // basemap opaco se dibuja al final, tapa los hexes (solo salía el fondo).
    const mapCanvas = container.querySelector<HTMLCanvasElement>(
      "canvas.maplibregl-canvas",
    );
    const base = mapCanvas ?? all[0];
    const ordered: HTMLCanvasElement[] = [
      ...(mapCanvas ? [mapCanvas] : []),
      ...all.filter((c) => c !== mapCanvas),
    ];
    // Cap de resolución: en pantallas retina el canvas del mapa es 2× → un PNG
    // enorme que luego hace lentísima la captura del informe (html2canvas). Se
    // reduce a un ancho máximo razonable manteniendo la relación de aspecto.
    const MAX_SNAPSHOT_W = 1400;
    const scaleDown = base.width > MAX_SNAPSHOT_W ? MAX_SNAPSHOT_W / base.width : 1;
    const composite = document.createElement("canvas");
    composite.width = Math.round(base.width * scaleDown);
    composite.height = Math.round(base.height * scaleDown);
    const ctx = composite.getContext("2d");
    if (!ctx) return;
    let drewOverlay = false;
    for (const c of ordered) {
      try {
        ctx.drawImage(c, 0, 0, composite.width, composite.height);
        if (c !== mapCanvas) drewOverlay = true;
      } catch {
        /* un canvas puede fallar en un frame concreto; se omite ese canvas */
      }
    }
    // Si no se pudo pintar la capa de deck (hexes), NO guardamos: evita dejar
    // en cache una captura "solo fondo" que luego se ve como imagen vieja.
    if (!drewOverlay) return;
    try {
      await saveToCache(composite.toDataURL("image/png"), SNAPSHOT_KEY);
    } catch {
      /* best-effort */
    }
  }, [saveToCache]);

  // Snapshot del informe: en fase de SELECCIÓN se limpia el cache (para que el
  // informe no muestre una captura anterior tras borrar/rehacer la selección);
  // al entrar al INFORME se captura el mapa ya reencuadrado (rAF + delay para
  // que deck termine de pintar tiles/heatmap antes del toDataURL).
  useEffect(() => {
    if (accion === "seleccion-area") {
      void clearCache(SNAPSHOT_KEY);
      return;
    }
    // Solo capturar con el heatmap efectivamente activo: evita el screenshot de
    // un mapa sin coloreo (y el "deck.gl: assertion failed" al leer un estado
    // en transición).
    if (accion !== "informe" || !heatmapActive) return;
    const id = setTimeout(() => {
      requestAnimationFrame(() => void captureSnapshot());
    }, 1200);
    return () => clearTimeout(id);
  }, [accion, heatmapActive, selectedHexes, activeDimension, captureSnapshot, clearCache]);

  // Al entrar al informe SIEMPRE debe haber una dimensión activa — el heatmap
  // no debe quedar apagado. Corrige el caso de volver al informe (desde otra
  // fase) y ver el área sin colorear.
  useEffect(() => {
    if (accion === "informe" && activeDimension === null) {
      setActiveDimension("general");
    }
  }, [accion, activeDimension, setActiveDimension]);

  // Limpiar el hover al cambiar de fase: en selección/dimensiones el grid es
  // pickable, así que `hoveredHex` podía quedar STALE (un hex fuera del área) y
  // el popup del informe / la leyenda de exclusión se mostraban con ese hex
  // viejo hasta mover el ratón. Reset → el popup solo reaparece al hover real.
  useEffect(() => {
    // Reset del hover al cambiar de fase (evita popup/leyenda con hex stale).
    /* eslint-disable react-hooks/set-state-in-effect */
    setHoveredHex(null);
    setHoverPos(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [accion]);

  // capa de cuadrícula con tiles — solo renderiza lo visible, cachea por tile.
  // Cuando el heatmap del informe está activo, oculto la malla entera para
  // no superponer bordes de hexágonos sobre el mapa de calor.
  // isFlyingRef se lee dentro de callbacks de deck.gl (onViewportLoad) que
  // corren DESPUÉS del render; el linter no distingue el momento de ejecución.
  // eslint-disable-next-line react-hooks/refs
  const gridTileLayer = useMemo(() => new TileLayer<HexCell>({
    // El id incluye `heatVersion`: al cambiar la variable de calor, el TileLayer se
    // remonta y refetchea los tiles con los nuevos valores (viridis).
    id: `colombia-grid-tiles-${heatVersion}`,
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
    getTileData: (tile) => {
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
      const tileKey = `${z}/${x}/${y}`;
      // EXCLUIDOS: ya NO se piden por tile con `get_tile` (ese endpoint, a zoom bajo,
      // barría millones de filas por cada tile). Ahora la capa COMPLETA de excluidos
      // llega en UNA sola petición al montar el mapa (`fetchExcludedCells` →
      // bannedStore); aquí solo se lee con `isHexBanned`, sin tocar el backend.
      // CALOR (backend): capa de datos APARTE de la malla. Lee de caché (sync); si
      // no está, dispara el fetch en 2º plano (1 vez por tile) y programa UN solo
      // re-render diferido para colorear. Si el fetch falla, el calor "falla solo":
      // la malla ya quedó pintada. Template: `windValueForHex` (sin fetch).
      const heatVar = activeHeatRef.current;
      let heatByCell: Map<string, number> | null = null;
      if (heatVar && USE_BACKEND) {
        const ck = `${heatVar}:${tileKey}`;
        const cached = heatCacheRef.current.get(ck);
        if (cached) {
          heatByCell = cached;
        } else if (!heatInflightRef.current.has(ck)) {
          heatInflightRef.current.add(ck);
          fetchVariableCellsBBox(
            heatVar,
            {
              west: west - lngMargin,
              south: south - latMargin,
              east: east + lngMargin,
              north: north + latMargin,
            },
            res,
          )
            .then((real) => {
              if (real) heatCacheRef.current.set(ck, aggregateValuesToRes(real, res));
            })
            .catch(() => {}) // el calor falla solo; no rompe la malla
            .finally(() => {
              heatInflightRef.current.delete(ck);
              // UN solo re-render diferido: colorea los tiles ya pintados sin una
              // cascada de remounts (cada tile que termina reprograma el timer).
              if (heatBumpTimerRef.current) clearTimeout(heatBumpTimerRef.current);
              heatBumpTimerRef.current = setTimeout(() => setHeatVersion((v) => v + 1), 300);
            });
        }
      }
      const tileCells = polygonToCells(tilePolygon, res, true);
      const result: HexCell[] = [];
      for (const h of tileCells) {
        const [lat, lng] = cellToLatLng(h);
        if (!isInColombia(lat, lng)) continue;
        // `owned`: el hex pertenece a ESTE tile si su centro cae en el bbox
        // EXACTO (sin el margen del 10%). El margen hace que los tiles vecinos
        // repitan los hex del borde → con relleno translúcido eso duplicaba el
        // alpha en las costuras ("pilares" oscuros). Rellenamos solo los owned.
        const owned = lat >= south && lat < north && lng >= west && lng < east;
        // `banned` = excluido por dato (bannedStore, ya incluye los del backend)
        // o placeholder local. Morado (BANNED_FILL = viridis(0)), no seleccionable.
        const banned = isHexBanned(h);
        let value: number | undefined;
        if (heatVar) {
          const v = USE_BACKEND
            ? heatByCell?.get(h)
            : windValueForHex(heatVar, h, null);
          if (v != null && v >= WIND_THRESHOLD) value = v;
        }
        result.push({ h, banned, owned, value });
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
        // Relleno: prohibidos → gris sólido; con CALOR activo, cada hex se pinta
        // con `viridis(valor)` (mismo palette+alpha 51 que el heatmap del informe),
        // solo los `owned` para no duplicar alpha en las costuras; el resto sin
        // relleno (el BORDE es la malla normal). Ver `activeHeatVarId`.
        getFillColor: (d) => {
          if (d.banned) return BANNED_FILL;
          if (d.value != null && d.owned) {
            const c = viridis(Math.max(0, Math.min(1, d.value)));
            return [c[0], c[1], c[2], 51];
          }
          return [0, 0, 0, 0];
        },
        getLineColor: (d) => (d.banned ? BANNED_BORDER : GRID_BORDER),
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        filled: true,
        stroked: true,
        // En informe SOLO el heatmap debe ser pickable. El grid usa resolución
        // por zoom (hexágonos grandes) y sus sublayers no heredan el
        // visible:false del TileLayer para el picking → el hover enganchaba un
        // hex enorme del grid en vez del hex fino pintado en el heatmap.
        pickable: !heatmapActive,
      });
    },
  }), [heatmapActive, isFlyingRef, heatVersion]);

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

  // SOLO PARA DIBUJAR: normaliza los hex seleccionados a la MISMA resolución que
  // el grid muestra a este zoom. Sin esto, un hex elegido a res7 seguía pintándose
  // grande al acercar a res8 (se veía "encima" de sus hijos → selección anidada que
  // "persiste" al cambiar de escala). NO toca el grid (rendimiento intacto) ni el
  // set real `selectedHexes` (la consulta al backend sigue igual): solo el relleno.
  const displayRes = Math.max(0, Math.min(15, zoomToH3Res(viewState.zoom)));
  // Res de las CAPAS de variable (símbolos/catálogo): la del zoom, TOPE 7 (nunca
  // res8-país, que traía millones — era el "pide res8 cada vez"). Entero → solo
  // cambia al cruzar un nivel de zoom (los effects no re-piden en cada píxel). A
  // zoom bajo baja a 5–6 → el backend agrega a padres y devuelve pocos hex (patrón
  // del heat, 9e4d654). Follow-up: bbox del viewport a zoom alto para afinar más.
  const layerRes = Math.min(7, displayRes);
  // Bbox del VIEWPORT (debounced) para acotar las capas de variable a lo VISIBLE →
  // el backend escanea el viewport, no el país entero (mató los scans de ~5 min que
  // apilaban los hilos). Se actualiza 400ms tras asentarse el paneo/zoom; las capas
  // refetchean con el nuevo bbox (y la caché por bbox redondeado evita refetch en
  // paneos chicos).
  const [viewBox, setViewBox] = useState<
    { west: number; south: number; east: number; north: number } | null
  >(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const b = mapRef.current?.getMap?.()?.getBounds?.();
      if (!b) return;
      setViewBox({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    }, 400);
    return () => clearTimeout(t);
  }, [viewState]);
  const selectedArr = useMemo<HexCell[]>(() => {
    const norm = new Set<string>();
    for (const h of selectedHexes) {
      const r = getResolution(h);
      if (r === displayRes) norm.add(h);
      else if (r > displayRes) norm.add(cellToParent(h, displayRes));
      else for (const c of cellToChildren(h, displayRes)) norm.add(c);
    }
    return Array.from(norm, (h) => ({ h }));
  }, [selectedHexes, displayRes]);

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

  // Datos reales por hex del backend (mismo fetch cacheado que el heatmap) para
  // que el tooltip de hover muestre scores/variables reales en modo API.
  const areaData = useAreaHexData(selectedHexes, heatmapActive);

  // Símbolos informativos en el mapa (círculo + ícono) para variables con
  // "mostrar en mapa" (nodos, infra, áreas protegidas, resguardos). La leyenda
  // (abajo-izq) actúa como interruptor: por defecto todas apagadas. No depende
  // del menú de dimensiones. Datos/iconos TEMPLATE — ver `Utils/map/mapSymbols.ts`.
  // Arrancan TODAS apagadas para no saturar el mapa; el usuario enciende las
  // capas que quiera ver desde la leyenda "Capas del mapa".
  const [activeSymbols, setActiveSymbols] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleSymbol = useCallback((id: string) => {
    setActiveSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  // Toggle desde la leyenda "Capas del mapa" (solo capas de área/punto —
  // multi-selección). El viento ya no se togglea aquí (vive en el desplegable
  // del Informe), así que este handler solo enciende/apaga símbolos.
  const handleSymbolToggle = toggleSymbol;
  // En DIMENSIONES el menú de capas controla la VISIBILIDAD en el mapa, NO el
  // estado de la variable: apagar una capa la oculta del mapa pero NUNCA apaga su
  // switch (las de modelo son obligatorias y no deben romperse). Set de capas
  // ocultas (override de visibilidad); vacío = todas las activas se ven.
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const toggleDimLayer = useCallback((id: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  // Variables con "ver en mapa" desactivado en admin (US08-01): sus símbolos se
  // ocultan de la leyenda y del mapa. Semilla vacía → nada oculto por defecto.
  const [mapDisabledIds, setMapDisabledIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let alive = true;
    fetchMapDisabledIds()
      .then((s) => alive && setMapDisabledIds(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Naturaleza mar/tierra del área seleccionada → filtra en el menú de capas las
  // variables que no aplican (p.ej. pastos marinos no sale si la selección es tierra).
  const mapNature = useMemo(
    () => (USE_API_EMPLAZAMIENTO ? selectionNature(selectedHexes) : "mixta"),
    [selectedHexes],
  );

  // Celdas res8 por capa de variable activa (V0 "verse en el mapa"): se cargan
  // desde el seam `mapLayerData` (placeholder hoy → `/api/tiles/variable` con la
  // máster). Se pintan como hexágonos res8: `area` relleno suave, `heat` viridis
  // + umbral. Ver contrato en memoria `map-res8-contract`.
  const [symbolCells, setSymbolCells] = useState<Record<string, MapLayerCell[]>>(
    {},
  );

  // Blink SEGURO de los iconos de capa: alterna la opacidad de los IconLayer.
  // GATE en `mapReady`: la causa del crash anterior era actualizar el IconLayer
  // antes de que el device (GPU) estuviera listo (`device.limits undefined`);
  // arrancar el intervalo solo tras `mapReady` lo evita. Solo con capas visibles.
  const [blinkOn, setBlinkOn] = useState(true);
  useEffect(() => {
    if (!mapReady || (accion !== "informe" && accion !== "dimensiones")) return;
    const t = setInterval(() => setBlinkOn((b) => !b), 800);
    return () => clearInterval(t);
  }, [mapReady, accion]);
  // Capas de variable EFECTIVAS (las que se pintan):
  //  - Informe: las controla el menú "Capas del mapa" (`activeSymbols`).
  //  - Dimensiones: las manda el SWITCH de la card (`activeVariables`), MENOS las
  //    ocultadas desde el menú de capas (`hiddenLayers`). Así apagar una capa en el
  //    menú la oculta del mapa sin tocar el switch de la variable (no rompe las
  //    obligatorias).
  const effectiveSymbols = useMemo(
    () =>
      accion === "dimensiones"
        ? new Set([...activeVariables].filter((id) => !hiddenLayers.has(id)))
        : activeSymbols,
    [accion, activeVariables, hiddenLayers, activeSymbols],
  );
  useEffect(() => {
    let alive = true;
    // En backend, espera a tener el bbox del viewport antes de pedir (si no, la 1ª
    // carga pediría el país entero → el scan de 5 min que estamos matando).
    if (USE_BACKEND && !viewBox) return;
    // Solo las variables de ÁREA cargan hex de cobertura; el viento (`heat`) es
    // un mapa de calor que colorea los hex del grid (no un set propio).
    const wanted = MAP_SYMBOLS.filter(
      (s) =>
        s.kind !== "heat" &&
        effectiveSymbols.has(s.variableId) &&
        !mapDisabledIds.has(s.variableId) &&
        variableAppliesToNatureById(s.variableId, mapNature), // filtro mar/tierra
    );
    Promise.all(
      wanted.map(
        async (s) =>
          [s.variableId, await fetchMapLayerCells(s, layerRes, viewBox ?? undefined)] as const,
      ),
    )
      .then((pairs) => {
        if (alive) setSymbolCells(Object.fromEntries(pairs));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [effectiveSymbols, mapDisabledIds, mapNature, layerRes, viewBox]);

  const symbolLayers = useMemo(() => {
    const active = MAP_SYMBOLS.filter(
      (s) =>
        effectiveSymbols.has(s.variableId) &&
        !mapDisabledIds.has(s.variableId) &&
        variableAppliesToNatureById(s.variableId, mapNature), // filtro mar/tierra
    );
    // Capas de ÁREA (protegidas, resguardos, nodos…): hex de cobertura con
    // relleno SUAVE del color de la variable. (El viento NO va aquí: es un mapa
    // de calor que colorea los hex del grid — ver `getFillColor` de gridTileLayer.)
    const polys = active
      .filter((s) => s.kind === "zone")
      .map((s) => {
        const cells = symbolCells[s.variableId] ?? [];
        const [br, bg, bb] = hexToRgb(s.color);
        return new H3HexagonLayer<MapLayerCell>({
          id: `map-hexlayer-${s.variableId}`,
          data: cells,
          getHexagon: (d) => d.h,
          extruded: false,
          stroked: true,
          filled: true,
          // Superpuestas: relleno 20% (alpha 51) + borde 100% del color.
          getFillColor: () => [br, bg, bb, 51],
          getLineColor: () => [br, bg, bb, 255],
          getLineWidth: 1,
          lineWidthUnits: "pixels",
          lineWidthMinPixels: 1,
          pickable: false,
          updateTriggers: { getFillColor: [s.color], getLineColor: [s.color] },
        });
      });
    // Redes de puntos: conecta los puntos de cada capa `point` con una línea.
    const paths = active
      .filter((s) => s.kind === "point")
      .map(
        (s) =>
          new PathLayer<SymbolPath>({
            id: `map-net-${s.variableId}`,
            data: symbolPaths(s),
            getPath: (d) => d.path,
            getColor: (d) => d.color,
            getWidth: 2,
            widthUnits: "pixels",
            capRounded: true,
            jointRounded: true,
            pickable: false,
            parameters: { depthCompare: "always" },
          }),
      );
    // Iconos encima: un marcador por capa de zona/punto. Las de CALOR (`heat`,
    // viento) NO llevan icono: se representan coloreando la rejilla (viridis, ver
    // `activeHeatVarId`), igual que el heatmap del informe → sin marcador redundante.
    const icons = active.filter((s) => s.kind !== "heat").map((s) => {
      // Icono ASIGNADO EN ADMIN (iconKey del catálogo, hidratado de BD) renderizado
      // a data-URI con el color de la variable. Fallback al icono estático de
      // `MAP_SYMBOLS` si el catálogo no tiene iconKey.
      const iconKey = getVariableById(s.variableId)?.iconKey;
      const iconUrl = iconKey ? iconKeyToDataUri(iconKey, s.color) : s.icon;
      return (
        new IconLayer<MapSymbolPoint>({
          id: `map-symbol-${s.variableId}`,
          data: s.points,
          getPosition: (d) => [d.lng, d.lat],
          // `id` incluye el iconKey: al cambiarlo en admin, deck.gl re-empaca el
          // atlas (sin él cachearía el icono viejo). Único por capa → sin colisión.
          getIcon: () => ({ id: `${s.variableId}|${iconKey ?? "static"}`, url: iconUrl, width: 48, height: 48, anchorY: 24, mask: false }),
          getSize: 30,
          sizeUnits: "pixels",
          opacity: blinkOn ? 1 : 0.45, // blink
          pickable: false,
          // Los polígonos (zonas/heat) escriben profundidad a z=0 y ocultarían el
          // icono que cae encima. `depthCompare: "always"` (luma.gl v9) hace que
          // el test de profundidad siempre pase → el icono SIEMPRE se dibuja.
          parameters: { depthCompare: "always" },
        })
      );
    });
    return [...polys, ...paths, ...icons];
  }, [effectiveSymbols, mapDisabledIds, symbolCells, blinkOn, mapNature]);

  // ── N1a-mapa 2b: capas GENÉRICAS de catálogo ────────────────────────────────
  // Variables enMapa (área/interconectado, NO calor) que NO están en la lista
  // curada `MAP_SYMBOLS` → capa aislada: hexes REALES del backend coloreados con
  // el color de la variable + icono asignado en admin. Aditivo: no toca el
  // pipeline curado. `calor` va por el heatmap (no aquí). FUENTE ÚNICA compartida
  // con la modal de capas (`genericMapVariables`) → mismo predicado (incluye el
  // filtro mar/tierra), así mapa y modal no divergen.
  // `calor` solo entra en Dimensiones (en Informe va por su desplegable).
  const extraMapVars = useMemo(
    () =>
      genericMapVariables(
        effectiveSymbols,
        mapDisabledIds,
        mapNature,
        accion === "dimensiones",
      ),
    [effectiveSymbols, mapDisabledIds, mapNature, accion],
  );

  const [extraCells, setExtraCells] = useState<Record<string, string[]>>({});
  useEffect(() => {
    let alive = true;
    // En backend, espera al bbox del viewport (no pedir el país entero en la 1ª carga).
    if (USE_BACKEND && !viewBox) return;
    Promise.all(
      // Regla: template = placeholder (pinta algo); backend = real o vacío.
      // `calor` no usa celdas de área (colorea la rejilla) → no se fetchea aquí.
      extraMapVars
        .filter((x) => x.kind !== "calor")
        .map(
          async (x) =>
            [x.id, await fetchCatalogCells(x.id, layerRes, viewBox ?? undefined)] as const,
        ),
    )
      .then((pairs) => alive && setExtraCells(Object.fromEntries(pairs)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [extraMapVars, layerRes, viewBox]);

  // Variable de CALOR activa (la primera): su valor por hex COLOREA la rejilla del
  // grid como heatmap viridis (resumen de padres por zoom, `gridTileLayer`). El
  // heatmap muestra UNA variable a la vez, como el desplegable del informe.
  const activeHeatVarId = useMemo(
    () => extraMapVars.find((x) => x.kind === "calor")?.id ?? null,
    [extraMapVars],
  );
  // Sincroniza el ref que lee el grid + remonta el TileLayer (bump de versión)
  // cuando cambia la variable de calor activa → refetch con los nuevos valores.
  useEffect(() => {
    if (activeHeatRef.current === activeHeatVarId) return;
    activeHeatRef.current = activeHeatVarId;
    setHeatVersion((n) => n + 1);
  }, [activeHeatVarId]);

  // Centroide del área seleccionada — para que las capas `interconectado` tracen
  // una línea desde el centro del área a cada punto (además de la red vecinal).
  const selectionCenter = useMemo(() => {
    if (selectedHexes.size === 0) return null;
    let sLat = 0;
    let sLng = 0;
    for (const h of selectedHexes) {
      const [lat, lng] = cellToLatLng(h);
      sLat += lat;
      sLng += lng;
    }
    return { lat: sLat / selectedHexes.size, lng: sLng / selectedHexes.size };
  }, [selectedHexes]);

  const catalogLayers = useMemo(() => {
    const out: (
      | H3HexagonLayer<{ h: string }>
      | IconLayer<{ lng: number; lat: number }>
      | PathLayer<{ path: [number, number][] }>
    )[] = [];
    for (const { id, kind } of extraMapVars) {
      const cells = extraCells[id] ?? [];
      if (cells.length === 0) continue;
      const color = colorForVariable(id);
      const [r, g, b] = hexToRgb(color);

      // CALOR: NO se pinta aquí. Colorea la REJILLA del grid (`gridTileLayer`,
      // resumen de padres por zoom) con `viridis` → ver `activeHeatVarId`.
      if (kind === "calor") continue;

      // ÁREA / INTERCONECTADO: hexes del color de la variable + icono.
      out.push(
        new H3HexagonLayer<{ h: string }>({
          id: `catalog-hex-${id}`,
          data: cells.map((h) => ({ h })),
          getHexagon: (d) => d.h,
          extruded: false,
          stroked: true,
          filled: true,
          getFillColor: () => [r, g, b, 51],
          getLineColor: () => [r, g, b, 200],
          getLineWidth: 1,
          lineWidthUnits: "pixels",
          lineWidthMinPixels: 1,
          pickable: false,
        }),
      );
      // Icono (asignado en admin) en una MUESTRA de hexes (≤12) para no saturar.
      const iconKey = getVariableById(id)?.iconKey ?? "lucide:MapPin";
      const iconUrl = iconKeyToDataUri(iconKey, color);
      const step = Math.max(1, Math.ceil(cells.length / 12));
      const points = cells
        .filter((_, i) => i % step === 0)
        .slice(0, 12)
        .map((h) => {
          const [lat, lng] = cellToLatLng(h);
          return { lng, lat };
        });
      out.push(
        new IconLayer<{ lng: number; lat: number }>({
          id: `catalog-icon-${id}`,
          data: points,
          getPosition: (d) => [d.lng, d.lat],
          getIcon: () => ({
            id: `${id}|${iconKey}`,
            url: iconUrl,
            width: 48,
            height: 48,
            anchorY: 24,
            mask: false,
          }),
          getSize: 26,
          sizeUnits: "pixels",
          opacity: blinkOn ? 1 : 0.45, // blink
          pickable: false,
          parameters: { depthCompare: "always" },
        }),
      );
      // `interconectado`: red vecino-más-cercano entre los puntos + una línea
      // desde el CENTRO del área seleccionada a cada punto (petición cliente).
      if (kind === "interconectado" && points.length >= 2) {
        const edges = nearestNeighborEdges(points);
        if (selectionCenter) {
          for (const p of points) {
            edges.push({
              path: [
                [selectionCenter.lng, selectionCenter.lat],
                [p.lng, p.lat],
              ],
            });
          }
        }
        out.push(
          new PathLayer<{ path: [number, number][] }>({
            id: `catalog-net-${id}`,
            data: edges,
            getPath: (d) => d.path,
            getColor: () => [r, g, b, 170],
            getWidth: 2,
            widthUnits: "pixels",
            capRounded: true,
            jointRounded: true,
            pickable: false,
            parameters: { depthCompare: "always" },
          }),
        );
      }
    }
    return out;
  }, [extraMapVars, extraCells, selectionCenter, blinkOn]);

  // Dibujo del POLÍGONO en curso (US03-04): vértices (puntos) + contorno. Se
  // materializa en hexágonos al "Aplicar" (ver `applyPolygon`).
  const polygonDrawLayers = useMemo(() => {
    if (polygonPoints.length === 0) return [];
    const out: (PathLayer | ScatterplotLayer)[] = [];
    if (polygonPoints.length >= 2) {
      const path =
        polygonPoints.length >= 3
          ? [...polygonPoints, polygonPoints[0]]
          : polygonPoints;
      out.push(
        new PathLayer<{ path: [number, number][] }>({
          id: "polygon-draw-path",
          data: [{ path }],
          getPath: (d) => d.path,
          getColor: [22, 81, 112, 220],
          getWidth: 2,
          widthUnits: "pixels",
          pickable: false,
          parameters: { depthCompare: "always" },
        }),
      );
    }
    out.push(
      new ScatterplotLayer<[number, number]>({
        id: "polygon-draw-points",
        data: polygonPoints,
        getPosition: (d) => d,
        getRadius: 5,
        radiusUnits: "pixels",
        getFillColor: [22, 81, 112, 255],
        getLineColor: [255, 255, 255, 255],
        lineWidthUnits: "pixels",
        getLineWidth: 1.5,
        stroked: true,
        pickable: false,
        parameters: { depthCompare: "always" },
      }),
    );
    return out;
  }, [polygonPoints]);

  // Bordes de la selección — comportamiento condicional por fase:
  // - En "seleccion-area": cada hex tiene su borde completo (grid de selección)
  // - En otras fases: sólo el contorno exterior (perímetro) del conjunto, usando
  //   `cellsToMultiPolygon` para fusionar bordes contiguos en una sola línea
  const selectedBordersLayer = useMemo(() => {
    if (selectedArr.length === 0) return null;
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
    // `heatmapActive` en deps: aunque el contenido del contorno no dependa de
    // él, forzamos una INSTANCIA de capa nueva al cambiar de fase (informe ↔
    // otras). Sin esto, la memo reutiliza la misma instancia entre fases y
    // deck.gl assertaba al recibir una capa ya finalizada (rompía el render →
    // heatmap despintado al volver a informe).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dep intencional
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

  // Enfoque bajo demanda (misma acción que el botón de enfoque): al abrir un
  // informe guardado desde el histórico, `requestMapFocus()` incrementa
  // `focusNonce` y aquí se reencuadra la selección. Así el mapa (y la captura
  // del informe/PDF, que ocurre después) muestran la zona correcta y no la
  // localización anterior. Guard por ref → solo dispara cuando cambia el nonce.
  const focusNonceRef = useRef(focusNonce);
  useEffect(() => {
    if (focusNonce === focusNonceRef.current) return;
    focusNonceRef.current = focusNonce;
    if (selectedHexes.size === 0) return;
    const id = requestAnimationFrame(() => zoomToSelection());
    return () => cancelAnimationFrame(id);
  }, [focusNonce, selectedHexes, zoomToSelection]);

  // Al ENTRAR al informe, reencuadra al ÁREA seleccionada antes de la captura del
  // snapshot: la imagen del informe/PDF debe mostrar la zona, no el zoom que el
  // usuario dejó. Solo en la TRANSICIÓN a "informe" (no re-encuadra si luego
  // paneó/zoomeó para inspeccionar). El delay de la captura (1200 ms) da tiempo a
  // que deck repinte en el nuevo encuadre (fitBounds fija el viewState al vuelo).
  const prevAccionZoomRef = useRef(accion);
  useEffect(() => {
    const entering =
      accion === "informe" && prevAccionZoomRef.current !== "informe";
    prevAccionZoomRef.current = accion;
    if (!entering || selectedHexes.size === 0) return;
    const id = requestAnimationFrame(() => zoomToSelection());
    return () => cancelAnimationFrame(id);
  }, [accion, selectedHexes, zoomToSelection]);

  // US-FB3-02 AC2 — Reset a Colombia: vuelve a la vista inicial (INITIAL_VIEW_STATE).
  const resetView = useCallback(() => {
    setViewState(INITIAL_VIEW_STATE);
  }, []);

  // Borrar selección: limpia por completo selectedHexes. También
  // resetea los refs del search para que no queden hexes "huérfanos" del buscador
  // pendientes de deseleccionar por un cambio de resolución H3 posterior.
  const clearSelection = useCallback(() => {
    setSelectedHexes(new Set());
    resetSearch();
  }, [setSelectedHexes, resetSearch]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { el.requestFullscreen(); setFullscreen(true); }
    else { document.exitFullscreen(); setFullscreen(false); }
  };

  return (
    <div ref={containerRef} className={`relative h-full w-full ${fullscreen ? "bg-black" : ""}`}>
      {/* AUDITORÍA (temporal): el mapa es CÁLCULO → se deja igual, con la lista
          de datos (BD) que usa. Quitar poniendo AUDIT_DB=false. */}
      {AUDIT_DB && (
        <div className="pointer-events-none absolute bottom-0 left-0 z-20 w-full bg-yellow-300/95 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-wide text-yellow-900">
          MAPA USA (BD): score_general/heatmap por hex (master · global.parquet) · tipo_celda (columna excluido) · mar/tierra (derivado batimetría) · capas de variable (/api/tiles/variable)
        </div>
      )}
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
          <div className="absolute top-3 right-3 z-10 flex w-[210px] flex-col gap-2 max-md:top-12">
            <AreaDisplay />
            {/* El menú "Capas del mapa" ya NO va en la vista inicial: se movió
                al Informe (instrucción cliente Sprint 4). Aquí solo el área km². */}
          </div>
        )}
      {mapReady && accion === "seleccion-area" && (
        <MapSearchBox
          onSelect={handlePlaceSelect}
          polygonPoints={polygonPoints}
          onAddCoordinate={addPolygonCoordinate}
          onRemovePoint={(i) =>
            setPolygonPoints((p) => p.filter((_, j) => j !== i))
          }
          onApplyPolygon={applyPolygon}
        />
      )}
      {/* Aviso viridis (sprint 3): explica que los hexágonos morados = idoneidad
          nula (zonas no aptas), coherente con la paleta del heatmap. */}
      {mapReady && canSelect && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 max-w-[230px] rounded-md bg-white/95 px-3 py-2 shadow-md ring-1 ring-black/5 max-md:hidden">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: "rgb(68,1,84)" }}
            />
            <p className="text-[11px] font-semibold text-[#5b2a86]">
              Zonas no idóneas
            </p>
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-gray-600">
            En la escala viridis, los hexágonos morados representan idoneidad 0:
            áreas no aptas bajo ninguna circunstancia (no seleccionables).
          </p>
        </div>
      )}
      {mapReady && <NextStepFloatingCard />}

      {/* Botones del mapa: SOLO en selección de área o en informe (sprint 3). */}
      {mapReady && (canSelect || accion === "informe") && (
        <>
          {/* Fullscreen mobile (top-derecha): solo en selección — en informe
              chocaría con el panel de variables/informativas (top-3 right-3). */}
          {canSelect && (
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
          )}
          {/* Botones de zoom/vista: el cartel "Siguiente paso" ahora va abajo-
              IZQUIERDA (pequeño) y la leyenda de excluidas abajo-derecha, así que
              este grupo va centrado abajo en selección. En informe, abajo-izquierda
              (no hay cartel) para no cruzarse con el panel de variables. */}
          <div className={`absolute z-10 flex items-center gap-2 ${canSelect ? "bottom-4 left-1/2 -translate-x-1/2" : "bottom-3 left-4"}`}>
            <button
              onClick={zoomToSelection}
              disabled={!hasSelection}
              aria-label="Zoom a la selección"
              title={hasSelection ? "Zoom a la selección" : "Selecciona hexágonos para hacer zoom"}
              className="flex h-8 w-8 items-center justify-center rounded text-white shadow bg-[#165170ff] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Crosshair size={16} />
            </button>
            {/* Reset a Colombia + Borrar selección: SOLO en selección de área.
                En informe se quitan (sprint 3): ya no se selecciona ni se
                reencuadra a Colombia desde aquí. */}
            {canSelect && (
              <>
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
                {/* Polígono (US03-04): pon puntos en el mapa → selecciona los
                    hexágonos dentro (estilo Google Maps). */}
                <button
                  onClick={togglePolygonMode}
                  aria-pressed={polygonMode}
                  aria-label="Selección por polígono"
                  title={
                    polygonMode
                      ? "Polígono activo — toca el mapa para poner puntos"
                      : "Polígono: pon puntos y selecciona el área"
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded shadow ${
                    polygonMode
                      ? "bg-white text-[#165170ff] ring-2 ring-[#165170ff]"
                      : "bg-[#165170ff] text-white"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 5-3 9H7L4 8z" />
                    <circle cx="12" cy="3" r="1.6" fill="currentColor" /><circle cx="20" cy="8" r="1.6" fill="currentColor" /><circle cx="4" cy="8" r="1.6" fill="currentColor" /><circle cx="7" cy="17" r="1.6" fill="currentColor" /><circle cx="17" cy="17" r="1.6" fill="currentColor" />
                  </svg>
                </button>
                {polygonMode && (
                  <>
                    <button
                      onClick={() => setPolygonPoints((p) => p.slice(0, -1))}
                      disabled={polygonPoints.length === 0}
                      title="Deshacer último punto"
                      className="flex h-8 items-center rounded px-2.5 text-[11px] font-semibold text-white shadow bg-gray-500 disabled:opacity-40"
                    >
                      Deshacer
                    </button>
                    <button
                      onClick={applyPolygon}
                      disabled={polygonPoints.length < 3}
                      title={
                        polygonPoints.length < 3
                          ? "Pon al menos 3 puntos"
                          : "Seleccionar hexágonos dentro del polígono"
                      }
                      className="flex h-8 items-center rounded px-2.5 text-[11px] font-semibold text-white shadow bg-emerald-600 disabled:opacity-40"
                    >
                      Aplicar ({polygonPoints.length})
                    </button>
                  </>
                )}
              </>
            )}

            {/* Separador vertical entre la toolbar de selección y el zoom */}
            <div className="h-6 w-px bg-white/50 mx-0.5 max-md:hidden" />

            {/* Zoom + fullscreen: solo desktop — misma fila y altura */}
            <div className="flex items-center gap-2 max-md:hidden">
              <button onClick={toggleFullscreen} className="flex h-8 w-8 items-center justify-center rounded text-white shadow bg-[#165170ff]" title={fullscreen ? "Salir" : "Pantalla completa"}>
                {fullscreen ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v4H2M10 1v4h4M6 15v-4H2M10 15v-4h4" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>
                )}
              </button>
              <button onClick={zoomIn} className="flex h-8 w-8 items-center justify-center rounded text-lg font-bold text-white shadow bg-[#165170ff]" title="Acercar">+</button>
              <button onClick={zoomOut} className="flex h-8 w-8 items-center justify-center rounded text-lg font-bold text-white shadow bg-[#165170ff]" title="Alejar">-</button>
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
          areaData={areaData}
        />
      )}

      {/* Leyenda de zona excluida (sprint 3): al pasar el cursor sobre un hex
          vetado (fuera del heatmap del informe), muestra el motivo de exclusión.
          Motivo por template hasta tener el campo real del dataset. */}
      {!isMobile &&
        !heatmapActive &&
        hoverPos &&
        hoveredHex &&
        isHexBanned(hoveredHex) && (
          <div
            role="tooltip"
            aria-label="Motivo de exclusión"
            style={{ left: hoverPos.x + 12, top: hoverPos.y + 12 }}
            className="pointer-events-none absolute z-20 max-w-[210px] rounded-md border border-[#e2d3ee] bg-white px-2.5 py-1.5 shadow-lg"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#5b2a86]">
              Zona excluida
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-gray-700">
              {bannedReason(hoveredHex)}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              0% idoneidad · no seleccionable
            </p>
          </div>
        )}

      {accion === "dimensiones" && activeVariables.size > 0 && (
        <SelectedVariablesChips />
      )}

      {/* Capas del mapa en DIMENSIONES (petición cliente): a la IZQUIERDA. Lista
          solo las variables seleccionadas (switches) con representación en el mapa.
          Togglear aquí controla la VISIBILIDAD de la capa (`hiddenLayers`), NO el
          switch de la variable → no rompe las obligatorias del modelo. */}
      {accion === "dimensiones" && (
        <div className="absolute top-3 left-3 z-10 w-44">
          <MapSymbolsLegend
            active={effectiveSymbols}
            onToggle={toggleDimLayer}
            disabled={mapDisabledIds}
            selected={activeVariables}
            nature={mapNature}
            includeHeat
          />
        </div>
      )}

      {/* Navegación del mapa (Dimensiones): abajo-derecha, en fila y compactos.
          Ver el país (vista completa) / centrar en la selección / alejar / acercar. */}
      {accion === "dimensiones" && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-row gap-1">
          <button
            onClick={resetView}
            title="Ver el país (vista completa)"
            aria-label="Ver el país"
            className="flex h-7 w-7 items-center justify-center rounded bg-white text-[#165170ff] shadow ring-1 ring-[#165170ff]/30 transition-colors hover:bg-[#cce1ee]/40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
            </svg>
          </button>
          {selectedHexes.size > 0 && (
            <button
              onClick={zoomToSelection}
              title="Centrar en la selección"
              aria-label="Centrar en la selección"
              className="flex h-7 w-7 items-center justify-center rounded bg-white text-[#165170ff] shadow ring-1 ring-[#165170ff]/30 transition-colors hover:bg-[#cce1ee]/40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="7" />
                <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
          )}
          <button
            onClick={zoomOut}
            title="Alejar"
            aria-label="Alejar"
            className="flex h-7 w-7 items-center justify-center rounded bg-[#165170ff] text-base font-bold text-white shadow transition-colors hover:bg-[#1e6a8c]"
          >
            −
          </button>
          <button
            onClick={zoomIn}
            title="Acercar"
            aria-label="Acercar"
            className="flex h-7 w-7 items-center justify-center rounded bg-[#165170ff] text-base font-bold text-white shadow transition-colors hover:bg-[#1e6a8c]"
          >
            +
          </button>
        </div>
      )}

      {/* El viento reusa la leyenda de idoneidad del Informe (`HeatmapLegend`),
          así que se retiró la mini-leyenda `WindHeatmapLegend` (era redundante:
          otro termómetro de color) — instrucción cliente Sprint 4. */}

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
            {/* Menú "Capas del mapa" (área/punto): movido aquí, al final, junto
                al mapa de calor (instrucción cliente Sprint 4). */}
            <MapSymbolsLegend
              active={activeSymbols}
              onToggle={handleSymbolToggle}
              disabled={mapDisabledIds}
              selected={activeVariables}
              nature={mapNature}
            />
          </div>
        </>
      )}

      <DeckGL
        style={{ position: "relative", width: "auto", height: "100%" }}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(clampViewState(vs as typeof INITIAL_VIEW_STATE))}
        // Pincel: al pintar se desactiva el paneo por arrastre (dragPan) para que
        // el arrastre pinte hexes en vez de mover el mapa. El resto (zoom, etc.) sigue.
        controller={true}
        // Las capas de símbolo (área/punto) se pintan en Informe Y en Dimensiones
        // (petición cliente): en Informe las controla el menú "Capas del mapa";
        // en Dimensiones, los switches de las cards. En las demás fases no.
        layers={[gridTileLayer, territoryBorderLayer, informeHeatmapLayer, selectedLayer, selectedBordersLayer, hoverFillLayer, ...(accion === "informe" || accion === "dimensiones" ? [...symbolLayers, ...catalogLayers] : []), ...polygonDrawLayers]}
        // US-FB3-03 (feedback item 8): nunca "not-allowed". Fuera de la fase de
        // selección el hex NO es inerte — en el informe se consulta con el
        // tooltip —, y el cursor de "prohibido" (muy marcado en Firefox/Windows)
        // se leía como "el mapa está bloqueado". El cursor ahora refleja qué se
        // puede hacer sobre la capa pickable: "pointer" si el hex responde
        // (selección o tooltip del informe), "default" si sólo es decorativo.
        getCursor={({ isHovering }) => {
          if (polygonActive) return "crosshair";
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
          // Modo POLÍGONO: cada clic añade un vértice (estilo Google Maps). El
          // área se materializa en hexágonos al "Aplicar".
          if (polygonActive) {
            const c = info.coordinate as [number, number] | undefined;
            if (c) setPolygonPoints((pts) => [...pts, [c[0], c[1]]]);
            return;
          }
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
          mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
          canvasContextAttributes={{ preserveDrawingBuffer: true }}
          // Atribución sin el toggle "ⓘ" (que parecía botón muerto): texto fijo.
          attributionControl={{ compact: false }}
          onLoad={() => setMapReady(true)}
        />
      </DeckGL>
    </div>
  );
}
