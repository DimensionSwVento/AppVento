export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Construye URLs de API sin dobles barras y conserva same-origin sin base. */
export function apiUrl(path: string): string {
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  const normalizedBase = API_BASE.replace(/\/+$/, "");
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}
