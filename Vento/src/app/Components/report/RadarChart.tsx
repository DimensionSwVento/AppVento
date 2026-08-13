/**
 * Radar / spider chart en SVG puro (US06-01). Sin librería de charting, para
 * integrarse con Tailwind v4/OKLCH y capturarse limpio en el PDF (html2canvas-pro).
 * Todos los colores van inline como hex para no depender de utilidades de color.
 */
type Axis = { label: string; value: number }; // value en escala 0–100

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function RadarChart({
  axes,
  size = 240,
  className = "",
}: {
  axes: Axis[];
  size?: number;
  className?: string;
}) {
  const n = axes.length;
  if (n < 3) return null; // un radar necesita al menos 3 ejes

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.3;
  const labelR = R + 20;
  const levels = [0.25, 0.5, 0.75, 1];
  // Padding horizontal del viewBox: da aire para etiquetas largas (ej.
  // "económica" / "Socioeconómica") que antes se cortaban en el borde.
  const padX = 76;

  const angleFor = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const point = (i: number, radius: number): [number, number] => {
    const a = angleFor(i);
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  };
  const polyPoints = (radiusFor: (i: number) => number) =>
    axes.map((_, i) => point(i, radiusFor(i)).join(",")).join(" ");

  const dataPoints = polyPoints((i) => R * clamp01(axes[i].value / 100));

  return (
    <svg
      viewBox={`${-padX} 0 ${size + padX * 2} ${size}`}
      className={className}
      role="img"
      aria-label={`Radar de idoneidad por dimensión: ${axes
        .map((a) => `${a.label} ${Math.round(a.value)} de 100`)
        .join(", ")}`}
    >
      {/* Anillos de la cuadrícula */}
      {levels.map((lv) => (
        <polygon
          key={lv}
          points={polyPoints(() => R * lv)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}

      {/* Ejes radiales */}
      {axes.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />;
      })}

      {/* Polígono de datos */}
      <polygon points={dataPoints} fill="#165170" fillOpacity={0.25} stroke="#165170" strokeWidth={2} />

      {/* Vértices con tooltip por eje */}
      {axes.map((a, i) => {
        const [x, y] = point(i, R * clamp01(a.value / 100));
        return (
          <circle key={i} cx={x} cy={y} r={3} fill="#165170">
            <title>{`${a.label}: ${a.value.toFixed(1)} / 100`}</title>
          </circle>
        );
      })}

      {/* Etiquetas de cada eje */}
      {axes.map((a, i) => {
        const [x, y] = point(i, labelR);
        const anchor = x < cx - 1 ? "end" : x > cx + 1 ? "start" : "middle";
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fill="#4b5563"
            fontSize={10}
            fontWeight={600}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
