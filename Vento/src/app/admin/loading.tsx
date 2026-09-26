/**
 * Pantalla de carga del segmento /admin. Next.js la muestra automáticamente
 * (fallback de Suspense) mientras el `layout.tsx` del admin resuelve en servidor
 * `await auth()` + la validación de rol admin — que es lo que hace lenta la
 * entrada a la ventana de administración.
 *
 * La validación es un único `await` (booleano permitido/no), así que NO hay un
 * porcentaje real que medir → spinner + barra INDETERMINADA (no finge %).
 */
export default function AdminLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[#0f3547] via-[#134b63] to-[#165170]">
      {/* keyframes de la barra indeterminada (se auto-desliza, sin porcentaje falso) */}
      <style>{`
        @keyframes ventoIndeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>

      <div className="flex w-[min(90vw,380px)] flex-col items-center rounded-2xl bg-white/10 px-8 py-10 text-center shadow-2xl ring-1 ring-white/15 backdrop-blur-md">
        {/* Spinner de marca */}
        <div
          className="h-12 w-12 animate-spin rounded-full border-[4px] border-white/25 border-t-white"
          role="status"
          aria-label="Validando permisos"
        />

        <h2 className="mt-6 text-lg font-semibold text-white">
          Estamos validando sus permisos
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-white/70">
          Un momento por favor — comprobando tu acceso al panel de administración.
        </p>

        {/* Barra indeterminada */}
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full w-1/4 rounded-full bg-white"
            style={{ animation: "ventoIndeterminate 1.2s ease-in-out infinite" }}
          />
        </div>
      </div>
    </div>
  );
}
