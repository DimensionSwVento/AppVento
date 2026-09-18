/**
 * Catálogo DEFINITIVO de variables del análisis (Excel del cliente / master).
 *
 * Estructura jerárquica: `Dimensión → Criterio → Subcriterio → Variable`.
 * Se separan dos naturalezas de variable:
 *   - `VARIABLES`               → 61 PONDERADAS (Tabla 1 "Variables_conPesoModelo"):
 *                                  puntúan y entran al cálculo multicriterio (WLC).
 *   - `INFORMATIVE_VARIABLES`   → 30 INFORMATIVAS (Tabla 3 "Informativas"): solo se
 *                                  visualizan/reportan, NO pesan en el modelo.
 * Las 4 CARACTERÍSTICAS (Tabla 2) viven fuera del catálogo (config de proyecto:
 * `CaracteristicasContext` + `projectData.AEROGENERADORES`).
 *
 * IDENTIDAD DE COLUMNA (`masterId`):
 *   Cada variable trae el ID definitivo con el que la master entrega su columna en
 *   el `.h3.parquet` (p.ej. `AMB-005-A`, `TEC-004-T`, `SOC-011-S`). Es la VERDAD de
 *   la fuente; `"NA"` cuando el cliente aún no asignó ID (económicas, AEP…).
 *   El `id` (slug) es la clave ESTABLE de UI: pesos (`variableWeights`), iconos
 *   (`variableIcons`) y estado (`VariablesContext`) se llavean por `id`, no por
 *   `masterId`. Así el slug sobrevive aunque el cliente renumere los códigos.
 *
 * `iconKey` = `lib:name` (`lucide:` | `tabler:` | `svg:`). Un `iconKey` no
 * reconocido degrada a `lucide.Info` sin romper (ver `variableIcons.tsx`).
 */

export type DimensionId =
  | "ambiental"
  | "tecnica"
  | "social"
  | "macroeconomica"
  | "regulatoria";

export interface Variable {
  /** Slug estable de UI (clave de pesos, iconos y estado). */
  id: string;
  /** ID definitivo de columna de la master (`"NA"` si aún sin asignar). */
  masterId: string;
  dimension: DimensionId;
  /** Grupo dentro de la dimensión (Tabla 1). */
  criterio: string;
  /** Subgrupo dentro del criterio (opcional; algunos criterios no lo tienen). */
  subcriterio?: string;
  label: string;
  description: string;
  /** Fuente de datos declarada por el cliente (opcional). */
  fuente?: string;
  /** `true` si la variable se representa en el mapa (columna "en mapa" del Excel). */
  enMapa?: boolean;
  /**
   * Emplazamiento donde APLICA la variable: `"mar"` (offshore) o `"tierra"`
   * (onshore). Ausente = aplica a AMBOS. Sirve para ocultar en el menú las
   * variables que no tienen sentido según la naturaleza de la selección (p.ej.
   * pendiente del terreno en mar). DEDUCIDO por ahora — se ajustará cuando el
   * cliente entregue la clasificación definitiva mar/tierra por variable.
   */
  aplicaEn?: "mar" | "tierra";
  /** Nombre del ícono en formato `lib:name`. Resolución en `variableIcons.tsx`. */
  iconKey: string;
  /** Si es `true`, arranca activa y su switch no se puede apagar desde la UI. */
  required?: boolean;
  /**
   * `true` para las variables OPCIONALES que NO entran al cálculo del modelo
   * (solo informativas). Son las únicas seleccionables en el menú de dimensiones
   * (ver `OPTIONAL_VARIABLES`). Las 61 ponderadas siempre pesan y NO se listan.
   */
  noCalculo?: boolean;
  /**
   * `true` si la variable es EXCLUYENTE: actúa como restricción dura (áreas
   * protegidas, amenazas, territorios de consulta previa) que puede excluir el
   * emplazamiento. Se muestra como tal en el informe (US06-03). Campo servido
   * por la API de variables; el catálogo template lo deriva con `isExcluyente`.
   */
  excluyente?: boolean;
}

/**
 * IDs de variables EXCLUYENTES (template — hasta que la API entregue el flag).
 * Restricciones duras: áreas protegidas, amenazas y territorios de consulta
 * previa. El cliente/administrador ajusta este conjunto.
 */
export const EXCLUYENTE_IDS = new Set<string>([
  // Ambiental · Áreas protegidas
  "reproduccion-aves",
  "biodiversidad",
  "humedales-ramsar",
  "mares-coralinos",
  "playas-tortugas",
  // Ambiental · Amenazas
  "riesgo-fisico",
  "amenaza-volcanica",
  // Social · Sensibilidad sociocultural, étnica y territorial (consulta previa)
  "resguardos-indigenas",
  "comunidades-negras",
  "reservas-campesinas",
]);

/** ¿La variable es excluyente? Usa el flag de la API si viene; si no, el template. */
export function isExcluyente(v: Variable): boolean {
  return v.excluyente ?? EXCLUYENTE_IDS.has(v.id);
}

export interface Dimension {
  id: DimensionId;
  label: string;
  /** Definición corta de la dimensión (tooltip / encabezado). */
  description: string;
}

export const DIMENSIONS: Dimension[] = [
  {
    id: "ambiental",
    label: "Dimensión ambiental",
    description:
      "Variables del medio natural, biótico y abiótico, susceptibles de ser afectadas por infraestructura eólica o que condicionan su idoneidad.",
  },
  {
    id: "tecnica",
    label: "Dimensión técnica",
    description:
      "Criterios que influyen en la selección del lugar desde el aspecto técnico (recurso eólico e infraestructura).",
  },
  {
    id: "social",
    label: "Dimensión social",
    description:
      "Condiciones sociales, culturales y territoriales que influyen en la aceptación, implementación y sostenibilidad del proyecto.",
  },
  {
    id: "macroeconomica",
    label: "Dimensión económica",
    description:
      "Modela la evolución en el tiempo de variables económicas de Colombia.",
  },
  {
    id: "regulatoria",
    label: "Dimensión regulatoria",
    description:
      "Marco regulatorio del proyecto. Pendiente de definición por el cliente (informativa, no puntúa).",
  },
];

/**
 * Dimensiones que SÍ puntúan en el modelo multicriterio (WLC) — 4 en total.
 * "Regulatoria" queda fuera del cálculo y se muestra como información contextual.
 */
export const SCORABLE_DIMENSION_IDS: DimensionId[] = [
  "ambiental",
  "tecnica",
  "social",
  "macroeconomica",
];

