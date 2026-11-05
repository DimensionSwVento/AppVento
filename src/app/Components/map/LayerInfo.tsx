"use client";

const RES_LABELS: Record<number, string> = {
  2: "~158 km",
  3: "~59 km",
  4: "~22 km",
  5: "~8.5 km",
  6: "~3.2 km",
  7: "~1.2 km",
  8: "~460 m",
};

interface LayerInfoProps {
  resolution: number;
  total: number;
  selectedCount: number;
  aboveThresholdCount: number;
}

export default function LayerInfo({ resolution, total, selectedCount, aboveThresholdCount }: LayerInfoProps) {
  return (
    <div className="rounded bg-black/70 px-3 py-2 text-xs text-white shadow backdrop-blur min-w-[140px]">
      <div className="flex justify-between gap-3">
        <span className="text-gray-400">Capa</span>
        <span className="font-mono">Res {resolution}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-gray-400">Tamaño</span>
        <span>{RES_LABELS[resolution] ?? `Res ${resolution}`}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-gray-400">Total hex</span>
        <span>{total.toLocaleString()}</span>
      </div>
      <hr className="my-1 border-gray-600" />
      <div className="flex justify-between gap-3">
        <span className="text-blue-400">Seleccionados</span>
        <span className="font-bold text-blue-400">{selectedCount.toLocaleString()}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-amber-400">Sobre umbral</span>
        <span className="font-bold text-amber-400">{aboveThresholdCount.toLocaleString()}</span>
      </div>
    </div>
  );
}
