import Card from "./Card";
import NextStepButton from "./NextStepButton";

const DIMENSIONS = [
  { title: "Dimensión ambiental", description: "Promedio anual de velocidad del viento a 100m de altura" },
  { title: "Dimensión técnica", description: "Energía disponible por unidad de área barrida por el rotor" },
  { title: "Dimensión regulatoria", description: "Clasificación del suelo según obstáculos y vegetación" },
  { title: "Dimensión socioeconómica", description: "Proximidad a líneas de transmisión existentes" },
  { title: "Dimensión macroeconómica", description: "Distancia a vías principales para transporte de equipos" },
];

export default function Dimensions() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg text-[#393939ff] font-bold">Configura las variables de interés por cada dimensión</h2>
      {DIMENSIONS.map((dim) => (
        <Card key={dim.title} title={dim.title} description={dim.description} />
      ))}
      <NextStepButton />
    </div>
  );
}
