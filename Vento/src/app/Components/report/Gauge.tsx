/**
 * Gauge semicircular "Índice de viabilidad" (US06-03) en SVG puro. Muestra el
 * score general (0–100) sobre un arco superior, con color por rango y etiqueta
 * ALTA/MEDIA/BAJA. Colores hex inline para capturarse limpio en el PDF.
 */
const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Color y etiqueta por rango de viabilidad. */
export function viabilityBand(value: number): { color: string; label: string } {
  const v = clamp(value);
  if (v >= 66) return { color: "#16a34a", label: "VIABILIDAD ALTA" };
  if (v >= 33) return { color: "#f59e0b", label: "VIABILIDAD MEDIA" };
  return { color: "#dc2626", label: "VIABILIDAD BAJA" };
}

export default function Gauge({
  value,
  size = 200,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const v = clamp(value);
  const cx = size / 2;
  const cy = size * 0.62;
  const r = size * 0.42;
  const band = viabilityBand(v);

  // Punto sobre el arco superior en la fracción t (0 = izquierda, 1 = derecha).
  const pt = (t: number): [number, number] => {
    const a = Math.PI - Math.PI * t; // π → 0
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const arc = (t0: number, t1: number) => {
    const [x0, y0] = pt(t0);
    const [x1, y1] = pt(t1);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size * 0.78}`}
      className={className}
      /* #4: el número del score general hereda la fuente del informe (antes el
         texto SVG salía en otra fuente). */
      style={{ fontFamily: "inherit" }}
      role="img"
      aria-label={`Índice de viabilidad ${v.toFixed(0)} de 100, ${band.label}`}
    >
      {/* Arco base */}
      <path d={arc(0, 1)} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.09} strokeLinecap="round" />
      {/* Arco de valor */}
      <path d={arc(0, v / 100)} fill="none" stroke={band.color} strokeWidth={size * 0.09} strokeLinecap="round" />
      {/* Valor */}
      <text x={cx} y={cy - size * 0.02} textAnchor="middle" fontSize={size * 0.22} fontWeight={700} fill="#165170">
        {v.toFixed(0)}%
      </text>
      {/* Etiqueta de banda */}
      <text x={cx} y={cy + size * 0.12} textAnchor="middle" fontSize={size * 0.075} fontWeight={700} fill={band.color}>
        {band.label}
      </text>
    </svg>
  );
}
