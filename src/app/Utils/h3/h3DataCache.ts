/**
 * ⚠️ TEMPORAL — Reemplazar con integración a base de datos (PostgreSQL + PostGIS)
 *
 * Cache en memoria para los datos H3 parseados del .parquet.
 * Almacena el resultado del parseo para evitar re-leer el archivo en cada request.
 */

import type { H3DataSet } from "./parseH3Parquet";

let cachedData: H3DataSet | null = null;

/**
 * Almacena los datos H3 parseados en cache de memoria.
 *
 * ⚠️ TEMPORAL — Migrar a PostgreSQL + PostGIS cuando se implemente la épica E6
 */
export function storeH3Data(data: H3DataSet): void {
  cachedData = data;
}

/**
 * Retorna los datos H3 del cache. null si no hay datos almacenados.
 *
 * ⚠️ TEMPORAL — Migrar a query PostgreSQL cuando se implemente la épica E6
 */
export function getH3Data(): H3DataSet | null {
  return cachedData;
}
