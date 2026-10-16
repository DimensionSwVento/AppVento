// Flag de "onboarding visto".
// Hoy: localStorage (frontend, sin backend).
// TODO(futuro): migrar a user attribute de Keycloak para que persista por
// usuario entre dispositivos en lugar de por navegador.
const KEY = "vento_onboarding_seen";

/** True si el usuario ya vio el onboarding. En SSR devuelve true (no mostrar). */
export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Marca el onboarding como visto para que no vuelva a aparecer. */
export function markOnboardingSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* almacenamiento no disponible: se mostrará de nuevo, aceptable */
  }
}

/** Resetea el flag (útil para reabrir la guía desde el ícono de ayuda — US-FB3-05). */
export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
