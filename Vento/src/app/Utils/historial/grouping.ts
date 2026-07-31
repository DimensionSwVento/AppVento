import type { InformeEntry } from "./types";

export type HistorialGroups = {
  hoy: InformeEntry[];
  semana: InformeEntry[];
  mes: InformeEntry[];
  anteriores: InformeEntry[];
};

/** Agrupa entradas por recencia: Hoy / Esta semana / Este mes / Más antiguos. */
export function groupByRecency(
  entries: InformeEntry[],
  now: Date = new Date(),
): HistorialGroups {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dayMs = 86_400_000;
  const weekAgo = startOfToday - 6 * dayMs;
  const monthAgo = startOfToday - 29 * dayMs;

  const groups: HistorialGroups = { hoy: [], semana: [], mes: [], anteriores: [] };
  for (const e of entries) {
    const t = new Date(e.createdAt).getTime();
    if (t >= startOfToday) groups.hoy.push(e);
    else if (t >= weekAgo) groups.semana.push(e);
    else if (t >= monthAgo) groups.mes.push(e);
    else groups.anteriores.push(e);
  }
  return groups;
}
