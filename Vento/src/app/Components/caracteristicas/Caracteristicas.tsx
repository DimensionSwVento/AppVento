"use client";

import { useEffect, useMemo } from "react";
import { cellArea } from "h3-js";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import {
  useCaracteristicas,
  type CategoriaAerogenerador,
} from "../../Utils/contexts/CaracteristicasContext";
import {
  isCapacityWithinRange,
  MAX_CAPACITY_MW,
  MIN_CAPACITY_MW,
} from "../../Utils/capacity";
import { dominantHexType } from "../../Utils/h3/hexClassification";
import {
  calcNumAerogeneradores,
  AEROGENERADORES,
  areaRangeForCapacity,
} from "../../Utils/projectData";
import {
  CARACTERISTICA_DEFINICIONES,
  TIPO_AEROGENERADOR_RANGOS,
  tamanoPorCapacidad,
} from "../../Utils/caracteristicasInfo";
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
    if (!isCapacityWithinRange(capacidadMW)) {
      e.capacidadMW =
        capacidadMW !== null &&
        Number.isFinite(capacidadMW) &&
        capacidadMW > MAX_CAPACITY_MW
          ? `La capacidad excede el límite de ${MAX_CAPACITY_MW} MW.`
          : `La capacidad nominal debe ser de al menos ${MIN_CAPACITY_MW} MW (rango permitido ${MIN_CAPACITY_MW} – ${MAX_CAPACITY_MW}).`;
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

  // US04-04 — Alerta (NO bloqueante) de área vs capacidad nominal: si el área
  // seleccionada queda fuera del rango esperado para la capacidad elegida.
  // Se mantiene FUERA de `errors` para no gatear el botón "Siguiente paso".
  const areaWarning = useMemo<string | null>(() => {
    if (areaKm2 <= 0 || !isCapacityWithinRange(capacidadMW)) return null;
    const range = areaRangeForCapacity(capacidadMW, categoriaAerogenerador);
    if (!range) return null;
    const fmt = (n: number) =>
      n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
    const banda = `~${fmt(range.min)}–${fmt(range.max)} km²`;
    if (areaKm2 < range.min)
      return `El área seleccionada (${fmt(areaKm2)} km²) es MENOR que la esperada para ${capacidadMW} MW (${banda}). Amplía el área o reduce la capacidad.`;
    if (areaKm2 > range.max)
      return `El área seleccionada (${fmt(areaKm2)} km²) es MAYOR que la esperada para ${capacidadMW} MW (${banda}). Reduce el área o aumenta la capacidad.`;
    return null;
  }, [areaKm2, capacidadMW, categoriaAerogenerador]);

  const detectado = useMemo(
    () => dominantHexType(selectedHexes),
    [selectedHexes],
  );

  // El emplazamiento lo DICTA la zona: área en mar → offshore; en tierra →
  // onshore (no se puede mezclar). La opción contraria se deshabilita abajo.
  // Sólo cuando no hay área definida (`detectado === null`) el usuario elige.
  useEffect(() => {
    if (detectado && tipoEmplazamiento !== detectado) {
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
          areaWarning={areaWarning}
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
      <h3
        className="text-sm font-bold text-[#383838]"
        title={CARACTERISTICA_DEFINICIONES.emplazamiento}
      >
        Tipo de emplazamiento
      </h3>
      <p className="mt-0.5 text-[11px] text-gray-500">
        {detectado
          ? "Definido por el área seleccionada (no se puede mezclar mar y tierra)."
          : "Selecciona un área en el mapa o elige el emplazamiento manualmente."}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-gray-400">
        {CARACTERISTICA_DEFINICIONES.emplazamiento}
      </p>

      <div className="mt-3 flex gap-2">
        <RadioCard
          checked={tipoEmplazamiento === "onshore"}
          onClick={() => onTipoChange("onshore")}
          disabled={detectado === "offshore"}
          label="Onshore (tierra)"
          hint="El proyecto está en tierra firme."
        />
        <RadioCard
          checked={tipoEmplazamiento === "offshore"}
          onClick={() => onTipoChange("offshore")}
          disabled={detectado === "onshore"}
          label="Offshore (mar)"
          hint="El proyecto está costa afuera."
        />
      </div>

      {tipoEmplazamiento === "offshore" && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-[#383838]">
            Tipo de tecnología offshore
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-400">
            {CARACTERISTICA_DEFINICIONES.tecnologiaOffshore}
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
  areaWarning,
}: {
  capacidadMW: number | null;
  onChange: (n: number | null) => void;
  error?: string;
  areaWarning?: string | null;
}) {
  const errorId = "capacidad-mw-error";
  const current = capacidadMW ?? 0;
  // Categorización por tamaño según los umbrales del cliente (template).
  const tamano = tamanoPorCapacidad(current);
  const sizeClasses =
    current >= 20
      ? "bg-blue-100 text-blue-800"
      : current > 1
        ? "bg-emerald-100 text-emerald-800"
        : "bg-amber-100 text-amber-800";

  return (
    <section className="mt-4 rounded-md bg-white p-4 shadow-sm">
      <h3
        className="text-sm font-bold text-[#383838]"
        title={CARACTERISTICA_DEFINICIONES.capacidadNominal}
      >
        Capacidad nominal (MW)
      </h3>
      <p className="mt-0.5 text-[11px] text-gray-500">
        Define la capacidad instalada esperada para el proyecto. Escribe cada
        dígito o ajústalo con las flechas, la rueda del mouse o las teclas ↑ ↓.
      </p>
      <p className="mt-1 text-[11px] leading-snug text-gray-400">
        Habilita o deshabilita los tipos de turbina disponibles.
      </p>

      <div className="mt-4 rounded-md bg-gray-50 p-3">
        <MWPicker
          value={current}
          onChange={onChange}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
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
          title={tamano.detalle}
        >
          {tamano.label} ({tamano.rango})
        </span>
      </div>
      <p className="mt-1 text-[10px] italic text-gray-400">{tamano.detalle}</p>
      <FieldError id={errorId} message={error} />

      {/* US04-04 — alerta área vs capacidad (aviso, no bloquea el flujo). */}
      {areaWarning && (
        <div
          role="status"
          className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800"
        >
          <svg
            className="mt-[1px] h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
          </svg>
          <span>{areaWarning}</span>
        </div>
      )}
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
              <span className="mt-1 block text-[9px] leading-tight text-gray-400">
                {cat.id ? TIPO_AEROGENERADOR_RANGOS[cat.id] : ""}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] italic text-gray-400">
          El número de unidades se calcula según la categoría y el área.
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
  disabled = false,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={checked}
      className={`flex-1 rounded-md border px-3 py-2 text-left transition-colors ${
        checked
          ? "border-[#165170ff] bg-[#cce1eeff]/40 ring-2 ring-[#165170ff]/30"
          : "border-gray-200 bg-white hover:bg-gray-50"
      } ${disabled ? "cursor-not-allowed opacity-40 hover:bg-white" : ""}`}
    >
      <span className="block text-xs font-semibold text-[#383838]">{label}</span>
      <span className="mt-0.5 block text-[10px] leading-tight text-gray-500">
        {hint}
      </span>
    </button>
  );
}

function FieldError({
  id,
  message,
  className = "",
}: {
  id?: string;
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={`text-[11px] font-medium text-red-600 ${className || "mt-2"}`}
    >
      {message}
    </p>
  );
}
