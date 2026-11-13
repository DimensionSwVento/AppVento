import type { ComponentType, ReactNode } from "react";

/** Cualquier componente que solo envuelve `children` (p.ej. un context Provider). */
export type WrapperComponent = ComponentType<{ children: ReactNode }>;

/**
 * Compone una lista de providers en UNO solo (evita el "provider hell"): en vez
 * de anidarlos a mano, se reduce la lista. El PRIMERO del array queda MÁS EXTERNO
 * y el último más INTERNO — equivalente a anidarlos de arriba hacia abajo, así que
 * el orden importa (p.ej. un guard que use un contexto debe ir DESPUÉS de su provider).
 *
 * Reutilizable: solo sirve para providers que reciben `children` (sin otras props
 * requeridas); si un provider necesita props, envuélvelo antes en un componente
 * que fije esas props y expón solo `children`.
 */
export function ProviderComposer({
  providers,
  children,
}: {
  providers: WrapperComponent[];
  children: ReactNode;
}) {
  return (
    <>
      {providers.reduceRight(
        (acc, Provider) => <Provider>{acc}</Provider>,
        children,
      )}
    </>
  );
}
