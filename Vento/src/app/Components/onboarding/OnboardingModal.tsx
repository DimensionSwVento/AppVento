"use client";
import { useEffect, useState } from "react";

type Step = {
  /** Imagen del slide. `null` = hero de bienvenida (gradiente + logo). */
  img: string | null;
  titulo: string;
  texto: string;
};

// Slide 0 = bienvenida (diseño del cliente). Slides 1-4 = Flujo Vento.
// `img: null` → placeholder branded (gradiente + logo). El cliente aún no entrega
// las ilustraciones; cuando lleguen, se pone la ruta en `img` y se muestran solas.
const STEPS: Step[] = [
  {
    img: "/on.svg",
    titulo:
      "Te damos la bienvenida a Vento, podrás evaluar el potencial de proyectos de generación eléctrica con energía eólica",
    texto:
      "Marca una zona en el mapa, agrega las características del proyecto y descubre el potencial de tu proyecto eólico.",
  },
  {
    img: "/on2.svg",
    titulo: "Selecciona un área",
    texto: "Haz clic en los hexágonos del mapa de Colombia para definir la zona a evaluar.",
  },
  {
    img: "/on4.svg",
    titulo: "Características del proyecto",
    texto: "Ingresa la capacidad nominal y el tipo de tu proyecto eólico.",
  },

  {
    img: "/on3.svg",
    titulo: "Configura las dimensiones",
    texto: "Elige las variables por dimensión que quieres considerar en el análisis.",
  },
  {
    // TODO: falta la 5ª imagen (on5) — placeholder hasta que la entreguen.
    img: null,
    titulo: "Informe de idoneidad",
    texto: "Revisa los puntajes de idoneidad por dimensión y descarga el informe en PDF.",
  },
];

/**
 * Onboarding introductorio (US02). Card centrada sobre backdrop difuminado.
 * Se muestra en cada ingreso al dashboard (petición winx). Al cerrarse, si el
 * mapa aún carga, queda debajo la ventana de carga de Map.tsx.
 */
export default function OnboardingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const { img, titulo, texto } = STEPS[step];
  const primaryLabel = step === 0 ? "Saber más" : isLast ? "Empezar" : "Siguiente";
  const next = () => (isLast ? onClose() : setStep((s) => s + 1));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 px-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guía de introducción a Vento"
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl"
      >
        {/* Imagen / hero */}
        <div className="mb-4 overflow-hidden rounded-xl">
          {img === null ? (
            <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-b from-[#0e2a3a] via-[#12484f] to-[#3f7f37]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vento_logo.svg" alt="Vento" className="h-12 w-auto brightness-0 invert" />
            </div>
          ) : (
            <div className="aspect-[4/3] overflow-hidden bg-[#cce1eeff]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        {/* Título */}
        <h2 className="mb-1.5 text-sm font-bold leading-snug text-gray-900">{titulo}</h2>
        {/* Descripción */}
        <p className="mb-4 text-xs leading-relaxed text-gray-500">{texto}</p>

        {/* Indicadores (dots) */}
        <div className="mb-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-4 bg-[#123a4d]" : "w-1.5 bg-gray-300"
                }`}
            />
          ))}
        </div>

        {/* Botones */}
        <div className="flex items-center gap-2">
          <button
            onClick={next}
            className="rounded-full bg-[#123a4d] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d2c3a]"
          >
            {primaryLabel}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
          >
            Omitir
          </button>
        </div>
      </div>
    </div>
  );
}
