"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { initialized, authenticated, login, register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && authenticated) {
      router.replace("/auth-test");
    }
  }, [initialized, authenticated, router]);

  if (!initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Conectando con el servicio de autenticación...</p>
        </div>
      </main>
    );
  }

  if (authenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Vento
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Plataforma de viabilidad eólica
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => login()}
            className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            onClick={() => register()}
            className="w-full rounded-md border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Crear cuenta
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Autenticación gestionada por Keycloak (OIDC)
        </p>
      </div>
    </main>
  );
}
