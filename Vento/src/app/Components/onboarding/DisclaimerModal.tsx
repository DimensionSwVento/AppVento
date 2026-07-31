"use client";
import { useEffect } from "react";
import {
  DISCLAIMER_BODY,
  DISCLAIMER_TITLE,
} from "../../Utils/report/reportTemplates";

/**
 * Aviso legal / disclaimer al INICIO (petición reunión): igual que el onboarding,
 * aparece en un flotante para que el usuario sepa —antes de usar la herramienta—
 * que Vento es INFORMATIVO y no constituye un certificado/aval legal. El mismo
 * texto (template `reportTemplates.ts`) se repite en el informe/PDF, así el aviso
 * queda visible al inicio y al final. Texto oficial pendiente de Secretaría General.
 */
export default function DisclaimerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={DISCLAIMER_TITLE}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center gap-3 bg-[#165170ff] px-5 py-4 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            {/* icono de aviso */}
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="text-sm font-bold leading-snug">{DISCLAIMER_TITLE}</h2>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          <p className="text-xs leading-relaxed text-gray-600">{DISCLAIMER_BODY}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-full bg-[#123a4d] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d2c3a]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
