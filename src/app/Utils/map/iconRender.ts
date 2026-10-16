import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getIconByKey } from "../variables/variableIcons";

// Cache: renderizar el SVG es relativamente caro; el par (iconKey, color) es
// estable, así que se memoiza el data-URI resultante.
const _cache = new Map<string, string>();

/** Fondo blanco + BORDE GRUESO del color de la variable + punto del color
 *  (fallback si el icono no resuelve; p.ej. variable sin `iconKey`). El borde
 *  codifica el color para distinguir la variable entre varios iconos del mapa. */
function circleFallback(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">` +
    `<circle cx="24" cy="24" r="18" fill="#ffffff" stroke="${color}" stroke-width="5"/>` +
    `<circle cx="24" cy="24" r="7" fill="${color}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Renderiza un `iconKey` (lucide/tabler/svg) a un data-URI SVG para el IconLayer
 * de deck.gl y para la leyenda de capas: círculo BLANCO con un BORDE GRUESO del
 * color de la variable y el glifo (del mismo color) centrado. El borde grueso
 * sirve para saber de qué variable es cada icono cuando hay varios en el mapa
 * (además del hexágono coloreado en modo área). Memoizado por (iconKey, color).
 * Si algo falla, cae al círculo simple (no rompe el mapa). Así el icono ASIGNADO
 * EN ADMIN se pinta, con su color, en la capa de la variable.
 */
export function iconKeyToDataUri(iconKey: string, color: string): string {
  const key = `${iconKey}|${color}`;
  const hit = _cache.get(key);
  if (hit) return hit;
  let uri: string;
  try {
    const Icon = getIconByKey(iconKey);
    const glyph = renderToStaticMarkup(
      createElement(Icon, {
        width: 24,
        height: 24,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color,
        strokeWidth: 2.4,
      } as Record<string, unknown>),
    );
    uri =
      `data:image/svg+xml;charset=utf-8,` +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">` +
          `<circle cx="24" cy="24" r="18" fill="#ffffff" stroke="${color}" stroke-width="5"/>` +
          `<g transform="translate(12,12)">${glyph}</g>` +
          `</svg>`,
      );
  } catch {
    uri = circleFallback(color);
  }
  _cache.set(key, uri);
  return uri;
}
