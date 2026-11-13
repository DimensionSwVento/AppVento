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

const DEFAULT_DURATION = 4000;

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
  success: { border: "border-green-500", Icon: CheckCircle2, color: "text-green-600", role: "status" as const, live: "polite" as const },
  error: { border: "border-red-500", Icon: AlertCircle, color: "text-red-600", role: "alert" as const, live: "assertive" as const },
  info: { border: "border-[#165170ff]", Icon: Info, color: "text-[#165170ff]", role: "status" as const, live: "polite" as const },
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2">
      {toasts.map((t) => {
        const v = VARIANT[t.variant];
        const Icon = v.Icon;
        return (
          <div
            key={t.id}
            role={v.role}
            aria-live={v.live}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border-l-4 bg-white px-3 py-2.5 shadow-lg ${v.border}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${v.color}`} aria-hidden="true" />
            <p className="flex-1 text-xs text-gray-700">{t.message}</p>
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
