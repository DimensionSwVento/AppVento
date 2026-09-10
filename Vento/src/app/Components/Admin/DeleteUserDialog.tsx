'use client';

import { useState } from "react";
import { User } from "../../types/user";

interface DeleteUserDialogProps {
  user: User;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export default function DeleteUserDialog({ user, onClose, onConfirm }: DeleteUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(user.id);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage || "Error al desactivar el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop — click outside closes */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(180,195,210,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      {/* Dialog card */}
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl px-8 py-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-800 mb-2 pr-6">
          ¿Desactivar este usuario?
        </h3>

        {/* Description — copy HONESTO (US08-04.3): la acción NO borra, solo
            desactiva; el usuario queda inactivo y se puede reactivar. */}
        <p className="text-xs text-gray-500 leading-relaxed mb-6">
          El usuario quedará <b>inactivo</b> y perderá el acceso a la plataforma.
          Sus informes e información se conservan; puedes <b>reactivarlo</b> cuando
          quieras.
        </p>

        {error && (
          <div className="mb-4 p-2.5 text-xs text-red-700 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading}
            type="button"
            className="px-5 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#165170" }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#113d56"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#165170"; }}
          >
            {loading ? "Desactivando..." : "Desactivar"}
          </button>
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
