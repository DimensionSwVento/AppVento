import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Image from "next/image";
import SignInButton from "./Components/SignInButton";

export default async function Home({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ expired?: string }>;
}>) {
  const session = await auth();
  const { expired } = await searchParams;

  if (session && !expired) redirect("/dashboard");

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

        <SignInButton />

        <p className="text-xs text-gray-500">
          La autenticación es gestionada por un servicio de identidad externo.
        </p>
      </div>
    </div>
  );
}
