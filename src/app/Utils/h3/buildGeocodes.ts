/**
 * Generador OFFLINE de la "guía de direcciones" (geocodes) de Colombia.
 *
 * Consulta UNA vez la Overpass API de OpenStreetMap (gratis, SIN token) por todos
 * los lugares poblados de Colombia (ciudades, municipios, pueblos, corregimientos/
 * caseríos) con su nombre y coordenadas, y arma un JSON. Ese archivo se guarda en el
 * repo/backend y la barra de búsqueda lo usa en LOCAL → cero dependencia de Nominatim.
 *
 * Datos de OpenStreetMap (ODbL, uso libre con atribución). Overpass soporta CORS.
 * Es un paso de GENERACIÓN (se corre una vez desde el botón de descarga), no en runtime.
 */

export interface GeocodeEntry {
  /** Nombre del lugar (p. ej. "Uribia"). */
  name: string;
  lat: number;
  lng: number;
  /** Tipo OSM: city | town | village | hamlet | municipality… */
  type: string;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter", // espejo de respaldo
];

// Lugares POBLADOS de Colombia con nombre. `place=municipality` + cabeceras
// (city/town/village) + corregimientos/caseríos (hamlet). `out tags center` da
// las coordenadas también para los que son área.
const QUERY = `[out:json][timeout:240];
area["ISO3166-1"="CO"][admin_level=2]->.co;
(
  node["place"~"^(city|town|village|hamlet|municipality|suburb)$"]["name"](area.co);
  way["place"~"^(city|town|village|municipality)$"]["name"](area.co);
);
out tags center;`;

interface OverpassEl {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Trae todos los lugares de Colombia desde Overpass y los normaliza. */
export async function fetchColombiaGeocodes(
  onProgress?: (msg: string) => void,
): Promise<GeocodeEntry[]> {
  let lastErr: unknown = null;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      onProgress?.(`Consultando OpenStreetMap (${new URL(url).host})…`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: QUERY,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const data = (await res.json()) as { elements: OverpassEl[] };
      const out: GeocodeEntry[] = [];
      const seen = new Set<string>();
      for (const el of data.elements) {
        const name = el.tags?.name;
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!name || lat == null || lng == null) continue;
        const key = `${name.toLowerCase()}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name, lat, lng, type: el.tags?.place ?? "place" });
      }
      out.sort((a, b) => a.name.localeCompare(b.name, "es"));
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Overpass no respondió");
}

/** Dispara la descarga de `data` como archivo JSON en el navegador. */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
