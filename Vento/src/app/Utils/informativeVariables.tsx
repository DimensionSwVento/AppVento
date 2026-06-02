/**
 * Catálogo provisional de "variables informativas" usado por
 * `InformativeVariablesList` y `HexValuesTooltip`.
 *
 * Mientras no exista el sistema de catálogo + selección (US04), este módulo
 * expone una lista fija + ícono + color + función de formateo por unidad.
 * Cuando regrese el sistema completo, reemplazar este módulo por uno que
 * lea del catálogo y del estado de selección.
 */
import {
  Bird,
  CircleDollarSign,
  Fan,
  Fish,
  Gauge,
  Mountain,
  PawPrint,
  Plug,
  TriangleAlert,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface InfoVar {
  id: string;
  label: string;
  unit: string;
  Icon: LucideIcon;
  color: string;
}

export const INFO_VARS: InfoVar[] = [
  {
    id: "viento-velocidad",
    label: "Velocidad del viento",
    unit: "m/s",
    Icon: Wind,
    color: "#165170",
  },
  {
    id: "wpd",
    label: "Densidad de potencia WPD",
    unit: "W/m²",
    Icon: Zap,
    color: "#1e6a8c",
  },
  {
    id: "elevacion",
    label: "Elevación",
    unit: "m",
    Icon: Mountain,
    color: "#2b6fb0",
  },
  {
    id: "factor-capacidad",
    label: "Factor de capacidad",
    unit: "%",
    Icon: Gauge,
    color: "#2f8f4e",
  },
  {
    id: "lcoe",
    label: "LCOE",
    unit: "USD/MWh",
    Icon: CircleDollarSign,
    color: "#6b4e9e",
  },
  {
    id: "nodos-conexion",
    label: "Distancia a nodos de conexión",
    unit: "km",
    Icon: Plug,
    color: "#d4842c",
  },
  {
    id: "num-aerogeneradores",
    label: "Número de aerogeneradores",
    unit: "uds.",
    Icon: Fan,
    color: "#3b5b8c",
  },
  {
    id: "amenaza-volcanica",
    label: "Amenaza volcánica",
    unit: "índice",
    Icon: TriangleAlert,
    color: "#b04848",
  },
  {
    id: "especies-iucn",
    label: "Especies IUCN",
    unit: "índice",
    Icon: PawPrint,
    color: "#2f8f4e",
  },
  {
    id: "especies-endemicas",
    label: "Especies endémicas",
    unit: "índice",
    Icon: Bird,
    color: "#3b8c75",
  },
  {
    id: "mares-coralinos",
    label: "Mares coralinos",
    unit: "índice",
    Icon: Fish,
    color: "#1e6a8c",
  },
];

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
    case "USD/MWh":
      return Math.round(35 + score * 60).toString(); // 35 – 95 USD/MWh
    case "km":
      return (score * 80).toFixed(1); // 0 – 80 km
    case "uds.":
      return Math.round(10 + score * 90).toString(); // 10 – 100 uds.
    default:
      return (score * 100).toFixed(1); // índice 0–100
  }
}
