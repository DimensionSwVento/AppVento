/**
 * Barras divergentes (suma/resta) en SVG puro — para "las variables que más
 * influyen". Verde a la derecha = suma idoneidad; rojo a la izquierda = resta.
 * SVG (no CSS) para que se capture SIEMPRE en el PDF (html2canvas). Colores hex
 * inline como el resto de gráficos del informe.
 */
export interface DivergingBar {
  label: string;
  sube: boolean;
  mag: number; // magnitud 0–1 (relativa al mayor)
}

export default function DivergingBars({
  bars,
  width = 360,
  className = "",
}: {
  bars: DivergingBar[];
  width?: number;
  className?: string;
}) {
  if (bars.length === 0) return null;

  const rowH = 18;
  const gap = 6;
  const padY = 6;
  const labelW = 150;
  // -10 (antes -6): reserva sitio para la PUNTA de la flecha, que sobresale ~11px
  // del final de la barra. Con -6 la flecha de una barra a magnitud máxima se
  // salía del viewBox y se veía CORTADA en el PDF. Con -10 cabe con holgura.
  const half = (width - labelW) / 2 - 10; // ancho máx de cada lado
  const cx = labelW + half + 6; // eje central
  const height = padY * 2 + bars.length * rowH + (bars.length - 1) * gap;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      /* Fuente EXPLÍCITA (no "inherit"): svg2pdf lee "inherit" literal y, al no
         resolverlo, caía a su fuente serif por defecto → las etiquetas del chart
         salían en otra fuente en el PDF. Helvetica la mapea svg2pdf y coincide con
         el cuerpo del informe (forzado a Helvetica/Arial en la captura). */
      style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      role="img"
      aria-label={`Variables que más influyen: ${bars
        .map((b) => `${b.label} ${b.sube ? "suma" : "resta"}`)
        .join(", ")}`}
    >
      {/* Eje central */}
      <line x1={cx} y1={padY} x2={cx} y2={height - padY} stroke="#94a3b8" strokeWidth={1} />
      {bars.map((b, i) => {
        const y = padY + i * (rowH + gap);
        const mid = y + rowH / 2;
        const w = Math.max(2, Math.min(1, b.mag) * half);
        const color = b.sube ? "#16a34a" : "#dc2626";
        return (
          <g key={i}>
            <text
              x={labelW - 6}
              y={mid}
              fontSize={12}
              fill="#4b5563"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {b.label.length > 26 ? `${b.label.slice(0, 25)}…` : b.label}
            </text>
            <rect
              x={b.sube ? cx : cx - w}
              y={mid - 5}
              width={w}
              height={10}
              rx={2}
              fill={color}
            >
              <title>{`${b.label}: ${b.sube ? "suma" : "resta"} idoneidad`}</title>
            </rect>
            {/* #9: triángulo SVG (no el carácter ↑/↓, que en el PDF salía como
                "punto abstracto" si la fuente no tiene el glifo). */}
            {b.sube ? (
              <polygon
                points={`${cx + w + 7},${mid - 4} ${cx + w + 3},${mid + 3} ${cx + w + 11},${mid + 3}`}
                fill={color}
              />
            ) : (
              <polygon
                points={`${cx - w - 7},${mid + 4} ${cx - w - 11},${mid - 3} ${cx - w - 3},${mid - 3}`}
                fill={color}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
