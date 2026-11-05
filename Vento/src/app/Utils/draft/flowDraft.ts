/**
 * Borrador del FLUJO en curso (área/hexágonos + variables + características),
 * persistido en `localStorage` para que una recarga, un cierre de pestaña o un
 * re-login NO borren el trabajo a medias (p. ej. estar afinando dimensiones y
 * perderlo todo). Complementa al refresh de sesión: la sesión ya no debería
 * caerse, pero esto es la red de seguridad si igual pasa algo.
 *
 * Clave POR USUARIO (`sub` de Keycloak) → en una máquina compartida no se filtra
 * el borrador de otra persona. Se guarda el `selectedHexes` tal cual (los mismos
 * strings que tiene el contexto) para restaurar con `new Set(...)` sin
 * transformar resolución.
 */
import type { Aprincipal } from "../contexts/AccionPrincipalContext";
import type { CaracteristicasState } from "../contexts/CaracteristicasContext";

export interface FlowDraft {
  sub: string;
  accion: Aprincipal;
  selectedHexes: string[];
  activeVariables: string[];
  caracteristicas: CaracteristicasState;
  savedAt: number;
}

// Un borrador viejo deja de ofrecerse (se descarta) pasada esta antigüedad.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const keyFor = (sub: string) => `vento:draft:${sub}`;

export function saveDraft(draft: FlowDraft): void {
  if (typeof window === "undefined" || !draft.sub) return;
  try {
    localStorage.setItem(keyFor(draft.sub), JSON.stringify(draft));
  } catch {
    // localStorage lleno/bloqueado → el borrador es best-effort, no romper el flujo.
  }
}

export function loadDraft(sub: string | undefined | null): FlowDraft | null {
  if (typeof window === "undefined" || !sub) return null;
  try {
    const raw = localStorage.getItem(keyFor(sub));
    if (!raw) return null;
    const draft = JSON.parse(raw) as FlowDraft;
    if (draft.sub !== sub) return null; // no restaurar borrador de otro usuario
    if (!draft.savedAt || Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearDraft(sub);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(sub: string | undefined | null): void {
  if (typeof window === "undefined" || !sub) return;
  try {
    localStorage.removeItem(keyFor(sub));
  } catch {
    // ignorar
  }
}
