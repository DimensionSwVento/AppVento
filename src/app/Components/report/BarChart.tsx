/**
 * Gráfico de barras horizontales en SVG puro (US06-03). Alternativa al radar
 * para los puntajes por dimensión (y fallback cuando hay <3 dimensiones, que
 * el radar no puede dibujar). Colores hex inline para capturarse limpio en el
 * PDF (html2canvas-pro), igual que RadarChart/PieChart.
 */
type Bar = { label: string; value: number }; // value en escala 0–100

export default function BarChart({
  data,
  width = 340,
  className = "",
}: {
  data: Bar[];
  width?: number;
  className?: string;
}) {
  if (data.length === 0) return null;

  const rowH = 22;
  const gap = 10;
  const padL = 92; // espacio para etiquetas ("Socioeconómica")
  const padR = 34; // espacio para el valor
  const padY = 8;
  const barW = width - padL - padR;
  const height = padY * 2 + data.length * rowH + (data.length - 1) * gap;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Barras de idoneidad por dimensión: ${data
        .map((a) => `${a.label} ${Math.round(a.value)} de 100`)
        .join(", ")}`}
    >
      {data.map((d, i) => {
        const y = padY + i * (rowH + gap);
        const mid = y + rowH / 2;
        const v = Math.max(0, Math.min(100, d.value));
        const w = (v / 100) * barW;
        return (
          <g key={i}>
            <text
              x={padL - 6}
              y={mid}
              fontSize={10}
              fill="#4b5563"
              fontWeight={600}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {d.label}
            </text>
            <rect x={padL} y={mid - 5} width={barW} height={10} rx={5} fill="#e5e7eb" />
            <rect x={padL} y={mid - 5} width={w} height={10} rx={5} fill="#165170">
              <title>{`${d.label}: ${d.value.toFixed(1)} / 100`}</title>
            </rect>
            <text
              x={padL + barW + 4}
              y={mid}
              fontSize={10}
              fill="#165170"
              fontWeight={700}
              dominantBaseline="middle"
            >
              {d.value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
