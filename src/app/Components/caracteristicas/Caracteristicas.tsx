"use client";

import { useEffect, useMemo } from "react";
import { cellArea } from "h3-js";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import {
  useCaracteristicas,
  type CategoriaAerogenerador,
} from "../../Utils/contexts/CaracteristicasContext";
import { dominantHexType } from "../../Utils/h3/hexClassification";
import { calcNumAerogeneradores, AEROGENERADORES } from "../../Utils/projectData";
import MWPicker from "./MWPicker";
import NextStepButton from "../ui/NextStepButton";

/**
 * US05 — Subpágina "Características del proyecto".
 *
 * Restricción de selección onshore/offshore vive en `Map.tsx` (`toggleHex`),
 * usando `canAddHexToSelection` de `Utils/hexClassification.ts`.
 */
export default function Caracteristicas() {
  const { selectedHexes } = useAprincipal();
  const {
    tipoEmplazamiento,
    setTipoEmplazamiento,
    tipoTecnologiaOffshore,
    setTipoTecnologiaOffshore,
    capacidadMW,
    setCapacidadMW,
    numAerogeneradores,
    setNumAerogeneradores,
    categoriaAerogenerador,
    setCategoriaAerogenerador,
  } = useCaracteristicas();

  const areaKm2 = useMemo(() => {
    let acc = 0;
    for (const h of selectedHexes) acc += cellArea(h, "km2");
    return acc;
  }, [selectedHexes]);

  // US05-AC3 — Validación de rangos técnicos.
  const errors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!tipoEmplazamiento) {
      e.tipoEmplazamiento = "Selecciona al menos un hexágono en el mapa.";
    }
    if (tipoEmplazamiento === "offshore" && !tipoTecnologiaOffshore) {
      e.tipoTecnologiaOffshore =
        "Selecciona el tipo de tecnología offshore (flotante o fija).";
    }
    if (capacidadMW === null || capacidadMW <= 0) {
      e.capacidadMW =
        "La capacidad nominal debe ser mayor a 0 MW (rango permitido 0.01 – 999.99).";
    } else if (capacidadMW > 999.99) {
      e.capacidadMW = "La capacidad excede el límite de 999.99 MW.";
    }
    if (!categoriaAerogenerador) {
      e.categoriaAerogenerador =
        "Selecciona la categoría/perfil del aerogenerador.";
    }
    return e;
  }, [
    tipoEmplazamiento,
    tipoTecnologiaOffshore,
    capacidadMW,
    categoriaAerogenerador,
  ]);

  const hasErrors = Object.keys(errors).length > 0;

  const detectado = useMemo(
    () => dominantHexType(selectedHexes),
    [selectedHexes],
  );

  // Inicializa el emplazamiento con el detectado SÓLO como default (cuando aún
  // no hay valor). #11: el usuario puede cambiarlo a mano y no se sobrescribe.
  useEffect(() => {
    if (tipoEmplazamiento === null && detectado) {
      setTipoEmplazamiento(detectado);
    }
  }, [detectado, tipoEmplazamiento, setTipoEmplazamiento]);

  // #12: Nº de aerogeneradores se DERIVA de categoría + área (ya no manual).
  useEffect(() => {
    setNumAerogeneradores(
      calcNumAerogeneradores(areaKm2, categoriaAerogenerador),
    );
  }, [areaKm2, categoriaAerogenerador, setNumAerogeneradores]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-lg font-bold text-[#393939ff]">
          Características del proyecto
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Configura las propiedades técnicas del proyecto eólico sobre el área
          seleccionada.
        </p>

        <EmplazamientoSection
          detectado={detectado}
          tipoEmplazamiento={tipoEmplazamiento}
          onTipoChange={setTipoEmplazamiento}
          tipoTecnologiaOffshore={tipoTecnologiaOffshore}
          onTecnologiaChange={setTipoTecnologiaOffshore}
          tecnologiaError={errors.tipoTecnologiaOffshore}
        />

        <CapacidadSection
          capacidadMW={capacidadMW}
          onChange={setCapacidadMW}
          error={errors.capacidadMW}
        />

        <TamañoSection
          areaKm2={areaKm2}
          numAerogeneradores={numAerogeneradores}
          categoria={categoriaAerogenerador}
          onCategoriaChange={setCategoriaAerogenerador}
          categoriaError={errors.categoriaAerogenerador}
        />
      </div>

      <NextStepButton
        disabled={hasErrors}
        blockedReason={
          hasErrors
            ? "Corrige los campos marcados antes de continuar."
            : undefined
        }
      />
    </div>
  );
}

