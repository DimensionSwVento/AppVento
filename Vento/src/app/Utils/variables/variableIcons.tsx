/**
 * Resolución de íconos por variable — soporta tres fuentes mezcladas:
 *
 *   `iconKey` (del catálogo) → componente React a renderizar:
 *   - `lucide:<PascalName>` → ícono de `lucide-react`
 *   - `tabler:<key>`        → SVG estilo Tabler dibujado inline (tablerIcons.tsx)
 *   - `svg:<key>`           → SVG propio (customIcons.tsx)
 *
 * Las tres comparten viewBox 24×24, fill=none, currentColor y stroke 2 →
 * se ven como un único set.
 *
 * Si el cliente entrega su propia librería de íconos (SVGs en
 * `public/icons/…`), basta con cambiar este archivo: el catálogo y los
 * consumidores no se tocan.
 */
import { createElement, type ComponentType, type SVGProps } from "react";
import * as lucide from "lucide-react";
import { CUSTOM_ICONS, type CustomIconKey } from "./customIcons";
import { TABLER_ICONS, type TablerIconKey } from "./tablerIcons";
import { getVariableById } from "./variablesCatalog";

export type VariableIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Fallback cuando no se reconoce la `iconKey` o la variable. */
const FALLBACK_ICON: VariableIconComponent = lucide.Info as VariableIconComponent;

/** Resuelve el componente de ícono para una `iconKey` con prefijo. */
export function getIconByKey(iconKey: string): VariableIconComponent {
  const [lib, name] = iconKey.split(":");
  if (!lib || !name) return FALLBACK_ICON;

  if (lib === "lucide") {
    const reg = lucide as unknown as Record<string, VariableIconComponent>;
    return reg[name] ?? FALLBACK_ICON;
  }
  if (lib === "tabler") {
    return TABLER_ICONS[name as TablerIconKey] ?? FALLBACK_ICON;
  }
  if (lib === "svg") {
    return CUSTOM_ICONS[name as CustomIconKey] ?? FALLBACK_ICON;
  }
  return FALLBACK_ICON;
}

/** Resuelve el ícono de una variable a partir de su id. */
export function getIconByVariableId(variableId: string): VariableIconComponent {
  const v = getVariableById(variableId);
  if (!v) return FALLBACK_ICON;
  return getIconByKey(v.iconKey);
}

/**
 * Componente estático que resuelve y renderiza el ícono de una variable.
 * Úsalo en vez de `const Icon = getIconByVariableId(...)` dentro de un
 * render: asignar componentes durante el render dispara la regla
 * react-hooks/static-components. Internamente usa createElement porque el
 * componente resuelto sale de mapas estáticos (no se crea en cada render).
 */
export function VariableIcon({
  variableId,
  ...svgProps
}: { variableId: string } & SVGProps<SVGSVGElement>) {
  return createElement(getIconByVariableId(variableId), svgProps);
}
