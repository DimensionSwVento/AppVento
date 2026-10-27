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

/**
 * "Resumen del cálculo" del informe — editable desde admin (SOLO DESCRIPTIVO).
 * Estas expresiones y la nota se IMPRIMEN en el informe para explicar cómo se
 * obtiene el score; NO recalculan nada (el score real lo precalcula el backend).
 * Fuente única de defaults: si el admin no fija un override (`report_calc_text`
 * en `app_config`), el informe usa estos valores.
 */
export interface CalcSummaryText {
  /** Fórmula mostrada para el score por dimensión. */
  formulaDimension: string;
  /** Fórmula mostrada para el índice general. */
  formulaGeneral: string;
  /** Nota metodológica al pie del resumen. */
  metodologiaNota: string;
}

/**
 * Contenido EDITABLE del informe (disclaimer legal + incentivos tributarios),
 * persistido en `app_config` (`report_content`) igual que el "Resumen del cálculo".
 * Antes eran constantes hardcodeadas (DISCLAIMER_* aquí, IMPUESTOS_CLAVE en
 * Report.tsx); ahora el admin los edita y el informe los prefiere.
 */
export interface ReportContentText {
  disclaimerTitle: string;
  disclaimerBody: string;
  /** Incentivos tributarios clave de la dimensión económica (label · valor). */
  incentivos: { label: string; value: string }[];
}

export const REPORT_CONTENT_DEFAULTS: ReportContentText = {
  disclaimerTitle: DISCLAIMER_TITLE,
  disclaimerBody: DISCLAIMER_BODY,
  incentivos: [
    { label: "Deducción de renta (Ley 1715)", value: "50% inversión" },
    { label: "Exclusión de IVA (equipos)", value: "Aplica" },
    { label: "Exención arancelaria", value: "Aplica" },
    { label: "Depreciación acelerada", value: "hasta 33%/año" },
  ],
};

export const CALC_SUMMARY_DEFAULTS: CalcSummaryText = {
  // El MODELO (en la máster) produce todo en escala 1–5 (5 = más viable, −1 =
  // excluida). La app consume ese resultado y lo normaliza a 0–100 con (valor−1)/4.
  // Dimensión = promedio de las variables PONDERADAS (ya 1–5) de esa dimensión;
  // índice general = el `global` de la máster (no un recompute).
  // Fórmulas de PESOS TEMPORALES (el cliente las ajusta en admin). El resultado
  // es 1–5; el informe muestra el número y su normalización a 0–100.
  formulaDimension: "Σ(pesoᵢ × ponderadaᵢ)  ⟨pesos temporales — ajustar⟩",
  formulaGeneral: "Σ(peso_dim × dimensión)  ⟨pesos temporales — ajustar⟩",
  metodologiaNota: WEIGHT_BALANCING_NOTE,
};
