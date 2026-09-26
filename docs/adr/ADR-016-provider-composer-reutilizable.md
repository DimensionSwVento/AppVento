---
id: ADR-016
title: ProviderComposer reutilizable para evitar "provider hell"
status: aceptado
date: 2026-09-26
---

# ADR-016: ProviderComposer reutilizable para evitar "provider hell"

## Contexto

El árbol de providers de la app (`Providers.tsx`) había crecido a ~10 niveles
anidados a mano (`ToastProvider` → `SessionProvider` → `SessionGuard` →
`AprincipalProvider` → `VariablesProvider` → `EconomicProvider` →
`RegulatoryProvider` → `CaracteristicasProvider` → `HeatmapDimensionProvider` →
`HistorialProvider`). Ese anidamiento ("provider hell") es difícil de leer, y
agregar/reordenar un provider implica tocar indentación en cascada y es propenso
a romper el orden (que importa: p.ej. `SessionGuard` debe ir dentro de
`SessionProvider`).

Durante una sesión de depuración/refactor se decidió sobre este punto.

## Opciones Evaluadas

| Criterio | Dejar anidado a mano | Composer inline en el mismo archivo | Composer en archivo propio (reutilizable) |
|---|---|---|---|
| Legibilidad | ❌ 10 niveles de indentación | ✅ Lista plana | ✅ Lista plana |
| Agregar/reordenar provider | ❌ Editar cascada | ✅ 1 línea en el array | ✅ 1 línea en el array |
| Reutilizable en otros árboles | ❌ No | ❌ Atado a `AppProvider` | ✅ Herramienta genérica |
| Costo | 0 | Bajo | Bajo |

## Decisión

**Extraer un `ProviderComposer` genérico a su propio archivo
(`src/app/Utils/ProviderComposer.tsx`) y renombrar `Providers.tsx` →
`AppProvider.tsx`**, que solo declara la lista ordenada `PROVIDERS` y la pasa al
composer.

- `ProviderComposer` reduce la lista con `reduceRight`: el primero del array queda
  MÁS EXTERNO y el último más INTERNO (equivalente al anidamiento manual).
- `AppProvider` conserva el orden exacto previo (comportamiento idéntico).

**Se deja el composer aunque hoy tenga UN solo consumidor** (`AppProvider`): la
decisión explícita es dejar la herramienta lista para que, si más adelante alguien
necesita componer otro árbol de providers (p.ej. un subárbol de una feature, un
entorno de test o Storybook), ya la tenga y no reinvente el patrón.

## Justificación

- El costo de mantener un módulo pequeño y puro es mínimo; el beneficio es tener un
  patrón único y probado para cualquier composición futura de providers.
- Separar la herramienta (genérica) del ensamblado de la app (`AppProvider`,
  específico) respeta la separación de responsabilidades.
- El orden como dato (array) hace explícito y revisable el orden de los contextos.

## Consecuencias

- `ProviderComposer` solo sirve para providers que reciben `children` sin otras
  props requeridas; si un provider necesita props, se envuelve antes en un
  componente que las fije y exponga solo `children` (documentado en el archivo).
- `layout.tsx` importa `AppProvider` (antes `Providers`).
- No cambia el comportamiento en runtime: mismo orden, mismos providers.
