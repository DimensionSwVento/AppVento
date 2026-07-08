"use client";
import { useEffect, useState, type ComponentType } from "react";
import { MapPin, SlidersHorizontal, Settings2, FileText, X } from "lucide-react";
import LoadingOverlay from "./LoadingOverlay";
import { markOnboardingSeen } from "../Utils/onboarding";

type Step = {
  titulo: string;
  texto: string;
  Icon: ComponentType<{ className?: string }>;
};

// Carrusel de 4 pasos = Flujo Vento. La "imagen" es hoy un ícono placeholder
// (lucide); se reemplaza por la ilustración del cliente cuando llegue.
const STEPS: Step[] = [
  {
    titulo: "1. Selecciona un área",
    texto: "Haz clic en los hexágonos del mapa de Colombia para definir la zona a evaluar.",
    Icon: MapPin,
  },
  {
    titulo: "2. Configura las dimensiones",
    texto: "Elige las variables por dimensión (técnica, ambiental, socioeconómica, macroeconómica) que quieres considerar.",
    Icon: SlidersHorizontal,
  },
  {
    titulo: "3. Características del proyecto",
    texto: "Ingresa la capacidad nominal y el tipo de tu proyecto eólico.",
    Icon: Settings2,
  },
  {
    titulo: "4. Informe de prefactibilidad",
    texto: "Revisa los puntajes de idoneidad por dimensión y descarga el informe en PDF.",
    Icon: FileText,
  },
];

/**
 * Onboarding introductorio (US02). Reusa el shell de la ventana de carga
 * (`LoadingOverlay`) a z-40, superpuesto al dashboard en el primer ingreso.
 * Al cerrarse, si el mapa aún no cargó, queda debajo la ventana de carga de
 * Map.tsx (z-30) — el fallback sale gratis, sin acoplar con Map.
 */
export default function OnboardingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  // ESC cierra la guía.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        markOnboardingSeen();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const { titulo, texto, Icon } = STEPS[step];

  const finish = () => {
    markOnboardingSeen();
    onClose();
  };
  const next = () => (isLast ? finish() : setStep((s) => s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <LoadingOverlay className="fixed inset-0 z-40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guía de introducción a Vento"
        className="relative mx-4 w-full max-w-md rounded-2xl border-2 border-[#165170ff] bg-white p-6 shadow-lg"
      >
        {/* Cerrar (X) */}
        <button
          onClick={finish}
          aria-label="Cerrar guía"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Imagen (placeholder: ícono; se reemplaza por ilustración del cliente) */}
        <div className="mx-auto mb-4 flex h-32 w-full items-center justify-center rounded-xl bg-[#cce1eeff]">
          <Icon className="h-16 w-16 text-[#165170ff]" />
        </div>

        {/* Texto */}
        <h2 className="mb-2 text-center text-lg font-semibold text-[#165170ff]">{titulo}</h2>
        <p className="mb-5 text-center text-sm text-gray-600">{texto}</p>

        {/* Indicadores (dots) */}
        <div className="mb-5 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === step ? "bg-[#165170ff]" : "bg-gray-300"}`}
            />
          ))}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between">
          <button onClick={finish} className="text-sm text-gray-500 hover:text-gray-700">
            Saltar guía
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Anterior
              </button>
            )}
            <button
              onClick={next}
              className="rounded-lg bg-[#165170ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#113d56]"
            >
              {isLast ? "Empezar" : "Avanzar"}
            </button>
          </div>
        </div>
      </div>
    </LoadingOverlay>
  );
}
