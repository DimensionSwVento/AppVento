"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { usePathname, useRouter } from "next/navigation";

export default function SideBar({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = useSession();
  const { accion, setAccion, selectedHexes } = useAprincipal();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.roles?.includes("admin");
  const isAdminPage = pathname?.startsWith("/admin");
  const [mobileOpen, setMobileOpen] = useState(false);

  const ORDEN = [
    "seleccion-area",
    "dimensiones",
    "caracteristicas",
    "informe",
  ] as const;
  const pasoActual = ORDEN.indexOf(accion as (typeof ORDEN)[number]);
  const haySeleccion = selectedHexes.size > 0;

  function navegar(destino: (typeof ORDEN)[number]) {
    // Desde admin: "seleccion-area" siempre vuelve al dashboard;
    // los demás pasos solo si están habilitados por la lógica de flujo normal.
    if (isAdminPage) {
      if (destino === "seleccion-area" || habilitado(destino)) {
        setAccion(destino);
        router.push("/dashboard");
      }
      return;
    }
    const pasoDestino = ORDEN.indexOf(destino);
    if (pasoDestino < pasoActual) {
      setAccion(destino);
    } else if (
      destino === "dimensiones" &&
      accion === "seleccion-area" &&
      haySeleccion
    ) {
      setAccion(destino);
    }
  }

  function habilitado(paso: (typeof ORDEN)[number]) {
    const idx = ORDEN.indexOf(paso);
    if (idx < pasoActual) return true;
    if (paso === "dimensiones" && accion === "seleccion-area" && haySeleccion)
      return true;
    return false;
  }

  const fullMail = session?.user?.email ?? "test@gmail.com";
  // truncar a 26 caracteres para dar espacio a los botones
  const mail = fullMail.length > 18 ? fullMail.slice(0, 18) + "…" : fullMail;
  const name = session?.user?.name ?? "test";

  // hay subpagina visible (no seleccion-area y no admin)
  const hasSubpage =
    !isAdminPage && accion !== "seleccion-area" && accion !== null;
  // en mobile con subpagina visible, sidebar queda colapsado (solo iconos)
  // clases compartidas para ocultar texto en mobile-colapsado
  const labelCls = hasSubpage ? "hidden md:inline-block" : "";
  // iconos: en mobile colapsado se separan más (mx + mt); en desktop mantienen ml-[0.5rem]
  const iconCls = hasSubpage
    ? "w-[15px] h-[15px] mx-auto mt-[0.5rem] mb-[0.5rem] md:mx-0 md:mt-0 md:ml-[0.5rem]"
    : "w-[15px] h-[15px] ml-[0.5rem]";
  const ExitIconCls = mobileOpen
    ? "mx-auto justify-center items-center   py-1 "
    : "shrink-0 rounded px-2 py-1 text-[11px] text-gray-300 transition-colors hover:bg-white/10 hover:text-white border rounded-full border-[white]";
  const ExitdivCls = mobileOpen
    ? " w-full "
    : "";

    // separadores entre items en mobile colapsado: gris claro azulado, sutil
  const dividerCls = "w-full border-t border-[#7a8ea0] opacity-40";

  return (
    <>
      {/* Botón hamburguesa — solo visible en mobile y sin subpagina activa */}
      {!hasSubpage && (
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden justify-center fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded bg-[#165170ff] shadow-lg"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <div className="flex flex-col gap-[4px]">
            <span className="block h-[2px] w-5 bg-white" />
            <span className="block h-[2px] w-5 bg-white" />
            <span className="block h-[2px] w-5 bg-white" />
          </div>
        </button>
      )}

      {/* Overlay en mobile cuando el menu está abierto (sin subpagina) */}
      {mobileOpen && !hasSubpage && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SideBar:
          - Desktop: siempre visible, ancho completo
          - Mobile + subpagina: siempre visible, colapsado a iconos
          - Mobile + sin subpagina: overlay controlado por hamburguesa
      */}
      <div
        className={`flex bg-[#165170ff] z-30 ${
          hasSubpage
            ? "flex md:relative"
            : mobileOpen
              ? "fixed inset-y-0 left-0 md:relative"
              : "hidden md:flex"
        }`}
      >
        <div
          className={`h-full text-[10.5px] flex flex-col justify-between ${hasSubpage ? "w-[3.5rem] md:w-[12rem]" : "w-[12rem]"}`}
        >
          <div>
            <img
              src="/vento_logo.svg"
              alt="Logo"
              className={`w-[111px] my-[1rem] ml-[1rem] h-[36px] ${labelCls}`}
            />
            <hr className={`mx-[1rem] ${labelCls}`} />
            <div
              className={`mx-[0.5rem] my-[1rem] text-gray-400 text-[10.5px] ${labelCls}`}
            >
              ACCIONES PRINCIPALES
            </div>

            <div
              onClick={() => navegar("seleccion-area")}
              className={`flex items-center cursor-pointer ${!isAdminPage && accion === "seleccion-area" ? "bg-gray-400" : ""}`}
            >
              <img src="/area.png" alt="" className={iconCls} />
              <p
                className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
              >
                Selección de área
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div
              onClick={() =>
                habilitado("dimensiones") && navegar("dimensiones")
              }
              className={`flex items-center ${habilitado("dimensiones") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${!isAdminPage && accion === "dimensiones" ? "bg-gray-400" : ""}`}
            >
              <img src="/dim.png" alt="" className={iconCls} />
              <p
                className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
              >
                Dimensiones
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div
              onClick={() =>
                habilitado("caracteristicas") && navegar("caracteristicas")
              }
              className={`flex items-center ${habilitado("caracteristicas") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${!isAdminPage && accion === "caracteristicas" ? "bg-gray-400" : ""}`}
            >
              <img src="/caracteristicas.png" alt="" className={iconCls} />
              <p
                className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
              >
                Características del proyecto
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div
              onClick={() => habilitado("informe") && navegar("informe")}
              className={`flex items-center ${habilitado("informe") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${!isAdminPage && accion === "informe" ? "bg-gray-400" : ""}`}
            >
              <img src="/viab.png" alt="" className={iconCls} />
              <p
                className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
              >
                Informe de viabilidad
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}
            <div className="flex items-center">
              <img src="/hist.png" alt="" className={iconCls} />
              <p
                className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
              >
                Histórico de viabilidad
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}
          </div>

          <div>
            <div
              className={`mx-[0.5rem] text-gray-400 text-[10.5px] mt-4 ${labelCls}`}
            >
              GESTIÓN Y AYUDA DE USUARIO
            </div>
            {isAdmin && (
              <Link
                href="/admin/users"
                className={`flex items-center ${isAdminPage ? "bg-gray-400" : ""}`}
              >
                <img src="/user.png" alt="" className={iconCls} />
                <p
                  className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
                >
                  Gestión de usuarios
                </p>
              </Link>
            )}
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div className="flex items-center">
              <img src="/config.png" alt="" className={iconCls} />
              <p
                className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
              >
                Configuraciones
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div className="flex items-center">
              <img src="/manual.png" alt="" className={iconCls} />
              <p
                className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
              >
                Manual de uso
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div className="flex items-center">
              <img src="/soporte.png" alt="" className={iconCls} />
              <p
                className={`text-[14px] mx-[0.5rem] mt-[0.5rem] text-white mb-[0.5rem] ${labelCls}`}
              >
                Soporte
              </p>
            </div>

            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div className="flex items-center justify-between px-[0.5rem]">
              <div className={`flex h-[4rem] items-center  ${ExitdivCls}` }>
                <img
                  src="/user.png"
                  alt=""
                  className={` ${labelCls} ${iconCls} `}
                />
                <div className={labelCls}>
                  <p className="text-[10px] mx-[0.5rem] text-white">{name}</p>
                  <p
                    className="text-[10px] mx-[0.5rem] text-gray-400"
                    title={fullMail}
                  >
                    {mail}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await signOut({ redirect: false });
                    window.location.href = "/api/auth/kc-logout";
                  }}
                  className={ExitIconCls}
                  title="Cerrar sesión"
                >
                  X
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
