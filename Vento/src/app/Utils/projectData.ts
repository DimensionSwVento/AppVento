/**
 * ════════════════════════════════════════════════════════════════════════
 *  DOC MAESTRO DE VALORES DEL PROYECTO
 * ════════════════════════════════════════════════════════════════════════
 * Única fuente de los valores del proyecto que dependen del equipo de
 * investigación / cliente. TODOS son PLACEHOLDER hasta que entreguen los
 * reales — para ajustarlos, editar SÓLO este archivo.
 *
 * Valores placeholder relacionados que viven cerca de su lógica (consumen de
 * aquí o se migrarán aquí cuando lleguen los reales):
 *  - `Utils/variables/variableWeights.ts` → pesos signados por variable.
 *  - `Utils/report/heatmapPalette.ts`     → scores placeholder por (dim, hex).
 *  - `Utils/variables/variablesCatalog.ts`→ catálogo de variables/dimensiones.
 */

export type CategoriaAeroId = "S" | "M" | "L";

/**
 * Especificaciones por categoría de aerogenerador. PLACEHOLDER — el equipo
 * entregará los valores reales (potencia, área/separación en m por categoría).
 */
export const AEROGENERADORES: Record<
  CategoriaAeroId,
  {
    label: string;
    detail: string;
    /** Potencia nominal por aerogenerador (MW). */
    potenciaMW: number;
    /** Área ocupada por aerogenerador (km²) — base para estimar el número. */
    areaPorAeroKm2: number;
    /** Separación entre aerogeneradores (m) — "los m" de cada categoría. */
    espaciamientoM: number;
  }
> = {
  S: {
    label: "S",
    detail: "Pequeño · hasta ~2 MW",
    potenciaMW: 2,
    areaPorAeroKm2: 0.3,
    espaciamientoM: 300,
  },
  M: {
    label: "M",
    detail: "Mediano · 2–4 MW",
    potenciaMW: 3.5,
    areaPorAeroKm2: 0.6,
    espaciamientoM: 500,
  },
  L: {
    label: "L",
    detail: "Grande · 4 MW o más",
    potenciaMW: 6,
    areaPorAeroKm2: 1.0,
    espaciamientoM: 800,
  },
};

/**
 * Nº de aerogeneradores estimado = área del proyecto ÷ área por aerogenerador.
 * Ya NO lo ingresa el usuario: se deriva de la categoría y el área (#12).
 */
export function calcNumAerogeneradores(
  areaKm2: number,
  categoria: CategoriaAeroId | null,
): number {
  if (!categoria || areaKm2 <= 0) return 0;
  return Math.max(
    1,
    Math.floor(areaKm2 / AEROGENERADORES[categoria].areaPorAeroKm2),
  );
}

/** Distancia máxima (km) entre un hex nuevo y la selección (restricción del mapa). */
export const MAX_SELECTION_GAP_KM = 50;

/** Máximo de informes guardados en el histórico (rotación del más viejo). */
export const MAX_HISTORIAL_ENTRIES = 50;

/**
 * Resolución H3 mínima (más fina) a la que se permite SELECCIONAR hexágonos.
 * Por debajo de esta resolución (zoom lejano) los hexes son solo-visualización
 * y NO clicables: así se evita el bug de selección anidada al cruzar niveles de
 * zoom (un hex grande seleccionado que luego muestra sus hijos finos dentro).
 * El usuario debe acercarse hasta esta resolución para poder seleccionar.
 *
 * Referencia zoom→res (ver `Utils/h3/mapGeo.ts:zoomToH3Res`):
 *   res 7 ≈ zoom ≥ 10 · res 8 ≈ zoom ≥ 12.
 */
export const MIN_SELECTION_H3_RES = 7;

/**
 * Hexágonos PROHIBIDOS / vetados — zonas totalmente inviables para el proyecto.
 * Se pintan en gris sólido y NO son seleccionables.
 *
 * ⚠️ PLACEHOLDER / TEMPLATE: hoy está vacío porque faltan los datos reales del
 * equipo de datos (Camila). Cuando lleguen, poblar este set con los índices H3
 * (a resolución `MIN_SELECTION_H3_RES`) de las celdas vetadas — el render gris y
 * el bloqueo de selección ya están cableados y funcionarán sin tocar más código.
 *
 * Ejemplo de formato (índices H3 res-7):
 *   new Set(["871f1d489ffffff", "871f1d48bffffff"])
 */
export const BANNED_HEXES: ReadonlySet<string> = new Set<string>([
  // ← poblar con datos reales del equipo de datos.
]);

/**
 * Mientras no lleguen las zonas excluidas reales (`tipo_celda="excluida"` del
 * parquet), muestra un **placeholder determinista** de zonas excluidas — gris
 * sólido, no seleccionable — para que la funcionalidad sea visible/demostrable.
 * Poner en `false` cuando se conecten los datos reales (o se pueble `BANNED_HEXES`).
 */
export const SHOW_PLACEHOLDER_EXCLUDED = true;
