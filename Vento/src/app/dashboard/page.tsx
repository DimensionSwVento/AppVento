"use client";
import SideBar from "../Components/SideBar";
import Dimensions from "../Components/Dimensions";
import Report from "../Components/Report";
import MapView from "../Components/Map";
import { useAprincipal } from "../Utils/AccionPrincipalContext";

export default function AreaSelectionPage() {
  const { accion } = useAprincipal();

  return (
    <main className="flex h-[100vh]">
      <SideBar>
        {(() => {
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
