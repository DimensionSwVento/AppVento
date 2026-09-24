/**
 * Pesos signados por variable para el modelo multicriterio (placeholder).
 *
 * Convención:
 * - **Positivo** → contribución aditiva (a mayor score de la variable, mayor idoneidad)
 * - **Negativo** → contribución penalizadora (a mayor score, menor idoneidad)
 * - **Magnitud** → cuánto pesa esa variable frente a las demás
 *
 * Estos valores son hardcoded mientras el cliente no entregue la tabla
 * definitiva en BD. Cuando exista la fuente real, se reemplaza este módulo
 * por un fetch al backend manteniendo la misma forma (`Record<string, number>`)
 * para que el resto del código no cambie.
 *
 * Ajustar números aquí es la forma de probar escenarios en local sin tocar
 * el catálogo ni el cálculo agregado del heatmap.
 *
 * Variables que NO aparecen aquí → peso 0 (no aportan al agregado hasta que
 * el cliente confirme su polaridad).
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
 * hidrató; si no, el template. 0 si no está en ninguno (no aporta al agregado).
 */
export function weightFor(variableId: string): number {
  if (dbWeights && variableId in dbWeights) return dbWeights[variableId];
  return VARIABLE_WEIGHTS[variableId] ?? 0;
}
