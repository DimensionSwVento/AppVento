import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { polygonToCells, cellToLatLng } from "h3-js";
import { canAddHexToSelection, isHexBanned } from "../../Utils/h3/hexClassification";
import { MIN_SELECTION_H3_RES } from "../../Utils/projectData";
import { zoomToH3Res, isInColombia } from "../../Utils/h3/mapGeo";
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

      const newSearchHexes = new Set<string>();
      if (place.polygons.length > 0) {
        for (const ring of place.polygons) {
          for (const h of polygonToCells(ring, targetH3Res, true)) {
            // Excluir zonas no idóneas de la auto-selección (igual que el clic).
            if (isHexBanned(h)) continue;
            newSearchHexes.add(h);
          }
        }
      }

      // Cancelar cualquier slide previo en curso (por si quedó uno).
      if (flyToRafRef.current !== null) {
        cancelAnimationFrame(flyToRafRef.current);
        flyToRafRef.current = null;
      }
      isFlyingRef.current = false;

      // Movimiento DIRECTO (mismo enfoque que `zoomToSelection`): salto inmediato
      // al destino, sin el slide cinematográfico de 3 fases (más rápido y menos
      // bugueado). La selección se aplica al instante.
      setViewState((v) =>
        clampViewState({
          ...v,
          latitude: place.lat,
          longitude: place.lng,
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
    },
    [clampViewState, setSelectedHexes, setViewState],
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

  // Pincel (US03-04): pinta (añade) o borra (quita) UN hex, idempotente, para
  // usar en arrastre. Mismas reglas que `toggleHex` (fase, piso de zoom, baneo,
  // proximidad), pero el chequeo de cercanía usa el set FRESCO (`prev`) para no
  // dejar huecos durante un trazo rápido, y no avisa (silencioso) al pintar.
  const paintHex = useCallback(
    (h3Index: string, erase: boolean) => {
      if (!canSelect) return;
      if (zoomToH3Res(viewStateRef.current.zoom) < MIN_SELECTION_H3_RES) return;
      if (isHexBanned(h3Index)) return;
      searchHexesRef.current.delete(h3Index);
      setSelectedHexes((prev) => {
        const has = prev.has(h3Index);
        if (erase) {
          if (!has) return prev;
          const next = new Set(prev);
          next.delete(h3Index);
          return next;
        }
        if (has || !canAddHexToSelection(h3Index, prev)) return prev;
        const next = new Set(prev);
        next.add(h3Index);
        return next;
      });
    },
    [canSelect, setSelectedHexes],
  );

  // Reset de los refs del buscador. Lo usa "Borrar selección" (US-FB3-02) para
  // que no queden hexes de búsqueda pendientes de deseleccionar en un cambio de
  // resolución H3 posterior.
  const resetSearch = useCallback(() => {
    searchHexesRef.current = new Set();
    searchH3ResRef.current = null;
  }, []);

  // Selección por POLÍGONO (US03-04): dado un anillo de vértices [lng,lat]
  // (puntos puestos en el mapa, estilo Google Maps), selecciona TODOS los
  // hexágonos dentro del polígono. Resolución = la mostrada (mín. seleccionable).
  // Filtra vetados y fuera de Colombia. Devuelve cuántos añadió.
  const selectPolygon = useCallback(
    (ring: [number, number][]): number => {
      if (!canSelect || ring.length < 3) return 0;
      const res = Math.max(
        zoomToH3Res(viewStateRef.current.zoom),
        MIN_SELECTION_H3_RES,
      );
      // h3 espera el anillo cerrado (primer = último), coords GeoJSON [lng,lat].
      const closed: [number, number][] = [...ring, ring[0]];
      let cells: string[] = [];
      try {
        cells = polygonToCells(closed, res, true);
      } catch {
        return 0;
      }
      const valid = cells.filter((h) => {
        if (isHexBanned(h)) return false;
        const [lat, lng] = cellToLatLng(h);
        return isInColombia(lat, lng);
      });
      if (valid.length === 0) return 0;
      searchHexesRef.current = new Set(); // pasa a ser selección manual
      setSelectedHexes((prev) => new Set([...prev, ...valid]));
      return valid.length;
    },
    [canSelect, setSelectedHexes],
  );

  return {
    toggleHex,
    paintHex,
    selectPolygon,
    handlePlaceSelect,
    isFlyingRef,
    resetSearch,
  };
}
