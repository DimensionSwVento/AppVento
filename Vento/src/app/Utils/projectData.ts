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
    /** Potencia por aerogenerador — RANGO REAL (Tabla 2 del cliente), en MW.
     *  `potenciaMaxMW === 0` = sin tope superior (utility "1 MW o más"). */
    potenciaMinMW: number;
    potenciaMaxMW: number;
    /** Área ocupada por aerogenerador (km²) — base para estimar el número.
     *  ⚠️ TEMPLATE: el cliente NO envió área/espaciamiento; queda estimado hasta
     *  que defina el cálculo de nº de aerogeneradores por hex (Tabla 2, pendiente). */
    areaPorAeroKm2: number;
    /** Separación entre aerogeneradores (m). ⚠️ TEMPLATE (ver arriba). */
    espaciamientoM: number;
  }
> = {
  S: {
    label: "S",
    detail: "Turbina pequeña · 1 kW – 100 kW",
    potenciaMinMW: 0.001,
    potenciaMaxMW: 0.1,
    areaPorAeroKm2: 0.3,
    espaciamientoM: 300,
  },
  M: {
    label: "M",
    detail: "Turbina mediana · 100 kW – 1 MW",
    potenciaMinMW: 0.1,
    potenciaMaxMW: 1,
    areaPorAeroKm2: 0.6,
    espaciamientoM: 500,
  },
  L: {
    label: "L",
    detail: "Turbina grande · 1 MW o más (utility)",
    potenciaMinMW: 1,
    potenciaMaxMW: 0,
    areaPorAeroKm2: 1.0,
    espaciamientoM: 800,
  },
};

/** Potencia representativa (MW) de una categoría para el cálculo: tope del rango
 *  si existe; si es abierto (utility), el mínimo. */
export function turbinePotenciaMW(
  spec: (typeof AEROGENERADORES)[CategoriaAeroId],
): number {
  return spec.potenciaMaxMW > 0 ? spec.potenciaMaxMW : spec.potenciaMinMW;
}

/**
 * Nº de aerogeneradores estimado = área del proyecto ÷ área por aerogenerador.
 * Ya NO lo ingresa el usuario: se deriva de la categoría y el área (#12).
 */
export function calcNumAerogeneradores(
  areaKm2: number,
  categoria: CategoriaAeroId | null,
  /** Specs override (viene de `catalog_turbine` en backend); default = template. */
  specs: typeof AEROGENERADORES = AEROGENERADORES,
): number {
  if (!categoria || areaKm2 <= 0) return 0;
  return Math.max(
    1,
    Math.floor(areaKm2 / specs[categoria].areaPorAeroKm2),
  );
}

/**
 * Rango de ÁREA (km²) esperado para una capacidad nominal (US04-04) — TEMPLATE
 * hasta que D. Técnica entregue las áreas mínimas/máximas oficiales por
 * capacidad. Se deriva de la densidad de la categoría: nº de turbinas necesarias
 * para la potencia (ceil(MW / turbinePotenciaMW)) × área por turbina, con una banda de
 * tolerancia [0.6×, 1.6×]. Si no hay categoría, usa "M" como referencia.
 */
export function areaRangeForCapacity(
  capacidadMW: number,
  categoria: CategoriaAeroId | null,
  /** Specs override (viene de `catalog_turbine` en backend); default = template. */
  specs: typeof AEROGENERADORES = AEROGENERADORES,
): { min: number; max: number; esperada: number } | null {
  if (!Number.isFinite(capacidadMW) || capacidadMW <= 0) return null;
  const spec = specs[categoria ?? "M"];
  const turbinas = Math.max(1, Math.ceil(capacidadMW / turbinePotenciaMW(spec)));
  const esperada = turbinas * spec.areaPorAeroKm2;
  return { min: esperada * 0.6, max: esperada * 1.6, esperada };
}

/** Distancia máxima (km) entre un hex nuevo y la selección (restricción del mapa). */
export const MAX_SELECTION_GAP_KM = 50;

/**
 * Máximo de informes guardados en el histórico (rotación del más viejo).
 * En backend (Postgres) el almacenamiento no es la restricción; el tope es de
 * UX (lista agrupada + buscador). Los `hexes` se guardan compactados
 * (`compactHexes`) → mismo formato, más liviano tanto en local como al backend.
 */
