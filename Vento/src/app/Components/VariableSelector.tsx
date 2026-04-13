"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "../Utils/apiUrl";
import { authFetch } from "../Utils/authFetch";

interface VariableInfo {
  name: string;
  label: string;
  range: { min: number; max: number } | null;
}

interface VariableSelectorProps {
  selected: string | null;  // null = sin filtro (score general)
  onSelect: (varName: string | null) => void;
}

export default function VariableSelector({ selected, onSelect }: VariableSelectorProps) {
  const [variables, setVariables] = useState<VariableInfo[]>([]);

  useEffect(() => {
    authFetch(`${API_BASE}/api/tiles/variables`)
      .then((res) => res.json())
      .then((data) => {
        if (data.variables) setVariables(data.variables);
      })
      .catch(() => {});
  }, []);

  if (variables.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 z-10">
      <select
        value={selected ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="rounded bg-white/90 px-3 py-1.5 text-sm text-gray-800 shadow backdrop-blur border border-gray-300 cursor-pointer"
      >
        <option value="">Temp. Viabilidad</option>
        {variables.map((v) => (
          <option key={v.name} value={v.name}>
            {v.label}
          </option>
        ))}
      </select>
    </div>
  );
}
