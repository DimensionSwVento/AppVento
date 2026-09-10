"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlace, type Place } from "../../Utils/h3/geocoder";

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
  polygonPoints = [],
  onAddCoordinate,
  onRemovePoint,
  onApplyPolygon,
}: {
  onSelect: (place: Place) => void;
  /** Vértices del polígono en curso (US03-04) — para listarlos aquí. */
  polygonPoints?: [number, number][];
  /** Añade un vértice por coordenada [lng,lat] (y vuela ahí). */
  onAddCoordinate?: (lng: number, lat: number) => void;
  /** Quita el vértice i del polígono. */
  onRemovePoint?: (index: number) => void;
  /** Materializa el polígono en hexágonos seleccionados. */
  onApplyPolygon?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Panel "por coordenadas" (US03-04): campo lat,lng que añade vértices.
  const [coordOpen, setCoordOpen] = useState(false);
  const [coordText, setCoordText] = useState("");
  const [coordErr, setCoordErr] = useState<string | null>(null);
  const coordsEnabled = Boolean(onAddCoordinate);

  const submitCoord = () => {
    // Acepta "lat, lng" o "lat lng".
    const m = coordText.trim().split(/[, ]+/).filter(Boolean);
    if (m.length !== 2) {
      setCoordErr("Escribe: latitud, longitud");
      return;
    }
    const lat = Number(m[0]);
    const lng = Number(m[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setCoordErr("Coordenadas inválidas");
      return;
    }
    setCoordErr(null);
    setCoordText("");
    onAddCoordinate?.(lng, lat); // el mapa vuela ahí y añade el vértice
  };
  // Evita re-buscar (y reabrir el dropdown) cuando el query cambia por una selección.
  const suppressSearchRef = useRef(false);

  // Debounce + AbortController para cancelar peticiones obsoletas
  useEffect(() => {
    const q = query.trim();
    // Las queries cortas se limpian en el onChange del input (event handler),
    // no aquí — el effect sólo orquesta el fetch debounced.
    if (q.length < 2) return;
    // Tras seleccionar un resultado el query pasa a ser el nombre del lugar:
    // no re-buscar ni reabrir el desplegable (US #8).
    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }
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
    suppressSearchRef.current = true; // el setQuery de abajo no debe reabrir el dropdown
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

      {/* Selección por COORDENADAS (US03-04): campos que arman un polígono. */}
      {coordsEnabled && (
        <div className="mt-1 rounded-lg bg-white shadow-md ring-1 ring-black/5">
          <button
            type="button"
            onClick={() => setCoordOpen((o) => !o)}
            aria-expanded={coordOpen}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-[#165170ff]"
          >
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M10 2a5 5 0 00-5 5c0 3.5 5 11 5 11s5-7.5 5-11a5 5 0 00-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
              </svg>
              Seleccionar por coordenadas
            </span>
            <span className={`transition-transform ${coordOpen ? "rotate-180" : ""}`}>▾</span>
          </button>
          {coordOpen && (
            <div className="border-t border-gray-100 px-3 py-2">
              {/* Lista de vértices ya puestos (clic en el mapa o por coordenada). */}
              {polygonPoints.length > 0 && (
                <ol className="mb-2 flex flex-col gap-1">
                  {polygonPoints.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-[11px] text-gray-600">
                      <span className="font-mono">
                        {i + 1}. {p[1].toFixed(4)}, {p[0].toFixed(4)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemovePoint?.(i)}
                        aria-label={`Quitar punto ${i + 1}`}
                        className="text-gray-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={coordText}
                  onChange={(e) => setCoordText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitCoord();
                    }
                  }}
                  placeholder="lat, lng (ej. 6.25, -75.57)"
                  aria-label="Latitud, longitud"
                  className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-[#165170ff]"
                />
                <button
                  type="button"
                  onClick={submitCoord}
                  title="Añadir punto"
                  className="shrink-0 rounded-md bg-[#165170ff] px-2.5 py-1.5 text-xs font-semibold text-white"
                >
                  Añadir
                </button>
              </div>
              {coordErr && (
                <p className="mt-1 text-[10px] text-red-600">{coordErr}</p>
              )}
              <button
                type="button"
                onClick={() => onApplyPolygon?.()}
                disabled={polygonPoints.length < 3}
                className="mt-2 w-full rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                Seleccionar área ({polygonPoints.length})
              </button>
              <p className="mt-1 text-[10px] leading-snug text-gray-400">
                Pon al menos 3 puntos (aquí o tocando el mapa) para formar el
                área; los hexágonos dentro quedan seleccionados.
              </p>
            </div>
          )}
        </div>
      )}

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
                <SelectBadge willSelect={place.polygons.length > 0} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Etiqueta ovalada que indica si el resultado se auto-selecciona al elegirlo:
 * - Verde "Autoselección": tiene polígono → `handlePlaceSelect` pinta sus hexes
 *   (ciudad / perímetro / municipio).
 * - Naranja "Exploración": sin polígono → sólo vuela la cámara, no selecciona
 *   (región / área grande).
 */
function SelectBadge({ willSelect }: { willSelect: boolean }) {
  return (
    <span
      className={`mt-0.5 shrink-0 self-start rounded-full px-2 py-0.5 text-[9px] font-semibold ${
        willSelect
          ? "bg-green-100 text-green-700"
          : "bg-orange-100 text-orange-700"
      }`}
    >
      {willSelect ? "Autoselección" : "Exploración"}
    </span>
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
