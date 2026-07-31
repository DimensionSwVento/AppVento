/**
 * Textos legales/institucionales del informe — TEMPLATE.
 *
 * Placeholder hasta que el cliente (Secretaría General de la universidad)
 * entregue el texto oficial del disclaimer y la lista real de fuentes.
 * Se reemplazan AQUÍ — el PDF y la UI no cambian (igual que los demás
 * valores template del proyecto).
 */

export const DISCLAIMER_TITLE = "Aviso legal y alcance del informe";

export const DISCLAIMER_BODY =
  "Este documento es una herramienta de carácter INFORMATIVO sobre la idoneidad " +
  "relativa de zonas para proyectos de energía eólica en Colombia. NO constituye " +
  "un certificado, aval, licencia, permiso ni concepto vinculante ante alcaldías, " +
  "curadurías, autoridades ambientales, la ANH ni ninguna otra entidad. " +
  "Los resultados se derivan de un modelo multicriterio con datos preliminares y " +
  "NO sustituyen estudios técnicos, ambientales, sociales, legales ni de " +
  "factibilidad específicos que cada proyecto requiera. El uso de esta " +
  "información es responsabilidad de quien la consulta.";

/** Fuentes de datos (placeholder — poblar con las reales del catálogo). */
export const REPORT_SOURCES: string[] = [
  "Modelo multicriterio Vento (datos preliminares del equipo de investigación)",
  "IGAC · IDEAM · INVEMAR · Instituto Alexander von Humboldt · GBIF",
  "UNGRD · NASA · NOAA · DANE",
];

/**
 * Nota sobre el equilibrado humano de pesos e impacto. Se muestra junto a las
 * fuentes del informe y en la sección "Relevancia" del detalle de variable.
 */
export const WEIGHT_BALANCING_NOTE =
  "Algunas variables pueden pasar por un proceso de equilibrado humano de sus " +
  "pesos e impacto, realizado por el equipo experto, para ajustar el modelo a " +
  "criterios cualitativos que los datos por sí solos no capturan.";
