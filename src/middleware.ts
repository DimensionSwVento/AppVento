import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;

  // Si no está autenticado, redirigir al login (raíz)
  if (!isLoggedIn) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  // Si es una ruta de admin, validar el rol
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const isAdmin = req.auth?.roles?.includes("admin");
    if (!isAdmin) {
      return Response.redirect(new URL("/not-authorized", req.nextUrl));
    }
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/dimensions/:path*"],
};
