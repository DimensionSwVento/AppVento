---
version: 2.0
date: 2026-05-14
scope: post-primera-entrega ronda 2 (evaluación de terceros)
origen: encuesta a evaluadores externos tras deploy AccuWeb v1
estado: ✅ cerrado — 5 HUs entregadas
---

# Feedback Ronda 2 — Evaluadores Terceros

Análisis de la encuesta de evaluación realizada a **terceros externos** (no al cliente contractual) tras la primera entrega. **Importante**: estas observaciones son insumo de mejora, **no son requisitos del cliente**. Se priorizan solo los items con valor agregado claro; el resto se documenta y descarta.

Tres respondientes participaron en la encuesta (Socioeconómica, económica, Otro).

> ⚠️ **Nota sobre Evaluador 3**: varios de sus síntomas (paneles erráticos, líneas intermitentes, retícula desalineada al hacer zoom, "no trasciende la página de inicio") son **típicos de uso en mobile**. La app actualmente **no soporta mobile en scope**; es altamente probable que la evaluación se haya hecho desde un dispositivo móvil, lo que invalida parcialmente los puntos UX. En el curso de acción se le pedirá **aclaración del dispositivo + screenshot**.

> 📌 **Política general para items UX de terceros**: pedir **screenshot del problema** y **confirmación de que evaluación se hizo en PC** (no mobile, no tablet). Mobile no está en scope formal.

---

## Evaluador 1 (Socioeconómica)

| # | Item reportado | Severidad | Causa (a comunicar) | Curso de acción (al evaluador) |
|---|----------------|-----------|---------------------|--------------------------------|
| 1 | "No es claro cuál es el siguiente paso una vez seleccionados los hexágonos" | 🟡 UX | La UI no comunica activamente el "próximo paso" — el SideBar permite avanzar pero no llama la atención visualmente. Es una observación válida de UX | (a) Agradecer feedback y confirmar que se planificó como HU (`US-FB2-01 — Guía visual de próximo paso`: CTA visible "Continuar a Dimensiones" cuando hay selección). (b) Pedir **screenshot del estado donde se sintió perdido** y confirmación de que usó **PC** para validar el reporte |
| 2 | "Botón cerrar sesión con 'x' poco claro" | 🟢 UX | Icono `X` se asocia a "cerrar ventana" o "cancelar", no a "cerrar sesión". Observación cosmética válida | (a) Informar que se cambiará por icono **logout** (puerta-flecha ⏏) + tooltip "Cerrar sesión" en hover, planificado como HU `US-FB2-05` |

---

## Evaluador 2 (económica)

| # | Item reportado | Severidad | Causa (a comunicar) | Curso de acción (al evaluador) |
|---|----------------|-----------|---------------------|--------------------------------|
| 3 | "No me envió el correo de recuperación de contraseña" | 🟢 Comunicación | SMTP gratuito ya configurado tras feedback-v1. Los servicios SMTP gratuitos tienen reputación de dominio baja → correos suelen aterrizar en **carpeta de spam** del receptor. **No hay falla técnica del flujo**, hay limitación de deliverability del proveedor gratuito | (a) **Pedir que revise carpeta de spam** (probablemente está ahí). (b) Si no aparece, pedir el email exacto usado para reintentarlo manualmente y verificar logs. (c) Informar que con la migración futura a SMTP institucional el problema desaparece (mejor reputación de dominio remitente). **Sin acción técnica inmediata** |
| 4 | "Formulario no permite quitar respuestas seleccionadas pregunta 6-1" | ℹ️ Externo | Es el **formulario de la encuesta de feedback** (Google Forms o similar), **no es la app Vento**. Está fuera del dominio del proyecto | (a) Agradecer y aclarar que el item corresponde al **formulario de encuesta**, no a la app. (b) Reportar al responsable del formulario para que lo corrija. **Fuera de scope de Vento** |

---

## Evaluador 3 (Otro) — ⚠️ posible evaluación desde mobile

> Múltiples síntomas reportados (paneles erráticos, líneas intermitentes, retícula desalineada al hacer zoom, operatividad limitada que "no trasciende inicio") son **típicos de comportamiento mobile**. **Mobile no está en scope formal** de esta entrega. Antes de tratar cualquier punto UX de este evaluador como bug, se requiere **confirmación del dispositivo + screenshot**.