export const MAX_HISTORIAL_ENTRIES = 100;

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
 *
 * FORZADO a `true`: aunque el backend esté conectado (`USE_BACKEND=true`), la
 * **master definitiva de zonas excluidas aún no existe**, así que se mantiene el
 * template para no dejar la funcionalidad vacía. Cuando llegue la columna real de
 * exclusión por hex, volver a derivarlo del modo:
 *   `process.env.NEXT_PUBLIC_USE_BACKEND !== "true"`.
 */
export const SHOW_PLACEHOLDER_EXCLUDED = true;

/**
 * Motivos de exclusión (TEMPLATE). Mientras no haya un campo "motivo" por hex
 * en los datos reales, la leyenda de una zona excluida muestra uno de estos de
 * forma determinista por zona (ver `bannedReason` en `hexClassification.ts`).
 * Cuando la API entregue el motivo real, se reemplaza la fuente ahí — la UI de
 * la leyenda no cambia.
 */
export const EXCLUSION_REASONS = [
  "Área protegida",
  "Humedal (RAMSAR)",
  "Parque nacional natural",
  "Zona de reserva forestal",
  "Resguardo indígena",
  "Territorio de comunidades negras",
  "Zona de exclusión aeronáutica",
] as const;

/**
 * ════════════════════════════════════════════════════════════════════════
 *  DESPLIEGUE POR FASES
 * ════════════════════════════════════════════════════════════════════════
 * `USE_BACKEND = false` (por defecto) → **modo template SIN API**: el histórico
 * usa cache local (localStorage) y scores/heatmap/detalle usan placeholders, sin
 * llamar al backend. Ideal para la **fase 1** del despliegue (solo frontend).
 * `true` → backend conectado (BFF `/api/tiles/*` + `/api/historico`).
 *
 * Se controla por entorno: `NEXT_PUBLIC_USE_BACKEND=true` para la fase con API.
 * No borra nada — solo cambia el modo.
 */
export const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

/**
 * Modo emplazamiento por DATO (mar/tierra) — sprint 3.
 * `true` → cada hex sabe si es offshore (mar) o onshore (tierra) por el dato
 * `es_offshore` de la master; la selección NO permite mezclar mar+tierra y el
 * emplazamiento se muestra según la naturaleza del área. Hoy TEMPLATE: la
 * fuente es la geometría (`hexType`) hasta que llegue la columna real; se apaga
 * poniendo `false` (como el modo template). Ver `isOffshoreHex`/`selectionNature`.
 */
export const USE_API_EMPLAZAMIENTO = true;

/**
 * ════════════════════════════════════════════════════════════════════════
 *  PLACEHOLDERS — ELIMINAR AL CONECTAR DATOS REALES
 * ════════════════════════════════════════════════════════════════════════
 * Interruptor maestro de los datos placeholder. **DERIVADO de `USE_BACKEND`**:
 * con el env `NEXT_PUBLIC_USE_BACKEND=true` el fallback se apaga solo (la UI
 * muestra SOLO lo real; lo que la API no entregue queda vacío/—). En modo
 * template (env sin setear) el fallback queda `true` y todo usa marcadores.
 * Así **un solo env** cambia de template → real. Al subir a prod con datos:
 *   1. Poner `NEXT_PUBLIC_USE_BACKEND=true` (apaga template automáticamente).
 *   2. Verificar que todo viene del backend.
 *   3. ELIMINAR los placeholders del inventario de abajo (y este bloque).
 *
 * Inventario a eliminar (todo lo placeholder está referenciado desde aquí):
 *   - `Utils/report/heatmapPalette.ts` → `dimensionHexScore` / `dimensionScore`
 *     / `generalScore` (scores fake por hash). Conservar `viridis` (paleta real).
 *   - `Utils/variables/variableWeights.ts` → pesos WLC placeholder.
 *   - `Utils/variables/informativeVariables.tsx` → conversión de valores placeholder.
 *   - Este archivo: `SHOW_PLACEHOLDER_EXCLUDED` + specs placeholder de `AEROGENERADORES`.
 *   - Fallbacks que consumen lo anterior: `useSelectionScores`, `useAreaScores`,
 *     `useInformeHeatmapLayer` (rama placeholder).
 */
export const USE_PLACEHOLDER_FALLBACK = !USE_BACKEND;
