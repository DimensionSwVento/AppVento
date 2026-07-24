/**
 * Pesos signados por variable para el modelo multicriterio (placeholder).
 *
 * Convención:
 * - **Positivo** → contribución aditiva (a mayor score de la variable, mayor viabilidad)
 * - **Negativo** → contribución penalizadora (a mayor score, menor viabilidad)
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
  // ─── Ambiental — sensibilidades ecológicas restan ──────────────────
  "especies-endemicas": -0.8,
  "especies-migratorias": -0.6,
  "especies-iucn": -0.7,
  "aves-playeras": -0.5,
  "pastos-marinos": -0.5,
  "reproduccion-aves": -0.6,
  "biodiversidad": -0.9,
  "humedales-ramsar": -1.0,
  "mares-coralinos": -0.7,
  "playas-tortugas": -0.6,
  "riesgo-fisico": -0.7,
  "amenaza-volcanica": -0.6,
  "fallas-sismicidad": -0.5,
  "uso-suelo": 0.3,
  "batimetria-offshore": 0.4,
  "pendiente-terreno": -0.5,
  "litologia": 0.2,
  "elevacion": 0.3,
  "densidad-aire": 0.7,

  // ─── Técnica — recurso y costos ────────────────────────────────────
  "wpd": 1.0,
  "viento-velocidad": 1.0,
  "turbulencia": -0.5,
  "rugosidad": -0.3,
  "nodos-conexion": -0.7,
  "distancia-sin": -0.7,
  "distancia-vial": -0.5,
  "lcoe": -0.8,
  "factor-capacidad": 0.9,
  "capex-conexion": -0.5,
  "capex-obra-civil": -0.5,
  "capex-generadores": -0.5,
  "opex": -0.5,
  "area-proyecto": 0.5,
  "num-aerogeneradores": 0.4,

  // ─── Económica ─────────────────────────────────────────────────────
  "distancia-poi": -0.3,
  "distancia-viviendas": 0.4,
  "ipm": -0.4,
  "analfabetismo": -0.3,
  "pobreza-energetica": 0.5,
  "estabilidad-juridica": 0.7,
  "capacidad-gestion": 0.6,
  "ordenamiento-territorial": 0.5,
  "incidencia-delictiva": -0.6,

  // ─── Socioeconómica — riesgos sociales restan ──────────────────────
  "mineria-ilegal": -0.8,
  "densidad-poblacional": -0.3,
  "cultivos-coca": -0.9,
  "grupos-beligerantes": -1.0,
  "atentados": -0.9,
  "tipologia-territorial": 0.3,
  "desempeno-institucional": 0.6,
  "resguardos-indigenas": -0.7,
  "comunidades-negras": -0.7,
  "reservas-campesinas": -0.5,
  "pdet": 0.4,
  "zomac": -0.4,

  // ─── Regulatoria ───────────────────────────────────────────────────
  "tasa-exito-proyectos": 0.8,
  "proyectos-xm": 0.6,
};

/**
 * Devuelve el peso signado para una variable. 0 si no está en el catálogo
 * (la variable no aporta al agregado).
 */
export function weightFor(variableId: string): number {
  return VARIABLE_WEIGHTS[variableId] ?? 0;
}
