"use client";
/**
 * Caché en memoria (por pestaña) para datos de BD de SOLO LECTURA relativamente
 * estáticos (normas, escenarios, rangos, textos del informe, catálogo…). Evita
 * que cada acción/render dispare una consulta a BD. TTL corto + INVALIDACIÓN
 * explícita desde las mutaciones → una edición en admin refresca de inmediato.
 *
 * Directiva: "cachear localmente cosas para que cada acción no sea una consulta
 * a BD" — sin saturar (TTL) y sin quedar viejo (invalidate en create/update/delete).
 */
type Entry = { at: number; val: unknown };

const _cache = new Map<string, Entry>();
const _inflight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL = 5 * 60_000; // 5 min

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.val as T;
  // Coalesce: si ya hay un fetch en vuelo para esta clave, reúsalo (no apila).
  const inflight = _inflight.get(key);
  if (inflight) return inflight as Promise<T>;
  const p = fetcher()
    .then((val) => {
      _cache.set(key, { at: Date.now(), val });
      return val;
    })
    .finally(() => _inflight.delete(key));
  _inflight.set(key, p);
  return p as Promise<T>;
}

/** Borra entradas del caché (llámalo tras crear/editar/borrar ese recurso). */
export function invalidate(...keys: string[]): void {
  for (const k of keys) _cache.delete(k);
}
