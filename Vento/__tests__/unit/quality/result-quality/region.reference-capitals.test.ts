import { describe, it, expect } from "vitest";
import { latLngToCell } from "h3-js";
import { getRegion } from "@/app/Utils/report/reportData";

// Result quality — validation against reference data: the department shown in the
// report header and used to name the saved report ("Informe — <departamento>") is
// derived from the selection centroid (`getRegion`). Reference: the capital city
// of each of the 32 departments plus Bogotá D.C. (DANE DIVIPOLA; coordinates of
// the urban centre, rounded to 4 decimals). Cundinamarca is administered from
// Bogotá (already the D.C. row), so Zipaquirá stands in for it. A one-cell
// selection on the capital
// must be attributed to that capital's department.
const CAPITALS: [departamento: string, capital: string, lat: number, lng: number][] = [
  ["Bogotá D.C.", "Bogotá", 4.6097, -74.0817],
  ["Amazonas", "Leticia", -4.2153, -69.9406],
  ["Antioquia", "Medellín", 6.2442, -75.5812],
  ["Arauca", "Arauca", 7.0903, -70.7617],
  ["Atlántico", "Barranquilla", 10.9639, -74.7964],
  ["Bolívar", "Cartagena", 10.391, -75.4794],
  ["Boyacá", "Tunja", 5.5353, -73.3678],
  ["Caldas", "Manizales", 5.0703, -75.5138],
  ["Caquetá", "Florencia", 1.6144, -75.6062],
  ["Casanare", "Yopal", 5.3378, -72.3959],
  ["Cauca", "Popayán", 2.4448, -76.6147],
  ["Cesar", "Valledupar", 10.4631, -73.2532],
  ["Chocó", "Quibdó", 5.6947, -76.6611],
  ["Córdoba", "Montería", 8.7479, -75.8814],
  ["Cundinamarca", "Zipaquirá", 5.0221, -74.0046],
  ["Guainía", "Inírida", 3.8653, -67.9239],
  ["Guaviare", "San José del Guaviare", 2.5729, -72.6459],
  ["Huila", "Neiva", 2.9273, -75.2819],
  ["La Guajira", "Riohacha", 11.5444, -72.9072],
  ["Magdalena", "Santa Marta", 11.2408, -74.199],
  ["Meta", "Villavicencio", 4.142, -73.6266],
  ["Nariño", "Pasto", 1.2136, -77.2811],
  ["Norte de Santander", "Cúcuta", 7.8939, -72.5078],
  ["Putumayo", "Mocoa", 1.1522, -76.6464],
  ["Quindío", "Armenia", 4.5339, -75.6811],
  ["Risaralda", "Pereira", 4.8133, -75.6961],
  ["San Andrés y Providencia", "San Andrés", 12.5847, -81.7006],
  ["Santander", "Bucaramanga", 7.1193, -73.1227],
  ["Sucre", "Sincelejo", 9.3047, -75.3978],
  ["Tolima", "Ibagué", 4.4389, -75.2322],
  ["Valle del Cauca", "Cali", 3.4516, -76.532],
  ["Vaupés", "Mitú", 1.2538, -70.2345],
  ["Vichada", "Puerto Carreño", 6.189, -67.4859],
];

describe("Result quality — department attribution vs reference capitals", () => {
  it.each(CAPITALS)(
    "a selection on the capital of %s (%s) is attributed to that department",
    (departamento, _capital, lat, lng) => {
      const hex = latLngToCell(lat, lng, 8);
      expect(getRegion(new Set([hex]))).toBe(departamento);
    },
  );
});
