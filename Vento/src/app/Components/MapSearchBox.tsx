"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlace, type Place } from "../Utils/geocoder";

const DEBOUNCE_MS = 350;

/**
 * Search box estilo Google Maps montado top-left del mapa.
 * Busca lugares en Colombia (departamento / municipio / corregimiento) vía Nominatim.
 * Al seleccionar un resultado dispara `onSelect(place)`.
 *
 * Comportamiento:
 * - Debounce de 350ms entre keystrokes (respeta política de Nominatim)
 * - Spinner mientras carga; "Sin resultados" si la búsqueda no devuelve nada
 * - Cancela peticiones obsoletas con AbortController
 * - ESC cierra el dropdown y devuelve foco al input
 */
export default function MapSearchBox({
  onSelect,
}: {
  onSelect: (place: Place) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce + AbortController para cancelar peticiones obsoletas
  useEffect(() => {
    const q = query.trim();
    // Las queries cortas se limpian en el onChange del input (event handler),
    // no aquí — el effect sólo orquesta el fetch debounced.
    if (q.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      searchPlace(q, controller.signal)
        .then((places) => {
          setResults(places);
          setLoading(false);
          setOpen(true);
        })
        .catch((err) => {
          if ((err as { name?: string }).name === "AbortError") return;
          setResults([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  // Click fuera y ESC cierran el dropdown
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (place: Place) => {
    onSelect(place);
    setOpen(false);
    setQuery(place.name);
    inputRef.current?.blur();
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-3 z-10 w-72 max-md:w-56"
    >
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.32 4.16l3.26 3.26a1 1 0 01-1.42 1.42l-3.26-3.26A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (v.trim().length < 2) {
              setResults([]);
              setLoading(false);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar corregimiento, municipio…"
          aria-label="Buscar lugar"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="map-search-listbox"
          aria-expanded={open}
          className="w-full rounded-full bg-white/95 px-9 py-2 text-sm text-[#393939] placeholder:text-gray-400 shadow-md outline-none focus:bg-white"
        />
        {loading && (
          <span
            aria-hidden="true"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 animate-spin"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeOpacity="0.25"
              />
              <path
                d="M22 12a10 10 0 00-10-10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </div>

      {open && (
        <ul
          id="map-search-listbox"
          role="listbox"
          className="mt-1 max-h-80 overflow-y-auto rounded-lg bg-white shadow-lg ring-1 ring-black/5"
        >
          {results.length === 0 && !loading && (
            <li className="px-3 py-2 text-xs text-gray-500">Sin resultados</li>
          )}
          {results.map((place, i) => (
            <li key={`${place.lat}-${place.lng}-${i}`} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(place)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-gray-50"
              >
                <PlaceIcon type={place.type} category={place.category} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[#393939] leading-tight truncate">
                    {place.name}
                  </span>
                  <span className="block text-[11px] text-gray-500 leading-tight truncate">
                    {place.displayName}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Icono pequeño según el tipo OSM. Placeholder con SVG inline; reemplazable. */
function PlaceIcon({ type, category }: { type: string; category: string }) {
  const isCity =
    type === "city" || type === "town" || category === "boundary";
  // Pin genérico (es independiente del tipo en v1)
  const path = isCity
    ? "M10 18s7-6.27 7-11a7 7 0 10-14 0c0 4.73 7 11 7 11zm0-9a2 2 0 110-4 2 2 0 010 4z"
    : "M10 18s7-6.27 7-11a7 7 0 10-14 0c0 4.73 7 11 7 11zm0-9a2 2 0 110-4 2 2 0 010 4z";
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 mt-0.5 text-[#165170ff]"
    >
      <path fillRule="evenodd" d={path} clipRule="evenodd" />
    </svg>
  );
}
