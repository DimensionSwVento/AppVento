"use client";

import { useSession } from "next-auth/react";

/**
 * `true` si la sesión actual tiene rol admin. FUENTE ÚNICA para gatear UI de
 * admin en el cliente (SideBar → gestión de usuarios, exportaciones del informe,
 * etc.), en vez de repetir `session?.roles?.includes("admin")` en cada sitio.
 *
 * OJO: esto es solo para la UI. El ACCESO real sigue protegido server-side por
 * `middleware.ts` y `admin/layout.tsx` (redirigen si no hay rol admin).
 */
export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  return !!session?.roles?.includes("admin");
}
