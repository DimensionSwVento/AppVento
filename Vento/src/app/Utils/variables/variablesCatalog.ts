/**
 * Catálogo hardcoded de variables del análisis, agrupadas por dimensión.
 * Fuente temporal hasta que el endpoint `GET /api/variables` esté disponible.
 *
 * Origen de la lista: Figura 3 — "Iconografía sugerida para variables" (cliente).
 *
 * `iconKey` tiene formato `lib:name` y mezcla tres fuentes (todas MIT, mismo
 * grid 24×24 y trazo 2 → se ven como un solo set):
 *   - `lucide:<token>` → ícono de `lucide-react` (la mayoría)
 *   - `tabler:<token>` → ícono estilo Tabler dibujado inline en `tablerIcons.tsx`
 *     (para las variables que no tienen equivalente fiel en Lucide)
 *   - `svg:<token>`    → SVG propio dibujado inline en `customIcons.tsx`
 *     (aves en vuelo, pastos marinos, nido, humedal, coral, pendiente —
 *     variables sin equivalente fiel en ninguna librería)
 *
 * La resolución vive en `variableIcons.tsx`. Cambiar el ícono de una variable
 * = cambiar la cadena aquí; no toca catálogo, helper ni consumidores.
 */

export type DimensionId =
  | "ambiental"
  | "tecnica"
  | "economica"
  | "socioeconomica"
  | "regulatoria";

export interface Variable {
  id: string;
  dimension: DimensionId;
  label: string;
  description: string;
  /** Nombre del componente en `lucide-react`. Resolución en `variableIcons.tsx`. */
  iconKey: string;
  /** Si es `true`, arranca activa y su switch no se puede apagar desde la UI. */
  required?: boolean;
}

export interface Dimension {
  id: DimensionId;
  label: string;
}

export const DIMENSIONS: Dimension[] = [
  { id: "ambiental", label: "Dimensión ambiental" },
  { id: "tecnica", label: "Dimensión técnica" },
  { id: "economica", label: "Dimensión económica" },
  { id: "socioeconomica", label: "Dimensión social" },
  { id: "regulatoria", label: "Dimensión regulatoria" },
];

/**
 * Dimensiones que SÍ puntúan en el modelo multicriterio (WLC) — 4 en total
 * (decisión del cliente, feedback item 11 / US-FB3-05). "Regulatoria" queda
 * fuera del cálculo y pasa a mostrarse como información contextual.
 *
 * Fuente única de verdad de la exclusión: el score general (`heatmapPalette`),
 * la lista de barras del informe, el tooltip y el heatmap derivan de aquí.
 */
export const SCORABLE_DIMENSION_IDS: DimensionId[] = [
  "ambiental",
  "tecnica",
  "economica",
  "socioeconomica",
];

/** Dimensiones informativas (no puntúan; se muestran como contexto). */
export const INFORMATIVE_DIMENSION_IDS: DimensionId[] = ["regulatoria"];

/** `true` si la dimensión aporta al score general (WLC). */
export function isScorableDimension(id: DimensionId): boolean {
  return SCORABLE_DIMENSION_IDS.includes(id);
}

