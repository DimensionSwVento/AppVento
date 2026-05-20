"use client";

import { useMemo, useState } from "react";
import DimensionCard from "./DimensionCard";
import NextStepButton from "./NextStepButton";
import { DIMENSIONS, variablesByDimension } from "../Utils/variablesCatalog";
import type { Variable } from "../Utils/variablesCatalog";

function matches(query: string, v: Variable): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    v.label.toLowerCase().includes(q) ||
    v.description.toLowerCase().includes(q)
  );
}

export default function Dimensions() {
  const [query, setQuery] = useState("");

  const filteredByDimension = useMemo(() => {
    const map = new Map<string, Variable[]>();
    for (const d of DIMENSIONS) {
      map.set(d.id, variablesByDimension(d.id).filter((v) => matches(query, v)));
    }
    return map;
  }, [query]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold text-[#393939ff]">
        Configura las variables de interés por cada dimensión
      </h2>

      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar variables"
          aria-label="Buscar variables"
          className="w-full rounded-lg bg-white px-3 py-2 pr-9 text-sm text-[#393939ff] placeholder:text-gray-400 shadow-sm outline-none"
        />
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.32 4.16l3.26 3.26a1 1 0 01-1.42 1.42l-3.26-3.26A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        {DIMENSIONS.map((d) => {
          const vars = filteredByDimension.get(d.id) ?? [];
          if (query.trim() && vars.length === 0) return null;
          return (
            <DimensionCard
              key={d.id}
              dimension={d}
              variables={vars}
              defaultOpen={Boolean(query.trim())}
            />
          );
        })}
      </div>

      <NextStepButton />
    </div>
  );
}
