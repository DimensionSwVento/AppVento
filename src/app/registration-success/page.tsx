import Image from "next/image";
import SignInButton from "../Components/auth/SignInButton";

export const metadata = {
  title: "Registro exitoso — Vento",
  description:
    "Confirmacion de registro en la plataforma Vento. Inicia sesion para acceder al mapa de idoneidad eolica.",
};

/**
 * Pantalla de confirmacion post-registro (US-FB-02, AC1).
 *
 * Es un Server Component estatico: se renderiza cuando Keycloak nos redirige
 * aqui tras completar el federated logout (ver ADR-012 y la ruta
 * `/api/auth/register/callback`). En ese momento el usuario NO tiene sesion
 * ni cookie SSO — el boton "Iniciar sesion" dispara el flujo de signIn de
 * NextAuth directamente a Keycloak (reusa SignInButton, mismo componente que
 * la landing), evitando un paso intermedio por `/`. Esto cumple AC2 con la
 * minima friccion y AC3 porque no existe sesion hasta que el usuario complete
 * login en Keycloak.
 */
export default function RegistrationSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b2a3c] px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <Image
          src="/vento_logo.svg"
          alt="Vento"
          width={180}
          height={58}
          priority
          className="h-auto w-[180px]"
        />

        <div
          role="status"
          aria-live="polite"
          className="w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              aria-hidden="true"
              className="h-5 w-5 text-emerald-300"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <h1 className="text-lg font-semibold text-emerald-100">
              ¡Usuario registrado!
            </h1>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
            Tu cuenta se creó correctamente. Ahora inicia sesión con tu correo
            y contraseña para acceder a la plataforma.
          </p>
        </div>

        <SignInButton />

        <p className="text-xs text-gray-500">
          Si el registro falla, vuelve a intentarlo desde la pantalla de inicio.
        </p>
      </div>
    </div>
  );
}
