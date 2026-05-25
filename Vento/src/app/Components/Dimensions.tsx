"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "./Card";
import NextStepButton from "./NextStepButton";
import VariableTooltip from "./VariableTooltip";

interface VariableInfo {
  dimension: string;
  name: string;
  label: string;
  definition?: string | null;
  type?: string;
}

const DIMENSIONS = [
  {
    key: "ambiental",
    title: "Dimensión ambiental",
    description: "Promedio anual de velocidad del viento a 100m de altura",
  },
  {
    key: "tecnica",
    title: "Dimensión técnica",
    description: "Energía disponible por unidad de área barrida por el rotor",
  },
  {
    key: "regulatoria",
    title: "Dimensión regulatoria",
    description: "Clasificación del suelo según obstáculos y vegetación",
  },
  {
    key: "socioeconomica",
    title: "Dimensión socioeconómica",
    description: "Proximidad a líneas de transmisión existentes",
  },
  {
    key: "macroeconomica",
    title: "Dimensión macroeconómica",
    description: "Distancia a vías principales para transporte de equipos",
  },
];

function normalizeDimension(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getDimensionKey(value: string) {
  const normalized = normalizeDimension(value);
  return (
    DIMENSIONS.find((dimension) => normalized.includes(dimension.key))?.key ??
    normalized
  );
}

export default function Dimensions() {
  const [variables, setVariables] = useState<VariableInfo[]>([]);

  useEffect(() => {
    fetch("/api/variables")
      .then((res) => {
        if (!res.ok) throw new Error("variables request failed");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data.variables)) setVariables(data.variables);
      })
      .catch(() => {});
  }, []);

  const variablesByDimension = useMemo(() => {
    return variables.reduce<Record<string, VariableInfo[]>>(
      (groups, variable) => {
        const key = getDimensionKey(variable.dimension);
        groups[key] = [...(groups[key] ?? []), variable];
        return groups;
      },
      {},
    );
  }, [variables]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg text-[#393939ff] font-bold">
        Configura las variables de interés por cada dimensión
      </h2>
      {variables.length > 0
        ? DIMENSIONS.map((dim) => {
            const dimensionVariables = variablesByDimension[dim.key] ?? [];
            return (
              <div
                key={dim.title}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-black">{dim.title}</h3>
                <p className="mt-1 text-sm text-gray-700">{dim.description}</p>
                {dimensionVariables.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {dimensionVariables.map((variable) => (
                      <li
                        key={variable.name}
                        className="flex items-center justify-between gap-3 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800"
                      >
                        <span>{variable.label}</span>
                        <VariableTooltip
                          definition={
                            variable.definition?.trim() ||
                            "Definición no disponible"
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        : DIMENSIONS.map((dim) => (
            <Card key={dim.title} title={dim.title} description={dim.description} />
          ))}
      <NextStepButton />
    </div>
  );
}