function EmplazamientoSection({
  detectado,
  tipoEmplazamiento,
  onTipoChange,
  tipoTecnologiaOffshore,
  onTecnologiaChange,
  tecnologiaError,
}: {
  detectado: ReturnType<typeof dominantHexType>;
  tipoEmplazamiento: ReturnType<typeof useCaracteristicas>["tipoEmplazamiento"];
  onTipoChange: ReturnType<typeof useCaracteristicas>["setTipoEmplazamiento"];
  tipoTecnologiaOffshore: ReturnType<
    typeof useCaracteristicas
  >["tipoTecnologiaOffshore"];
  onTecnologiaChange: ReturnType<
    typeof useCaracteristicas
  >["setTipoTecnologiaOffshore"];
  tecnologiaError?: string;
}) {
  return (
    <section className="mt-5 rounded-md bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#383838]">Tipo de emplazamiento</h3>
      <p className="mt-0.5 text-[11px] text-gray-500">
        {detectado
          ? "Detectado automáticamente según el área; puedes cambiarlo manualmente."
          : "Selecciona un área en el mapa o elige el emplazamiento manualmente."}
      </p>

      <div className="mt-3 flex gap-2">
        <RadioCard
          checked={tipoEmplazamiento === "onshore"}
          onClick={() => onTipoChange("onshore")}
          label="Onshore (tierra)"
          hint="El proyecto está en tierra firme."
        />
        <RadioCard
          checked={tipoEmplazamiento === "offshore"}
          onClick={() => onTipoChange("offshore")}
          label="Offshore (mar)"
          hint="El proyecto está costa afuera."
        />
      </div>
      {detectado && detectado !== tipoEmplazamiento && (
        <p className="mt-2 text-[11px] text-amber-600">
          El área seleccionada sugiere{" "}
          <strong>{detectado === "onshore" ? "onshore" : "offshore"}</strong>.
        </p>
      )}

      {tipoEmplazamiento === "offshore" && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-[#383838]">
            Tipo de tecnología offshore
          </p>
          <div className="mt-2 flex gap-2">
            <RadioCard
              checked={tipoTecnologiaOffshore === "flotante"}
              onClick={() => onTecnologiaChange("flotante")}
              label="Flotante"
              hint="Aerogeneradores sobre estructuras flotantes ancladas."
            />
            <RadioCard
              checked={tipoTecnologiaOffshore === "fija"}
              onClick={() => onTecnologiaChange("fija")}
              label="Fija con cimentación"
              hint="Aerogeneradores cimentados al lecho marino."
            />
          </div>
          <FieldError message={tecnologiaError} />
        </div>
      )}
    </section>
  );
}