export const VARIABLES: Variable[] = [
  // ─── Ambiental ──────────────────────────────────────────────────────
  { id: "especies-endemicas", dimension: "ambiental", label: "Especies endémicas", description: "Presencia de especies endémicas en la zona de interés", iconKey: "lucide:Bird" },
  { id: "especies-migratorias", dimension: "ambiental", label: "Especies migratorias", description: "Rutas y zonas de paso de especies migratorias", iconKey: "lucide:Bird" },
  { id: "especies-iucn", dimension: "ambiental", label: "Especies terrestres y marinas IUCN", description: "Especies catalogadas en la lista roja IUCN", iconKey: "lucide:PawPrint" },
  { id: "aves-playeras", dimension: "ambiental", label: "Congregación de aves playeras", description: "Zonas de concentración estacional de aves playeras", iconKey: "svg:birds3" },
  { id: "pastos-marinos", dimension: "ambiental", label: "Pastos marinos", description: "Áreas con presencia de praderas de pastos marinos", iconKey: "svg:seagrass" },
  { id: "reproduccion-aves", dimension: "ambiental", label: "Zonas de reproducción de aves", description: "Sitios identificados para reproducción de aves", iconKey: "svg:nestBird" },
  { id: "biodiversidad", dimension: "ambiental", label: "Áreas clave para la biodiversidad", description: "KBAs y zonas reconocidas por su valor de biodiversidad", iconKey: "tabler:butterfly" },
  { id: "humedales-ramsar", dimension: "ambiental", label: "Humedales RAMSAR", description: "Humedales designados bajo la convención RAMSAR", iconKey: "svg:cattails" },
  { id: "mares-coralinos", dimension: "ambiental", label: "Mares coralinos", description: "Áreas con presencia de arrecifes coralinos", iconKey: "svg:coral" },
  { id: "playas-tortugas", dimension: "ambiental", label: "Playas de anidación de tortugas", description: "Sitios documentados de anidación de tortugas marinas", iconKey: "lucide:Turtle" },
  { id: "riesgo-fisico", dimension: "ambiental", label: "Riesgo físico relativo", description: "Índice de riesgo físico ambiental relativo de la zona", iconKey: "lucide:TriangleAlert" },
  { id: "amenaza-volcanica", dimension: "ambiental", label: "Amenaza volcánica", description: "Nivel de amenaza por actividad volcánica", iconKey: "tabler:volcano" },
  { id: "uso-suelo", dimension: "ambiental", label: "Uso y cobertura del suelo", description: "Clasificación de cobertura y uso del suelo", iconKey: "lucide:Grid2x2" },
  { id: "fallas-sismicidad", dimension: "ambiental", label: "Fallas y sismicidad", description: "Presencia de fallas geológicas y actividad sísmica", iconKey: "lucide:Activity" },
  { id: "batimetria-offshore", dimension: "ambiental", label: "Batimetría offshore", description: "Profundidad del lecho marino en zonas costa afuera", iconKey: "lucide:Radar" },
  { id: "pendiente-terreno", dimension: "ambiental", label: "Pendiente del terreno", description: "Inclinación promedio del terreno", iconKey: "svg:slope" },
  { id: "litologia", dimension: "ambiental", label: "Litología y fondos marinos", description: "Tipo de roca/sedimento del subsuelo y fondos marinos", iconKey: "lucide:Map" },
  { id: "elevacion", dimension: "ambiental", label: "Elevación", description: "Altitud media sobre el nivel del mar", iconKey: "lucide:MountainSnow" },
  { id: "densidad-aire", dimension: "ambiental", label: "Densidad del aire", description: "Densidad del aire a la altura del rotor", iconKey: "lucide:Wind" },

  // ─── Técnica ────────────────────────────────────────────────────────
  { id: "wpd", dimension: "tecnica", label: "Densidad de potencia WPD", description: "Wind Power Density a la altura del rotor", iconKey: "tabler:windmill", required: true },
  { id: "viento-velocidad", dimension: "tecnica", label: "Velocidad del viento media anualizada", description: "Promedio anual de velocidad del viento", iconKey: "lucide:Wind", required: true },
  { id: "turbulencia", dimension: "tecnica", label: "Turbulencia", description: "Intensidad de turbulencia del viento", iconKey: "lucide:Tornado" },
  { id: "rugosidad", dimension: "tecnica", label: "Longitud de rugosidad", description: "Parámetro de rugosidad superficial del terreno", iconKey: "lucide:WavesHorizontal" },
  { id: "nodos-conexion", dimension: "tecnica", label: "Distancia a nodos de conexión", description: "Distancia a subestaciones y nodos eléctricos", iconKey: "lucide:MapPin" },
  { id: "distancia-vial", dimension: "tecnica", label: "Distancia a infraestructura vial", description: "Distancia a vías principales para logística", iconKey: "tabler:road" },
  { id: "lcoe", dimension: "tecnica", label: "LCOE", description: "Levelized Cost of Energy estimado", iconKey: "lucide:CircleDollarSign" },
  { id: "factor-capacidad", dimension: "tecnica", label: "Factor de capacidad", description: "Factor de capacidad esperado del aerogenerador", iconKey: "lucide:Gauge" },
  { id: "capex-conexion", dimension: "tecnica", label: "CAPEX de conexión", description: "Inversión inicial requerida para la conexión eléctrica", iconKey: "lucide:Plug" },
  { id: "capex-obra-civil", dimension: "tecnica", label: "CAPEX de obra civil", description: "Inversión inicial en obra civil del proyecto", iconKey: "lucide:Building2" },
  { id: "capex-generadores", dimension: "tecnica", label: "CAPEX de generadores", description: "Inversión inicial en aerogeneradores", iconKey: "lucide:Cog" },
  { id: "opex", dimension: "tecnica", label: "OPEX", description: "Costo operativo anual estimado", iconKey: "lucide:Coins" },
  { id: "area-proyecto", dimension: "tecnica", label: "Área de proyecto", description: "Superficie disponible para el desarrollo del proyecto", iconKey: "lucide:LandPlot" },
  { id: "num-aerogeneradores", dimension: "tecnica", label: "Número de aerogeneradores", description: "Cantidad de aerogeneradores prevista en la zona", iconKey: "tabler:windmill" },

  // ─── Económica ──────────────────────────────────────────────────────
  { id: "distancia-poi", dimension: "economica", label: "Distancia a puntos de interés", description: "Distancia a puntos de interés socio-económicos", iconKey: "lucide:MapPin" },
  { id: "distancia-viviendas", dimension: "economica", label: "Distancia lineal a viviendas >50k hab", description: "Distancia a centros poblados de más de 50.000 habitantes", iconKey: "lucide:House" },
  { id: "ipm", dimension: "economica", label: "Índice de pobreza multidimensional", description: "IPM municipal o departamental", iconKey: "lucide:Boxes" },
  { id: "analfabetismo", dimension: "economica", label: "Tasa de analfabetismo", description: "Porcentaje de población analfabeta", iconKey: "lucide:Book" },
  { id: "pobreza-energetica", dimension: "economica", label: "Pobreza energética", description: "Indicador de pobreza energética de la zona", iconKey: "lucide:ZapOff" },
  { id: "estabilidad-juridica", dimension: "economica", label: "Instituciones y estabilidad jurídica", description: "Índice de calidad institucional y estabilidad jurídica", iconKey: "lucide:Scale" },
  { id: "capacidad-gestion", dimension: "economica", label: "Índice de capacidad de gestión", description: "Capacidad de gestión territorial del ente local", iconKey: "lucide:Settings" },
  { id: "ordenamiento-territorial", dimension: "economica", label: "Ordenamiento territorial", description: "Estado del ordenamiento territorial y POT", iconKey: "lucide:Map" },
  { id: "incidencia-delictiva", dimension: "economica", label: "Índice de incidencia delictiva", description: "Índice de incidencia delictiva municipal", iconKey: "lucide:ShieldAlert" },

  // ─── Socioeconómica ─────────────────────────────────────────────────
  { id: "mineria-ilegal", dimension: "socioeconomica", label: "Minería ilegal", description: "Presencia de actividad de minería ilegal en la zona", iconKey: "lucide:Pickaxe" },
  { id: "densidad-poblacional", dimension: "socioeconomica", label: "Densidad poblacional", description: "Número de habitantes por km²", iconKey: "lucide:Users" },
  { id: "cultivos-coca", dimension: "socioeconomica", label: "Densidad de cultivos de coca", description: "Concentración de cultivos ilícitos de coca", iconKey: "lucide:Sprout" },
  { id: "grupos-beligerantes", dimension: "socioeconomica", label: "Presencia de grupos beligerantes", description: "Actividad de grupos armados ilegales", iconKey: "lucide:Swords" },
  { id: "atentados", dimension: "socioeconomica", label: "Atentados terroristas", description: "Histórico de atentados terroristas en la zona", iconKey: "tabler:bomb" },
  { id: "tipologia-territorial", dimension: "socioeconomica", label: "Tipología territorial", description: "Clasificación tipológica del territorio", iconKey: "tabler:bomb" },
  { id: "desempeno-institucional", dimension: "socioeconomica", label: "Desempeño institucional", description: "Índice de desempeño de las instituciones locales", iconKey: "lucide:Landmark" },
  { id: "resguardos-indigenas", dimension: "socioeconomica", label: "Resguardos indígenas", description: "Solapamiento con resguardos indígenas titulados", iconKey: "tabler:tent" },
  { id: "comunidades-negras", dimension: "socioeconomica", label: "Territorios de comunidades negras", description: "Solapamiento con territorios colectivos de comunidades negras", iconKey: "lucide:UsersRound" },
  { id: "reservas-campesinas", dimension: "socioeconomica", label: "Zonas de reservas campesinas", description: "Solapamiento con zonas de reserva campesina", iconKey: "lucide:Wheat" },
  { id: "pdet", dimension: "socioeconomica", label: "PDET", description: "Programas de Desarrollo con Enfoque Territorial vigentes", iconKey: "lucide:Flag" },
  { id: "zomac", dimension: "socioeconomica", label: "ZOMAC", description: "Zonas Más Afectadas por el Conflicto", iconKey: "lucide:MapPinned" },

  // ─── Regulatoria ────────────────────────────────────────────────────
  { id: "tasa-exito-proyectos", dimension: "regulatoria", label: "Tasa de éxito en implementación de proyectos", description: "Histórico de éxito de proyectos energéticos en la zona", iconKey: "lucide:BadgeCheck" },
  { id: "proyectos-xm", dimension: "regulatoria", label: "Proyectos de generación implementados XM", description: "Proyectos de generación implementados según registros XM", iconKey: "lucide:ChartColumn" },
];

export function variablesByDimension(dim: DimensionId): Variable[] {
  return VARIABLES.filter((v) => v.dimension === dim);
}

export function getVariableById(id: string): Variable | undefined {
  return VARIABLES.find((v) => v.id === id);
}

/** Devuelve los ids de las variables marcadas como obligatorias. */
export function requiredVariableIds(): string[] {
  return VARIABLES.filter((v) => v.required).map((v) => v.id);
}
