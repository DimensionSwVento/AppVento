/**
 * Detalle por variable para el popover de "Detalle de la variable seleccionada"
 * (pestañas: Cómo se calcula · Relevancia · Rango e interpretación).
 *
 * El contenido se DERIVA de los datos que ya tiene cada variable (peso/polaridad
 * del modelo, fuente, criterio/subcriterio, unidad, código de la master). Es un
 * TEMPLATE: cuando el cliente entregue las fichas redactadas, se puede sustituir
 * el texto derivado por `variable.detalle?.{calculo|relevancia|rango}` sin tocar
 * el componente (ver el fallback en cada helper).
 */
import {
  DIMENSIONS,
  type Variable,
} from "./variablesCatalog";
import { weightFor } from "./variableWeights";
import { getInfoVarById } from "./informativeVariables";
import { WEIGHT_BALANCING_NOTE } from "../report/reportTemplates";

/** Label de la dimensión sin el prefijo "Dimensión ". */
function dimLabel(id: Variable["dimension"]): string {
  const d = DIMENSIONS.find((x) => x.id === id);
  const raw = d ? d.label.replace(/^Dimensi[oó]n\s+/i, "") : id;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Unidad legible de la variable (o "índice" 0–100 por defecto). */
function unitOf(id: string): string {
  return getInfoVarById(id)?.unit ?? "índice";
}

export interface VariableDetail {
  calculo: string;
  relevancia: string;
  rango: string;
}

/**
 * Construye el detalle derivado de una variable. Determinista y sin datos fake:
 * describe el tratamiento del modelo, no valores concretos del área.
 */
export function variableDetail(variable: Variable): VariableDetail {
  const w = weightFor(variable.id);
  const dim = dimLabel(variable.dimension);
  const unit = unitOf(variable.id);
  const grupo = variable.subcriterio
    ? `${variable.criterio} › ${variable.subcriterio}`
    : variable.criterio;
  const fuente =
    variable.fuente && variable.fuente !== "(sin definir)"
      ? variable.fuente
      : null;
  const codigo = variable.masterId !== "NA" ? variable.masterId : null;

  // ── Cómo se calcula ────────────────────────────────────────────────
  const calculoPartes = [
    `Para cada hexágono del área se toma el valor de «${variable.label}»` +
      (fuente ? ` a partir de la fuente ${fuente}` : "") +
      ", se normaliza a una escala 0–100 y se agrega (promedio) sobre el área seleccionada.",
    w !== 0
      ? `Entra al modelo multicriterio (WLC) de la dimensión ${dim} con un peso relativo de ${Math.abs(
          w,
        ).toFixed(1)} (${w > 0 ? "signo positivo" : "signo negativo"}).`
      : `No aporta al puntaje de idoneidad: se muestra como información de contexto.`,
    variable.enMapa ? "Además se representa como capa en el mapa." : null,
    codigo ? `Código de la variable: ${codigo}.` : null,
  ].filter(Boolean);

  // ── Relevancia ─────────────────────────────────────────────────────
  const relevancia =
    (w > 0
      ? `Un valor alto de esta variable AUMENTA la idoneidad del emplazamiento (contribución positiva al modelo).`
      : w < 0
        ? `Un valor alto de esta variable REDUCE la idoneidad del emplazamiento (restricción o penalización).`
        : `Variable informativa: no altera el puntaje de idoneidad, aporta contexto para la decisión.`) +
    ` Forma parte del criterio «${grupo}» de la dimensión ${dim}.` +
    ` ${WEIGHT_BALANCING_NOTE}`;

  // ── Rango e interpretación ─────────────────────────────────────────
  const escala =
    unit === "índice"
      ? "El indicador se expresa como un índice normalizado de 0 a 100."
      : `El indicador se expresa en ${unit} y luego se normaliza a 0–100 para el modelo.`;
  const lectura =
    w > 0
      ? "Interpretación: a mayor valor, mejor idoneidad."
      : w < 0
        ? "Interpretación: a mayor valor, mayor restricción (peor idoneidad)."
        : "Interpretación: se usa solo como referencia, sin efecto en el puntaje.";
  const rango = `${escala} ${lectura} (Los rangos definitivos dependen de los datos reales de la master.)`;

  return { calculo: calculoPartes.join(" "), relevancia, rango };
}