function CapacidadSection({
  capacidadMW,
  onChange,
  error,
}: {
  capacidadMW: number | null;
  onChange: (n: number | null) => void;
  error?: string;
}) {
  const current = capacidadMW ?? 0;
  const sizeLabel =
    current >= 20 ? "Grande" : current > 1 ? "Mediano" : "Pequeña";
  const sizeRange = current >= 20 ? ">20" : current > 1 ? ">1" : "≤1";
  const sizeClasses =
    current >= 20
      ? "bg-blue-100 text-blue-800"
      : current > 1
        ? "bg-emerald-100 text-emerald-800"
        : "bg-amber-100 text-amber-800";

  return (
    <section className="mt-4 rounded-md bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#383838]">
        Capacidad nominal (MW)
      </h3>
      <p className="mt-0.5 text-[11px] text-gray-500">
        Define la capacidad instalada esperada para el proyecto. Ajusta cada
        dígito con las flechas o con la rueda del mouse / teclas ↑ ↓.
      </p>

      <div className="mt-4 rounded-md bg-gray-50 p-3">
        <MWPicker value={current} onChange={onChange} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-gray-500">
          Valor:{" "}
          <span className="font-mono font-semibold text-[#165170ff]">
            {current.toFixed(2)} MW
          </span>
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${sizeClasses}`}
        >
          {sizeLabel} ({sizeRange} MW)
        </span>
      </div>
      <FieldError message={error} />
    </section>
  );
}

// Categorías desde el doc maestro (Utils/projectData) — labels/detalles y specs.
const CATEGORIAS: { id: CategoriaAerogenerador; label: string; detail: string }[] =
  (["S", "M", "L"] as const).map((id) => ({
    id,
    label: AEROGENERADORES[id].label,
    detail: AEROGENERADORES[id].detail,
  }));

function TamañoSection({
  areaKm2,
  numAerogeneradores,
  categoria,
  onCategoriaChange,
  categoriaError,
}: {
  areaKm2: number;
  numAerogeneradores: number | null;
  categoria: CategoriaAerogenerador;
  onCategoriaChange: (c: CategoriaAerogenerador) => void;
  categoriaError?: string;
}) {
  return (
    <section className="mt-4 rounded-md bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#383838]">Tamaño del proyecto</h3>
      <p className="mt-0.5 text-[11px] text-gray-500">
        Define el alcance físico y el perfil de los aerogeneradores.
      </p>

      <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="font-semibold text-gray-500">Área del proyecto</dt>
        <dd className="text-gray-700">
          {areaKm2 > 0 ? (
            <span className="font-mono font-semibold text-[#165170ff]">
              {areaKm2.toLocaleString("es-CO", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              km²
            </span>
          ) : (
            <span className="italic text-gray-400">
              Selecciona hexágonos en el mapa
            </span>
          )}
        </dd>

        <dt className="font-semibold text-gray-500">
          Número de aerogeneradores
        </dt>
        <dd className="text-gray-700">
          {categoria && areaKm2 > 0 ? (
            <span className="font-mono font-semibold text-[#165170ff]">
              {numAerogeneradores ?? 0}
            </span>
          ) : (
            <span className="italic text-gray-400">
              Selecciona categoría y área
            </span>
          )}
          <span className="ml-1 text-[10px] text-gray-400">
            (calculado según categoría y área)
          </span>
        </dd>
      </dl>

      <div className="mt-4">
        <p className="text-xs font-semibold text-[#383838]">
          Categoría / perfil del aerogenerador
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoriaChange(cat.id)}
              aria-pressed={categoria === cat.id}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                categoria === cat.id
                  ? "border-[#165170ff] bg-[#cce1eeff]/40 ring-2 ring-[#165170ff]/30"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <span className="block font-mono text-lg font-bold text-[#165170ff]">
                {cat.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-tight text-gray-500">
                {cat.detail}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] italic text-gray-400">
          3 categorías por ahora — podrían subir a 5 cuando el cliente cierre el
          catálogo.
        </p>
        <FieldError message={categoriaError} />
      </div>
    </section>
  );
}

function RadioCard({
  checked,
  onClick,
  label,
  hint,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`flex-1 rounded-md border px-3 py-2 text-left transition-colors ${
        checked
          ? "border-[#165170ff] bg-[#cce1eeff]/40 ring-2 ring-[#165170ff]/30"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <span className="block text-xs font-semibold text-[#383838]">{label}</span>
      <span className="mt-0.5 block text-[10px] leading-tight text-gray-500">
        {hint}
      </span>
    </button>
  );
}

function FieldError({
  message,
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`text-[11px] font-medium text-red-600 ${className || "mt-2"}`}
    >
      {message}
    </p>
  );
}
