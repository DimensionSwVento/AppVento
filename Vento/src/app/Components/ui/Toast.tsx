"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

type Variant = "success" | "error" | "info";
type Toast = { id: number; message: string; variant: Variant };

type ToastApi = {
  show: (message: string, variant?: Variant, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Hook de acceso a los toasts. Debe usarse dentro de <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

// 5s: con 4s abajo-derecha el aviso pasaba desapercibido (feedback US08-04).
const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, variant: Variant = "info", durationMs = DEFAULT_DURATION) => {
      const id = ++idRef.current;
      setToasts((ts) => [...ts, { id, message, variant }]);
      if (durationMs > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), durationMs));
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, d) => show(m, "success", d),
      error: (m, d) => show(m, "error", d),
      info: (m, d) => show(m, "info", d),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const VARIANT = {
  success: { box: "border-green-500 bg-green-50", Icon: CheckCircle2, color: "text-green-600", role: "status" as const, live: "polite" as const },
  error: { box: "border-red-500 bg-red-50", Icon: AlertCircle, color: "text-red-600", role: "alert" as const, live: "assertive" as const },
  info: { box: "border-[#165170ff] bg-[#eef5f9]", Icon: Info, color: "text-[#165170ff]", role: "status" as const, live: "polite" as const },
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  // Arriba-centro (no abajo-derecha): es donde la vista ya está puesta tras
  // pulsar un botón de un formulario/modal, y no compite con controles del mapa.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4">
      <style>{`@keyframes ventoToastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }`}</style>
      {toasts.map((t) => {
        const v = VARIANT[t.variant];
        const Icon = v.Icon;
        return (
          <div
            key={t.id}
            role={v.role}
            aria-live={v.live}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border-l-4 px-4 py-3 shadow-xl ring-1 ring-black/5 ${v.box}`}
            style={{ animation: "ventoToastIn 180ms ease-out" }}
          >
            <Icon className={`h-5 w-5 shrink-0 ${v.color}`} aria-hidden="true" />
            <p className="flex-1 text-sm font-medium text-gray-800">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
