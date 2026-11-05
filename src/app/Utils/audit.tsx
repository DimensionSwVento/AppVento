"use client";

/**
 * MODO AUDITORÍA (TEMPORAL) — US "no real values hardcoded".
 *
 * Con `AUDIT_DB = true`, todo CAMPO DE VALOR REAL mostrado se reemplaza por el
 * marcador `{DATO BD}` → así se ve de un vistazo qué debería venir de la BD (y
 * dónde aún se llama). Lo que es CÁLCULO (mapa, scores, gráficos) se deja igual
 * pero se le pone debajo una etiqueta AMARILLA EN MAYÚSCULA con la lista de
 * datos que usa.
 *
 * Poner `AUDIT_DB = false` restaura todo (es solo para auditar). NO commitear en
 * true a producción.
 */
import type { ReactNode } from "react";

export const AUDIT_DB = false;

export const DB_MARK = "{DATO BD}";

/** Envuelve un valor REAL mostrado: en auditoría devuelve `{DATO BD}`. */
export function dbField<T>(realValue: T): T | string {
  return AUDIT_DB ? DB_MARK : realValue;
}

/**
 * Etiqueta amarilla en mayúscula con la lista de datos que usa un elemento de
 * CÁLCULO (mapa, gauge, gráficos). Se muestra solo en modo auditoría.
 */
export function AuditDataLabel({
  uses,
  className = "",
}: {
  uses: string[];
  className?: string;
}): ReactNode {
  if (!AUDIT_DB) return null;
  return (
    <p
      className={`mt-1 rounded bg-yellow-300 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-snug tracking-wide text-yellow-900 ${className}`}
    >
      USA (BD): {uses.join(" · ")}
    </p>
  );
}
