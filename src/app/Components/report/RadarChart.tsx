/**
 * Radar / spider chart en SVG puro (US06-01). Sin librería de charting, para
 * integrarse con Tailwind v4/OKLCH y capturarse limpio en el PDF (html2canvas-pro).
 * Todos los colores van inline como hex para no depender de utilidades de color.
 */
type Axis = { label: string; value: number; color?: string }; // value 0–100; color por dimensión

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
  // Padding horizontal del viewBox: da aire para etiquetas largas que antes se
  // cortaban en el borde. Las etiquetas muy largas (subcriterios/variables del
  // desglose #36) además se TRUNCAN (el nombre completo va en el tooltip del
  // vértice y en la lista de origen del informe).
  const padX = 94;
  const shortLabel = (s: string) => (s.length > 16 ? s.slice(0, 15) + "…" : s);

  const angleFor = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const point = (i: number, radius: number): [number, number] => {
    const a = angleFor(i);
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  };
  const polyPoints = (radiusFor: (i: number) => number) =>
    axes.map((_, i) => point(i, radiusFor(i)).join(",")).join(" ");

  const dataXY = axes.map((_, i) => point(i, R * clamp01(axes[i].value / 100)));

  return (
    <svg
      viewBox={`${-padX} 0 ${size + padX * 2} ${size}`}
      className={className}
      style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
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
          stroke="#475569"
          strokeWidth={1}
        />
      ))}

      {/* ESCALA: valor (0–100) de cada aro, sobre el eje vertical (hacia arriba),
          para leer qué significa cada anillo. */}
      {levels.map((lv) => (
        <text
          key={`scale-${lv}`}
          x={cx + 3}
          y={cy - R * lv}
          fontSize={9}
          fill="#111827"
          fontWeight={700}
          dominantBaseline="middle"
        >
          {Math.round(lv * 100)}
        </text>
      ))}

      {/* Ejes radiales — cada uno en el color de su dimensión */}
      {axes.map((a, i) => {
        const [x, y] = point(i, R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={a.color ?? "#475569"}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        );
      })}

      {/* Área de datos partida en ZONAS por dimensión: cada vértice (dimensión)
          pinta su porción con su PROPIO color (sin borde). La zona de la dimensión
          i va del centro a los puntos medios con sus vecinas, pasando por su vértice. */}
      {axes.map((a, i) => {
        const prev = (i - 1 + n) % n;
        const next = (i + 1) % n;
        const mPrev = [
          (dataXY[i][0] + dataXY[prev][0]) / 2,
          (dataXY[i][1] + dataXY[prev][1]) / 2,
        ];
        const mNext = [
          (dataXY[i][0] + dataXY[next][0]) / 2,
          (dataXY[i][1] + dataXY[next][1]) / 2,
        ];
        const zone = `${cx},${cy} ${mPrev[0]},${mPrev[1]} ${dataXY[i][0]},${dataXY[i][1]} ${mNext[0]},${mNext[1]}`;
        return (
          <polygon
            key={`zone-${i}`}
            points={zone}
            fill={a.color ?? "#165170"}
            fillOpacity={0.35}
            stroke="none"
          />
        );
      })}

      {/* Vértices con tooltip por eje */}
      {axes.map((a, i) => {
        const [x, y] = point(i, R * clamp01(a.value / 100));
        return (
          <circle key={i} cx={x} cy={y} r={3.5} fill={a.color ?? "#165170"}>
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
            fill={a.color ?? "#4b5563"}
            fontSize={13}
            fontWeight={700}
          >
            {shortLabel(a.label)}
            <title>{a.label}</title>
          </text>
        );
      })}
    </svg>
  );
}
