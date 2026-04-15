import Image from "next/image";
import Link from "next/link";

export default function NotAuthorizedPage() {
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
            Acceso denegado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            No tienes los permisos necesarios para acceder a esta página.
            Contacta a un administrador si crees que esto es un error.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-lg bg-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
