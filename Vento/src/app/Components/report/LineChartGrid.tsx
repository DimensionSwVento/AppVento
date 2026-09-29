/**
 * Rejilla de "small-multiples" para las proyecciones económicas (#7). Un solo
 * LineChart con muchas variables de UNIDADES distintas (%, USD/MWh, MUSD, índice…)
 * aplasta las series pequeñas contra el eje y solapa la leyenda. Aquí se parten en
 * varios gráficos: primero por UNIDAD (misma escala comparable) y, dentro de cada
 * unidad, en bloques de `maxPerChart` series (def. 3) para que la leyenda respire.
 * Cada sub-gráfico conserva su autoescalado (lo hace `LineChart`).
 *
 * Reutiliza el primitivo `LineChart` (no lo modifica): mantiene su responsabilidad
 * única (N series sobre UN eje autoescalado).
 */
import LineChart, { type LineSeries } from "./LineChart";

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function LineChartGrid({
  series,
  chartWidth = 300,
  chartHeight = 190,
  maxPerChart = 3,
  className = "",
}: {
  series: LineSeries[];
  chartWidth?: number;
  chartHeight?: number;
  /** Máx. series por sub-gráfico. `Infinity` = todo en uno (p.ej. comparar escenarios). */
  maxPerChart?: number;
  className?: string;
}) {
  const withData = series.filter((s) => s.points.length > 0);
  if (withData.length === 0) return null;

  // 1 solo gráfico si caben (≤ maxPerChart) o si se pide explícitamente (Infinity).
  if (withData.length <= maxPerChart || maxPerChart === Infinity) {
    return (
      <LineChart series={withData} width={chartWidth} height={chartHeight} className={className} />
    );
  }

  // Agrupar por UNIDAD (escala comparable); dentro de cada unidad, trocear a maxPerChart.
  const byUnit = new Map<string, LineSeries[]>();
  for (const s of withData) {
    const u = s.unit ?? "";
    (byUnit.get(u) ?? byUnit.set(u, []).get(u)!).push(s);
  }
  const groups: { unit: string; series: LineSeries[] }[] = [];
  for (const [unit, list] of byUnit) {
    for (const part of chunk(list, maxPerChart)) groups.push({ unit, series: part });
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {groups.map((g, i) => (
        <div key={i} className="flex flex-col">
          {g.unit && (
            <span className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
              {g.unit}
            </span>
          )}
          <LineChart series={g.series} width={chartWidth} height={chartHeight} />
        </div>
      ))}
    </div>
  );
}
