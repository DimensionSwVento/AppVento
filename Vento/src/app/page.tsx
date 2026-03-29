"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { initialized, authenticated, login } = useAuth();
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
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </main>
    );
  }

  if (authenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Vento
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Plataforma de análisis de viabilidad eólica para Colombia
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => login()}
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Iniciar sesión
          </button>
          <a
            href="/login"
            className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Más opciones
          </a>
        </div>
      </div>
    </main>
  );
}
// ci
// trigger
