import NextStepButton from "./NextStepButton";

export default function Caracteristicas() {
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <h2 className="text-lg font-bold text-[#393939ff]">
        Características del proyecto
      </h2>
      <div className="flex-1" />
      <NextStepButton />
    </div>
  );
}
