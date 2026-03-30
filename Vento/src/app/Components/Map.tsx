"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapGL } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { useCachedImage } from "../Utils/useCachedImage";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import {
  type HexData,
  INITIAL_VIEW_STATE,
  MAP_STYLE,
  MAX_BOUNDS,
  SNAPSHOT_KEY,
  zoomToH3Res,
  createResolutionCache,
  getResolutionLevel,
  filterByViewport,
  fetchHexData,
} from "../Utils/h3Resolution";
import "maplibre-gl/dist/maplibre-gl.css";

try { luma.registerAdapters([webgl2Adapter]); } catch { /* retry on mount */ }

// gradiente de color por score — se usará cuando se active el mapa de calor (AC1)
// function getColor(score: number): [number, number, number, number] {
//   if (score > 0.7) return [220, 50, 50, 180];
//   if (score > 0.5) return [240, 180, 50, 160];
//   if (score > 0.3) return [50, 180, 220, 140];
//   return [80, 120, 200, 120];
// }

export default function MapView() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const { accion } = useAprincipal();
  const [hexData, setHexData] = useState<HexData[]>([]);
  const [dataReady, setDataReady] = useState(false);   // fetch de H3 completado
  const [mapReady, setMapReady] = useState(false);     // MapGL tiles cargados
  const loading = !dataReady || !mapReady;             // mapa no listo hasta ambos
  const [updating, setUpdating] = useState(false);     // computando nueva resolución
  const [mapState, setMapState] = useState<"active" | "frozen">("active");
  const [fullscreen, setFullscreen] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const { saveToCache, clearCache } = useCachedImage();
  const containerRef = useRef<HTMLDivElement>(null);

  const shouldFreeze = accion !== "seleccion-area";

  // cache lazy — persiste entre renders, computa solo el nivel pedido
  const resCacheRef = useRef(createResolutionCache());
  const [visibleHex, setVisibleHex] = useState<HexData[]>([]);

  // computar resolución + filtrar viewport — async para no bloquear UI
  const targetRes = zoomToH3Res(viewState.zoom);
  useEffect(() => {
    if (hexData.length === 0 || loading) return;

    const cache = resCacheRef.current;
    const alreadyCached = cache.has(targetRes);

    // si ya está cacheado, resolver directo sin banner
    if (alreadyCached) {
      const allAtRes = getResolutionLevel(hexData, cache, targetRes);
      setVisibleHex(filterByViewport(allAtRes, viewState));
      return;
    }

    // si no está cacheado: pintar "actualizando" primero, luego computar
    setUpdating(true);
    // doble RAF: el primero deja que React pinte el banner, el segundo computa
    let outer = 0;
    let inner = 0;
    outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const allAtRes = getResolutionLevel(hexData, cache, targetRes);
        const filtered = filterByViewport(allAtRes, viewState);
          setVisibleHex(filtered);
        setUpdating(false);
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [hexData, loading, targetRes, viewState.latitude, viewState.longitude, viewState.zoom]);

  // effect único: carga datos H3 + listener fullscreen
  useEffect(() => {
    const ctrl = new AbortController();

    fetchHexData(ctrl.signal)
      .then((data) => {
        setHexData(data);
        setDataReady(true);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Error cargando datos H3:", err);
        setDataReady(true);
      });

    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      ctrl.abort();
      document.removeEventListener("fullscreenchange", onFsChange);
    };
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

  // construimos la capa con los hexagonos
  const layers = [
    new H3HexagonLayer<HexData>({
      id: "h3-hexagons",
      data: visibleHex,
      getHexagon: (d) => d.h3_index,
      getFillColor: [0, 0, 0, 0],
      extruded: false,
      filled: false,
      stroked: true,
      getLineColor: [204, 204, 204, 78],
      lineWidthMinPixels: 2,
      pickable: true,
    }),
  ];

  return (
    <div ref={containerRef} className={`relative h-full w-full ${fullscreen ? "bg-black" : ""}`}>
      {/* overlay de carga — cubre el mapa mientras se inicializa debajo */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-lg">... cargando mapa</p>
        </div>
      )}

      {/* overlay "actualizando" — visible mientras se computa una nueva resolución */}
      {!loading && updating && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded bg-black/70 px-4 py-1.5 text-sm text-white shadow">
          actualizando...
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
          {/* DeckGL + MapGL siempre montados para que onLoad funcione */}
          <DeckGL
            style={{ position: "relative", width: "auto", height: "100%" }}
            viewState={viewState}
            onViewStateChange={({ viewState: vs }) =>
              setViewState(vs as typeof INITIAL_VIEW_STATE)
            }
            controller={true}
            layers={layers}
            getTooltip={({ object }: { object?: HexData }) =>
              object
                ? `H3: ${object.h3_index}\nScore: ${(object.score_general * 100).toFixed(0)}%\nTipo: ${object.tipo_celda}`
                : null
            }
          >
            <MapGL
              mapStyle={MAP_STYLE}
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
