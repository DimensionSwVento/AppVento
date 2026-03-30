"use client";
import { useAprincipal } from "../Utils/AccionPrincipalContext";

export default function SideBar({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { accion, setAccion } = useAprincipal(); //   los estados posibles son: "seleccion-area" "dimensiones","caracteristicas","informe" utiles para configurar y redirigir sub paginas

  // orden de pasos: solo avanzar al siguiente, retroceder libre
  const ORDEN = [
    "seleccion-area",
    "dimensiones",
    "caracteristicas",
    "informe",
  ] as const;
  const pasoActual = ORDEN.indexOf(accion as (typeof ORDEN)[number]);

  // navegar: permite ir atrás siempre, adelante solo al siguiente paso
  function navegar(destino: (typeof ORDEN)[number]) {
    const pasoDestino = ORDEN.indexOf(destino);
    if (pasoDestino <= pasoActual || pasoDestino === pasoActual + 1) {
      setAccion(destino);
    }
  }

  // determinar si un paso está habilitado to DO: avanzar de seleccion de area solo si hay hexagonos selecionados
  function habilitado(paso: (typeof ORDEN)[number]) {
    const idx = ORDEN.indexOf(paso);
    return idx <= pasoActual || idx === pasoActual + 1;
  }

  let mail = "test@gmail.com";
  return (
    // opciones de menu lateral
    <div className="flex  bg-[#165170ff]">
      <div className="h-full w-[10rem] flex flex-col justify-between">
        <div>
        <hr />
        <div> ACCIONES PRINCIPALES</div>

        <div
          onClick={() => navegar("seleccion-area")}
          className={`flex cursor-pointer ${accion === "seleccion-area" ? "bg-blue-800" : ""}`}
        >
          <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Seleción de área
          </p>
        </div>
        <div
          onClick={() => habilitado("dimensiones") && navegar("dimensiones")}
          className={`flex ${habilitado("dimensiones") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${accion === "dimensiones" ? "bg-blue-800" : ""}`}
        >
          <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Dimenciones
          </p>
        </div>
        <div
          onClick={() =>
            habilitado("caracteristicas") && navegar("caracteristicas")
          }
          className={`flex ${habilitado("caracteristicas") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${accion === "caracteristicas" ? "bg-blue-800" : ""}`}
        >
          <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Caracteristicas del proyecto
          </p>
        </div>
        <div
          onClick={() => habilitado("informe") && navegar("informe")}
          className={`flex ${habilitado("informe") ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${accion === "informe" ? "bg-blue-800" : ""}`}
        >
          <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]">
            Informe de viabilidad
          </p>
        </div>
        <hr />
        <div className="flex">
          <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]">
            {" "}
            Histórico de viabilidad
          </p>
        </div>
        </div>
        <div className="">
          <div> GESTIÓN Y AYUDA DE USUARIO</div>
          <div className="flex">
            <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]">
              {" "}
              Configuraciones
            </p>
          </div>
          <div className="flex">
            <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]"> Manual de uso</p>
          </div>
          <div className="flex">
            <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]"> Soporte</p>
          </div>

          <hr />

          <div className="flex">
            <p className="mx-[1rem] mt-[0.5rem] text-white mb-[0.5rem]"> {mail}</p>
          </div>
        </div>
      </div>
      {accion == "seleccion-area" ? null : (
        <div className="w-[25rem] h-full overflow-y-auto bg-[#cce1eeff]">{children}</div>
      )}
    </div>
  );
}
