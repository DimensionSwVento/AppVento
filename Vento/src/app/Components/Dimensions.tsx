import Card from "./Card";

const DIMENSIONS = [
  { title: "Velocidad del viento", description: "Promedio anual de velocidad del viento a 100m de altura" },
  { title: "Densidad de potencia", description: "Energía disponible por unidad de área barrida por el rotor" },
  { title: "Rugosidad del terreno", description: "Clasificación del suelo según obstáculos y vegetación" },
  { title: "Distancia a red eléctrica", description: "Proximidad a líneas de transmisión existentes" },
  { title: "Accesibilidad vial", description: "Distancia a vías principales para transporte de equipos" },
  { title: "Restricciones ambientales", description: "Áreas protegidas, humedales y zonas de exclusión" },
];

export default function Dimensions() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg text-[#393939ff] font-bold">Configura las de interés por cada dimensión</h2>
      {DIMENSIONS.map((dim) => (
        <Card key={dim.title} title={dim.title} description={dim.description} />
      ))}
    </div>
  );
}