| # | Item reportado | Severidad | Causa (a comunicar) | Curso de acción (al evaluador) |
|---|----------------|-----------|---------------------|--------------------------------|
| 5 | "Falta la dimensión Social — no aparece esta dimensión" | 🟢 Comunicación | **No es una dimensión faltante** — la dimensión "Socioeconómica" del spec ya cubre lo social + económico. El evaluador no identificó que "Socioeconómica" engloba ambos aspectos. Es confusión de **terminología**, no carencia funcional | (a) Aclarar que **Socioeconómica = social + económico** y no son dos dimensiones separadas. (b) Informar que para evitar la misma confusión a futuros usuarios se está mejorando el **tooltip** de la dimensión dentro de **US04-AC2** (tooltips), sin requerir HU nueva |
| 6 | "Errores en cartografía: sectores onshore y offshore no contabilizados" | 🔴 Bug datos | El `COLOMBIA_POLYGON` actual es una **simplificación manual de ~30 vértices** — no es cartografía oficial. Sectores reales del territorio (costas detalladas, frontera onshore, ZEE marítima) quedan fuera o mal alineados. **Es un bug real, no depende de dispositivo** | (a) Reconocer el reporte como **bug crítico** confirmado por el equipo. (b) Informar que se planificó HU `US-FB2-02 — Cartografía oficial IGAC`. (c) Pedir si tiene **screenshot de los sectores específicos** que detectó faltantes para priorizar la auditoría del polígono |
| 7 | "Página de inicio: márgenes internas inconsistentes, afecta proporción y navegación" | 🟡 UX | Posibles dos causas: (1) inconsistencias reales de padding/margin en landing vs Figma original, o (2) **artefacto de visualización mobile** (responsive comprimiendo layout). Sin screenshot + dispositivo no se puede confirmar cuál | (a) **Pedir screenshot y confirmación de dispositivo (PC vs mobile)**. (b) Si fue PC: hacer audit del layout y planificar HU `US-FB2-03 — Polish layout landing/dashboard`. (c) Si fue mobile: aclarar que mobile no está en scope y diferir |
| 8 | "Panel derecho con comportamiento errático: al cambiar acción los elementos pierden alineación, aparecen líneas intermitentes" | ℹ️ Probable mobile | Los síntomas (líneas intermitentes al cambiar paso, pérdida de alineación) son **típicos de transiciones responsivas mal escaladas en pantallas pequeñas**. En PC el panel funciona correctamente | (a) **Pedir screenshot y confirmación de dispositivo**. (b) Aclarar que **mobile no está en scope formal** y que la evaluación debería realizarse en PC. (c) Si confirma PC con screenshot, reabrir análisis. **Sin acción técnica hasta confirmar** |
| 9 | "Retícula hexagonal pierde alineación geométrica al cambiar zoom" | 🟡 UX | Al cambiar de zoom la app remapea a otra resolución H3 (los hexágonos cambian de tamaño). Durante la transición, los hexágonos viejos y nuevos no encajan porque son resoluciones distintas — **comportamiento esperado de DeckGL TileLayer**, pero la transición no es suave y **se percibe como bug**. No depende de dispositivo | (a) Aclarar que es **transición esperada entre resoluciones H3**, no un bug geométrico. (b) Informar que se planificó HU `US-FB2-04 — Transición visual suave al cambiar resolución H3` para mejorar UX de la transición (loading, opacidad gradual) |
| 10 | "Operatividad limitada: el sistema no trasciende la página de inicio" | ℹ️ Expectativa / mobile | Dos hipótesis: (1) **Features pendientes** — US04/US05/US06 están en `scope-dos`, aún no entregadas; el flujo termina en la selección por diseño actual. (2) **Mobile**: en pantallas chicas el sidebar puede no mostrarse correctamente, dando la impresión de "no avanza" | (a) **Pedir confirmación de dispositivo y screenshot**. (b) Si fue PC: explicar el **roadmap de scope-dos** (Dimensiones → Características → Informe) y que la entrega actual cubre solo selección de área. (c) Si fue mobile: aclarar que mobile no está en scope. **Sin acción técnica** |

---

## Resumen ejecutivo de HUs

| ID | Historia | Severidad | Prioridad | Estado |
|----|----------|-----------|-----------|--------|
| US-FB2-02 | Cartografía oficial IGAC | 🔴 Bug datos | Crítica | ✅ Listo |
| US-FB2-01 | Guía visual del próximo paso | 🟡 UX | Alta | ✅ Listo |
| US-FB2-04 | Transición visual suave al cambiar resolución H3 | 🟡 UX | Media | ✅ Listo |
| US-FB2-03 | Polish layout landing/dashboard | 🟡 UX | Media | ✅ Listo |
| US-FB2-05 | Icono claro de cierre de sesión | 🟢 Cosmético | Baja | ✅ Listo |

