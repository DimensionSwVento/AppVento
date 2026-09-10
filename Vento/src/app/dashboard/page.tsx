"use client";
import { useEffect, useState } from "react";
import SideBar from "../Components/layout/SideBar";
import Dimensions from "../Components/dimensions/Dimensions";
import Caracteristicas from "../Components/caracteristicas/Caracteristicas";
import Report from "../Components/report/Report";
import HistorialList from "../Components/historial/HistorialList";
import MapView from "../Components/map/Map";
import OnboardingModal from "../Components/onboarding/OnboardingModal";
import DisclaimerModal from "../Components/onboarding/DisclaimerModal";
import { useAprincipal } from "../Utils/contexts/AccionPrincipalContext";

export default function AreaSelectionPage() {
  const { accion } = useAprincipal();

  // Onboarding: UNA VEZ POR SESIÓN activa (sessionStorage). No se repite en cada
  // recarga de la misma sesión; vuelve a salir en una sesión nueva.
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Disclaimer al inicio (reunión): tras cerrar el onboarding, aparece el aviso
  // legal en un flotante. Mismo texto que el informe → visible al inicio y al final.
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem("vento_onboarding_seen")) setShowOnboarding(true);
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  const subpage = (() => {
    switch (accion) {
      case "dimensiones":
        return <Dimensions />;
      case "caracteristicas":
        return <Caracteristicas />;
      case "informe":
        return <Report />;
      case "historico":
        return <HistorialList />;
      default:
        return null;
    }
  })();

  return (
    <main className="flex h-[100vh] overflow-hidden">
      <SideBar>{null}</SideBar>
      {/* Contenido a la derecha del sidebar:
          - Mobile: flex-col-reverse → Map arriba, Subpage abajo
          - Desktop: flex-row → Subpage izq, Map der */}
      <div className="flex flex-1 min-w-0 relative md:flex-row">
        {/* En desktop: subpage va primero (izquierda, flex normal).
            En mobile: absolute al fondo, pt-2 transparente deja ver mapa detrás */}
        {subpage && (
          <div className="absolute bottom-0 left-0 w-full h-[50%] pt-2 z-10 md:static md:w-[25rem] md:h-full md:pt-0 md:z-0">
            <div className="w-full h-full overflow-y-auto bg-[#cce1eeff] rounded-t-2xl md:rounded-none border-t-2 border-[#165170ff] md:border-0">
              {subpage}
            </div>
          </div>
        )}
        {/* Mapa: en mobile absolute top 60% (pegado arriba, el 10% inferior queda cubierto por subpage) */}
        <div className={subpage ? "absolute top-0 left-0 w-full h-[60%] md:static md:h-full md:flex-1" : "flex-1 h-full"}>
          <MapView />
        </div>
      </div>
      <OnboardingModal
        open={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          try {
            sessionStorage.setItem("vento_onboarding_seen", "1");
          } catch {}
          setShowDisclaimer(true);
        }}
      />
      <DisclaimerModal
        open={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
      />
    </main>
  );
}
