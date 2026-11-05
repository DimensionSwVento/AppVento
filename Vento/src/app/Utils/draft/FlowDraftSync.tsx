"use client";

/**
 * Sincroniza el BORRADOR del flujo con `localStorage`:
 *  - AUTO-RESTORE: al autenticarse (y con el catálogo ya hidratado), si hay un
 *    borrador del usuario, restaura selección + variables + características + fase.
 *    Sin banner: se restaura automáticamente (decisión de producto).
 *  - AUTOSAVE: cada cambio relevante del flujo se guarda (debounced). Si el flujo
 *    queda vacío (sin selección y en "seleccion-area"), se borra el borrador.
 *
 * `useClearFlow()` expone el reset total (lo usa el botón "Limpiar"): vacía
 * selección, variables no obligatorias y características, borra el borrador y
 * vuelve al mapa limpio.
 *
 * Debe renderizarse DENTRO de SessionProvider y de los providers de dominio.
 */
import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAprincipal } from "../contexts/AccionPrincipalContext";
import { useVariables } from "../contexts/VariablesContext";
import {
  useCaracteristicas,
  type CaracteristicasState,
} from "../contexts/CaracteristicasContext";
import { clearDraft, loadDraft, saveDraft } from "./flowDraft";

const SAVE_DEBOUNCE_MS = 600;

/** Reset total del flujo + borrado del borrador. Para el botón "Limpiar". */
export function useClearFlow() {
  const { data: session } = useSession();
  const sub = session?.sub;
  const { setAccion, setSelectedHexes } = useAprincipal();
  const { clearNonRequired } = useVariables();
  const caract = useCaracteristicas();

  return useCallback(() => {
    setSelectedHexes(new Set());
    clearNonRequired();
    caract.reset();
    setAccion("seleccion-area");
    clearDraft(sub);
  }, [sub, setAccion, setSelectedHexes, clearNonRequired, caract]);
}

export default function FlowDraftSync() {
  const { data: session, status } = useSession();
  const sub = session?.sub;

  const { accion, setAccion, selectedHexes, setSelectedHexes } = useAprincipal();
  const { activeVariables, replaceActiveVariables, clearNonRequired, catalogReady } =
    useVariables();
  const caract = useCaracteristicas();

  // Autosave queda "armado" solo DESPUÉS del intento de restore, para que el
  // estado inicial vacío no pise un borrador bueno antes de restaurarlo.
  const armed = useRef(false);
  const restoredFor = useRef<string | null>(null);

  // ── AUTO-RESTORE (una vez por usuario, con catálogo ya hidratado) ──────────
  useEffect(() => {
    if (status !== "authenticated" || !sub || !catalogReady) return;
    if (restoredFor.current === sub) return;
    restoredFor.current = sub;

    // No pisar un flujo que el usuario YA empezó mientras el catálogo hidrataba.
    const pristine = selectedHexes.size === 0 && accion === "seleccion-area";
    const draft = pristine ? loadDraft(sub) : null;
    if (draft) {
      if (draft.selectedHexes?.length) {
        setSelectedHexes(new Set(draft.selectedHexes));
      }
      if (draft.activeVariables?.length) {
        replaceActiveVariables(draft.activeVariables);
      }
      if (draft.caracteristicas) {
        caract.restore(draft.caracteristicas);
      }
      // No restaurar a vistas que no son del flujo guiado (histórico/null).
      if (
        draft.accion &&
        draft.accion !== "historico"
      ) {
        setAccion(draft.accion);
      }
    }
    armed.current = true;
    // selectedHexes/accion solo se leen para la guarda `pristine`; el ref
    // `restoredFor` asegura que el restore corre UNA vez por usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sub, catalogReady, setSelectedHexes, replaceActiveVariables, caract, setAccion]);

  // ── RESET al vaciar el ÁREA (borrar / empezar de cero) ─────────────────────
  // Al BORRAR la selección o empezar una nueva área, los ajustes de Dimensiones
  // (variables no obligatorias) y Características NO deben heredarse de la anterior.
  // Se detecta la transición no-vacío → vacío (cualquier camino: botón "Borrar
  // selección" del mapa, deseleccionar el último hex, etc.) y se resetea a los
  // defaults. No actúa en el vacío inicial ni durante el restore (`armed`), ni
  // pisa el autoguardado (al quedar vacío, el autosave borra el borrador).
  const prevSelSize = useRef(selectedHexes.size);
  useEffect(() => {
    const was = prevSelSize.current;
    prevSelSize.current = selectedHexes.size;
    if (!armed.current) return;
    if (was > 0 && selectedHexes.size === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      clearNonRequired();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      caract.reset();
    }
  }, [selectedHexes, clearNonRequired, caract]);

  // ── AUTOSAVE (debounced) de los campos relevantes del flujo ────────────────
  const caractState: CaracteristicasState = {
    tipoEmplazamiento: caract.tipoEmplazamiento,
    tipoTecnologiaOffshore: caract.tipoTecnologiaOffshore,
    capacidadMW: caract.capacidadMW,
    numAerogeneradores: caract.numAerogeneradores,
    categoriaAerogenerador: caract.categoriaAerogenerador,
  };

  useEffect(() => {
    if (!armed.current || !sub) return;
    const isEmpty = selectedHexes.size === 0 && accion === "seleccion-area";
    const timer = setTimeout(() => {
      if (isEmpty) {
        clearDraft(sub);
        return;
      }
      saveDraft({
        sub,
        accion,
        selectedHexes: Array.from(selectedHexes),
        activeVariables: Array.from(activeVariables),
        caracteristicas: caractState,
        savedAt: Date.now(),
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // caractState se reconstruye por render; sus campos primitivos van explícitos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sub,
    accion,
    selectedHexes,
    activeVariables,
    caract.tipoEmplazamiento,
    caract.tipoTecnologiaOffshore,
    caract.capacidadMW,
    caract.numAerogeneradores,
    caract.categoriaAerogenerador,
  ]);

  return null;
}