> **✅ FB2 CERRADO** — las 5 HUs entregadas. (Las pantallas de `scope-dos` — Dimensiones, Características, Informe — mencionadas como "aún no entregadas" en el triage histórico de abajo **ya se entregaron** en el Scope 2, cerrado 2026-06-01.)

---

### US-FB2-02 — Cartografía Oficial IGAC
- **Prioridad:** 🔴 Crítica
- **Tipo:** Bug datos
- **Origen:** Item #6 — Evaluador 3 (sectores onshore y offshore no contabilizados)
- **Contexto:** El `COLOMBIA_POLYGON` actual es una simplificación manual de ~30 vértices, no cartografía oficial. Sectores reales del territorio (costas detalladas, frontera continental, ZEE marítima) quedan fuera o mal alineados. La HU reemplaza el polígono por uno proveniente de IGAC, preservando el `ARCHIPELAGO_POLYGON` y la ZEE ya añadidos previamente.
- **Criterios de Aceptación:**
  1. Polígono oficial de Colombia obtenido desde IGAC (GeoJSON o shapefile convertido) y versionado en el repo
  2. Cobertura validada: frontera continental + costas representadas con precisión superior a la simplificación de ~30 vértices actual
  3. `COLOMBIA_POLYGON` en `Vento/src/app/Utils/h3Resolution.ts` reemplazado por los vértices del polígono IGAC
  4. `ARCHIPELAGO_POLYGON` (San Andrés + Providencia) y la ZEE marítima conservados — no se descartan al hacer el reemplazo
  5. `COLOMBIA_POLYGONS` (array) sigue exponiendo el conjunto completo a `Map.tsx` sin romper la API actual
  6. `MAX_BOUNDS` revisado y, si es necesario, ajustado para cubrir todo el territorio ampliado
  7. Test: `polygonToCells(COLOMBIA_POLYGONS, res)` produce cells consistentes en zonas de control (frontera Venezuela/Brasil, costa Caribe, costa Pacífica, archipiélago)
- **Notas técnicas:**
  - Fuente IGAC: revisar disponibilidad pública (geoportal). Si no es accesible, alternativa: Natural Earth admin-0 + verificación contra IGAC.
  - Mantener formato `[number, number][]` (lng/lat) para no romper consumidores actuales.

---

### US-FB2-01 — Guía Visual del Próximo Paso
- **Prioridad:** 🟡 Alta
- **Tipo:** UX
- **Origen:** Item #1 — Evaluador 1 (no es claro el siguiente paso tras seleccionar hexágonos)
- **Contexto:** Tras seleccionar hexágonos el usuario no sabe cómo continuar. El SideBar permite avanzar pero no llama la atención visualmente. Se añade un CTA visible que aparece sólo cuando hay selección activa.
- **Criterios de Aceptación:**
  1. Cuando `selectedHexes.size > 0`, se muestra un CTA visible "Continuar a Dimensiones" (en sidebar o panel flotante)
  2. El CTA no se solapa con `AreaDisplay` ni otros controles del mapa
  3. Click en el CTA cambia la acción principal a "dimensiones" usando `AccionPrincipalContext`
  4. El CTA desaparece cuando no hay hexágonos seleccionados
  5. El estilo del CTA sigue la paleta actual de Vento (sin introducir colores nuevos)
  6. Test: CTA visible sólo con selección activa; click dispara cambio de acción a "dimensiones"
- **Notas técnicas:**
  - Aprovechar `useAprincipal()` para leer `selectedHexes` y disparar el cambio de acción.
  - Animación sutil (pulse / fade-in) opcional para captar atención sin ser intrusivo.

---

### US-FB2-04 — Transición Visual Suave al Cambiar Resolución H3
- **Prioridad:** 🟡 Media
- **Tipo:** UX
- **Origen:** Item #9 — Evaluador 3 (retícula pierde alineación al cambiar zoom)
- **Contexto:** Al cambiar zoom, la app remapea a otra resolución H3; los hexágonos viejos y nuevos no encajan porque son tamaños distintos. Es comportamiento esperado de DeckGL TileLayer, pero la transición no es suave y se percibe como bug. La HU mejora la percepción de la transición sin alterar la mecánica del TileLayer.
- **Criterios de Aceptación:**
  1. Al cambiar zoom y disparar una nueva resolución H3, los hexágonos viejos no desaparecen abruptamente — se aplica fade out
  2. Los hexágonos nuevos aparecen con fade in para no irrumpir la vista
  3. Estrategia `refinementStrategy` del TileLayer revisada y la elección queda documentada en un comentario corto en `Map.tsx`
  4. Indicador de carga sutil visible si el remapeo se nota visualmente
  5. La transición funciona en todas las resoluciones soportadas (3-8)
  6. Test: cambio de resolución no produce error en render; estado de transición se setea y limpia correctamente
