"use client";
import dynamic from "next/dynamic";
import SideBar from "../Components/SideBar";
import Dimensions from "../Components/Dimensions";
import Report from "../Components/Report";
import { useAprincipal } from "../Utils/AccionPrincipalContext";

// dynamic import sin SSR — elimina problemas de hidratación con WebGL/DeckGL
const MapView = dynamic(() => import("../Components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <p className="text-gray-500 text-lg">... cargando mapa</p>
    </div>
  ),
});

export default function AreaSelectionPage() {
  // preparamos el estado de las subpaginas en la side bar
  const { accion } = useAprincipal();

  return (
    <main className="flex h-[100vh]">
      <SideBar>
        {(() => {
          // revisamos el estado para decidir la subpagina en la sidebar
          switch (accion) {
            case "seleccion-area":
              return undefined;
            case "dimensiones":
              return <Dimensions />;
            case "informe":
              return <Report />;
            default:
              return null;
          }
        })()}
      </SideBar>
      <MapView />
    </main>
  );
}
