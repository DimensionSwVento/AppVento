/**
 * Gráfico circular (dona) en SVG puro (US06-03). Alternativa al radar para los
 * puntajes por dimensión. Mismo enfoque que RadarChart: sin librería de
 * charting y con colores hex inline para capturarse limpio en el PDF
 * (html2canvas-pro). Cada sector es proporcional al puntaje de la dimensión
 * (comparación relativa entre dimensiones); el valor real (0–100) se muestra
 * en la leyenda.
 */
type Slice = { label: string; value: number }; // value en escala 0–100

// Paleta cualitativa (misma línea viridis/marca del proyecto).
const PALETTE = ["#165170", "#21918c", "#5ec962", "#3b528b", "#fde725", "#e07a5f"];

export default function PieChart({
  data,
  size = 200,
  className = "",
}: {
  data: Slice[];
  size?: number;
  className?: string;
}) {
  const vals = data.filter((d) => d.value > 0);
  const total = vals.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const inner = r * 0.55; // dona
  const legendW = 150;

  const polar = (ang: number, rad: number): [number, number] => [
    cx + rad * Math.cos(ang),
    cy + rad * Math.sin(ang),
  ];

  // Offsets acumulados SIN mutar (regla react-hooks/immutability): la suma
  // previa de cada sector se calcula desde los anteriores.
  const arcs = vals.map((d, i) => {
    const before = vals.slice(0, i).reduce((s, v) => s + v.value, 0);
    const start = (before / total) * Math.PI * 2 - Math.PI / 2;
    const end = ((before + d.value) / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const [x1, y1] = polar(start, r);
    const [x2, y2] = polar(end, r);
    const [x3, y3] = polar(end, inner);
    const [x4, y4] = polar(start, inner);
    const path =
      `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} ` +
      `L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`;
    return { path, color: PALETTE[i % PALETTE.length], label: d.label, value: d.value };
  });

  return (
    <svg
      viewBox={`0 0 ${size + legendW} ${size}`}
      className={className}
      role="img"
      aria-label={`Gráfico circular de idoneidad por dimensión: ${vals
        .map((a) => `${a.label} ${Math.round(a.value)} de 100`)
        .join(", ")}`}
    >
      {arcs.map((a, i) => (
        <path key={i} d={a.path} fill={a.color} stroke="#ffffff" strokeWidth={1.5}>
          <title>{`${a.label}: ${a.value.toFixed(1)} / 100`}</title>
        </path>
      ))}

      {/* Leyenda con el valor real (0–100) de cada dimensión */}
      {arcs.map((a, i) => {
        const ly = size / 2 - (arcs.length * 20) / 2 + 10 + i * 20;
        return (
          <g key={`lg-${i}`}>
            <rect x={size + 8} y={ly - 7} width={11} height={11} rx={2} fill={a.color} />
            <text
              x={size + 24}
              y={ly}
              fontSize={10}
              fill="#4b5563"
              fontWeight={600}
              dominantBaseline="middle"
            >
              {a.label} · {a.value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
