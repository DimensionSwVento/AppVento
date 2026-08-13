/**
 * Catálogo de "variables informativas" usado por `InformativeVariablesList`
 * y `HexValuesTooltip`.
 *
 * Ahora deriva del catálogo de dimensiones (`variablesCatalog.ts`) — todas
 * las variables del flujo son informativas. La capa visual (icon, color)
 * se resuelve dinámicamente vía `variableIcons.tsx` + `dimensionColors.ts`.
 *
 * Las unidades por id se mantienen en un overrides map; las variables sin
 * unidad explícita usan "índice" como fallback (escala 0–100).
 */
import {
  VARIABLES,
  getVariableById,
  type Variable,
} from "./variablesCatalog";
import {
  getIconByVariableId,
  type VariableIconComponent,
} from "./variableIcons";
import { colorForVariable } from "./dimensionColors";

export interface InfoVar {
  id: string;
  /** Código master del catálogo (para casar con `variables` del backend). */
  masterId: string;
  label: string;
  unit: string;
  /** Componente SVG genérico — puede venir de Lucide, Tabler o custom. */
  Icon: VariableIconComponent;
  color: string;
}

/** Unidades por id de variable. Lo no listado usa "índice" (escala 0–100). */
const UNIT_OVERRIDES: Record<string, string> = {
  // Técnica
  wpd: "W/m²",
  "nodos-conexion": "km",
  "distancia-vial": "km",
  "distancia-portuaria": "km",
  // Ambiental
  elevacion: "m",
  "batimetria-offshore": "m",
  "pendiente-terreno": "°",
  "amenaza-volcanica": "índice",
  "fallas-sismicidad": "índice",
  "riesgo-fisico": "índice",
  // Social · Económico
  "dist-atractivo-turistico": "km",
  "pobreza-multidimensional": "%",
  "analfabetismo-soe": "%",
  "pobreza-energetica": "índice",
  // Social · Vulnerabilidad social
  desocupados: "%",
  "densidad-poblacional": "hab/km²",
  "distancia-viviendas": "km",
  ipm: "%",
  analfabetismo: "%",
  "hogares-municipio": "uds.",
  "pobreza-monetaria": "%",
  // Social · Brecha energética
  "ipm-energetica": "%",
  // Social · Seguridad / gobernanza
  "incidencia-delictiva": "índice",
  "desempeno-institucional": "índice",
  // económica
  desempleo: "%",
  ipc: "%",
};

function unitFor(id: string): string {
  return UNIT_OVERRIDES[id] ?? "índice";
}

/** Construye el InfoVar runtime a partir de un Variable del catálogo. */
function toInfoVar(v: Variable): InfoVar {
  return {
    id: v.id,
    masterId: v.masterId,
    label: v.label,
    unit: unitFor(v.id),
    Icon: getIconByVariableId(v.id),
    color: colorForVariable(v.id),
  };
}

/** Catálogo completo de variables informativas (derivado de variablesCatalog). */
export const INFO_VARS: InfoVar[] = VARIABLES.map(toInfoVar);

/** Lookup individual por id (devuelve `undefined` si no existe). */
export function getInfoVarById(id: string): InfoVar | undefined {
  const v = getVariableById(id);
  return v ? toInfoVar(v) : undefined;
}

/**
 * Convierte un score normalizado [0,1] en un valor "humano" según la unidad
 * de la variable. Sólo placeholder — la conversión real depende del modelo.
 */
export function formatVariableValue(score: number, unit: string): string {
  switch (unit) {
    case "m/s":
      return (3 + score * 9).toFixed(1); // 3.0 – 12.0 m/s
    case "W/m²":
      return Math.round(150 + score * 700).toString(); // 150 – 850 W/m²
    case "m":
      return Math.round(score * 4500).toString(); // 0 – 4500 m
    case "%":
      return (15 + score * 45).toFixed(1); // 15% – 60%
    case "°":
      return (score * 35).toFixed(1); // 0 – 35° pendiente
    case "USD/MWh":
      return Math.round(35 + score * 60).toString(); // 35 – 95 USD/MWh
    case "MUSD":
      return (1 + score * 40).toFixed(1); // 1 – 41 MUSD
    case "km":
      return (score * 80).toFixed(1); // 0 – 80 km
    case "km²":
      return (score * 1500).toFixed(0); // 0 – 1500 km²
    case "kg/m³":
      return (0.9 + score * 0.4).toFixed(2); // 0.90 – 1.30 kg/m³
    case "uds.":
      return Math.round(1 + score * 99).toString(); // 1 – 100 uds.
    case "hab/km²":
      return Math.round(score * 800).toString(); // 0 – 800 hab/km²
    default:
      return (score * 100).toFixed(1); // índice 0–100
  }
}
