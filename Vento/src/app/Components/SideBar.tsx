"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { usePathname, useRouter } from "next/navigation";

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export default function SideBar({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  void children;
  const { data: session } = useSession();
  const { accion, setAccion, selectedHexes } = useAprincipal();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.roles?.includes("admin");
  const isAdminPage = pathname?.startsWith("/admin");
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  );

  const ORDEN = [
    "seleccion-area",
    "dimensiones",
    "caracteristicas",
    "informe",
  ] as const;
  const pasoActual = ORDEN.indexOf(accion as (typeof ORDEN)[number]);
  const haySeleccion = selectedHexes.size > 0;
  const showNextStepCta =
    isHydrated && !isAdminPage && accion === "seleccion-area" && haySeleccion;
  const selectedCount = selectedHexes.size;
  const selectedHexLabel = `${selectedCount} ${
    selectedCount === 1 ? "hexágono seleccionado" : "hexágonos seleccionados"
  }`;

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

  const dimensionesHabilitadas = isHydrated && habilitado("dimensiones");
  const caracteristicasHabilitadas =
    isHydrated && habilitado("caracteristicas");
  const informeHabilitado = isHydrated && habilitado("informe");

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
    ? "h-4 w-4 shrink-0 mx-auto my-[0.55rem] opacity-90 md:mx-0 md:my-0"
    : "h-4 w-4 shrink-0 opacity-90";
  const navItemBase =
    "group mx-[0.5rem] flex min-h-[44px] w-[calc(100%-1rem)] items-center gap-2 rounded-lg border border-l-[3px] border-transparent px-2.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cce1eeff]";
  const navItemEnabled =
    "cursor-pointer text-white hover:border-white/15 hover:bg-white/10 hover:shadow-md hover:shadow-black/10";
  const navItemDisabled = "cursor-not-allowed text-white/45 opacity-55";
  const activeNavItem =
    "border-white/20 border-l-[#cce1eeff] bg-white/15 shadow-lg shadow-black/15";
  const nextNavItem =
    "border-[#cce1eeff]/70 bg-white/10 shadow-lg shadow-black/10 ring-1 ring-[#cce1eeff]/50";
  const secondaryItemBase =
    "group mx-[0.5rem] flex min-h-[40px] w-[calc(100%-1rem)] cursor-default select-none items-center gap-2 rounded-lg border border-l-[3px] border-transparent px-2.5 text-white/90 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:shadow-md hover:shadow-black/10";
  const ExitIconCls = mobileOpen
    ? "mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:bg-white/10 hover:text-white";
  const ExitdivCls = mobileOpen ? "w-full justify-center" : "";

  // separadores entre items en mobile colapsado: gris claro azulado, sutil
  const dividerCls = "mx-auto w-7 border-t border-[#cce1eeff]/25";
  const itemLabelCls = "min-w-0 select-none text-[14px] leading-tight text-white";
  const sectionLabelCls =
    "mx-[0.75rem] mb-[0.75rem] mt-[1rem] cursor-default select-none text-[10.5px] font-semibold text-white/65";

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
        className={`relative z-30 flex overflow-hidden bg-[#165170ff] bg-[linear-gradient(180deg,#165170ff_0%,#0b2a3c_135%)] shadow-2xl shadow-black/25 ring-1 ring-white/10 ${
          hasSubpage
            ? "flex md:relative"
            : mobileOpen
              ? "fixed inset-y-0 left-0 md:relative"
              : "hidden md:flex"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(204,225,238,0.14)_0%,rgba(204,225,238,0.08)_48%,rgba(204,225,238,0)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/20"
        />
        <div
          className={`relative z-10 flex h-full flex-col justify-between py-3 text-[10.5px] ${hasSubpage ? "w-[3.75rem] md:w-[14rem]" : "w-[14rem]"}`}
        >
          <div>
            <Image
              src="/vento_logo.svg"
              alt="Logo"
              width={118}
              height={38}
              className={`mb-[1.1rem] ml-[1rem] mt-[0.2rem] h-[38px] w-[118px] ${labelCls}`}
            />
            <hr className={`mx-[1rem] border-white/20 ${labelCls}`} />
            <div className={`${sectionLabelCls} ${labelCls}`}>
              ACCIONES PRINCIPALES
            </div>

            <button
              type="button"
              onClick={() => navegar("seleccion-area")}
              className={`${navItemBase} ${navItemEnabled} ${!isAdminPage && accion === "seleccion-area" ? activeNavItem : ""}`}
              aria-current={
                !isAdminPage && accion === "seleccion-area" ? "step" : undefined
              }
            >
              <Image src="/area.png" alt="" width={15} height={15} className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Selección de área
              </p>
            </button>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <button
              type="button"
              onClick={() =>
                dimensionesHabilitadas && navegar("dimensiones")
              }
              className={`${navItemBase} ${dimensionesHabilitadas ? navItemEnabled : navItemDisabled} ${showNextStepCta ? nextNavItem : ""} ${!isAdminPage && accion === "dimensiones" ? activeNavItem : ""}`}
              aria-disabled={!dimensionesHabilitadas}
              aria-current={
                !isAdminPage && accion === "dimensiones" ? "step" : undefined
              }
            >
              <Image src="/dim.png" alt="" width={15} height={15} className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Dimensiones
              </p>
            </button>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            {showNextStepCta && (
              <div
                className={`mx-[0.5rem] mb-[1.1rem] mt-[0.6rem] ${labelCls}`}
                aria-live="polite"
              >
                <button
                  type="button"
                  onClick={() => navegar("dimensiones")}
                  className="group relative w-full overflow-hidden rounded-lg border border-[#cce1eeff] bg-white px-3 py-3 text-left text-[#165170ff] shadow-xl shadow-black/20 transition-all duration-200 motion-safe:hover:-translate-y-[1px] hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-safe:animate-[vento-cta-in_220ms_ease-out]"
                  aria-label={`Continuar a Dimensiones con ${selectedHexLabel}`}
                  data-testid="next-step-cta"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-1 bg-[#cce1eeff]"
                    aria-hidden="true"
                  />
                  <span className="block text-[10px] font-semibold leading-tight opacity-80">
                    Área lista
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[13px] font-bold leading-tight">
                    <span>Continuar a Dimensiones</span>
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#165170ff] text-[13px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      {">"}
                    </span>
                  </span>
                  <span className="mt-1 block text-[10px] leading-tight opacity-80">
                    {selectedHexLabel}
                  </span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                caracteristicasHabilitadas && navegar("caracteristicas")
              }
              className={`${navItemBase} ${caracteristicasHabilitadas ? navItemEnabled : navItemDisabled} ${!isAdminPage && accion === "caracteristicas" ? activeNavItem : ""}`}
              aria-disabled={!caracteristicasHabilitadas}
              aria-current={
                !isAdminPage && accion === "caracteristicas"
                  ? "step"
                  : undefined
              }
            >
              <Image
                src="/caracteristicas.png"
                alt=""
                width={15}
                height={15}
                className={iconCls}
              />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Características del proyecto
              </p>
            </button>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <button
              type="button"
              onClick={() => informeHabilitado && navegar("informe")}
              className={`${navItemBase} ${informeHabilitado ? navItemEnabled : navItemDisabled} ${!isAdminPage && accion === "informe" ? activeNavItem : ""}`}
              aria-disabled={!informeHabilitado}
              aria-current={
                !isAdminPage && accion === "informe" ? "step" : undefined
              }
            >
              <Image src="/viab.png" alt="" width={15} height={15} className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Informe de viabilidad
              </p>
            </button>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}
            <div className={secondaryItemBase}>
              <Image src="/hist.png" alt="" width={15} height={15} className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
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
            <div className={`${sectionLabelCls} mt-4 ${labelCls}`}>
              GESTIÓN Y AYUDA DE USUARIO
            </div>
            {isAdmin && (
              <Link
                href="/admin/users"
                className={`${navItemBase} ${navItemEnabled} ${isAdminPage ? activeNavItem : ""}`}
              >
                <Image src="/user.png" alt="" width={15} height={15} className={iconCls} />
                <p className={`${itemLabelCls} ${labelCls}`}>
                  Gestión de usuarios
                </p>
              </Link>
            )}
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div className={secondaryItemBase}>
              <Image src="/config.png" alt="" width={15} height={15} className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Configuraciones
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div className={secondaryItemBase}>
              <Image src="/manual.png" alt="" width={15} height={15} className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Manual de uso
              </p>
            </div>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div className={secondaryItemBase}>
              <Image src="/soporte.png" alt="" width={15} height={15} className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Soporte
              </p>
            </div>

            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <div className="mx-[0.5rem] mt-[0.85rem] flex items-center justify-between rounded-lg border border-white/10 bg-[#0b2a3c]/35 px-[0.65rem] shadow-inner shadow-black/20">
              <div className={`flex h-[4rem] min-w-0 items-center gap-2 ${ExitdivCls}`}>
                <Image
                  src="/user.png"
                  alt=""
                  width={15}
                  height={15}
                  className={`${labelCls} ${iconCls}`}
                />
                <div className={`min-w-0 flex-1 ${labelCls}`}>
                  <p className="truncate cursor-default select-none text-[10.5px] font-semibold text-white">
                    {name}
                  </p>
                  <p
                    className="truncate cursor-default select-none text-[10px] text-[#cce1eeff]/70"
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
                  aria-label="Cerrar sesión"
                  title="Cerrar sesión"
                >
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M6 3.5H3.75A1.25 1.25 0 0 0 2.5 4.75v6.5c0 .69.56 1.25 1.25 1.25H6M10.25 5.25 13 8m0 0-2.75 2.75M13 8H6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
