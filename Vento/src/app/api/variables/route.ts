import { NextResponse } from "next/server";

// Variables de referencia (fallback cuando el backend no está disponible)
const FALLBACK_VARIABLES = [
  {
    dimension: "Ambiental",
    name: "wind_speed_100m",
    label: "Velocidad del viento a 100m",
    definition:
      "Promedio anual de la velocidad del viento medida a 100 metros de altura sobre el nivel del suelo, expresada en m/s. Es el indicador primario del recurso eólico disponible.",
    type: "decision",
  },
  {
    dimension: "Ambiental",
    name: "wind_power_density",
    label: "Densidad de potencia eólica",
    definition:
      "Energía disponible por unidad de área barrida por el rotor (W/m²). Combina la velocidad del viento con la densidad del aire para estimar el potencial energético real del sitio.",
    type: "decision",
  },
  {
    dimension: "Técnica",
    name: "land_cover",
    label: "Cobertura del suelo",
    definition:
      "Clasificación del suelo según la presencia de obstáculos naturales o artificiales (vegetación densa, edificaciones, cuerpos de agua) que pueden afectar la instalación y operación de aerogeneradores.",
    type: "restriction",
  },
  {
    dimension: "Técnica",
    name: "slope",
    label: "Pendiente del terreno",
    definition:
      "Inclinación del terreno expresada en grados o porcentaje. Pendientes elevadas incrementan los costos de construcción y pueden representar riesgos geotécnicos para la cimentación de aerogeneradores.",
    type: "restriction",
  },
  {
    dimension: "Regulatoria",
    name: "protected_areas",
    label: "Áreas protegidas",
    definition:
      "Proximidad o superposición con zonas de conservación ambiental, parques nacionales, reservas forestales o territorios indígenas. La normativa colombiana restringe o prohíbe el desarrollo eólico en estas áreas.",
    type: "restriction",
  },
  {
    dimension: "Regulatoria",
    name: "land_use_zoning",
    label: "Uso del suelo (zonificación)",
    definition:
      "Clasificación oficial del uso permitido del suelo según los Planes de Ordenamiento Territorial (POT) municipales. Determina si la actividad eólica industrial es compatible con la zonificación vigente.",
    type: "decision",
  },
  {
    dimension: "Socioeconómica",
    name: "transmission_distance",
    label: "Distancia a líneas de transmisión",
    definition:
      "Distancia en kilómetros al punto de conexión más cercano de la red de transmisión eléctrica nacional. Una menor distancia reduce significativamente los costos de infraestructura eléctrica del proyecto.",
    type: "decision",
  },
  {
    dimension: "Socioeconómica",
    name: "road_distance",
    label: "Distancia a vías principales",
    definition:
      "Distancia a carreteras primarias o secundarias aptas para el transporte de equipos de gran dimensión (palas, nacelles, torres). Afecta directamente los costos logísticos y la viabilidad constructiva.",
    type: "decision",
  },
  {
    dimension: "Macroeconómica",
    name: "irr_estimate",
    label: "TIR estimada del proyecto",
    definition:
      "Tasa Interna de Retorno estimada del proyecto eólico, calculada a partir del recurso viento, costos de desarrollo, CAPEX, OPEX y precios proyectados de energía. Indicador clave de viabilidad financiera.",
    type: "decision",
  },
  {
    dimension: "Macroeconómica",
    name: "lcoe",
    label: "Costo nivelado de energía (LCOE)",
    definition:
      "Levelized Cost of Energy: costo total del ciclo de vida del proyecto dividido por la energía total generada (USD/MWh). Permite comparar la competitividad económica del proyecto frente a otras fuentes de generación.",
    type: "decision",
  },
];

export async function GET() {
  // Intentar primero el backend FastAPI si está disponible
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/variables`, {
        signal: AbortSignal.timeout(3000), // 3s timeout
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend no disponible — usar fallback local
    }
  }

  // Fallback: devolver variables locales
  return NextResponse.json({ variables: FALLBACK_VARIABLES });
}
