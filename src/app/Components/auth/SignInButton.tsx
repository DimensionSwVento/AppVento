import { signIn } from "@/auth";

export default function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("keycloak", { redirectTo: "/dashboard" });
      }}
      className="w-full"
    >
      <button
        type="submit"
        className="w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0b2a3c] shadow-md transition-colors hover:bg-gray-100"
      >
        Iniciar sesión
      </button>
    </form>
  );
}