- **Notas técnicas:**
  - Doc oficial relevante: https://deck.gl/docs/api-reference/geo-layers/tile-layer (sección `refinementStrategy`).
  - Evitar over-engineering: la mejora apunta a percepción, no a cambiar la lógica del TileLayer.

---

### US-FB2-03 — Polish Layout Landing/Dashboard
- **Prioridad:** 🟡 Media (tras desbloqueo)
- **Tipo:** UX
- **Estado:** ✅ Entregada — polish de layout landing/dashboard aplicado (FB2 cerrado)
- **Origen:** Item #7 — Evaluador 3 (márgenes internos inconsistentes en página de inicio)
- **Contexto:** Posibles dos causas: (1) inconsistencias reales de padding/margin contra Figma, o (2) artefacto de visualización mobile (responsive comprimiendo layout). Sin screenshot + confirmación de dispositivo no se puede confirmar cuál. Si la evaluación fue mobile, la HU se archiva como diferida (mobile fuera de scope).
- **Criterios de Aceptación:**
  1. **Bloqueador**: confirmación del Evaluador 3 (PC vs mobile) + screenshot del problema recibidos antes de iniciar
  2. Audit de paddings/margins de la landing contra el Figma original — lista de inconsistencias documentada
  3. Audit de paddings/margins de `dashboard/page.tsx` contra Figma — lista documentada
  4. Inconsistencias detectadas en el audit (espaciados, alineaciones, contenedores) ajustadas en código
  5. Validación visual contra Figma post-ajustes — todas las inconsistencias del audit resueltas
  6. Validación manual cross-browser (Chrome + Firefox) en desktop
- **Notas técnicas:**
  - Si tras desbloqueo el problema resulta ser solo mobile, archivar la HU como diferida (no descartar definitivamente).

---

### US-FB2-05 — Icono Claro de Cierre de Sesión
- **Prioridad:** 🟢 Baja
- **Tipo:** Cosmético
- **Origen:** Item #2 — Evaluador 1 (botón cerrar sesión con `X` poco claro)
- **Contexto:** El icono `X` se asocia a "cerrar ventana" o "cancelar", no a "cerrar sesión". Cambio cosmético en `SideBar` sin alterar la lógica de logout actual.
- **Criterios de Aceptación:**
  1. Icono `X` reemplazado por icono de logout (puerta-flecha-salida ⏏) en `SideBar`
  2. Tooltip "Cerrar sesión" visible al hover sobre el icono
  3. Comportamiento del click sigue idéntico — dispara el flujo de logout actual sin cambios
  4. Test: tooltip aparece al hover; click dispara la función de logout existente
- **Notas técnicas:**
  - Usar icono de la misma librería de iconos que ya importa `SideBar` para no añadir dependencia nueva.
  - No alterar el flujo de `kc-logout`; sólo cambian el icono y el tooltip.

---

## Items que NO se toman como HU

| # item | Razón |
|--------|-------|
| #3 — Correo de recuperación no llegó | **Sin acción técnica**: causa es deliverability del SMTP gratuito (cae en spam). Se le pide al evaluador revisar spam; cuando llegue SMTP institucional el problema desaparece por reputación de dominio |
| #4 — Formulario no permite quitar respuesta pregunta 6-1 | **Externo al proyecto**: pertenece al formulario de encuesta (Google Forms o similar), no a la app Vento. Se notifica al responsable del formulario |
| #5 — "Falta dimensión Social" | **Confusión de terminología, no carencia funcional**. La dimensión "Socioeconómica" ya cubre lo social. Se resuelve mejorando el tooltip de la dimensión **dentro de US04-AC2** (tooltips) — no requiere HU separada |
| #8 — Panel derecho errático, líneas intermitentes | **Probable mobile (fuera de scope)**: síntomas típicos de responsivo en pantalla chica. Mobile no está en scope formal. Sin acción hasta que el evaluador confirme dispositivo + envíe screenshot |
| #10 — "El sistema no trasciende la página de inicio" | **Expectativa o mobile**: las pantallas siguientes (Dimensiones, Características, Informe) están en `scope-dos`, aún no entregadas. Alternativamente, podría ser artefacto mobile. Sin acción técnica — comunicación informativa del roadmap |
