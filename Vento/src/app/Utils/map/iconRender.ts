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

/** Glifo (del catálogo) renderizado a markup SVG 24×24 con el color dado. */
function glyphMarkup(iconKey: string, color: string): string {
  try {
    return renderToStaticMarkup(
      createElement(getIconByKey(iconKey), {
        width: 18,
        height: 18,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color,
        strokeWidth: 2.4,
      } as Record<string, unknown>),
    );
  } catch {
    return "";
  }
}

export interface PinSpec {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  id: string;
}

const _pinCache = new Map<string, PinSpec>();

/**
 * Marcador tipo "signo de ubicación" (pin): una CABEZA (cápsula blanca) con uno o
 * varios iconos-círculo del color de su variable LADO A LADO, y una ÚNICA PUNTA fina
 * abajo-centro que apunta a la ubicación. Con 1 variable es un pin normal; con varias
 * co-ubicadas la cabeza se ENSANCHA horizontalmente juntando los iconos (misma punta).
 * `anchor` = la punta (abajo-centro). Devuelve el data-URI + dimensiones (la IconLayer
 * conserva el aspecto). Memoizado por el conjunto (iconKey,color).
 */
export function compositePin(
  items: { iconKey: string; color: string }[],
): PinSpec {
  const id = "pin|" + items.map((i) => `${i.iconKey}:${i.color}`).join("|");
  const hit = _pinCache.get(id);
  if (hit) return hit;
  const n = Math.max(1, items.length);
  const D = 34; // diámetro de cada círculo-icono
  const gap = 2;
  const pad = 5;
  const tip = 13; // alto de la punta
  const W = pad * 2 + n * D + (n - 1) * gap;
  const headH = D + pad * 2;
  const H = headH + tip;
  let circles = "";
  items.forEach((it, k) => {
    const cx = pad + D / 2 + k * (D + gap);
    const cy = headH / 2;
    circles +=
      `<circle cx="${cx}" cy="${cy}" r="${D / 2 - 2}" fill="#ffffff" stroke="${it.color}" stroke-width="3"/>` +
      `<g transform="translate(${cx - 9},${cy - 9})">${glyphMarkup(it.iconKey, it.color)}</g>`;
  });
  const cxMid = W / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    // punta: triángulo blanco con borde gris (misma para 1 o varios)
    `<path d="M${cxMid - 7} ${headH - 3} L${cxMid + 7} ${headH - 3} L${cxMid} ${H - 1} Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>` +
    // cabeza: cápsula blanca
    `<rect x="0.6" y="0.6" width="${W - 1.2}" height="${headH - 1.2}" rx="${headH / 2}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>` +
    circles +
    `</svg>`;
  const spec: PinSpec = {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    width: W,
    height: H,
    anchorX: cxMid,
    anchorY: H,
    id,
  };
  _pinCache.set(id, spec);
  return spec;
}
