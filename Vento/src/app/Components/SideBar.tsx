"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { keycloakLogoutUrl } from "../Utils/keycloakLogout";
import { usePathname } from "next/navigation";

export default function SideBar({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = useSession();
  const { accion, setAccion, selectedHexes } = useAprincipal();
  const pathname = usePathname();
  const isAdmin = session?.roles?.includes("admin");
  const isAdminPage = pathname?.startsWith("/admin");

  // orden de pasos: solo avanzar al siguiente, retroceder libre
  const ORDEN = [
    "seleccion-area",
    "dimensiones",
    "caracteristicas",
    "informe",
  ] as const;
  const pasoActual = ORDEN.indexOf(accion as (typeof ORDEN)[number]);
  const haySeleccion = selectedHexes.size > 0;

  // navegar: retroceder siempre, avanzar a dimensiones solo si hay selección de hexágonos
  function navegar(destino: (typeof ORDEN)[number]) {
    const pasoDestino = ORDEN.indexOf(destino);
    if (pasoDestino < pasoActual) {
      setAccion(destino);
    } else if (destino === "dimensiones" && accion === "seleccion-area" && haySeleccion) {
      setAccion(destino);
    }
  }

  // pasos anteriores son clickeables + dimensiones si hay selección desde seleccion-area
  function habilitado(paso: (typeof ORDEN)[number]) {
    const idx = ORDEN.indexOf(paso);
    if (idx < pasoActual) return true;
    if (paso === "dimensiones" && accion === "seleccion-area" && haySeleccion) return true;
    return false;
  }

  const mail = session?.user?.email ?? "";
  return (
    <div className="flex  bg-[#165170ff]">
      <div className="h-full text-[10.5px] w-[15rem] flex flex-col justify-between">
        <div>
        <img src="/vento_logo.png" alt="Logo" className="w-[111px] my-[1rem] ml-[1rem] h-[36px]" />
        <hr className="mx-[1rem]" />
        <div className="mx-[0.5rem] my-[1rem] text-gray-400 text-[10.5px]"> ACCIONES PRINCIPALES</div>

        <div
          onClick={() => navegar("seleccion-area")}
          className={`flex items-center cursor-pointer ${accion === "seleccion-area" ? "bg-gray-400" : ""}`}
        >
          <img src="/area.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
          <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Selección de área
          </p>
        </div>
        <div
          onClick={() => habilitado("dimensiones") && navegar("dimensiones")}
          className={`flex items-center ${habilitado("dimensiones") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${accion === "dimensiones" ? "bg-gray-400" : ""}`}
        >
          <img src="/dim.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
          <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Dimensiones
          </p>
        </div>
        <div
          onClick={() =>
            habilitado("caracteristicas") && navegar("caracteristicas")
          }
          className={`flex items-center ${habilitado("caracteristicas") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${accion === "caracteristicas" ? "bg-gray-400" : ""}`}
        >
          <img src="/caracteristicas.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
          <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Características del proyecto
          </p>
        </div>
        <div
          onClick={() => habilitado("informe") && navegar("informe")}
          className={`flex items-center ${habilitado("informe") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${accion === "informe" ? "bg-gray-400" : ""}`}
        >
          <img src="/viab.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
          <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Informe de viabilidad
          </p>
        </div>
        <hr className="mx-[1rem]" />
        <div className="flex items-center">
          <img src="/hist.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
          <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Histórico de viabilidad
          </p>
        </div>
        </div>
        <div>
          <div className="mx-[0.5rem] text-gray-400 text-[10.5px] mt-4"> GESTIÓN Y AYUDA DE USUARIO</div>
          {isAdmin && (
            <Link
              href="/admin/users"
              className={`flex items-center ${isAdminPage ? "bg-gray-400" : ""}`}
            >
              <img src="/user.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
              <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]">
                Gestión de usuarios
              </p>
            </Link>
          )}
          <div className="flex items-center">
            <img src="/config.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
            <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]">
              Configuraciones
            </p>
          </div>
          <div className="flex items-center">
            <img src="/manual.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
            <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]"> Manual de uso</p>
          </div>
          <div className="flex items-center">
            <img src="/soporte.png" alt="" className="w-[15px] h-[15px] ml-[0.5rem]" />
            <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem]"> Soporte</p>
          </div>

        <hr className="mx-[1rem]" />

          <div className="flex items-center justify-between px-[0.5rem]">
            <div className="flex items-center min-w-0">
              <img src="/user.png" alt="" className="w-[15px] h-[15px] shrink-0" />
              <p className="text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] truncate"> {mail}</p>
            </div>
            <button
              onClick={async () => {
                const idToken = session?.idToken;
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                await signOut({ redirect: false });
                const kc = idToken ? keycloakLogoutUrl(idToken, origin) : null;
                if (kc) window.location.href = kc;
                else window.location.href = "/";
              }}
              className="shrink-0 rounded px-2 py-1 text-[11px] text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>

      </div>
      {isAdminPage || accion == "seleccion-area" ? null : (
        <div className="w-[30rem] h-full overflow-y-auto bg-[#cce1eeff]">{children}</div>
      )}
    </div>
  );
}
