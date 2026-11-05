/**
 * Definiciones de las 4 CARACTERÍSTICAS del proyecto (Tabla 2 del Excel del
 * cliente "Características"). Son textos de ayuda/tooltip; NO cambian la lógica
 * de configuración (esa vive en `CaracteristicasContext` + `projectData`).
 *
 * TEMPLATE: el texto lo define el cliente. Editar aquí ⇒ se refleja en la UI de
 * `Caracteristicas.tsx` sin tocar el componente.
 */

/** Definición de cada característica (para el tooltip/ayuda del bloque). */
export const CARACTERISTICA_DEFINICIONES = {
  emplazamiento:
    "Onshore = en tierra firme · Offshore = sobre el mar. Se delimita automáticamente según el área; si es offshore, debe definirse el tipo de emplazamiento según el lecho marino y la profundidad.",
  tecnologiaOffshore:
    "Donde la profundidad sea menor a 100 m hay opción entre flotante y fija; en el resto, flotante.",
  capacidadNominal:
    "Capacidad instalada del parque en MW. Habilita o deshabilita los tipos de turbina disponibles.",
  tamano:
    "Categoría derivada de la capacidad nominal (no seleccionable). Se muestra como mensaje informativo.",
  tipoAerogenerador:
    "Perfil de turbina sugerido según la capacidad. El número de unidades es calculable a partir de la categoría y el área.",
} as const;

/**
 * Categorización por TAMAÑO según capacidad nominal (umbrales del cliente).
 * < 1 MW: autogenerador/distribuido, no requiere trámite ante la UPME.
 */
export const TAMANO_CATEGORIAS = [
  {
    id: "pequeno",
    label: "Pequeño",
    rango: "< 1 MW",
    detalle: "Autogenerador / distribuido (no requiere UPME).",
  },
  {
    id: "mediano",
    label: "Mediano",
    rango: "> 1 y < 20 MW",
    detalle: "Generación intermedia.",
  },
  {
    id: "grande",
    label: "Grande",
    rango: "> 20 MW",
    detalle: "Utility scale.",
  },
] as const;

export type TamanoId = (typeof TAMANO_CATEGORIAS)[number]["id"];

/** Devuelve la categoría de tamaño para una capacidad nominal en MW. */
export function tamanoPorCapacidad(mw: number): (typeof TAMANO_CATEGORIAS)[number] {
  if (mw >= 20) return TAMANO_CATEGORIAS[2];
  if (mw > 1) return TAMANO_CATEGORIAS[1];
  return TAMANO_CATEGORIAS[0];
}

/**
 * Rangos de potencia por tipo de aerogenerador (Tabla 2 del cliente).
 * Sugerencia por capacidad: mediano bajo → pequeña o mediana; mediano alto →
 * mediana o grande; grande → utility (no se escoge).
 */
export const TIPO_AEROGENERADOR_RANGOS: Record<string, string> = {
  S: "Turbina pequeña · 1 kW – 100 kW",
  M: "Turbina mediana · 100 kW – 1 MW",
  L: "Turbina grande · 1 MW o más (utility)",
};
