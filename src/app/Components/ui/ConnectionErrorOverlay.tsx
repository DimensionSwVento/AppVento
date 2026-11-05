"use client";

/**
 * Aviso FLOTANTE de problemas de conexión (modo datos). Reemplaza al informe
 * cuando el backend está caído: en vez de generar el informe con datos en CERO
 * (que genera ruido), se muestra este aviso con una ilustración 404 y un botón
 * "Reintentar". Fondo semitransparente → se ve el mapa por detrás.
 */
export default function ConnectionErrorOverlay({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="conn-err-title"
      aria-describedby="conn-err-desc"
      className="fixed inset-0 z-[90] flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(241,245,248,0.72)", backdropFilter: "blur(2px)" }}
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-gray-200 bg-white/95 p-7 text-center shadow-xl">
        {/* Ilustración 404 (SVG inline, sin asset externo) */}
        <svg
          viewBox="0 0 220 120"
          className="mb-4 h-28 w-auto"
          fill="none"
          aria-hidden="true"
        >
          {/* 404 */}
          <text
            x="110"
            y="58"
            textAnchor="middle"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="800"
            fontSize="54"
            fill="#165170"
          >
            404
          </text>
          {/* Enchufe desconectado (motivo "sin conexión") */}
          <g stroke="#94a3b8" strokeWidth="4" strokeLinecap="round">
            <path d="M40 92 h40" />
            <path d="M140 92 h40" />
          </g>
          <g fill="#dc2626">
            <path d="M80 86 h14 a4 4 0 0 1 4 4 v4 a4 4 0 0 1 -4 4 h-14 z" />
            <path d="M84 80 v6 M90 80 v6" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
          </g>
          <g fill="#165170">
            <path d="M140 86 h-14 a4 4 0 0 0 -4 4 v4 a4 4 0 0 0 4 4 h14 z" />
          </g>
          {/* chispa de desconexión */}
          <path d="M106 84 l4 -8 l-2 6 l6 -2 l-5 9" fill="#f59e0b" stroke="none" />
        </svg>

        <h2 id="conn-err-title" className="text-base font-bold text-[#165170ff]">
          Hay problemas de conexión
        </h2>
        <p id="conn-err-desc" className="mt-2 text-sm text-gray-500">
          No pudimos conectar con el servidor, así que no generamos el informe
          para no mostrarte datos en cero. Revisa tu conexión e inténtalo de nuevo.
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#165170ff] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1e6a8c]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 10a8 8 0 0 0-14.3-3.7L4 10M4 14a8 8 0 0 0 14.3 3.7L20 14" />
          </svg>
          Reintentar
        </button>
      </div>
    </div>
  );
}
