/**
 * Geocoder client — usa Nominatim (OpenStreetMap) para buscar lugares en Colombia.
 *
 * **Política de uso de Nominatim** (https://operations.osmfoundation.org/policies/nominatim/):
 * - Máximo 1 request por segundo. El debounce del search box (300ms) más el
 *   typing humano normal lo respetan; igualmente debouncear si se hace lotes.
 * - Es obligatorio un `User-Agent` o `Referer` identificable. El fetch del
 *   browser envía `Referer` por defecto, lo que cumple el requisito.
 * - Para producción a escala se debería self-hostear o migrar a servicio comercial.
 *
 * **Parámetros usados**:
 * - `countrycodes=co` — limita resultados a Colombia
 * - `format=jsonv2` — respuesta JSON enriquecida
 * - `polygon_geojson=1` — incluye el polígono del lugar (necesario para auto-select)
 * - `limit=7` — máximo 7 resultados
 * - `accept-language=es` — labels en español cuando estén disponibles
 */

export interface Place {
  /** Nombre principal del lugar (p. ej. "El Porvenir") */
  name: string;
  /** Texto completo del lugar (incluye contexto: "El Porvenir, Cauca, Colombia") */
  displayName: string;
  lat: number;
  lng: number;
  /** Categoría OSM cruda: "boundary", "place", etc. */
  category: string;
  /** Tipo específico OSM: "administrative", "village", "municipality", etc. */
  type: string;
  /**
   * Polígono GeoJSON del lugar como anillos en formato [lng, lat].
   * Vacío si Nominatim no entregó polígono (algunos puntos no lo tienen).
   */
  polygons: Array<[number, number][]>;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

interface NominatimRaw {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
  geojson?: {
    type: "Polygon" | "MultiPolygon" | string;
    coordinates: unknown;
  };
}

/**
 * Aplana un GeoJSON Polygon/MultiPolygon a una lista de anillos en formato
 * `[lng, lat][]`. Soporta los dos tipos; ignora huecos (sólo outer ring por polígono).
 */
function extractPolygons(
  geojson: NominatimRaw["geojson"],
): Array<[number, number][]> {
  if (!geojson) return [];
  if (geojson.type === "Polygon") {
    const coords = geojson.coordinates as number[][][];
    if (!coords.length) return [];
    return [coords[0] as [number, number][]];
  }
  if (geojson.type === "MultiPolygon") {
    const coords = geojson.coordinates as number[][][][];
    return coords.map((poly) => poly[0] as [number, number][]);
  }
  return [];
}

/**
 * Busca lugares en Colombia que coincidan con la query.
 *
 * Devuelve un array (posiblemente vacío) con hasta 7 lugares. Cada lugar
 * incluye su centroide y, cuando Nominatim lo entrega, el polígono outer del
 * lugar para auto-seleccionar hexes después.
 *
 * Lanza si el fetch falla. El llamador debe manejar errores y loading state.
 */
export async function searchPlace(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "co");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("limit", "7");
  url.searchParams.set("accept-language", "es");

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);

  const raw = (await res.json()) as NominatimRaw[];
  return raw.map((r) => ({
    name: r.name ?? r.display_name.split(",")[0],
    displayName: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    category: r.class,
    type: r.type,
    polygons: extractPolygons(r.geojson),
  }));
}

/**
 * Centroide simple (promedio de vértices) de un anillo de polígono.
 * Útil cuando hay polígono pero queremos un único punto para centrar el mapa.
 */
export function polygonCentroid(
  ring: [number, number][],
): { lat: number; lng: number } | null {
  if (ring.length === 0) return null;
  let sumLat = 0;
  let sumLng = 0;
  for (const [lng, lat] of ring) {
    sumLat += lat;
    sumLng += lng;
  }
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}
