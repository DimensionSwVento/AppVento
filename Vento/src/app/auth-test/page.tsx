"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ServerVerifyResult {
  valid: boolean;
  user?: Record<string, unknown>;
  roles?: string[];
  error?: string;
}

function TokenCountdown({ exp }: Readonly<{ exp: number }>) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, exp - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, exp - Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [exp]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <span className={remaining < 60 ? "text-red-600 font-semibold" : "text-green-700"}>
      {mins}m {secs.toString().padStart(2, "0")}s
    </span>
  );
}

export default function AuthTestPage() {
  const { initialized, authenticated, user, token, keycloak, login, logout, refreshToken } =
    useAuth();
  const router = useRouter();
  const [showRawToken, setShowRawToken] = useState(false);
  const [serverResult, setServerResult] = useState<ServerVerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (initialized && !authenticated) {
      router.replace("/login");
    }
  }, [initialized, authenticated, router]);

  const verifyOnServer = useCallback(async () => {
    if (!token) return;
    setVerifying(true);
    setServerResult(null);
    try {
      const res = await fetch("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as ServerVerifyResult;
      setServerResult(data);
    } catch (err) {
      setServerResult({ valid: false, error: String(err) });
    } finally {
      setVerifying(false);
    }
  }, [token]);

  const handleRefresh = useCallback(async () => {
    const ok = await refreshToken();
    if (!ok) {
      alert("Error al refrescar el token. Será redirigido al login.");
      login();
    }
  }, [refreshToken, login]);

  if (!initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </main>
    );
  }

  if (!authenticated || !user) {
    return null;
  }

  const accessTokenParsed = keycloak?.tokenParsed as Record<string, unknown> | undefined;
  const idTokenParsed = keycloak?.idTokenParsed as Record<string, unknown> | undefined;
  const iat = accessTokenParsed?.iat as number | undefined;
  const exp = accessTokenParsed?.exp as number | undefined;
  const iss = accessTokenParsed?.iss as string | undefined;
  const aud = accessTokenParsed?.aud;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Verificación de Autenticación
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Autenticado
          </span>
        </div>

        <p className="text-sm text-gray-500">
          Página temporal para verificar que la integración con Keycloak funciona
          correctamente. Se eliminará cuando el dashboard esté listo.
        </p>

        {/* User Info */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Datos del Usuario
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre completo" value={user.name} />
            <Field label="Email" value={user.email} />
            <Field label="Username" value={user.preferredUsername} />
            <Field label="Nombre" value={user.givenName} />
            <Field label="Apellido" value={user.familyName} />
            <Field
              label="Email verificado"
              value={user.emailVerified ? "Sí" : "No"}
            />
            <Field label="Subject (sub)" value={user.sub} />
          </dl>
        </section>

        {/* Roles */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Roles Asignados
          </h2>
          <div className="flex flex-wrap gap-2">
            {user.realmRoles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
              >
                {role}
              </span>
            ))}
          </div>
        </section>

        {/* Token Info */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Información del Token
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Issuer" value={iss ?? "-"} />
            <Field
              label="Audience"
              value={Array.isArray(aud) ? aud.join(", ") : String(aud ?? "-")}
            />
            <Field
              label="Emitido (iat)"
              value={iat ? new Date(iat * 1000).toLocaleString() : "-"}
            />
            <Field
              label="Expira (exp)"
              value={exp ? new Date(exp * 1000).toLocaleString() : "-"}
            />
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500">
                Tiempo restante
              </dt>
              <dd className="mt-0.5 text-sm">
                {exp ? <TokenCountdown exp={exp} /> : "-"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Server-side verification */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Validación Server-Side
          </h2>
          <p className="mb-3 text-sm text-gray-500">
            Envía el token al backend (API Route) para verificar que la validación
            vía JWKS funciona.
          </p>
          <button
            type="button"
            onClick={verifyOnServer}
            disabled={verifying}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {verifying ? "Verificando..." : "Verificar Token en Backend"}
          </button>
          {serverResult && (
            <div
              className={`mt-3 rounded-md p-3 text-sm ${
                serverResult.valid
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              <p className="font-semibold">
                {serverResult.valid ? "Token válido" : "Token inválido"}
              </p>
              {serverResult.error && <p className="mt-1">{serverResult.error}</p>}
              {serverResult.valid && serverResult.roles && (
                <p className="mt-1">
                  Roles detectados por backend: {serverResult.roles.join(", ")}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Raw token toggle */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Tokens Raw (Debug)
            </h2>
            <button
              type="button"
              onClick={() => setShowRawToken(!showRawToken)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showRawToken ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {showRawToken && (
            <div className="mt-3 space-y-3">
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-600">ID Token (perfil usuario)</h3>
                <pre className="max-h-60 overflow-auto rounded-md bg-gray-900 p-4 text-xs text-green-400">
                  {idTokenParsed ? JSON.stringify(idTokenParsed, null, 2) : "No disponible"}
                </pre>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-600">Access Token (roles y permisos)</h3>
                <pre className="max-h-60 overflow-auto rounded-md bg-gray-900 p-4 text-xs text-green-400">
                  {accessTokenParsed ? JSON.stringify(accessTokenParsed, null, 2) : "No disponible"}
                </pre>
              </div>
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Refrescar Token
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-all">{value}</dd>
    </div>
  );
}
