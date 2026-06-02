"use client";

import { useEffect, useMemo } from "react";
import { cellArea } from "h3-js";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import {
  useCaracteristicas,
  type CategoriaAerogenerador,
} from "../Utils/CaracteristicasContext";
import { dominantHexType } from "../Utils/hexClassification";
import MWPicker from "./MWPicker";
import NextStepButton from "./NextStepButton";

/**
 * US05 — Subpágina "Características del proyecto".
 *
 * Estructura (se completa en pasos siguientes):
 *  - **Emplazamiento** (sección 1, este paso): auto-detectado desde
 *    `selectedHexes`. Si el área es offshore, aparece selector flotante/fija.
 *  - Capacidad nominal MW (sección 2, pendiente)
 *  - Tamaño del proyecto (sección 3, pendiente)
 *  - Distancia al SIN (sección 4, pendiente — tarea Felipe)
 *  - Botón "Siguiente paso" — avanza a informe.
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
    distanciaSINKm,
    setDistanciaSINKm,
  } = useCaracteristicas();

  const areaKm2 = useMemo(() => {
    let acc = 0;
    for (const h of selectedHexes) acc += cellArea(h, "km2");
    return acc;
  }, [selectedHexes]);

  // US05-AC3 — Validación de rangos técnicos.
  // Un error por campo → string con el mensaje a mostrar inline (y bloquear "Siguiente").
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
    if (numAerogeneradores === null) {
      e.numAerogeneradores = "Ingresa el número de aerogeneradores.";
    } else if (numAerogeneradores < 1) {
      e.numAerogeneradores = "Debe haber al menos 1 aerogenerador.";
    } else if (numAerogeneradores > 500) {
      e.numAerogeneradores =
        "Cantidad fuera del rango técnico permitido (máx. 500).";
    }
    if (!categoriaAerogenerador) {
      e.categoriaAerogenerador =
        "Selecciona la categoría/perfil del aerogenerador.";
    }
    if (distanciaSINKm === null) {
      e.distanciaSINKm = "Ingresa la distancia al SIN.";
    } else if (distanciaSINKm < 0) {
      e.distanciaSINKm = "La distancia no puede ser negativa.";
    } else if (distanciaSINKm > 500) {
      e.distanciaSINKm =
        "Distancia fuera del rango técnico (máx. 500 km en territorio colombiano).";
    }
    return e;
  }, [
    tipoEmplazamiento,
    tipoTecnologiaOffshore,
    capacidadMW,
    numAerogeneradores,
    categoriaAerogenerador,
    distanciaSINKm,
  ]);

  const hasErrors = Object.keys(errors).length > 0;

  const detectado = useMemo(
    () => dominantHexType(selectedHexes),
    [selectedHexes],
  );

  // Auto-sincroniza el tipo cuando cambia la selección.
  useEffect(() => {
    if (detectado !== tipoEmplazamiento) {
      setTipoEmplazamiento(detectado);
    }
  }, [detectado, tipoEmplazamiento, setTipoEmplazamiento]);

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
          onNumChange={setNumAerogeneradores}
          categoria={categoriaAerogenerador}
          onCategoriaChange={setCategoriaAerogenerador}
          numError={errors.numAerogeneradores}
          categoriaError={errors.categoriaAerogenerador}
        />

        <DistanciaSINSection
          distanciaSINKm={distanciaSINKm}
          onChange={setDistanciaSINKm}
          error={errors.distanciaSINKm}
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
  tipoTecnologiaOffshore,
  onTecnologiaChange,
  tecnologiaError,
}: {
  detectado: ReturnType<typeof dominantHexType>;
  tipoEmplazamiento: ReturnType<typeof useCaracteristicas>["tipoEmplazamiento"];
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
        Se determina automáticamente a partir del área seleccionada.
      </p>

      {!detectado ? (
        <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Selecciona al menos un hexágono en el mapa para detectar el
          emplazamiento.
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Badge type={tipoEmplazamiento} />
          <span className="text-xs text-gray-600">
            {tipoEmplazamiento === "onshore"
              ? "El proyecto está en tierra firme."
              : "El proyecto está costa afuera."}
          </span>
        </div>
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
  const sizeRange =
    current >= 20 ? ">20" : current > 1 ? ">1" : "≤1";
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

/**
 * Catálogo provisional de categorías de aerogenerador. Cliente identificó 3
 * (S/M/L) y mencionó que podrían subir a 5 — extender este arreglo cuando
 * llegue la definición final.
 */
