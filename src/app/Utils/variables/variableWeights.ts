import { USE_PLACEHOLDER_FALLBACK } from "../projectData";

/**
 * Pesos signados por variable para el modelo multicriterio.
 *
 * ⚠️ ESTE MAPA HARDCODED ES SOLO PARA EL MODO TEMPLATE / PRUEBA. ⚠️
 * YA EXISTE la conexión a BD: en modo backend (`USE_BACKEND`) los pesos REALES se
 * hidratan del catálogo (`applyDbWeights`, `catalog_variable.polaridad × peso`) y
 * mandan. DECISIÓN: con el backend prendido NO se usan valores falsos/template →
 * `weightFor` NO cae al template (devuelve el de BD o 0). Este `VARIABLE_WEIGHTS`
 * solo se usa como semilla para probar sin backend.
 * (Los comentarios anteriores que decían "cuando exista la fuente real se
 *  reemplazará por un fetch" quedaron OBSOLETOS: eso ya está implementado.)
 *
 * Convención de signo (aplica a ambos orígenes, BD y template):
 * - **Positivo** → aditivo (a mayor score de la variable, mayor idoneidad)
 * - **Negativo** → penalizador (a mayor score, menor idoneidad)
 * - **Magnitud** → cuánto pesa esa variable frente a las demás
 *
 * Ajustar números aquí solo afecta al MODO TEMPLATE (probar escenarios en local
 * sin backend). Variables que NO aparecen → peso 0.
 */
export const VARIABLE_WEIGHTS: Record<string, number> = {
  // ─── Ambiental · Especies bióticas — sensibilidades ecológicas restan ─
  "especies-endemicas": -0.8,
  "especies-migratorias": -0.6,
  "especies-marinas-iucn": -0.7,
  "especies-aves-iucn": -0.7,
  "especies-murcielagos-iucn": -0.6,
  "aves-playeras": -0.5,
  "pastos-marinos": -0.5,
  // ─── Ambiental · Áreas protegidas ──────────────────────────────────
  "reproduccion-aves": -0.6,
  "biodiversidad": -0.9,
  "humedales-ramsar": -1.0,
  "mares-coralinos": -0.7,
  "playas-tortugas": -0.6,
  // ─── Ambiental · Amenazas ──────────────────────────────────────────
  "riesgo-fisico": -0.7,
  "amenaza-volcanica": -0.6,
  // ─── Ambiental · Condiciones geológicas y geotécnicas ──────────────
  "uso-suelo": 0.3,
  "fallas-sismicidad": -0.5,
  "batimetria-offshore": 0.4,
  "pendiente-terreno": -0.5,
  "litologia": 0.2,
  "fondos-marinos": 0.2, // offshore, separada de litología (AMB-029-A)
  "elevacion": 0.3,

  // ─── Técnica · Recurso eólico ──────────────────────────────────────
  "wpd": 1.0,
  // ─── Técnica · Infraestructura y red (distancia mayor resta) ───────
  "nodos-conexion": -0.7,
  "distancia-vial": -0.5,
  "distancia-portuaria": -0.5,

  // ─── Social · Económico ────────────────────────────────────────────
  "dist-atractivo-turistico": -0.3,
  "tiempo-centro-poblado": -0.3,
  "pobreza-multidimensional": -0.4,
  "analfabetismo-soe": -0.3,
  "pobreza-energetica": 0.5,
  "iot": 0.5,
  // ─── Social · Vulnerabilidad social ────────────────────────────────
  "desocupados": -0.4,
  "densidad-poblacional": -0.3,
  "distancia-viviendas": 0.4,
  "ipm": -0.4,
  "analfabetismo": -0.3,
  "hogares-municipio": 0.1,
  "pobreza-monetaria": -0.4,
  "tipologia-territorial": 0.3,
  // ─── Social · Brecha energética y asequibilidad ────────────────────
  "tarifa-energia": -0.3,
  "ipm-energetica": -0.4,
  "zni": -0.3,
  // ─── Social · Riesgo en seguridad, delictividad y conflicto armado ─
  "grupos-beligerantes": -1.0,
  "cultivos-coca": -0.9,
  "mineria-ilegal": -0.8,
  "reclutamiento-menores": -0.8,
  "incidencia-delictiva": -0.6,
  // ─── Social · Falta de gobernanza, institucionalidad y riesgo político ─
  "desempeno-institucional": 0.6,
  "tipologia-territorial-gob": 0.3,
  // ─── Social · Sensibilidad sociocultural, étnica y territorial ─────
  "resguardos-indigenas": -0.7,
  "reservas-campesinas": -0.5,
  "comunidades-negras": -0.7,
  "zomac": -0.4,
  "pdet": 0.4,

  // ─── Económica y Regulatoria ───────────────────────────────────────
  // AMBAS son INFORMATIVAS: no puntúan en el modelo (WLC). No llevan peso →
  // `weightFor` devuelve 0 para sus variables/normas ("no aporta al cálculo"),
  // igual que el resto de informativas (ver `INFORMATIVE_DIMENSION_IDS`).
};

/**
 * Override de pesos venidos de BD (`catalog_variable.polaridad`×`peso`). Null
 * hasta que se hidrate; entonces `weightFor` lo prefiere sobre el template. Es la
 * forma anticipada arriba: "se reemplaza por un fetch manteniendo la misma forma".
 */
let dbWeights: Record<string, number> | null = null;

/**
 * Hidrata los pesos reales desde el catálogo de BD. `peso_con_signo =
 * polaridad × peso`. Se llama una vez al cargar la app (ver VariablesContext).
 * Solo entra en efecto si trae al menos un peso ≠ 0 (evita pisar el template con
 * datos vacíos si el backend aún no tiene la tabla poblada).
 */
export function applyDbWeights(
  entries: { id: string; polaridad?: number; peso?: number }[],
): void {
  const map: Record<string, number> = {};
  for (const e of entries) {
    if (typeof e.polaridad === "number" && typeof e.peso === "number") {
      map[e.id] = e.polaridad * e.peso;
    }
  }
  if (Object.values(map).some((w) => w !== 0)) dbWeights = map;
}

/**
 * Devuelve el peso signado para una variable. Prefiere el valor de BD si se
 * hidrató. En modo backend NO cae al template (decisión: sin valores falsos con
 * el backend prendido) → devuelve 0 si BD no lo trae. Solo en modo template usa
 * el `VARIABLE_WEIGHTS` hardcoded. 0 = no aporta al agregado.
 */
export function weightFor(variableId: string): number {
  if (dbWeights && variableId in dbWeights) return dbWeights[variableId];
  if (!USE_PLACEHOLDER_FALLBACK) return 0; // backend ON → sin fallback a template
  return VARIABLE_WEIGHTS[variableId] ?? 0;
}
