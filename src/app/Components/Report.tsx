import Card from "./Card";
import NextStepButton from "./NextStepButton";

const REPORT_ITEMS = [
  { title: "Puntuación general", description: "Índice compuesto de viabilidad eólica para la zona seleccionada" },
  { title: "Potencial energético", description: "Estimación de generación anual en MWh para la capacidad instalada" },
  { title: "Factores favorables", description: "Dimensiones con puntuación alta que benefician el proyecto" },
  { title: "Factores de riesgo", description: "Dimensiones con puntuación baja que requieren mitigación" },
  { title: "Comparación regional", description: "Ranking de la zona frente a otras áreas evaluadas en Colombia" },
  { title: "Recomendación", description: "Dictamen de viabilidad con nivel de confianza del análisis" },
];

export default function Report() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold text-white">Informe de viabilidad</h2>
      {REPORT_ITEMS.map((item) => (
        <Card key={item.title} title={item.title} description={item.description} />
      ))}
      <NextStepButton />
    </div>
  );
}
