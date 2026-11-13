"use client";

import SideBar from "../Components/layout/SideBar";
import AdminNav from "../Components/Admin/AdminNav";

/**
 * Fallback de Suspense del segmento /admin (mientras el `layout.tsx` resuelve en
 * servidor `await auth()` + rol admin, y mientras carga cada página).
 *
 * #22: antes era un overlay a PANTALLA COMPLETA (`fixed inset-0`) que tapaba la
 * barra lateral y "rompía el flujo". Ahora renderiza el MISMO shell que las
 * páginas admin (SideBar + AdminNav) con el spinner DENTRO del panel → la barra
 * queda accesible y la carga se espera en el área de contenido, no fuera.
 */
export default function AdminLoading() {
  return (
    <main className="flex h-screen w-full">
      <SideBar>
        <div className="flex h-full w-full flex-col" />
      </SideBar>

      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-4xl px-8 py-10">
          <AdminNav />
          <div className="mt-10 flex flex-col items-center justify-center gap-3 py-24 text-gray-500">
            <div
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent"
              role="status"
              aria-label="Cargando"
            />
            <p className="text-sm">Cargando el panel de administración…</p>
          </div>
        </div>
      </div>
    </main>
  );
}
