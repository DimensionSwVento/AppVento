/**
 * Lookup aproximado de departamento colombiano a partir de coordenadas (lat, lng).
 * Bounding boxes manualmente curadas — la geometría real de los departamentos es
 * irregular, así que esto da una respuesta razonable pero no exacta. Suficiente
 * para mostrar la región en el informe preliminar; reemplazar por shapefile
 * oficial cuando esté disponible.
 *
 * Bboxes: [west, south, east, north]. Orden importa: bboxes contenidas dentro
 * de otra (ej. Bogotá D.C. dentro de Cundinamarca) deben ir primero.
 */
export interface DepartmentBBox {
  name: string;
  bbox: [number, number, number, number];
}

export const COLOMBIA_DEPARTMENTS: DepartmentBBox[] = [
  // Distrito Capital primero (queda dentro de la bbox de Cundinamarca)
  { name: "Bogotá D.C.", bbox: [-74.4, 3.7, -73.9, 4.8] },
  // Insular
  { name: "San Andrés y Providencia", bbox: [-82.0, 12.4, -81.3, 13.4] },
  // Caribe
  { name: "La Guajira", bbox: [-73.4, 10.7, -71.0, 12.6] },
  { name: "Atlántico", bbox: [-75.3, 10.2, -74.6, 11.1] },
  { name: "Magdalena", bbox: [-75.1, 8.9, -73.6, 11.6] },
  { name: "Cesar", bbox: [-74.3, 7.4, -72.8, 10.8] },
  { name: "Bolívar", bbox: [-75.6, 7.0, -73.8, 11.0] },
  { name: "Sucre", bbox: [-75.7, 8.3, -74.5, 10.1] },
  { name: "Córdoba", bbox: [-76.4, 7.4, -74.8, 9.4] },
  // Eje Cafetero / Andina central pequeños
  { name: "Quindío", bbox: [-75.9, 4.3, -75.4, 4.8] },
  { name: "Risaralda", bbox: [-76.2, 4.7, -75.4, 5.5] },
  { name: "Caldas", bbox: [-76.0, 4.8, -74.7, 5.8] },
  // Pacífica
  { name: "Chocó", bbox: [-78.0, 4.0, -76.0, 8.7] },
  { name: "Valle del Cauca", bbox: [-77.6, 3.1, -75.6, 5.0] },
  { name: "Cauca", bbox: [-77.6, 1.0, -75.5, 3.4] },
  { name: "Nariño", bbox: [-78.6, 0.4, -76.6, 1.7] },
  // Andina norte/este
  { name: "Norte de Santander", bbox: [-73.4, 7.0, -72.0, 9.4] },
  { name: "Santander", bbox: [-74.6, 5.7, -72.4, 8.1] },
  { name: "Boyacá", bbox: [-74.5, 4.6, -71.7, 7.1] },
  { name: "Cundinamarca", bbox: [-75.0, 3.7, -73.0, 5.9] },
  { name: "Tolima", bbox: [-76.3, 2.9, -74.5, 5.4] },
  { name: "Huila", bbox: [-76.6, 1.5, -74.4, 3.9] },
  // Antioquia
  { name: "Antioquia", bbox: [-77.1, 5.4, -73.8, 8.9] },
  // Llanos
  { name: "Arauca", bbox: [-72.0, 5.8, -69.4, 7.1] },
  { name: "Casanare", bbox: [-73.1, 4.3, -69.4, 6.4] },
  { name: "Meta", bbox: [-75.0, 1.6, -71.6, 4.9] },
  { name: "Vichada", bbox: [-71.0, 2.7, -67.4, 6.4] },
  // Amazonía
  { name: "Putumayo", bbox: [-77.5, -0.4, -73.8, 1.6] },
  { name: "Caquetá", bbox: [-76.3, -0.7, -73.9, 2.9] },
  { name: "Guaviare", bbox: [-74.0, 0.1, -69.7, 3.0] },
  { name: "Guainía", bbox: [-71.0, 0.6, -66.9, 4.0] },
  { name: "Vaupés", bbox: [-71.6, -1.2, -69.4, 1.5] },
  { name: "Amazonas", bbox: [-74.0, -4.3, -69.4, -0.2] },
];

/**
 * Devuelve el nombre del departamento que contiene el punto (lat, lng) o
 * `"Sin región"` si está fuera del territorio cubierto.
 */
export function getRegionFromLatLng(lat: number, lng: number): string {
  for (const dep of COLOMBIA_DEPARTMENTS) {
    const [w, s, e, n] = dep.bbox;
    if (lng >= w && lng <= e && lat >= s && lat <= n) {
      return dep.name;
    }
  }
  return "Sin región";
}
