import { cellToLatLng } from "h3-js";
import { getRegionFromLatLng } from "./colombiaRegions";

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Devuelve el centroide (promedio simple de lat/lng) de los hexágonos
 * seleccionados. Si no hay selección, retorna null.
 */
export function getCentroid(hexes: Set<string>): LatLng | null {
  if (hexes.size === 0) return null;
  let sumLat = 0;
  let sumLng = 0;
  for (const h of hexes) {
    const [lat, lng] = cellToLatLng(h);
    sumLat += lat;
    sumLng += lng;
  }
  return { lat: sumLat / hexes.size, lng: sumLng / hexes.size };
}

/**
 * Devuelve el nombre del departamento que cubre el centroide de la selección,
 * o null si no hay selección.
 */
export function getRegion(hexes: Set<string>): string | null {
  const c = getCentroid(hexes);
  if (!c) return null;
  return getRegionFromLatLng(c.lat, c.lng);
}

const coordFmt = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

/**
 * Formatea un par lat/lng como `"4.7110, -74.0721"`.
 */
export function formatCoordenadas(c: LatLng): string {
  return `${coordFmt.format(c.lat)}, ${coordFmt.format(c.lng)}`;
}

/**
 * Timestamp en formato `DD/MM/YY – HH:MM am/pm` para etiquetar el informe.
 */
export function formatReportTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yy = pad(d.getFullYear() % 100);
  const hours24 = d.getHours();
  const ampm = hours24 >= 12 ? "pm" : "am";
  const hh = pad(((hours24 + 11) % 12) + 1);
  const min = pad(d.getMinutes());
  return `${dd}/${mm}/${yy} – ${hh}:${min} ${ampm}`;
}
