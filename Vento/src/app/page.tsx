import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Image from "next/image";
import SignInButton from "./Components/SignInButton";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b2a3c] px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-10">
        <Image
          src="/vento_logo.png"
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

        <SignInButton />

        <p className="text-xs text-gray-500">
          La autenticación es gestionada por un servicio de identidad externo.
        </p>
      </div>
    </div>
  );
}
