/**
 * Marco normativo nacional (US04-05 / referencia del informe). TEMPLATE hasta que
 * el admin de normas (US08-02) las entregue: la dimensión regulatoria es
 * INFORMATIVA (no puntúa) y muestra las normas con una etiqueta rápida tipo
 * semáforo. Sustituir por datos reales cuando exista `GET /api/admin/normas`.
 */
export type NormaEstado =
  | "aplica"
  | "tramite"
  | "verificacion"
  | "no-aplica";

export interface Norma {
  id: string;
  nombre: string;
  descripcion: string;
  estado: NormaEstado;
}

export const NORMA_ESTADO_META: Record<
  NormaEstado,
  { label: string; color: string; bg: string }
> = {
  aplica: { label: "Aplica", color: "#166534", bg: "#dcfce7" },
  tramite: { label: "Requiere trámite", color: "#9a3412", bg: "#ffedd5" },
  verificacion: { label: "Requiere verificación", color: "#854d0e", bg: "#fef9c3" },
  "no-aplica": { label: "No aplica", color: "#6b7280", bg: "#f3f4f6" },
};

export const REGULATORY_NORMS: Norma[] = [
  {
    id: "cp-1991",
    nombre: "Constitución Política de 1991",
    descripcion: "Arts. 79 y 80: protección del ambiente y desarrollo sostenible.",
    estado: "aplica",
  },
  {
    id: "ley-99-1993",
    nombre: "Ley 99 de 1993",
    descripcion: "Crea el Ministerio de Ambiente y el sistema de licenciamiento ambiental.",
    estado: "aplica",
  },
  {
    id: "ley-1715-2014",
    nombre: "Ley 1715 de 2014",
    descripcion: "Integración de energías renovables no convencionales al sistema.",
    estado: "tramite",
  },
  {
    id: "ley-2099-2021",
    nombre: "Ley 2099 de 2021",
    descripcion: "Reactivación económica y transición energética.",
    estado: "aplica",
  },
  {
    id: "decreto-1076-2015",
    nombre: "Decreto 1076 de 2015",
    descripcion: "Decreto Único Reglamentario del Sector Ambiente (licencias y permisos).",
    estado: "verificacion",
  },
  {
    id: "ley-1844-2017",
    nombre: "Ley 1844 de 2017",
    descripcion: "Ratifica el Acuerdo de París sobre cambio climático.",
    estado: "aplica",
  },
  {
    id: "res-emma",
    nombre: "Reglamentación EMMA",
    descripcion: "Aplicable a proyectos costa afuera / offshore.",
    estado: "no-aplica",
  },
];

export const REGULATORY_AUTHORITIES = [
  { sigla: "ANLA", nombre: "Autoridad Nacional de Licencias Ambientales" },
  { sigla: "Minambiente", nombre: "Ministerio de Ambiente y Desarrollo Sostenible" },
  { sigla: "Minenergía", nombre: "Ministerio de Minas y Energía" },
  { sigla: "UPME", nombre: "Unidad de Planeación Minero Energética" },
];

/** Conteo por estado para el semáforo normativo. */
export function normasSemaforo(norms: Norma[] = REGULATORY_NORMS) {
  const counts: Record<NormaEstado, number> = {
    aplica: 0,
    tramite: 0,
    verificacion: 0,
    "no-aplica": 0,
  };
  for (const n of norms) counts[n.estado]++;
  return counts;
}
