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
 */
export const VARIABLE_WEIGHTS: Record<string, number> = {
  // Ambiental
  "viento-100m": 1.0,
  "densidad-energetica": 1.0,
  "exposicion-solar": 0.4,
  "humedad-relativa": -0.3,
  // Técnica
  "pendiente-terreno": -0.6,
  "rugosidad-superficie": -0.1,
  "distancia-subestacion": -0.7,
  "accesibilidad-vial": 0.5,
  // Regulatoria
  "zonas-protegidas": -1.0,
  "resguardos-indigenas": -1.0,
  "uso-suelo": 0.7,
  "cigarrillos-ilegales": -0.8,
  // Socioeconómica
  "densidad-poblacional": -0.4,
  "nbi": 0.3,
  "conflictividad": -0.9,
  // Macroeconómica
  "pib-departamental": 0.5,
  "inversion-historica": 0.6,
  "precio-kwh": 0.5,
};

/**
 * Devuelve el peso signado para una variable. 0 si no está en el catálogo
 * (la variable no aporta al agregado).
 */
export function weightFor(variableId: string): number {
  return VARIABLE_WEIGHTS[variableId] ?? 0;
}
