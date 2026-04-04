"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("keycloak", { callbackUrl: "/dashboard" })}
      className="w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0b2a3c] shadow-md transition-colors hover:bg-gray-100"
    >
      Iniciar sesión
    </button>
  );
}
