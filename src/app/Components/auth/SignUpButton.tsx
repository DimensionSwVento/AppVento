import Link from "next/link";

/**
 * Boton para iniciar el flujo de registro (US-FB-02).
 *
 * No usa NextAuth porque el flujo post-registro requiere interceptar el
 * callback antes de crear sesion — ver `/api/auth/register/route.ts` y
 * ADR-012. Apunta directamente a la ruta que construye la URL
 * `authorization_endpoint?kc_action=register` en Keycloak.
 *
 * Se renderiza como `<a>` (Link) y no como form submit para permitir al
 * navegador mostrar la URL de destino en status bar (transparencia UX) y
 * funcionar correctamente con prefetch deshabilitado en rutas de auth.
 */
export default function SignUpButton() {
  return (
    <Link
      href="/api/auth/register"
      prefetch={false}
      className="w-full rounded-lg border border-white/30 bg-transparent px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
    >
      Crear cuenta
    </Link>
  );
}