/** Dimensiones informativas (no puntúan; se muestran como contexto). */
export const INFORMATIVE_DIMENSION_IDS: DimensionId[] = ["regulatoria"];

/** `true` si la dimensión aporta al score general (WLC). */
export function isScorableDimension(id: DimensionId): boolean {
  return SCORABLE_DIMENSION_IDS.includes(id);
}

/** Descripción corta de cada CRITERIO (grupo). Clave = nombre del criterio. */
export const CRITERIO_DESCRIPTIONS: Record<string, string> = {
  "Variables bióticas":
    "Componentes vivos del ecosistema (flora, fauna, hábitats).",
  "Variables abióticas":
    "Componentes físicos del entorno (geología, relieve, amenazas naturales).",
  "Recurso eólico": "Qué tan bueno es el viento en un lugar.",
  "Infraestructura y red": "Cercanía a infraestructura clave.",
  Económico: "Condiciones de desarrollo y vulnerabilidad económica del territorio.",
  Social:
    "Condiciones sociales, energéticas, institucionales, de seguridad y territoriales.",
  Proyecciones:
    "Proyecciones temporales de variables económicas y del sector energético.",
};

/** Descripción corta de cada SUBCRITERIO (subgrupo). Clave = nombre del subcriterio. */
export const SUBCRITERIO_DESCRIPTIONS: Record<string, string> = {
  "Especies bióticas":
    "Presencia, distribución y conservación de fauna y flora (endémicas, migratorias o amenazadas).",
  "Áreas protegidas":
    "Espacios declarados legalmente para conservación.",
  Amenazas:
    "Exposición a riesgos naturales (deslizamientos, inundaciones, sismos, huracanes, tsunamis, vulcanismo).",
  "Condiciones geológicas y geotécnicas":
    "idoneidad del suelo y subsuelo para implantar parques.",
  "Distancia a puntos de interés": "Cercanía a atractivos y centros poblados.",
  "Condiciones de vida": "Pobreza, educación y acceso a energía.",
  "Instituciones (estabilidad jurídica)":
    "Instrumentos de planeación y estabilidad jurídica del territorio.",
  "Vulnerabilidad social":
    "Condiciones socioeconómicas y demográficas de vulnerabilidad.",
  "Brecha energética y asequibilidad":
    "Acceso, tarifa e interconexión al servicio de energía.",
  "Riesgo en seguridad, delictividad y conflicto armado":
    "Presencia de actores armados, ilícitos y delincuencia.",
  "Falta de gobernanza, institucionalidad y riesgo político":
    "Desempeño institucional y tipología del territorio.",
  "Sensibilidad sociocultural, étnica y territorial":
    "Solapamiento con territorios étnicos y figuras de ordenamiento social.",
  General: "Indicadores macroeconómicos generales del país.",
  "Sector energético": "Proyecciones del mercado eléctrico.",
};