const CATEGORIAS: {
  id: CategoriaAerogenerador;
  label: string;
  detail: string;
}[] = [
  { id: "S", label: "S", detail: "Pequeño · hasta ~2 MW" },
  { id: "M", label: "M", detail: "Mediano · 2–4 MW" },
  { id: "L", label: "L", detail: "Grande · 4 MW o más" },
];

function TamañoSection({
  areaKm2,
  numAerogeneradores,
  onNumChange,
  categoria,
  onCategoriaChange,
  numError,
  categoriaError,
}: {
  areaKm2: number;
  numAerogeneradores: number | null;
  onNumChange: (n: number | null) => void;
  categoria: CategoriaAerogenerador;
  onCategoriaChange: (c: CategoriaAerogenerador) => void;
  numError?: string;
  categoriaError?: string;
}) {
  return (
    <section className="mt-4 rounded-md bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#383838]">
        Tamaño del proyecto
      </h3>
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
        <dd>
          <input
            type="number"
            min={0}
            step={1}
            value={numAerogeneradores ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return onNumChange(null);
              const n = Number.parseInt(raw, 10);
              onNumChange(Number.isFinite(n) && n >= 0 ? n : null);
            }}
            placeholder="0"
            aria-invalid={Boolean(numError)}
            className={`w-24 rounded border px-2 py-1 text-right font-mono text-sm text-[#165170ff] focus:outline-none focus:ring-2 ${
              numError
                ? "border-red-400 focus:border-red-500 focus:ring-red-400/30"
                : "border-gray-300 focus:border-[#165170ff] focus:ring-[#165170ff]/30"
            }`}
          />
          <FieldError message={numError} className="mt-1" />
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
          3 categorías por ahora — podrían subir a 5 cuando el cliente cierre
          el catálogo.
        </p>
        <FieldError message={categoriaError} />
      </div>
    </section>
  );
}

function Badge({
  type,
}: {
  type: ReturnType<typeof useCaracteristicas>["tipoEmplazamiento"];
}) {
  if (!type) return null;
  const colors =
    type === "onshore"
      ? "bg-green-100 text-green-800"
      : "bg-blue-100 text-blue-800";
  const label = type === "onshore" ? "Onshore (tierra)" : "Offshore (mar)";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colors}`}
    >
      {label}
    </span>
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
      <span className="block text-xs font-semibold text-[#383838]">
        {label}
      </span>
      <span className="mt-0.5 block text-[10px] leading-tight text-gray-500">
        {hint}
      </span>
    </button>
  );
}

function DistanciaSINSection({
  distanciaSINKm,
  onChange,
  error,
}: {
  distanciaSINKm: number | null;
  onChange: (n: number | null) => void;
  error?: string;
}) {
  return (
    <section className="mt-4 rounded-md bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#383838]">Distancia al SIN</h3>
      <p className="mt-0.5 text-[11px] text-gray-500">
        Distancia al Sistema Interconectado Nacional más cercano. El
        auto-cálculo desde el área seleccionada está pendiente — por ahora
        ingrésala manualmente.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={0.1}
          value={distanciaSINKm ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(null);
            const n = Number.parseFloat(raw);
            onChange(Number.isFinite(n) && n >= 0 ? n : null);
          }}
          placeholder="0.0"
          aria-invalid={Boolean(error)}
          className={`w-28 rounded border px-2 py-1 text-right font-mono text-sm text-[#165170ff] focus:outline-none focus:ring-2 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-400/30"
              : "border-gray-300 focus:border-[#165170ff] focus:ring-[#165170ff]/30"
          }`}
        />
        <span className="text-xs font-semibold text-gray-500">km</span>
      </div>

      <FieldError message={error} />
    </section>
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
