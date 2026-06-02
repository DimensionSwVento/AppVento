# hexValuesTooltip

Feature autocontenido del tooltip "Valores del área seleccionada" sobre el mapa.

Mismo patrón que `Vento/src/app/heatmap/` para que se pueda **copiar a otra rama** sin re-escribir.

## Contenido

- `HexValuesTooltip.tsx` — componente React
- `placeholderValues.ts` — helpers deterministas para puntajes (mientras no hay datos reales, US03-AC6)
- `index.ts` — punto de entrada del feature

## Cómo se monta

```tsx
import { HexValuesTooltip } from "../hexValuesTooltip";

// dentro de MapView:
{mapReady && <HexValuesTooltip />}
```

Se auto-oculta si `selectedHexes.size === 0`. No recibe props.

## Dependencias compartidas (deben existir en la rama destino)

- `../Utils/AccionPrincipalContext` → `useAprincipal()` con `selectedHexes`
- `../Utils/VariablesContext` → `useVariables()` con `activeVariables`
- `../Utils/variablesCatalog` → `DIMENSIONS`, `getVariableById`, tipo `Variable`
- `../Utils/dimensionColors` → `colorForVariable(id)`
- `../Utils/variableIcons` → `getIconByVariableId(id)`

Si la rama destino no las tiene, hay dos opciones:
1. Portar también esos utils (son cross-cutting del flujo de variables).
2. Reemplazar con stubs locales (peor — duplica catálogo).

## Estados visuales

- **Pill compacta** (default): título + puntaje general + 1 variable destacada + chevron ▼
- **Panel expandido**: header con chevron ▲ + sección Puntajes (general + 5 dimensiones) + sección Variables con scrollbar (`max-h-[22rem]`)

## Reemplazar placeholders por datos reales

Cuando US03-AC6 (ingesta `.h3.parquet → JSON`) esté listo, reemplazar
`placeholderValues.ts` por un módulo equivalente que consulte datos reales:

```ts
export function valueForSelection(varId: string, hexes: Iterable<string>): string {
  // ...lookup en el JSON ingerido, agregación de hexes...
  return "12.4";
}
```

Los componentes no cambian — sólo el cómputo.