// ════════════════════════════════════════════════════════════════════════
//  TABLA 1 — VARIABLES PONDERADAS (61) · puntúan en el modelo (WLC)
// ════════════════════════════════════════════════════════════════════════
export const VARIABLES: Variable[] = [
  // ─── AMBIENTAL · Bióticas · Especies bióticas (7) ───────────────────────
  { id: "especies-endemicas", masterId: "AMB-005-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Especies bióticas", label: "Especies endémicas", description: "Ocurrencias de vertebrados que se distribuyen únicamente en Colombia.", fuente: "Instituto Von Humboldt", iconKey: "lucide:Bird" },
  { id: "especies-migratorias", masterId: "AMB-003-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Especies bióticas", label: "Especies migratorias", description: "Ocurrencias georreferenciadas de especies migratorias presentes en Colombia.", fuente: "GBIF", iconKey: "lucide:Bird" },
  { id: "especies-marinas-iucn", masterId: "AMB-019-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Especies bióticas", label: "Especies marinas IUCN", description: "Ocurrencias georreferenciadas de especies marinas presentes en Colombia listadas por la UICN.", fuente: "GBIF", aplicaEn: "mar", iconKey: "lucide:Fish" },
  { id: "especies-aves-iucn", masterId: "AMB-017-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Especies bióticas", label: "Especies aves IUCN", description: "Especies de aves presentes en Colombia listadas por la UICN.", fuente: "GBIF", iconKey: "lucide:Bird" },
  { id: "especies-murcielagos-iucn", masterId: "AMB-042-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Especies bióticas", label: "Especies murciélagos IUCN", description: "Ocurrencias georreferenciadas de murciélagos presentes en Colombia listados por la UICN.", fuente: "GBIF", iconKey: "lucide:PawPrint" },
  { id: "aves-playeras", masterId: "AMB-038-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Especies bióticas", label: "Congregación de aves playeras", description: "Ocurrencias de congregación de aves playeras.", fuente: "IGAC", iconKey: "svg:birds3" },
  { id: "pastos-marinos", masterId: "AMB-020-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Especies bióticas", label: "Pastos marinos", description: "Zonas con ecosistemas de pastos marinos.", fuente: "INVEMAR", aplicaEn: "mar", iconKey: "svg:seagrass" },

  // ─── AMBIENTAL · Bióticas · Áreas protegidas (5) · todas en mapa ─────────
  { id: "reproduccion-aves", masterId: "AMB-034-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Áreas protegidas", label: "Zonas de reproducción de aves", description: "Sitios identificados para reproducción de aves.", fuente: "IGAC", enMapa: true, iconKey: "svg:nestBird" },
  { id: "biodiversidad", masterId: "AMB-033-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Áreas protegidas", label: "Áreas clave para la biodiversidad", description: "Zonas legalmente designadas para la conservación de la biodiversidad.", fuente: "(sin definir)", enMapa: true, iconKey: "tabler:butterfly" },
  { id: "humedales-ramsar", masterId: "AMB-012-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Áreas protegidas", label: "Humedales RAMSAR", description: "Ubicación de los humedales RAMSAR en Colombia.", fuente: "(sin definir)", enMapa: true, iconKey: "svg:cattails" },
  { id: "mares-coralinos", masterId: "AMB-021-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Áreas protegidas", label: "Áreas coralinas", description: "Áreas con presencia de arrecifes coralinos.", fuente: "INVEMAR", enMapa: true, aplicaEn: "mar", iconKey: "svg:coral" },
  { id: "playas-tortugas", masterId: "AMB-036-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Áreas protegidas", label: "Playas de anidación de tortugas", description: "Sitios documentados de anidación de tortugas marinas.", fuente: "INVEMAR", enMapa: true, aplicaEn: "mar", iconKey: "lucide:Turtle" },

  // ─── AMBIENTAL · Abióticas · Amenazas (2) ───────────────────────────────
  { id: "riesgo-fisico", masterId: "AMB-040-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Amenazas", label: "Riesgo físico relativo", description: "Índice de riesgo de la UNGRD para estimar amenaza y vulnerabilidad municipal a inundaciones, sismos, tsunamis y huracanes. También referenciado como TEC-015.", fuente: "UNGRD", iconKey: "lucide:TriangleAlert" },
  { id: "amenaza-volcanica", masterId: "TEC-016", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Amenazas", label: "Amenaza volcánica", description: "Escala de riesgo por caída de ceniza, flujos piroclásticos, lahares y ondas de choque.", aplicaEn: "tierra", iconKey: "tabler:volcano" },

  // ─── AMBIENTAL · Abióticas · Condiciones geológicas y geotécnicas (6) ────
  { id: "uso-suelo", masterId: "AMB-006-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Uso y cobertura del suelo", description: "Distribución de las coberturas del suelo (Corine Land Cover) en Colombia.", fuente: "IGAC", aplicaEn: "tierra", iconKey: "lucide:Grid2x2" },
  { id: "fallas-sismicidad", masterId: "AMB-031-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Fallas y sismicidad", description: "Presencia de zonas de fallas.", fuente: "IGAC", iconKey: "lucide:Activity" },
  { id: "batimetria-offshore", masterId: "AMB-030-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Batimetría para cimentación offshore", description: "Profundidad del lecho marino para cimentación costa afuera.", fuente: "NOAA", aplicaEn: "mar", iconKey: "lucide:Radar" },
  { id: "pendiente-terreno", masterId: "AMB-007-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Pendiente del terreno", description: "Inclinación del terreno; factor de estabilidad ecológica.", fuente: "Investigación interna EAFIT y aliados", aplicaEn: "tierra", iconKey: "svg:slope" },
  { id: "litologia", masterId: "AMB-028-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Litología y fondos marinos", description: "Composición litológica del suelo y del fondo marino. El cliente la divide en AMB-028-AT (suelos) y AMB-029-AT (fondos marinos).", fuente: "INVEMAR", iconKey: "lucide:Map" },
  { id: "elevacion", masterId: "AMB-008-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Elevación", description: "Altitud media sobre el nivel del mar.", fuente: "NASA", aplicaEn: "tierra", iconKey: "lucide:MountainSnow" },

  // ─── TÉCNICA · Recurso eólico (1) ───────────────────────────────────────
  { id: "wpd", masterId: "TEC-004-T", dimension: "tecnica", criterio: "Recurso eólico", label: "Densidad de potencia WPD", description: "Medida cualitativa de la energía del viento en un punto, calculada a las mismas alturas que la velocidad.", iconKey: "tabler:windmill", required: true },

  // ─── TÉCNICA · Infraestructura y red (3) · las 3 en mapa ─────────────────
  { id: "nodos-conexion", masterId: "TEC-023-T", dimension: "tecnica", criterio: "Infraestructura y red", label: "Distancia a nodos de conexión", description: "Distancia lineal (m) a nodos del SIN.", enMapa: true, iconKey: "lucide:MapPin" },
  { id: "distancia-vial", masterId: "TEC-032-T", dimension: "tecnica", criterio: "Infraestructura y red", label: "Distancia a infraestructura vial", description: "Distancia lineal (m) a vías principales (escala 1 a 5).", enMapa: true, iconKey: "tabler:road" },
  { id: "distancia-portuaria", masterId: "TEC-031-T", dimension: "tecnica", criterio: "Infraestructura y red", label: "Distancia a infraestructura portuaria", description: "Distancia lineal (m) a grandes centros portuarios.", enMapa: true, iconKey: "lucide:Anchor" },

  // ─── SOCIAL · Económico · Distancia a puntos de interés (2) ──────────────
  { id: "dist-atractivo-turistico", masterId: "SOE-001", dimension: "social", criterio: "Económico", subcriterio: "Distancia a puntos de interés", label: "Distancia al primer atractivo turístico", description: "Distancia mínima al primer atractivo turístico.", iconKey: "lucide:Camera" },
  { id: "tiempo-centro-poblado", masterId: "SOE-002", dimension: "social", criterio: "Económico", subcriterio: "Distancia a puntos de interés", label: "Tiempo al centro poblado ≥50k hab.", description: "Tiempo mínimo al centro poblado de 50.000 habitantes o más.", iconKey: "lucide:Clock" },

  // ─── SOCIAL · Económico · Condiciones de vida (3) ───────────────────────
  { id: "pobreza-multidimensional", masterId: "SOE-003", dimension: "social", criterio: "Económico", subcriterio: "Condiciones de vida", label: "Pobreza multidimensional", description: "Índice de pobreza multidimensional del territorio.", iconKey: "lucide:Boxes" },
  { id: "analfabetismo-soe", masterId: "SOE-004", dimension: "social", criterio: "Económico", subcriterio: "Condiciones de vida", label: "Tasa de analfabetismo", description: "Porcentaje de población analfabeta (criterio económico).", iconKey: "lucide:Book" },
  { id: "pobreza-energetica", masterId: "SOE-005", dimension: "social", criterio: "Económico", subcriterio: "Condiciones de vida", label: "Pobreza energética", description: "Indicador de pobreza energética de la zona.", iconKey: "lucide:ZapOff" },

  // ─── SOCIAL · Económico · Instituciones (estabilidad jurídica) (1) ──────
  { id: "iot", masterId: "SOE-006", dimension: "social", criterio: "Económico", subcriterio: "Instituciones (estabilidad jurídica)", label: "Instrumentos de ordenamiento territorial (IOT)", description: "Estado de los instrumentos de ordenamiento territorial y POT.", iconKey: "lucide:Map" },

  // ─── SOCIAL · Social · Vulnerabilidad social (8) ────────────────────────
  { id: "desocupados", masterId: "SOC-001-SE", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Tasa de desocupados", description: "Porcentaje de la población económicamente activa sin empleo; valores altos sugieren mayor vulnerabilidad laboral.", iconKey: "lucide:UserX" },
  { id: "densidad-poblacional", masterId: "SOC-002-S", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Proyección de densidad poblacional", description: "Estimación de habitantes por unidad de área; identifica presión demográfica y concentración poblacional.", iconKey: "lucide:Users" },
  { id: "distancia-viviendas", masterId: "SOC-007-S", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Distancia de viviendas a centros urbanos", description: "Distancia relativa de viviendas a cabeceras y centros urbanos; valores altos indican menor accesibilidad.", iconKey: "lucide:House" },
  { id: "ipm", masterId: "SOC-008-SE", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Índice de pobreza multidimensional (IPM)", description: "Indicador que sintetiza privaciones en educación, salud, vivienda, trabajo y condiciones de vida.", iconKey: "lucide:Boxes" },
  { id: "analfabetismo", masterId: "SOC-012-S", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Tasa de analfabetismo", description: "Proporción de población que no sabe leer ni escribir; valores altos reflejan mayores barreras educativas.", iconKey: "lucide:Book" },
  { id: "hogares-municipio", masterId: "SOC-034-S", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Hogares por municipio", description: "Número de hogares registrados en el municipio; aproxima escala social y demanda potencial de atención.", iconKey: "lucide:Home" },
  { id: "pobreza-monetaria", masterId: "SOC-035-SE", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Índice de pobreza monetaria", description: "Proporción de población con ingresos por debajo de la línea de pobreza monetaria.", iconKey: "lucide:CircleDollarSign" },
  { id: "tipologia-territorial", masterId: "SOC-036-SE", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Tipología territorial", description: "Clasificación del municipio según características territoriales, funcionales o de desarrollo.", iconKey: "lucide:MapPinned" },

  // ─── SOCIAL · Social · Brecha energética y asequibilidad (3) ────────────
  { id: "tarifa-energia", masterId: "SOC-010-TSE", dimension: "social", criterio: "Social", subcriterio: "Brecha energética y asequibilidad", label: "Tarifa de energía por comercializador", description: "Costo de la energía eléctrica cobrado por el comercializador; permite estimar la asequibilidad del servicio.", iconKey: "lucide:Zap" },
  { id: "ipm-energetica", masterId: "SOC-038-TSE", dimension: "social", criterio: "Social", subcriterio: "Brecha energética y asequibilidad", label: "IPM energética", description: "Indicador de privaciones relacionadas con acceso, calidad, uso y asequibilidad de la energía.", iconKey: "lucide:ZapOff" },
  { id: "zni", masterId: "SOC-009-TS", dimension: "social", criterio: "Social", subcriterio: "Brecha energética y asequibilidad", label: "Zona no interconectada", description: "Identifica municipios o áreas sin conexión al Sistema Interconectado Nacional.", iconKey: "lucide:PlugZap" },

  // ─── SOCIAL · Social · Riesgo en seguridad, delictividad y conflicto (5) ─
  { id: "grupos-beligerantes", masterId: "SOC-011-S", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Presencia de grupos beligerantes", description: "Señala presencia o influencia de actores armados o grupos ilegales en el territorio.", iconKey: "lucide:Swords" },
  { id: "cultivos-coca", masterId: "SOC-015-SR", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Densidad de cultivos de coca", description: "Medida de concentración de cultivos de coca; aproxima exposición a economías ilegales.", iconKey: "lucide:Sprout" },
  { id: "mineria-ilegal", masterId: "SOC-018-AE", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Minería ilegal", description: "Identifica presencia o afectación asociada a minería ilegal.", iconKey: "lucide:Pickaxe" },
  { id: "reclutamiento-menores", masterId: "SOC-031-S", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Reclutamiento de menores de 18", description: "Registra eventos o riesgo de reclutamiento de niños, niñas y adolescentes.", iconKey: "lucide:UserMinus" },
  { id: "incidencia-delictiva", masterId: "SOC-041-S", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Índice de incidencia delictiva", description: "Sintetiza la ocurrencia relativa de delitos relevantes para el análisis de seguridad.", iconKey: "lucide:ShieldAlert" },

  // ─── SOCIAL · Social · Falta de gobernanza, institucionalidad y riesgo político (2) ─
  { id: "desempeno-institucional", masterId: "SOC-023-SER", dimension: "social", criterio: "Social", subcriterio: "Falta de gobernanza, institucionalidad y riesgo político", label: "Índice de desempeño institucional", description: "Mide la capacidad de gestión, resultados y desempeño de la administración municipal.", iconKey: "lucide:Landmark" },
  // ⚠️ Tipología territorial aparece DOS veces en el Excel del cliente (SOC-036-SE):
  //    en "Vulnerabilidad social" y aquí. Se conserva el duplicado (posible doble
  //    peso a revisar con el cliente). Mismo masterId, slug distinto.
  { id: "tipologia-territorial-gob", masterId: "SOC-036-SE", dimension: "social", criterio: "Social", subcriterio: "Falta de gobernanza, institucionalidad y riesgo político", label: "Tipología territorial", description: "Clasificación territorial para aproximar capacidades, ruralidad, centralidad o rezagos institucionales.", iconKey: "lucide:Landmark" },

  // ─── SOCIAL · Social · Sensibilidad sociocultural, étnica y territorial (5) ─
  { id: "resguardos-indigenas", masterId: "SOC-013-SR", dimension: "social", criterio: "Social", subcriterio: "Sensibilidad sociocultural, étnica y territorial", label: "Resguardos indígenas", description: "Identifica presencia de resguardos indígenas y posibles necesidades de consulta, coordinación y enfoque diferencial.", enMapa: true, iconKey: "tabler:tent" },
  { id: "reservas-campesinas", masterId: "SOC-016-SR", dimension: "social", criterio: "Social", subcriterio: "Sensibilidad sociocultural, étnica y territorial", label: "Zonas de reserva campesina", description: "Señala territorios con figura de reserva campesina y dinámicas organizativas rurales.", iconKey: "lucide:Wheat" },
  { id: "comunidades-negras", masterId: "SOC-032-S", dimension: "social", criterio: "Social", subcriterio: "Sensibilidad sociocultural, étnica y territorial", label: "Territorios de comunidades negras", description: "Identifica territorios colectivos de comunidades negras y posibles procesos de participación diferenciada.", iconKey: "lucide:UsersRound" },
  { id: "zomac", masterId: "SOC-039-SR", dimension: "social", criterio: "Social", subcriterio: "Sensibilidad sociocultural, étnica y territorial", label: "ZOMAC", description: "Municipios definidos como Zonas Más Afectadas por el Conflicto Armado.", iconKey: "lucide:MapPinned" },
  { id: "pdet", masterId: "SOC-040-SER", dimension: "social", criterio: "Social", subcriterio: "Sensibilidad sociocultural, étnica y territorial", label: "PDET", description: "Municipios con Programas de Desarrollo con Enfoque Territorial; refleja condiciones históricas de conflicto y necesidades de articulación.", iconKey: "lucide:Flag" },

  // ─── económica · Proyecciones · General (5) · sin IDs de la master ──
  { id: "pib", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", subcriterio: "General", label: "PIB", description: "Proyección del Producto Interno Bruto.", iconKey: "lucide:TrendingUp" },
  { id: "pib-per-capita", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", subcriterio: "General", label: "PIB per cápita", description: "Proyección del PIB por habitante.", iconKey: "lucide:TrendingUp" },
  { id: "ipc", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", subcriterio: "General", label: "IPC", description: "Proyección del Índice de Precios al Consumidor.", iconKey: "lucide:Percent" },
  { id: "desempleo", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", subcriterio: "General", label: "Desempleo", description: "Proyección de la tasa de desempleo.", iconKey: "lucide:UserX" },
  { id: "tasa-cambio", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", subcriterio: "General", label: "Tasa de cambio (COP-USD)", description: "Proyección de la tasa de cambio peso-dólar.", iconKey: "lucide:DollarSign" },

  // ─── económica · Proyecciones · Sector energético (3) · sin IDs ─────
  { id: "precio-spot", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", subcriterio: "Sector energético", label: "Precio spot (COP/kWh)", description: "Proyección del precio spot de la energía.", iconKey: "lucide:LineChart" },
  { id: "demanda-energia", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", subcriterio: "Sector energético", label: "Demanda de energía (kWh)", description: "Proyección de la demanda de energía.", iconKey: "lucide:Zap" },
  { id: "oferta-energia", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", subcriterio: "Sector energético", label: "Oferta de energía (kWh)", description: "Proyección de la oferta de energía.", iconKey: "lucide:Plug" },

  // ─── REGULATORIA ────────────────────────────────────────────────────────
  // Sin variables: el cliente la declaró como "Falta" (pendiente). La dimensión
  // existe pero es informativa y hoy no aporta variables al modelo.
];

// ════════════════════════════════════════════════════════════════════════
//  TABLA 3 — VARIABLES INFORMATIVAS (30) · solo visualización, NO pesan
// ════════════════════════════════════════════════════════════════════════
export interface InformativeVariable {
  masterId: string;
  dimension: DimensionId;
  label: string;
  description: string;
  /** `true` si se representa en el mapa. */
  enMapa?: boolean;
  /** Idea de visualización sugerida por el cliente (opcional). */
  visualizacion?: string;
}

export const INFORMATIVE_VARIABLES: InformativeVariable[] = [
  // ─── Técnica (4) ────────────────────────────────────────────────────────
  { masterId: "TEC-001-T", dimension: "tecnica", label: "Velocidad del viento media anualizada", description: "Velocidad media del viento a distintas alturas (10, 50, 100, 150, 200 m).", enMapa: true, visualizacion: "Mapa de calor + valor numérico promedio del polígono; selector de altura del buje." },
  { masterId: "TEC-002-T", dimension: "tecnica", label: "Densidad de viento", description: "Densidad del aire/viento a las mismas alturas que la velocidad.", enMapa: true, visualizacion: "Mapa de calor + valor promedio del polígono." },
  { masterId: "TEC-005-TE", dimension: "tecnica", label: "Turbulencia", description: "Clasificación IEC según intensidad turbulenta (12%, 14%, 16%).", visualizacion: "Mapa de categorías discretas." },
  { masterId: "NA", dimension: "tecnica", label: "AEP", description: "Energía anual generada, calculada en el software a partir de Weibull (TEC-003), densidad (TEC-002) y perfiles de aerogeneradores.", visualizacion: "Valor numérico único en informe o tooltip." },

  // ─── Social (19) · 3 propias + 16 repetidas de la Tabla 1 ───────────────
  { masterId: "SOC-024-S", dimension: "social", label: "Diversidad religiosa", description: "Encuesta nacional de diversidad religiosa 2019.", visualizacion: "Escala de color según %." },
  { masterId: "SOC-005-S", dimension: "social", label: "Inclinaciones políticas", description: "Consulta nacional de política: ideología por la que votan los ciudadanos.", visualizacion: "Escala de color según %." },
  { masterId: "SOC-004-SR", dimension: "social", label: "Riesgo electoral", description: "Factores indicativos de fraude electoral y de violencia.", visualizacion: "Escala ascendente por cuartiles; en el informe, gráfica que ubica la zona frente al resto." },
  { masterId: "SOC-001-SE", dimension: "social", label: "Tasa de desocupados", description: "Tasa de desocupación de la población (repetida de la Tabla 1)." },
  { masterId: "SOC-002-S", dimension: "social", label: "Proyección de densidad poblacional", description: "Habitantes por km² proyectado (repetida de la Tabla 1)." },
  { masterId: "SOC-007-S", dimension: "social", label: "Distancia de viviendas a centros urbanos", description: "Distancia lineal de viviendas a centros urbanos (repetida de la Tabla 1)." },
  { masterId: "SOC-008-SE", dimension: "social", label: "Índice de pobreza multidimensional (IPM)", description: "IPM municipal o departamental (repetida de la Tabla 1)." },
  { masterId: "SOC-035-SE", dimension: "social", label: "Índice de pobreza monetaria", description: "Índice de pobreza monetaria (repetida de la Tabla 1)." },
  { masterId: "SOC-010-TSE", dimension: "social", label: "Tarifa de energía por comercializador", description: "Tarifa de energía según comercializador (repetida de la Tabla 1)." },
  { masterId: "SOC-038-TSE", dimension: "social", label: "IPM energética", description: "IPM energética (repetida de la Tabla 1)." },
  { masterId: "SOC-009-TS", dimension: "social", label: "Zona no interconectada", description: "Pertenencia a ZNI (repetida de la Tabla 1)." },
  { masterId: "SOC-011-S", dimension: "social", label: "Presencia de grupos beligerantes", description: "Actividad de grupos armados ilegales (repetida de la Tabla 1)." },
  { masterId: "SOC-015-SR", dimension: "social", label: "Densidad de cultivos de coca", description: "Concentración de cultivos ilícitos de coca (repetida de la Tabla 1)." },
  { masterId: "SOC-018-AE", dimension: "social", label: "Minería ilegal", description: "Presencia de minería ilegal (repetida de la Tabla 1)." },
  { masterId: "SOC-041-S", dimension: "social", label: "Índice de incidencia delictiva", description: "Incidencia delictiva municipal (repetida de la Tabla 1)." },
  { masterId: "SOC-023-SER", dimension: "social", label: "Índice de desempeño institucional", description: "Desempeño de las instituciones locales (repetida de la Tabla 1)." },
  { masterId: "SOC-013-SR", dimension: "social", label: "Resguardos indígenas", description: "Solapamiento con resguardos indígenas (repetida de la Tabla 1).", enMapa: true },
  { masterId: "SOC-016-SR", dimension: "social", label: "Zonas de reserva campesina", description: "Solapamiento con zonas de reserva campesina (repetida de la Tabla 1)." },
  { masterId: "SOC-032-S", dimension: "social", label: "Territorios de comunidades negras", description: "Solapamiento con territorios de comunidades negras (repetida de la Tabla 1)." },

  // ─── económica (1) ─────────────────────────────────────────────────
  { masterId: "NA", dimension: "macroeconomica", label: "Proyección precio spot energía", description: "Proyección a 10 años del precio del kWh negociado en bolsa.", visualizacion: "Serie de tiempo en el informe (sin mapa)." },

  // ─── Ambiental (6) ──────────────────────────────────────────────────────
  { masterId: "AMB-006", dimension: "ambiental", label: "Uso y cobertura del suelo", description: "Clasificación de cobertura y uso del suelo." },
  { masterId: "AMB-038-A", dimension: "ambiental", label: "Congregación de aves playeras", description: "Zonas de concentración estacional de aves playeras." },
  { masterId: "AMB-034-A", dimension: "ambiental", label: "Zonas de reproducción de aves", description: "Sitios identificados para reproducción de aves." },
  { masterId: "NA", dimension: "ambiental", label: "Amenazas volcánicas", description: "Presencia de volcanes (sin ID asignado por el cliente)." },
  { masterId: "AMB-008-A", dimension: "ambiental", label: "Elevación", description: "Altitud media sobre el nivel del mar." },
  { masterId: "AMB-030-A", dimension: "ambiental", label: "Batimetría", description: "Profundidad del lecho marino." },

  // ─── Regulatoria ── "Falta" (pendiente por el cliente) ──────────────────
];

export function variablesByDimension(dim: DimensionId): Variable[] {
  return VARIABLES.filter((v) => v.dimension === dim);
}

/**
 * ════════════════════════════════════════════════════════════════════════
 *  VARIABLES OPCIONALES (seleccionables por el usuario en el menú)
 * ════════════════════════════════════════════════════════════════════════
 * Reflejan la Tabla 3 "Informativas" COMPLETA (30) convertidas a `Variable`
 * para que el usuario pueda activarlas/verlas desde el menú. TODAS llevan
 * `noCalculo: true`: 22 de ellas comparten `masterId` con una de las 61
 * ponderadas (y por tanto SÍ pesan en el modelo a través de su versión en
 * `VARIABLES`) — aquí solo se agrega la tarjeta informativa, no vuelve a
 * sumar peso. Las otras 8 no tienen contraparte ponderada (dato exclusivo
 * de la hoja Informativas). `masterId` `"NA"` = se calcula en el software o
 * sin columna asignada por el cliente.
 */
export const OPTIONAL_VARIABLES: Variable[] = [
  // ─── Técnica · Recurso eólico (4) — sin contraparte ponderada ───────────
  { id: "velocidad-viento", masterId: "TEC-001-T", dimension: "tecnica", criterio: "Recurso eólico", label: "Velocidad del viento media anualizada", description: "Velocidad media del viento a distintas alturas (10, 50, 100, 150, 200 m).", enMapa: true, noCalculo: true, iconKey: "lucide:Wind" },
  { id: "densidad-viento", masterId: "TEC-002-T", dimension: "tecnica", criterio: "Recurso eólico", label: "Densidad de viento", description: "Densidad del aire/viento a las mismas alturas que la velocidad.", enMapa: true, noCalculo: true, iconKey: "lucide:Gauge" },
  { id: "turbulencia", masterId: "TEC-005-TE", dimension: "tecnica", criterio: "Recurso eólico", label: "Turbulencia", description: "Clasificación IEC según intensidad turbulenta (12%, 14%, 16%).", noCalculo: true, iconKey: "lucide:Tornado" },
  { id: "aep", masterId: "NA", dimension: "tecnica", criterio: "Recurso eólico", label: "AEP (energía anual generada)", description: "Energía anual estimada por el software a partir de Weibull, densidad y perfiles de aerogenerador.", noCalculo: true, iconKey: "lucide:Zap" },

  // ─── Social (3) — sin contraparte ponderada ─────────────────────────────
  { id: "diversidad-religiosa", masterId: "SOC-024-S", dimension: "social", criterio: "Social", label: "Diversidad religiosa", description: "Resultados de la encuesta nacional de diversidad religiosa 2019.", noCalculo: true, iconKey: "lucide:Users" },
  { id: "inclinaciones-politicas", masterId: "SOC-005-S", dimension: "social", criterio: "Social", label: "Inclinaciones políticas", description: "Ideología política predominante según la consulta nacional.", noCalculo: true, iconKey: "lucide:Vote" },
  { id: "riesgo-electoral", masterId: "SOC-004-SR", dimension: "social", criterio: "Social", label: "Riesgo electoral", description: "Indicadores de riesgo de fraude electoral y de violencia.", noCalculo: true, iconKey: "lucide:TriangleAlert" },

  // ─── Económica (1) — sin contraparte ponderada ──────────────────────────
  { id: "proyeccion-precio-spot", masterId: "NA", dimension: "macroeconomica", criterio: "Proyecciones", label: "Proyección precio spot energía", description: "Proyección a 10 años del precio del kWh negociado en bolsa.", noCalculo: true, iconKey: "lucide:TrendingUp" },

  // ═══ A partir de aquí: duplican masterId con VARIABLES (ya pesan; esto es solo la tarjeta informativa) ═══

  // ─── Social · Vulnerabilidad social (5) ──────────────────────────────────
  { id: "desocupados-info", masterId: "SOC-001-SE", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Tasa de desocupados", description: "Tasa de desocupación de la población.", noCalculo: true, iconKey: "lucide:UserX" },
  { id: "densidad-poblacional-info", masterId: "SOC-002-S", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Proyección de densidad poblacional", description: "Habitantes por km² proyectado.", noCalculo: true, iconKey: "lucide:Users" },
  { id: "distancia-viviendas-info", masterId: "SOC-007-S", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Distancia de viviendas a centros urbanos", description: "Distancia lineal de viviendas a centros urbanos.", noCalculo: true, iconKey: "lucide:House" },
  { id: "ipm-info", masterId: "SOC-008-SE", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Índice de pobreza multidimensional (IPM)", description: "IPM municipal o departamental.", noCalculo: true, iconKey: "lucide:Boxes" },
  { id: "pobreza-monetaria-info", masterId: "SOC-035-SE", dimension: "social", criterio: "Social", subcriterio: "Vulnerabilidad social", label: "Índice de pobreza monetaria", description: "Índice de pobreza monetaria.", noCalculo: true, iconKey: "lucide:CircleDollarSign" },

  // ─── Social · Brecha energética y asequibilidad (3) ──────────────────────
  { id: "tarifa-energia-info", masterId: "SOC-010-TSE", dimension: "social", criterio: "Social", subcriterio: "Brecha energética y asequibilidad", label: "Tarifa de energía por comercializador", description: "Tarifa de energía según comercializador.", noCalculo: true, iconKey: "lucide:Zap" },
  { id: "ipm-energetica-info", masterId: "SOC-038-TSE", dimension: "social", criterio: "Social", subcriterio: "Brecha energética y asequibilidad", label: "IPM energética", description: "IPM energética.", noCalculo: true, iconKey: "lucide:ZapOff" },
  { id: "zni-info", masterId: "SOC-009-TS", dimension: "social", criterio: "Social", subcriterio: "Brecha energética y asequibilidad", label: "Zona no interconectada", description: "Pertenencia a ZNI.", noCalculo: true, iconKey: "lucide:PlugZap" },

  // ─── Social · Riesgo en seguridad, delictividad y conflicto armado (4) ───
  { id: "grupos-beligerantes-info", masterId: "SOC-011-S", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Presencia de grupos beligerantes", description: "Actividad de grupos armados ilegales.", noCalculo: true, iconKey: "lucide:Swords" },
  { id: "cultivos-coca-info", masterId: "SOC-015-SR", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Densidad de cultivos de coca", description: "Concentración de cultivos ilícitos de coca.", noCalculo: true, iconKey: "lucide:Sprout" },
  { id: "mineria-ilegal-info", masterId: "SOC-018-AE", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Minería ilegal", description: "Presencia de minería ilegal.", noCalculo: true, iconKey: "lucide:Pickaxe" },
  { id: "incidencia-delictiva-info", masterId: "SOC-041-S", dimension: "social", criterio: "Social", subcriterio: "Riesgo en seguridad, delictividad y conflicto armado", label: "Índice de incidencia delictiva", description: "Incidencia delictiva municipal.", noCalculo: true, iconKey: "lucide:ShieldAlert" },

  // ─── Social · Falta de gobernanza, institucionalidad y riesgo político (1) ─
  { id: "desempeno-institucional-info", masterId: "SOC-023-SER", dimension: "social", criterio: "Social", subcriterio: "Falta de gobernanza, institucionalidad y riesgo político", label: "Índice de desempeño institucional", description: "Desempeño de las instituciones locales.", noCalculo: true, iconKey: "lucide:Landmark" },

  // ─── Social · Sensibilidad sociocultural, étnica y territorial (3) ───────
  { id: "resguardos-indigenas-info", masterId: "SOC-013-SR", dimension: "social", criterio: "Social", subcriterio: "Sensibilidad sociocultural, étnica y territorial", label: "Resguardos indígenas", description: "Solapamiento con resguardos indígenas.", enMapa: true, noCalculo: true, iconKey: "tabler:tent" },
  { id: "reservas-campesinas-info", masterId: "SOC-016-SR", dimension: "social", criterio: "Social", subcriterio: "Sensibilidad sociocultural, étnica y territorial", label: "Zonas de reserva campesina", description: "Solapamiento con zonas de reserva campesina.", noCalculo: true, iconKey: "lucide:Wheat" },
  { id: "comunidades-negras-info", masterId: "SOC-032-S", dimension: "social", criterio: "Social", subcriterio: "Sensibilidad sociocultural, étnica y territorial", label: "Territorios de comunidades negras", description: "Solapamiento con territorios de comunidades negras.", noCalculo: true, iconKey: "lucide:UsersRound" },

  // ─── Ambiental (6) ─────────────────────────────────────────────────────
  // ⚠️ AMB-006 sin sufijo "-A": así aparece en la hoja Informativas del cliente
  //    (la ponderada equivalente "uso-suelo" usa AMB-006-A). Se conserva tal cual.
  { id: "uso-suelo-info", masterId: "AMB-006", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Uso y cobertura del suelo", description: "Clasificación de cobertura y uso del suelo.", aplicaEn: "tierra", noCalculo: true, iconKey: "lucide:Grid2x2" }, { id: "aves-playeras-info", masterId: "AMB-038-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Especies bióticas", label: "Congregación de aves playeras", description: "Zonas de concentración estacional de aves playeras.", noCalculo: true, iconKey: "svg:birds3" },
  { id: "reproduccion-aves-info", masterId: "AMB-034-A", dimension: "ambiental", criterio: "Variables bióticas", subcriterio: "Áreas protegidas", label: "Zonas de reproducción de aves", description: "Sitios identificados para reproducción de aves.", noCalculo: true, iconKey: "svg:nestBird" },
  // ⚠️ masterId "NA" aquí (la ponderada equivalente "amenaza-volcanica" usa TEC-016).
  { id: "amenaza-volcanica-info", masterId: "NA", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Amenazas", label: "Amenazas volcánicas", description: "Presencia de volcanes (sin ID asignado por el cliente).", aplicaEn: "tierra", noCalculo: true, iconKey: "tabler:volcano" }, { id: "elevacion-info", masterId: "AMB-008-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Elevación", description: "Altitud media sobre el nivel del mar.", aplicaEn: "tierra", noCalculo: true, iconKey: "lucide:MountainSnow" }, { id: "batimetria-info", masterId: "AMB-030-A", dimension: "ambiental", criterio: "Variables abióticas", subcriterio: "Condiciones geológicas y geotécnicas", label: "Batimetría", description: "Profundidad del lecho marino.", aplicaEn: "mar", noCalculo: true, iconKey: "lucide:Radar" }];/** Variables opcionales (no-cálculo) de una dimensión — universo del menú. */
export function optionalVariablesByDimension(dim: DimensionId): Variable[] {
  return OPTIONAL_VARIABLES.filter((v) => v.dimension === dim);
}

export function getVariableById(id: string): Variable | undefined {
  return (
    VARIABLES.find((v) => v.id === id) ??
    OPTIONAL_VARIABLES.find((v) => v.id === id)
  );
}

/**
 * Hidrata el catálogo desde BD (modo backend): sobrescribe IN PLACE los campos de
 * TEXTO/identidad (label, description, criterio, subcriterio, fuente, masterId) de
 * las variables con los de la BD. Los valores estáticos de este archivo quedan
 * SOLO como TEMPLATE (modo demo). La lógica del front (iconos, required, pesos por
 * icono…) no cambia — solo el dato. Como es mutación in-place de los objetos que
 * todos los consumidores ya referencian (getVariableById, variablesByDimension,
 * VARIABLES.filter…), el informe y el menú toman el dato real sin tocar cada sitio.
 * Se llama UNA vez al montar la app (VariablesProvider), como `applyDbWeights`.
 */
export function applyDbCatalog(
  entries: Array<{
    id: string;
    label?: string;
    descripcion?: string;
    criterio?: string;
    subcriterio?: string;
    fuente?: string;
    masterId?: string;
  }>,
): void {
  const byId = new Map<string, Variable>();
  for (const v of VARIABLES) byId.set(v.id, v);
  for (const v of OPTIONAL_VARIABLES) byId.set(v.id, v);
  for (const e of entries) {
    const v = byId.get(e.id);
    if (!v) continue;
    if (e.label) v.label = e.label;
    if (e.descripcion) v.description = e.descripcion;
    if (e.criterio) v.criterio = e.criterio;
    if (e.subcriterio) v.subcriterio = e.subcriterio;
    if (e.fuente) v.fuente = e.fuente;
    if (e.masterId) v.masterId = e.masterId;
  }
}

// ── Catálogo VIVO desde el DB (modo backend) ──────────────────────────────────
// Ícono y `required` son UI (no dato de negocio) → snapshot por id del catálogo
// estático, para conservarlos cuando en backend la lista se reconstruye desde el
// DB (que no guarda icono ni required).
const _ICON_BY_ID: Record<string, string> = {};
const _REQUIRED_BY_ID: Record<string, boolean> = {};
for (const v of [...VARIABLES, ...OPTIONAL_VARIABLES]) {
  _ICON_BY_ID[v.id] = v.iconKey;
  if (v.required) _REQUIRED_BY_ID[v.id] = true;
}
export function iconForVariable(id: string): string {
  return _ICON_BY_ID[id] ?? "lucide:Info";
}
export function requiredForVariable(id: string): boolean {
  return _REQUIRED_BY_ID[id] ?? false;
}

/**
 * Modo BACKEND: reemplaza EN SITIO el catálogo con la lista VIVA del DB. Todos
 * los consumidores importan `VARIABLES`/`OPTIONAL_VARIABLES` por referencia, así
 * que ven la lista nueva sin tocar cada consumidor → nada hardcodeado se consume.
 * El estático queda solo como template (demo). Modular: si a futuro suben más
 * variables en la máster, aparecen solas sin cambiar código. Si el DB viniera
 * VACÍO no reemplaza (evita dejar la app en blanco); se llena al subir la máster.
 */
export function replaceCatalogFromDb(
  modelo: Variable[],
  informativa: Variable[],
): void {
  if (modelo.length === 0 && informativa.length === 0) return;
  VARIABLES.length = 0;
  VARIABLES.push(...modelo);
  OPTIONAL_VARIABLES.length = 0;
  OPTIONAL_VARIABLES.push(...informativa);
}

/**
 * ¿La variable aplica a la naturaleza (mar/tierra) de la selección actual?
 * Sin `aplicaEn` → aplica a ambos. Con selección "mixta"/"vacia" no se filtra
 * (se muestran todas). Pensado para ocultar en el menú las variables que no
 * tienen sentido según el emplazamiento (p.ej. batimetría en tierra).
 */
export function variableAppliesToNature(
  v: Variable,
  nature: "mar" | "tierra" | "mixta" | "vacia",
): boolean {
  if (!v.aplicaEn) return true;
  if (nature === "mar" || nature === "tierra") return v.aplicaEn === nature;
  return true;
}

/** Devuelve los ids de las variables marcadas como obligatorias. */
export function requiredVariableIds(): string[] {
  return VARIABLES.filter((v) => v.required).map((v) => v.id);
}

/**
 * Agrupa las variables ponderadas por su fuente de datos, para la tabla de
 * fuentes del informe (cada fuente → las variables que se obtienen de ella).
 * Ignora variables sin fuente declarada; "(sin definir)" se normaliza a un
 * rótulo legible.
 */
export function variablesBySource(): { fuente: string; variables: string[] }[] {
  const map = new Map<string, string[]>();
  for (const v of VARIABLES) {
    if (!v.fuente) continue;
    const fuente = v.fuente === "(sin definir)" ? "Fuente por definir" : v.fuente;
    const list = map.get(fuente) ?? [];
    list.push(v.label);
    map.set(fuente, list);
  }
  return [...map.entries()]
    .map(([fuente, variables]) => ({ fuente, variables }))
    .sort((a, b) => a.fuente.localeCompare(b.fuente, "es"));
}

/** Grupo de variables por criterio → subcriterio (para render jerárquico). */
export interface CriterioGroup {
  criterio: string;
  subgrupos: { subcriterio: string | null; variables: Variable[] }[];
}

/**
 * Agrupa una lista de variables por `criterio` y luego por `subcriterio`,
 * PRESERVANDO el orden de aparición en el array (que ya viene ordenado por
 * dimensión→criterio→subcriterio). Pensado para `DimensionCard`.
 */
export function groupByCriterio(vars: Variable[]): CriterioGroup[] {
  const groups: CriterioGroup[] = [];
  for (const v of vars) {
    let g = groups.find((x) => x.criterio === v.criterio);
    if (!g) {
      g = { criterio: v.criterio, subgrupos: [] };
      groups.push(g);
    }
    const subKey = v.subcriterio ?? null;
    let sg = g.subgrupos.find((s) => s.subcriterio === subKey);
    if (!sg) {
      sg = { subcriterio: subKey, variables: [] };
      g.subgrupos.push(sg);
    }
    sg.variables.push(v);
  }
  return groups;
}
