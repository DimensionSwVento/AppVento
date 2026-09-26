# Depuración — decisiones y pendientes (ajustar docs al final)

> Bitácora viva de la sesión de depuración: decisiones tomadas mientras se limpia
> el código. **Los docs/manuales se ajustan al FINAL** de la depuración con base en
> esta lista. No reescribir historias/ADRs viejos (registro); sí actualizar docs
> de comportamiento vigente.

## Decisiones tomadas

1. **Modo auditoría ACTIVO por defecto** + **logs de depuración ON por defecto.**
   - Estado actual: encendidos por defecto (decisión explícita para la fase de depuración).
   - Pendiente docs: dejarlo escrito; **decidir el estado en producción** (¿apagar auditoría/logs verbosos en prod o dejarlos?).

2. **Con el backend PRENDIDO no se usan valores falsos/template** (ni pesos ni datos).
   - **Porqué:** mostrar vacío/0 en vez de fingir hace **visibles las conexiones
     rotas** (si el backend no entrega, se nota); el template las enmascararía.
   - `weightFor` ya **no cae al template** en modo backend (devuelve BD o 0). Hecho en `variableWeights.ts`.
   - **Audit COMPLETO de `USE_PLACEHOLDER_FALLBACK`:** el resto ya estaba bien —
     en backend devuelven `null`/0, nunca template (Report.tsx, AreaMiniMap,
     useInformeHeatmapLayer, HexValuesTooltip, InformativeVariablesList,
     useAreaScores). `weightFor` era la ÚNICA fuga → corregida. Principio enforced.

3. **Pesos hardcoded (`variableWeights.ts`) = SOLO modo template.**
   - Ya existe la conexión a BD (`applyDbWeights` ← `catalog_variable.polaridad × peso`).
   - Comentarios del módulo **actualizados** (los que decían "se reemplazará por un fetch" quedaron obsoletos: ya está).

4. **`projectData.ts` = SOLO modo template / prueba** (aclarado en cabecera, en mayúsculas).

5. **Económica es INFORMATIVA** (no puntúa) → score general promedia **3 dimensiones** (ambiental/técnica/social). (hecho)

6. **Regulatoria y económica se muestran como `DimensionCard` normal** con switches (informativas); su único extra es modal + CRUD admin. (hecho)

7. **Providers → `ProviderComposer` + `AppProvider`** (ADR-016). (hecho)

8. **Nombres de persona eliminados** de comentarios y docs (salvo atribuciones de autor). (hecho)

9. **Catálogo reconciliado con InfoVariables(2)** (modelo anidado): masterIds
   corregidos (AMB-041, AMB-040, AMB-006-A…), split Litología/Fondos marinos
   (AMB-029-A nueva), económicas ECO-001..008, emplazamiento/¿mapa? declarados.
   Slugs `id` preservados. (hecho) — pendiente barrido de docs al final.

10. **Intervalos de ponderadas: fuente única = backend** (`minmax_anchors.json` →
    `hexagon_meta`) (ADR-017). Se DESCARTÓ el archivo front `variableRanges.ts`
    (habría sido código muerto: en template se deriva, en backend mandan anchors).
    Pendiente próximo sprint: editar el JSON de intervalos desde admin.

11. **Subir master ignora archivos** (solo entra un subconjunto — en pruebas ~3
    aunque sean canónicos). Se agregó **modal de aviso** pre-ingesta: compara lo
    ELEGIDO vs lo que el chunk plan realmente ingiere y lista "se actualizan / quedan
    fuera" (robusto a la causa). PENDIENTE: **investigar la causa raíz** del límite
    (no está en el /upload —guarda todos— ni en chunk_plan —itera todos—; revisar
    proxy/nginx multipart, `_select_paths` canónicos, o tmp). Reproducir subiendo 10.

## Pendiente de barrido de docs/comentarios (al final)

- Buscar y corregir menciones a comportamiento viejo: "4 dimensiones puntuables",
  económica que puntúa, `RegulatoryCard` (borrado), `Providers.tsx` (renombrado),
  variables económicas en `VARIABLES` (ahora en `OPTIONAL_VARIABLES`).
- Docs de comportamiento a revisar: `modelo-datos-anidado.md`, `manual-usuario.md`,
  `docs/README.md`, `spec`, `dev-notes` relacionados.
- NO tocar stories/ADRs históricos salvo afirmación de scoring falsa.
