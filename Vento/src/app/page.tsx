import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Image from "next/image";
import SignInButton from "./Components/SignInButton";
import SignUpButton from "./Components/SignUpButton";

type RegisterError =
  | "register_config"
  | "register_missing_code"
  | "register_state"
  | "register_token_exchange"
  | `register_${string}`;

function registerErrorMessage(code: RegisterError | undefined): string | null {
  if (!code) return null;
  if (code === "register_access_denied") {
    return "Cancelaste el registro. Puedes intentarlo de nuevo cuando quieras.";
  }
  return "No pudimos completar el registro. Vuelve a intentarlo; si el problema persiste contacta al administrador.";
}

export default async function Home({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ expired?: string; error?: string }>;
}>) {
  const session = await auth();
  const { expired, error } = await searchParams;

  if (session && !expired) redirect("/dashboard");

  const registerErrorMsg = error?.startsWith("register_")
    ? registerErrorMessage(error as RegisterError)
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b2a3c] px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-10">
        <Image
          src="/vento_logo.svg"
          alt="Vento"
          width={180}
          height={58}
          priority
          className="h-auto w-[180px]"
        />

        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Plataforma de Viabilidad Eólica
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            Accede al análisis geoespacial de viabilidad eólica en Colombia.
          </p>
        </div>

        {expired === "true" && (
          <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
            Tu sesión ha expirado. Por favor, inicia sesión de nuevo.
          </div>
        )}

        {registerErrorMsg && (
          <div
            role="alert"
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200"
          >
            {registerErrorMsg}
          </div>
        )}

        <div className="flex w-full flex-col gap-3">
          <SignInButton />
          <SignUpButton />
        </div>

        {/* gray-400: contraste AA (≥4.5:1) sobre el fondo #0b2a3c */}
        <p className="text-xs text-gray-400">
          La autenticación es gestionada por un servicio de identidad externo.
        </p>
      </div>
    </div>
  );
}
