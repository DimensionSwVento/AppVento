/**
 * Gráfico de líneas (serie de tiempo) en SVG puro (US04-02). Para las
 * proyecciones económicas. Mismo enfoque que RadarChart/PieChart/BarChart:
 * sin librería de charting y con colores hex inline para capturarse limpio en
 * el PDF (html2canvas-pro).
 */
export interface LineSeries {
  label: string;
  color: string;
  points: { year: number; value: number }[];
  /** Unidad de la serie (%, USD/MWh, …) — para agrupar por escala en LineChartGrid. */
  unit?: string;
}

export default function LineChart({
  series,
  width = 380,
  height = 210,
  className = "",
}: {
  series: LineSeries[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const withData = series.filter((s) => s.points.length > 0);
  if (withData.length === 0) return null;

  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 34; // eje X (años) + leyenda
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const years = withData[0].points.map((p) => p.year);
  const xMin = years[0];
  const xMax = years[years.length - 1];
  const allVals = withData.flatMap((s) => s.points.map((p) => p.value));
  const yMax = Math.max(1, ...allVals) * 1.1;
  const yMin = 0;

  const x = (year: number) =>
    padL + (xMax === xMin ? 0 : ((year - xMin) / (xMax - xMin)) * plotW);
  const y = (val: number) =>
    padT + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMin + f * (yMax - yMin)));

  return (
    <svg
      // width/height explícitos → tamaño INTRÍNSECO. Sin ellos, el `viewBox`
      // solo da relación de aspecto y el SVG se colapsa a ~0 dentro de un flex
      // (p.ej. la rejilla de LineChartGrid). `maxWidth:100%` lo mantiene responsive.
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ maxWidth: "100%", height: "auto", flexShrink: 0 }}
      className={className}
      role="img"
      aria-label={`Proyección económica: ${withData.map((s) => s.label).join(", ")}`}
    >
      {/* Cuadrícula + eje Y */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={y(t)} x2={width - padR} y2={y(t)} stroke="#eef2f5" strokeWidth={1} />
          <text x={padL - 5} y={y(t)} fontSize={8} fill="#9ca3af" textAnchor="end" dominantBaseline="middle">
            {t}
          </text>
        </g>
      ))}

      {/* Eje X (años) — muestra hasta 6 marcas para no saturar */}
      {years
        .filter((_, i) => i % Math.ceil(years.length / 6) === 0 || i === years.length - 1)
        .map((yr) => (
          <text key={yr} x={x(yr)} y={height - padB + 12} fontSize={8} fill="#9ca3af" textAnchor="middle">
            {yr}
          </text>
        ))}

      {/* Series */}
      {withData.map((s) => {
        const d = s.points
          .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`)
          .join(" ");
        return (
          <g key={s.label}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
            {s.points.map((p, i) => (
              <circle key={i} cx={x(p.year)} cy={y(p.value)} r={2} fill={s.color}>
                <title>{`${s.label} · ${p.year}: ${p.value}`}</title>
              </circle>
            ))}
          </g>
        );
      })}

      {/* Leyenda */}
      {withData.map((s, i) => (
        <g key={`lg-${s.label}`} transform={`translate(${padL + i * (plotW / withData.length)}, ${height - 6})`}>
          <rect x={0} y={-7} width={9} height={9} rx={2} fill={s.color} />
          <text x={12} y={0} fontSize={8} fill="#4b5563">
            {s.label.length > 18 ? `${s.label.slice(0, 17)}…` : s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
