import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { polygonToCells } from "h3-js";
import { canAddHexToSelection, isHexBanned } from "../../Utils/h3/hexClassification";
import { MIN_SELECTION_H3_RES } from "../../Utils/projectData";
import { zoomToH3Res } from "../../Utils/h3/mapGeo";
import { type Place } from "../../Utils/h3/geocoder";
import { INITIAL_VIEW_STATE } from "../../Utils/h3/h3Resolution";

type ViewState = typeof INITIAL_VIEW_STATE;

/** Determina un nivel de zoom razonable según el tipo de lugar OSM. */
function zoomForPlaceType(type: string, category: string): number {
  if (category === "boundary" && type === "administrative") return 9;
  if (type === "city" || type === "town") return 11;
  if (type === "village" || type === "hamlet" || type === "suburb") return 12;
  if (type === "municipality" || type === "county") return 9;
  if (type === "state" || type === "region") return 7;
  return 10;
}

type Opts = {
  canSelect: boolean;
  viewState: ViewState;
  selectedHexes: Set<string>;
  setViewState: Dispatch<SetStateAction<ViewState>>;
  clampViewState: (vs: ViewState) => ViewState;
  setSelectedHexes: Dispatch<SetStateAction<Set<string>>>;
  setIsTilesLoading: Dispatch<SetStateAction<boolean>>;
  /** Se llama cuando un hex se rechaza por estar demasiado lejos de la selección. */
  onRejectFar?: () => void;
};

/**
 * Selección de hexágonos + fly-to del buscador. Van juntos porque comparten
 * `searchHexesRef` (los hexes venidos de una búsqueda que aún no se tocaron a
 * mano). Extraído de Map.tsx para dejarlo como orquestador.
 *
 * Devuelve `isFlyingRef` para que la capa de tiles (onViewportLoad) sepa si un
 * slide está en curso y no baje el overlay antes de tiempo.
 */
export function useMapSelection({
  canSelect,
  viewState,
  selectedHexes,
  setViewState,
  clampViewState,
  setSelectedHexes,
  setIsTilesLoading,
  onRejectFar,
}: Opts) {
  // Hexes que vinieron de la última búsqueda (y aún no tocados a mano). Si el
  // zoom cambia a otra resolución H3, sólo estos se deseleccionan.
  const searchHexesRef = useRef<Set<string>>(new Set());
  // Resolución H3 a la que se ancló la última selección por búsqueda.
  const searchH3ResRef = useRef<number | null>(null);
  // Slide programático del search: token rAF + flag activa.
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

  const toggleHex = useCallback(
    (h3Index: string) => {
      if (!canSelect) return; // US03-AC12 — selección sólo en fase "seleccion-area"
      // Piso de resolución: sólo se selecciona con el mapa suficientemente
      // acercado (res ≥ MIN_SELECTION_H3_RES). Evita el bug de anidamiento al
      // cruzar niveles de zoom. El aviso "acércate" lo muestra Map.tsx.
      if (zoomToH3Res(viewStateRef.current.zoom) < MIN_SELECTION_H3_RES) return;
      // Zonas prohibidas / excluidas (gris sólido) no son seleccionables.
      if (isHexBanned(h3Index)) return;
      // Cualquier toggle manual saca al hex del set "vino del search".
      searchHexesRef.current.delete(h3Index);
      const isRemoving = selectedHexes.has(h3Index);
      // Restricción de cercanía: no se puede añadir un hex demasiado lejos del
      // área ya elegida. Avisa (onRejectFar) en vez de fallar en silencio.
      if (!isRemoving && !canAddHexToSelection(h3Index, selectedHexes)) {
        onRejectFar?.();
        return;
      }
      setSelectedHexes((prev) => {
        const next = new Set(prev);
        if (next.has(h3Index)) next.delete(h3Index);
        else next.add(h3Index);
        return next;
      });
    },
    [canSelect, selectedHexes, setSelectedHexes, onRejectFar],
  );

  const handlePlaceSelect = useCallback(
    (place: Place) => {
      const targetZoom = zoomForPlaceType(place.type, place.category);
      const targetH3Res = zoomToH3Res(targetZoom);

      // Pre-calcular los hexes del lugar; se aplican SOLO al final del slide.
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

      const initial = { ...viewStateRef.current };
      const targetLat = place.lat;
      const targetLng = place.lng;

      // Zoom "seguro" durante el paneo: bajo para que cada tile tenga pocos
      // hexes y DeckGL los procese tile-a-tile como en un arrastre real.
      const SAFE_ZOOM = Math.min(initial.zoom, targetZoom, 5);
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
          const t = frame / PHASE_1;
          lat = initial.latitude;
          lng = initial.longitude;
          z = initial.zoom + (SAFE_ZOOM - initial.zoom) * t;
        } else if (frame <= PHASE_1 + PHASE_2) {
          const t = (frame - PHASE_1) / PHASE_2;
          lat = initial.latitude + (targetLat - initial.latitude) * t;
          lng = initial.longitude + (targetLng - initial.longitude) * t;
          z = SAFE_ZOOM;
        } else if (frame <= TOTAL) {
          const t = (frame - PHASE_1 - PHASE_2) / PHASE_3;
          lat = targetLat;
          lng = targetLng;
          z = SAFE_ZOOM + (targetZoom - SAFE_ZOOM) * t;
        } else {
          // Fin del slide: aplicar selección y bajar overlay.
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
    },
    [clampViewState, setSelectedHexes, setViewState, setIsTilesLoading],
  );

  // Cuando el zoom cruza a otra resolución H3, deseleccionar SÓLO los hexes
  // venidos del search; los manuales se mantienen. Sólo en `seleccion-area`.
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

  return { toggleHex, handlePlaceSelect, isFlyingRef };
}
