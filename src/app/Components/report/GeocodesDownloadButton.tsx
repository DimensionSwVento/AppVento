"use client";

import { useState } from "react";
import {
  fetchColombiaGeocodes,
  downloadJson,
} from "../../Utils/h3/buildGeocodes";

/**
 * Botón de GENERACIÓN (solo en modo template/dev): baja todos los lugares de
 * Colombia desde OpenStreetMap (Overpass, gratis, sin token) y descarga un
 * `geocodes-colombia.json`. Ese archivo se guarda en el repo/backend y la barra de
 * búsqueda lo usa en LOCAL → sin depender de Nominatim. Se corre UNA vez.
 */
export default function GeocodesDownloadButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [count, setCount] = useState(0);

  const run = async () => {
    setState("loading");
    setMsg("Preparando consulta…");
    try {
      const data = await fetchColombiaGeocodes((m) => setMsg(m));
      setCount(data.length);
      setMsg("Generando archivo…");
      downloadJson(data, "geocodes-colombia.json");
      setState("done");
      setMsg(`Listo: ${data.length.toLocaleString("es")} lugares descargados.`);
    } catch (e) {
      setState("error");
      setMsg(`Falló la descarga: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="my-4 rounded-xl border-2 border-dashed border-[#165170] bg-[#cce1ee]/30 p-5 text-center">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#165170]">
        Herramienta de generación (modo template)
      </p>
      <p className="mb-3 text-[13px] text-gray-600">
        Baja los lugares de Colombia desde OpenStreetMap (gratis, sin token) y genera
        <code className="mx-1 rounded bg-white px-1">geocodes-colombia.json</code>
        para la búsqueda propia (sin Nominatim). Guardalo en el repo/backend.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 rounded-lg bg-[#165170] px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-[#123f57] disabled:opacity-60"
      >
        {state === "loading" ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Descargando…
          </>
        ) : (
          <>⬇ Descargar geocodes (Colombia)</>
        )}
      </button>
      {msg && (
        <p
          className={`mt-3 text-[12px] ${
            state === "error"
              ? "text-red-600"
              : state === "done"
                ? "text-green-700"
                : "text-gray-500"
          }`}
        >
          {msg}
          {state === "done" && count > 0 && (
            <>
              {" "}Movelo a <code className="rounded bg-white px-1">public/</code> o al
              backend y conectamos la búsqueda.
            </>
          )}
        </p>
      )}
    </div>
  );
}
