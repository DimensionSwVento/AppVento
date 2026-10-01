"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession, signOut } from "next-auth/react";
import { useIsAdmin } from "../../Utils/useIsAdmin";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { PHASE_ORDER } from "../../Utils/usePhaseNav";
import { usePathname, useRouter } from "next/navigation";

// TEMPLATE — correo de soporte. Reemplazar por el real cuando el cliente lo defina.
const SUPPORT_EMAIL = "soporte@vento.com";

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
  const { accion, setAccion, selectedHexes, maxFaseIdx } = useAprincipal();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isAdminPage = pathname?.startsWith("/admin");
  const [mobileOpen, setMobileOpen] = useState(false);
  // #25: modal de soporte con el correo GUARDADO EN BD (app_config/support_email,
  // editable por admin vía PATCH). Fallback a la constante si no está fijado.
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState(SUPPORT_EMAIL);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/catalog/config/support_email")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        const email = v && typeof v.email === "string" ? v.email.trim() : "";
        if (alive && email) setSupportEmail(email);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  );

  // Fuente ÚNICA del orden de fases (misma que el botón "Siguiente paso"): evita
  // duplicar el orden y que diverjan stepper y navegación.
  const ORDEN = PHASE_ORDER;
  const pasoActual = ORDEN.indexOf(accion as (typeof ORDEN)[number]);
  const haySeleccion = selectedHexes.size > 0;
  const esPasado = (paso: (typeof ORDEN)[number]) =>
    !isAdminPage && ORDEN.indexOf(paso) < pasoActual;
  const esActual = (paso: (typeof ORDEN)[number]) =>
    !isAdminPage && accion === paso;
  const showNextStepCta =
    isHydrated && !isAdminPage && accion === "seleccion-area" && haySeleccion;

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
    // Navegar a cualquier fase habilitada (atrás siempre; adelante hasta la fase
    // más avanzada alcanzada → atajos selección↔informe una vez completado).
    if (destino === "seleccion-area" || habilitado(destino)) {
      setAccion(destino);
    }
  }

  function habilitado(paso: (typeof ORDEN)[number]) {
    const idx = ORDEN.indexOf(paso);
    // Retroceso libre (independiente de maxFaseIdx).
    if (idx < pasoActual) return true;
    // Salto adelante: hasta la fase más avanzada alcanzada (atajos si ya se
    // llegó a informe → selección↔informe directo).
    if (idx <= maxFaseIdx) return true;
    // Primera progresión: de selección a CARACTERÍSTICAS si ya hay selección.
    if (paso === "caracteristicas" && accion === "seleccion-area" && haySeleccion)
      return true;
    return false;
  }

  const dimensionesHabilitadas = isHydrated && habilitado("dimensiones");
  const caracteristicasHabilitadas =
    isHydrated && habilitado("caracteristicas");
  const informeHabilitado = isHydrated && habilitado("informe");

  // Identidad REAL de la sesión. Sin fallback fabricado: si no hay sesión se
  // muestra un placeholder neutro (nunca un usuario falso tipo "test@gmail.com",
  // que daba la falsa impresión de estar logueado como otra cuenta).
  const fullMail = session?.user?.email ?? "—";
  // truncar a 18 caracteres para dar espacio a los botones
  const mail = fullMail.length > 18 ? fullMail.slice(0, 18) + "…" : fullMail;
  const name = session?.user?.name ?? "Sin sesión";

  // hay subpagina visible (no seleccion-area y no admin)
  const hasSubpage =
    !isAdminPage && accion !== "seleccion-area" && accion !== null;
  // en mobile con subpagina visible, sidebar queda colapsado (solo iconos)
  // clases compartidas para ocultar texto en mobile-colapsado
  const labelCls = hasSubpage  ? "hidden md:inline-block" : "";
  // iconos: en mobile colapsado se separan más (mx + mt); en desktop mantienen ml-[0.5rem]
  const iconCls = hasSubpage
    ? "h-4 w-4 shrink-0 mx-auto my-[0.55rem] opacity-90 md:mx-0 md:my-0"
    : "h-4 w-4 shrink-0 opacity-90";
  const navItemBase =
    "group flex min-h-[44px] w-full items-center gap-2 border border-l-[3px] border-transparent px-2.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cce1eeff]";
  const navItemEnabled =
    "cursor-pointer text-white hover:border-white/15 hover:bg-white/10 hover:shadow-md hover:shadow-black/10";
  const navItemDisabled = "cursor-not-allowed text-white/45 opacity-55";
  const activeNavItem =
    "border-white/20 border-l-[#cce1eeff] bg-white/15 shadow-lg shadow-black/15";
  const nextNavItem = "";
  const secondaryItemBase =
    "group flex min-h-[40px] w-full cursor-default select-none items-center gap-2 border border-l-[3px] border-transparent px-2.5 text-white/90 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:shadow-md hover:shadow-black/10";
  const ExitIconCls = mobileOpen
    ? "mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:bg-white/10 hover:text-white";
  const ExitdivCls = mobileOpen ? "w-full justify-center" : "";

  // separadores entre items en mobile colapsado: gris claro azulado, sutil
  const dividerCls = "mx-auto w-7 border-t border-[#cce1eeff]/25";
  const stepCheckIcon = (
    <svg
      className={`ml-auto h-4 w-4 shrink-0 text-white/90 ${labelCls}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.4 14.6-4.2-4.2 1.4-1.4 2.8 2.8 5.8-5.8 1.4 1.4-7.2 7.2z" />
    </svg>
  );
  const activeStepArrowIcon = (
    <svg
      className={`ml-auto h-4 w-4 shrink-0 text-white/90 ${labelCls}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
  const itemLabelCls = "min-w-0 select-none text-[12px] leading-tight text-white";
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
          className={`relative z-10 flex h-full flex-col justify-between py-3 text-[10.5px] ${hasSubpage ? "w-[3.75rem] md:w-[12rem]" : "w-[12rem]"}`}
        >
          <div>
            <Image
              src="/vento_logo.svg"
              alt="Logo"
              width={118}
              height={38}
              className={`${hasSubpage ? "hidden md:block md:mb-[1.1rem] md:mx-auto md:h-[38px] md:w-[118px]" : "mb-[1.1rem] mx-auto h-[38px] w-[118px]"}`}
            />
            <hr className={`hidden md:mx-[1rem] md:block md:border-white/20 `} />
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
              {esPasado("seleccion-area") && stepCheckIcon}
              {esActual("seleccion-area") && activeStepArrowIcon}
            </button>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}

            <button
              type="button"
              onClick={() =>
                caracteristicasHabilitadas && navegar("caracteristicas")
              }
              className={`${navItemBase} ${caracteristicasHabilitadas ? navItemEnabled : navItemDisabled} ${showNextStepCta ? nextNavItem : ""} ${!isAdminPage && accion === "caracteristicas" ? activeNavItem : ""}`}
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
              {esPasado("caracteristicas") && stepCheckIcon}
              {esActual("caracteristicas") && activeStepArrowIcon}
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
              className={`${navItemBase} ${dimensionesHabilitadas ? navItemEnabled : navItemDisabled} ${!isAdminPage && accion === "dimensiones" ? activeNavItem : ""}`}
              aria-disabled={!dimensionesHabilitadas}
              aria-current={
                !isAdminPage && accion === "dimensiones" ? "step" : undefined
              }
            >
              <Image src="/dim.png" alt="" width={15} height={15} unoptimized className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Dimensiones
              </p>
              {esPasado("dimensiones") && stepCheckIcon}
              {esActual("dimensiones") && activeStepArrowIcon}
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
                Informe de idoneidad
              </p>
              {esPasado("informe") && stepCheckIcon}
              {esActual("informe") && activeStepArrowIcon}
            </button>
            {mobileOpen && hasSubpage ? (
              <hr className={dividerCls}></hr>
            ) : (
              <></>
            )}
            <button
              type="button"
              onClick={() => setAccion("historico")}
              className={`${secondaryItemBase} w-full text-left ${!isAdminPage && accion === "historico" ? activeNavItem : ""}`}
            >
              <Image src="/hist.png" alt="" width={15} height={15} className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Histórico de informes
              </p>
            </button>
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

            {/* #25: abre un modal con el correo de soporte (guardado en BD) en vez
                de un mailto directo. */}
            <button
              type="button"
              onClick={() => {
                setCopied(false);
                setSupportOpen(true);
              }}
              className={secondaryItemBase}
            >
              <Image src="/soporte.png" alt="" width={15} height={15} unoptimized className={iconCls} />
              <p className={`${itemLabelCls} ${labelCls}`}>
                Soporte
              </p>
            </button>

            {supportOpen && (
              <div
                className="fixed inset-0 z-[300] flex items-center justify-center p-4"
                style={{ backgroundColor: "rgba(180,195,210,0.45)", backdropFilter: "blur(2px)" }}
                onClick={() => setSupportOpen(false)}
                role="dialog"
                aria-modal="true"
              >
                <div
                  className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-base font-semibold text-gray-800">Soporte</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    ¿Necesitas ayuda? Escríbenos a este correo:
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="truncate font-mono text-sm text-[#165170]">
                      {supportEmail}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(supportEmail);
                          setCopied(true);
                        } catch {
                          /* sin portapapeles: el usuario lo copia a mano */
                        }
                      }}
                      className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      {copied ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSupportOpen(false)}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cerrar
                    </button>
                    <a
                      href={`mailto:${supportEmail}?subject=${encodeURIComponent("Soporte Vento")}`}
                      className="rounded-md px-4 py-2 text-sm font-medium text-white"
                      style={{ backgroundColor: "#165170" }}
                    >
                      Escribir correo
                    </a>
                  </div>
                </div>
              </div>
            )}

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
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
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
