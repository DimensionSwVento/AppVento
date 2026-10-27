import { MAP_SYMBOLS } from "./mapSymbols";
import {
  getVariableById,
  mapKindForVariable,
  variableAppliesToNature,
  type Variable,
} from "../variables/variablesCatalog";

export type MapNature = "mar" | "tierra" | "mixta" | "vacia";

/**
 * ¿La variable (por id) aplica a la naturaleza mar/tierra del área? Filtro ÚNICO
 * mar/tierra por id: lo comparten las capas curadas del mapa y la modal para no
 * divergir (una capa que no aplica se OCULTA en ambos). Si el id no está en el
 * catálogo o la naturaleza es mixta/vacía, no filtra (true).
 */
export function variableAppliesToNatureById(
  id: string,
  nature: MapNature | undefined,
): boolean {
  if (!nature) return true;
  const v = getVariableById(id);
  return !v || variableAppliesToNature(v, nature);
}

export interface GenericMapVariable {
  id: string;
  variable: Variable;
  /** Método de representación. `calor` solo se incluye con `includeHeat` (en
   *  Dimensiones); en Informe el calor va por su desplegable, no aquí. */
  kind: "area" | "interconectado" | "calor";
}

/**
 * FUENTE ÚNICA de "qué variables GENÉRICAS se representan en el mapa" (capa de
 * icono/área o red de nodos). La consumen a la vez el MAPA (`catalogLayers`) y la
 * MODAL de capas (`MapSymbolsLegend`), con el MISMO predicado, para que no
 * diverjan (antes: el mapa no filtraba por mar/tierra y la modal sí → una capa
 * aparecía en el mapa pero no en la modal, y viceversa).
 *
 * Criterio de inclusión de una variable:
 *  - está ACTIVA (`active`: switches de Dimensiones / símbolos del Informe);
 *  - NO es curada (`MAP_SYMBOLS` tiene su propia representación fija);
 *  - NO está deshabilitada en admin (`disabled`, "ver en mapa" apagado);
 *  - tiene `enMapa` y método `area` o `interconectado` (el `calor` va al heatmap);
 *  - APLICA a la naturaleza del área seleccionada (mar/tierra); en "mixta"/"vacia"
 *    no se filtra.
 *
 * NO consulta datos (hexes): eso lo resuelve cada consumidor por su cuenta
 * (backend = dato real o nada; template = sin dato no pinta). Aquí solo se decide
 * la PERTENENCIA, que es lo que debe ser idéntico en mapa y modal.
 */
export function genericMapVariables(
  active: Set<string>,
  disabled: Set<string> | undefined,
  nature: MapNature | undefined,
  includeHeat = false,
): GenericMapVariable[] {
  const curated = new Set(MAP_SYMBOLS.map((s) => s.variableId));
  const out: GenericMapVariable[] = [];
  for (const id of active) {
    if (disabled?.has(id)) continue;
    const v = getVariableById(id);
    if (!v?.enMapa) continue;
    const kind = v.mapKind ?? mapKindForVariable(id);
    // `calor` solo entra si el consumidor lo pide (Dimensiones); en Informe el
    // calor se controla desde su desplegable, no desde la modal de capas.
    const allowed =
      kind === "area" ||
      kind === "interconectado" ||
      (kind === "calor" && includeHeat);
    if (!allowed) continue;
    // Las CURADAS (`MAP_SYMBOLS`) tienen su propia representación → se excluyen…
    // SALVO las de CALOR (viento): su símbolo curado `heat` está obsoleto, así que
    // se dejan pasar por el path genérico de calor para que aparezcan en la modal.
    if (curated.has(id) && kind !== "calor") continue;
    if (nature && !variableAppliesToNature(v, nature)) continue;
    out.push({ id, variable: v, kind });
  }
  return out;
}
