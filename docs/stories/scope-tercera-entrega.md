---
version: 2.1
date: 2026-07-30
scope: sprint-3 / tercera-entrega
origen: lista de épicas del proyecto (US01–US09) — solo HUs no ejecutadas
equipo: Mavalan Software
estado: ENTREGADO en modo template — ver reporte de cierre en Reportes_Entregas/entrega-3
---

# Scope Sprint 3 / Tercera Entrega — Guía de Desarrollo

Sigue a [scope-segunda-entrega.md](./scope-segunda-entrega.md) y al cierre de Scope 2 ([scope-2-entregado.md](../../Reportes_Entregas/entrega-2/scope-2-entregado.md)).

> **Estado (2026-07-30): ENTREGADO en modo template.** Este documento fue la guía de planeación; el **reporte de lo efectivamente entregado** (con el catálogo definitivo de variables, el emplazamiento mar/tierra, el informe/PDF por captura y la guía de modo template → datos reales) está en **[Reportes_Entregas/entrega-3/scope-3-entregado.md](../../Reportes_Entregas/entrega-3/scope-3-entregado.md)**. Nota: las dimensiones definitivas son **Ambiental · Técnica · Social · Macroeconómica** (+ Regulatoria informativa); donde abajo se lea "socioeconómica/económica", léase **Social**.

> **Estructura (aclaración 2026-07-07):** En la lista maestra del proyecto, **US01–US09 son ÉPICAS / módulos**, no historias de usuario. Las **HUs reales** son los puntos que la lista llama "criterios de aceptación". Este documento contiene **solo las HUs NO ejecutadas** — todo lo ya entregado en Scope 1 y 2 (login base, mapa base, CRUD usuarios, PDF con branding, etc.) queda fuera.

> **Aclaración de origen:** El Sprint 3 son estas HUs pendientes. El track `US-FB3-01..06` de [feedback-cliente-v2.md](./feedback-cliente-v2.md) es **feedback de cierre del Scope 2** (documento aparte, referenciado solo para trazabilidad).

---

## Estado de precondiciones

- Scope 1 y Scope 2 entregados; feedback rondas 1 y 2 atendido.
- **Bloqueo transversal:** ingesta real del `.h3.parquet` (US03-AC6) pendiente — hoy los scores/heatmap usan placeholders deterministas por `(varId, hex)`. Owner: equipo de datos (Camila).
- **Decisiones internas tomadas (2026-07-07):**
  - US06 radar → **4 ejes puntuables** + **SVG propio** (sin librería de charting).
  - US07 histórico → **persistencia en Postgres (backend)** vía patrón repositorio (`HistorialRepository`): se guardan **parámetros compactados** (selección con `compactCells` + variables + características + `scores_snapshot`), **NUNCA el PDF**. Alineado con "Histórico informes" de ADR-006 (E6). **Límites por usuario/área = TEMPORALES** (constante configurable) — valores finales en próxima reunión.

---

## Resumen de HUs pendientes (Sprint 3)

| Épica (módulo) | HU | Historia | Prioridad | ¿Empezable? |
|----------------|----|----------|-----------|-------------|
| US06 Reportes | US06-01 | Gráfico de radar (spider chart) dinámico | 🔴 Crítica | ✅ Sí (placeholders) |
| US02 Onboarding | US02-01 | Visualización única por usuario | 🔵 Baja | ✅ Sí |
| US02 Onboarding | US02-02 | Carrusel de 4 pasos (Flujo Vento) | 🔵 Baja | ✅ Sí |
| US02 Onboarding | US02-03 | Botón de cierre y salto de guía | 🔵 Baja | ✅ Sí |
| US07 Histórico | US07-01 | Listado cronológico (Hoy, Semana, Mes) | 🟢 Media | ✅ Sí (backend + seam) |
| US07 Histórico | US07-02 | Visualización de reportes antiguos | 🟢 Media | ✅ Sí |
| US09 UX/UI | US09-01 | Mensajes de confirmación (success toasts) | 🟢 Media | ✅ Sí |
| US09 UX/UI | US09-02 | Alertas de error en validación de datos | 🟢 Media | ✅ Sí |
| US01 Acceso | US01-01 | Configuración de SMTP pago (MailerSend) | 🟡 Alta | ⛔ Externo (cliente) |
| US03 Mapa | US03-01 | Pruebas con datos reales | 🔴 Crítica | 🟡 Datos (Camila) |
| US03 Mapa | US03-02 | Selección anclada a resolución (fix anidados) | 🟡 Alta | ✅ Implementado |
| US03 Mapa | US03-03 | Zonas prohibidas (gris sólido no seleccionable) | 🟢 Media | 🟡 Datos (Camila) |
| US04 Variables | US04-01 | Pruebas con datos reales | 🟡 Alta | 🟡 Datos (Camila) |
| US05 Proyecto | US05-01 | Negociar cambios de alcance | 🟡 Alta | ⛔ Externo (reunión) |

**Total: 14 HUs pendientes** en 8 épicas. (US08 Admin no tiene HUs pendientes → fuera del sprint.)
**Empezables ya (sin bloqueo):** US06-01, US02-01/02/03, US07-01/02, US09-01/02, US03-02 → **9 HUs**.

---

# Épica US06 — Reportes: Generación de Informe PDF

> Base de previsualización + PDF con branding EAFIT/ANH ya entregada en Scope 2. **Pendiente:** el gráfico de radar dinámico.

---

### US06-01 — Reportes:Gráfico de radar (spider chart) dinámico
- **Prioridad:** 🔴 Crítica
- **Bloqueo:** 🟢 Empezable (dev puro; valores reales llegan con la ingesta, se construye con placeholders)
- **Dependencia:** `Components/Report.tsx`, `Utils/pdfExport.ts`, `Utils/heatmapPalette.ts` (ya existen)
- **Criterios de Aceptación:**
  1. Radar con **4 ejes puntuables**: Ambiental, Técnica, Social, Macroeconómica (escala 0–100)
  2. Regulatoria **NO es eje** (coherente con WLC de 4 dimensiones, US-FB3-06) — puede ir como bloque informativo aparte
  3. Dibujado en **SVG propio** (sin librería) para integrarse con Tailwind v4/OKLCH y capturarse limpio en el PDF
  4. Refleja los scores del área seleccionada y se actualiza al cambiar la selección
  5. Hover sobre un vértice muestra el valor de esa dimensión (desktop); `<title>`/`aria-label` para accesibilidad
  6. El radar aparece tanto en la **previsualización** como en el **PDF descargado**
  7. Robusto con `0 hexágonos` → sin radar ni crash, mensaje claro
- **Tareas técnicas:**
  - 📦 `Components/RadarChart.tsx` — SVG puro (grid poligonal + ejes + área rellena), props `{ scores: {ambiental, tecnica, social, macroeconomica} }`
  - 📦 Helper que arma los 4 valores desde `heatmapPalette.ts` (score por dimensión)
  - 📦 Integrar `<RadarChart>` en `Report.tsx` y asegurar que entra en el DOM que captura `pdfExport.ts` (`html2canvas-pro`; fallback a rasterizar si el SVG no se captura)
  - 🧪 Tests: 4 ejes con valores correctos; 0 hexes no rompe; PDF ≥ 1KB con el gráfico

> **US06-02 (Exportación PDF con logos EAFIT/ANH):** ✅ ya entregada en Scope 2 (header brand + footer ANH/EAFIT/Mavalan). Fuera del Sprint 3 salvo que el radar exija ajustar el layout del PDF.

---

# Épica US02 — Onboarding: Modal Introductorio

> Épica nueva, **100% frontend (sin backend)**. Es lo **primero** que ve el usuario en su primer ingreso: un **pop-up superpuesto y centrado** (backdrop atenuado) con instrucciones de uso + botón **"Avanzar"**. **Sustituye a la ventana de carga** — mientras el mapa hace warmup/carga tiles por debajo, el usuario lee el onboarding en vez de ver un spinner. Todas las HUs viven en `OnboardingModal.tsx`. **NO toca `Map.tsx`** (solo lee su estado de carga) → seguro de hacer **antes** del refactor.

---

### US02-01 — Onboarding:Visualización única + sustitución de la ventana de carga
- **Prioridad:** 🔵 Baja
- **Criterios de Aceptación:**
  1. En el **primer ingreso** del usuario al dashboard, el onboarding aparece **de inmediato**, superpuesto y centrado, **en lugar de** la ventana de carga del mapa
  2. El mapa hace su warmup/carga de tiles **por debajo** mientras el onboarding está visible
  3. Al **terminar o saltar** el onboarding: si el mapa ya cargó → se muestra el mapa; si **aún no cargó** (el usuario pasó rápido) → **aparece la ventana de carga** ("...cargando mapa") por el tiempo restante
  4. **Por ahora se muestra en CADA recarga** (decisión del equipo). El flag `localStorage` para "única por usuario" queda disponible en `Utils/onboarding.ts` como toggle futuro
  5. Reabrible manualmente desde el ícono de ayuda (US-FB3-05); al reabrir NO bloquea con carga (el mapa ya está listo)
  6. **Diseño fiel al mockup del cliente**: card blanca sobre backdrop difuminado, imagen hero con logo Vento, título + descripción, botones pill "Saber más" (primario) / "Omitir"
- **Tareas técnicas:**
  - 📦 `Utils/onboarding.ts` — `hasSeenOnboarding()` / `markOnboardingSeen()` sobre `localStorage` (`vento_onboarding_seen`). Comentario para futura migración a user attribute de Keycloak
  - 📦 Disparo condicional en `dashboard/page.tsx` al primer render; overlay con z-index por encima del mapa
  - 📦 **Coordinación con carga**: leer el estado de carga existente (pill "...cargando mapa", US-FB2-04) para decidir el fallback al cerrar. **Sin tocar la lógica interna de `Map.tsx`**
  - 🧪 Tests: aparece solo si no visto; no reaparece tras marcarse visto; al cerrar con mapa cargado → mapa; al cerrar con mapa cargando → ventana de carga

### US02-02 — Onboarding:Carrusel de pasos con instrucciones (Flujo Vento)
- **Prioridad:** 🔵 Baja
- **Criterios de Aceptación:**
  1. Pop-up centrado con **instrucciones de cómo usar el software** + botón **"Avanzar"**
  2. Carrusel de **4 pasos**: Selección de Área → Dimensiones → Características → Informe
  3. Cada paso: ilustración/ícono + título + descripción corta en español
  4. Navegación Anterior/Siguiente + indicadores (dots); en el último paso el botón dice "Empezar"
  5. Responsive (desktop y mobile)
- **Tareas técnicas:**
  - 📦 `Components/OnboardingModal.tsx` — carrusel + dots + navegación + botón "Avanzar"
  - 🎨 4 ilustraciones placeholder (se reemplazan cuando llegue diseño del cliente)
  - 🧪 Tests: navegación prev/next; dots reflejan el paso actual

### US02-03 — Onboarding:Botón de cierre y salto de guía
- **Prioridad:** 🔵 Baja
- **Criterios de Aceptación:**
  1. Botón **"Saltar guía"** siempre visible y botón **cerrar (X)**
  2. Ambos marcan el onboarding como visto (`markOnboardingSeen`)
  3. Cierre también con ESC; `role="dialog"` + `aria-modal` + focus-trap
- **Tareas técnicas:**
  - 📦 Acciones de cierre en `OnboardingModal.tsx` + focus-trap
  - 🧪 Tests: saltar/cerrar/ESC marcan visto y cierran el modal

---

# Épica US07 — Histórico: Gestión de Análisis Previos

> Épica nueva. **Persistencia en Postgres (backend)** vía patrón repositorio (`HistorialRepository`). Se guardan **parámetros compactados** para **regenerar** el informe — nunca el PDF ni la expansión res-8. Alineado con "Histórico informes" de [ADR-006](../adr/ADR-006-storage-cache-datos-geoespaciales.md). **Límites TEMPORALES** (constante configurable) hasta la próxima reunión.

---

### US07-01 — Histórico:Listado cronológico (Hoy, Semana, Mes)
- **Prioridad:** 🟢 Media
- **Criterios de Aceptación:**
  1. Al generar un informe se persiste una fila en `informe` (Postgres): `id`, `user_id` (sub Keycloak), `created_at`, `nombre`, `hexes` (selección **compactada** con `compactCells`), `variables`, `caracteristicas`, `scores_snapshot`
  2. **Nunca** se guarda el PDF ni la expansión res-8 — el informe se **regenera** desde los parámetros
  3. **Listado agrupado** por: Hoy / Esta semana / Este mes / Más antiguos; `ORDER BY created_at DESC` filtrado por `user_id`
  4. **Límites TEMPORALES** (constante `LIMITES_HISTORIAL`, ajustable tras reunión): máx. informes por usuario (con rotación del más viejo) y máx. área/hexes por selección. **Validados en el backend** (rechaza 413/422); el front avisa antes
  5. Accesible desde el SideBar ("Histórico de informes")
  6. Sin entradas → estado vacío con mensaje ("Aún no has generado análisis")
- **Tareas técnicas:**
  - 📦 **BE Tabla**: `informe` (Postgres) + índice `(user_id, created_at DESC)`; migración versionada
  - 📦 **BE Endpoints**: `GET /api/historico` (lista del usuario), `POST /api/historico` (guardar, valida límites), `DELETE /api/historico/{id}`
  - 📦 **FE Puerto**: `Utils/historial/HistorialRepository.ts` (interface `list/save/get/remove`)
  - 📦 **FE Adaptador**: `ApiHistorialRepo.ts` — implementación real contra los endpoints; `LocalStorageHistorialRepo.ts` como fallback/mock para desarrollar el front en paralelo mientras el backend avanza
  - 📦 **FE Compactación**: `compactCells` al guardar / `uncompactCells` (o `polygonToCells`) al reabrir
  - 📦 **FE Config**: `Utils/historial/limites.ts` — topes temporales (documentados como PROVISIONALES, pendiente reunión)
  - 📦 **FE Componente**: `Components/historial/HistorialList.tsx` (agrupación cronológica)
  - 🧪 Tests: guardar/listar/agrupar; rotación al superar tope; backend rechaza fuera de límite; `compact`↔`uncompact` ida y vuelta

### US07-02 — Histórico:Visualización de reportes antiguos
- **Prioridad:** 🟢 Media
- **Dependencia:** US07-01
- **Criterios de Aceptación:**
  1. Botón **"Ver"** reabre el informe en **modo lectura**, reconstruyendo el estado desde los parámetros guardados (expande `hexes`, recarga variables/características/scores)
  2. Botón **eliminar** (con confirmación) → `DELETE /api/historico/{id}`
  3. El informe reabierto muestra scores, radar (US06-01) y variables tal como se guardaron (fidelidad vía `scores_snapshot`)
- **Tareas técnicas:**
  - 📦 Reconstrucción read-only reusando `Report.tsx` desde el registro
  - 📦 Acción eliminar → `repo.remove(id)` + confirmación (toast US09)
  - 🧪 Tests: "Ver" reconstruye el informe; eliminar quita la entrada

---

# Épica US09 — UX/UI: Feedback y Alertas

> Épica nueva. Sistema transversal de feedback visual con la línea gráfica brand (NO librería genérica que rompa el estilo — el cliente ya rechazó lo "genérico/IA").

---

### US09-01 — Mensajes de confirmación (success toasts)
- **Prioridad:** 🟢 Media
- **Criterios de Aceptación:**
  1. Sistema de **toasts** reutilizable con variantes **success / info**, con estilo brand
  2. Success toasts en acciones clave: guardar/editar usuario (Admin), generar PDF, guardar en histórico
  3. Auto-dismiss configurable + cierre manual (X); soporte de **cola** de varios toasts
  4. Posición consistente y responsive; accesible `role="status"` + `aria-live="polite"`
- **Tareas técnicas:**
  - 📦 `Components/Toast.tsx` + `ToastProvider` (context) + hook `useToast()`
  - 📦 Disparar toasts en `Admin/CreateUserModal.tsx`, `Admin/EditUserModal.tsx`, `Utils/pdfExport.ts`, histórico (US07)
  - 🧪 Tests: aparece/auto-dismiss/cierre manual; cola de varios; `role=status`

### US09-02 — Alertas de error en validación de datos
- **Prioridad:** 🟢 Media
- **Criterios de Aceptación:**
  1. Alertas de error **inline** unificadas en validaciones de formularios (extiende las de rangos de US05 en `Caracteristicas.tsx`)
  2. Toast/alerta de error para fallos de acción (p. ej. PDF falla, guardar usuario falla) con `role="alert"` + `aria-live="assertive"`
  3. Mensajes en español, claros y accionables
  4. El error se limpia cuando el usuario corrige el dato
- **Tareas técnicas:**
  - 📦 Componente `<FieldError>` reutilizable para errores inline
  - 📦 Integrar variante `error` del toast (US09-01) en los puntos de fallo
  - 🧪 Tests: error inline aparece/limpia; toast de error con role correcto

---

# Épica US03 — Mapa: Selección Territorial H3

> Selección H3, mapa base y offshore/insular entregados en Scope 1/2. **Pendiente:** validación con datos reales.

---

### US03-01 — Mapa:Pruebas con datos reales
- **Prioridad:** 🔴 Crítica
- **Bloqueo:** 🟡 Externo — depende de la ingesta real del `.h3.parquet` (US03-AC6, equipo de datos).
- **Criterios de Aceptación:**
  1. El mapa consume tiles del `.h3.parquet` **oficial** (no placeholder)
  2. Conteos de hexágonos por resolución consistentes con el dataset real
  3. Clasificación onshore/offshore verificada contra la línea de costa IGAC (`--land-only`)
  4. Sin regresiones de rendimiento con el volumen real (~150K hex, tile-based)
  5. Selección, popup y área (km²) correctos sobre datos reales
- **Tareas técnicas:**
  - 📦 BE: completar ingesta real (US03-AC6) — cargar parquet oficial en warmup
  - 📦 FE: generar `colombia-igac-land-boundary.json` con `node scripts/generate-igac-boundary.mjs --land-only`
  - 🧪 QA: batería de validación (frontera, costas, archipiélago) con datos reales

---

### US03-02 — Mapa:Selección anclada a resolución (fix hexágonos anidados)
- **Prioridad:** 🟡 Alta
- **Bloqueo:** ✅ Ninguno — implementado.
- **Origen:** feedback cliente v2 #11 — "Se pueden seleccionar hexágonos dentro de otros al cambiar el nivel de zoom; la única solución era recargar la página."
- **Causa raíz:** `selectedHexes` es un `Set<string>` de índices H3 sin resolución asociada. Al seleccionar un hex grueso (res baja) y luego acercar, el mapa pinta sus hijos finos "dentro" del padre aún seleccionado → anidamiento y estado inconsistente. El promediado por zoom (`zoomToH3Res`, res 3–8) es **correcto** y anti-desbordamiento de render; NO se elimina.
- **Decisión (party técnica):** los hexes gruesos quedan **solo-visualización**; la selección se ancla a una resolución fina única. No se reconcilia padre/hijos (el área quedaría ambigua).
- **Criterios de Aceptación:**
  1. La selección sólo se permite con el mapa acercado a **res ≥ `MIN_SELECTION_H3_RES`** (doc maestro `Utils/projectData.ts`; hoy = 7 ≈ zoom ≥ 10). Ajustable en un solo sitio.
  2. Por debajo de ese zoom, click sobre un hex **no selecciona** y el cursor es `zoom-in` (no `pointer`).
  3. Aviso flotante **"Acércate para seleccionar el área"** visible mientras el zoom sea insuficiente; desaparece solo al acercarse.
  4. Nunca se produce selección anidada al cruzar niveles de zoom; sin necesidad de recargar.
- **Tareas técnicas:**
  - ✅ `MIN_SELECTION_H3_RES` en `Utils/projectData.ts`; guard en `useMapSelection.toggleHex`.
  - ✅ `selectionZoomTooFar` + pill de aviso + `getCursor` en `Components/map/Map.tsx`.
  - 🧪 QA: seleccionar a res 7/8, alejar y acercar → sin hexes anidados ni recarga.

---

### US03-03 — Mapa:Zonas prohibidas / inviables (gris sólido no seleccionable)
- **Prioridad:** 🟢 Media
- **Bloqueo:** 🟡 Datos — el cableado está listo; falta la **lista real** de hexes vetados (equipo de datos, Camila).
- **Origen:** feedback cliente v2 #26 — "¿Zonas excluidas/prohibidas marcadas visualmente en el Sprint 3?"
- **Criterios de Aceptación:**
  1. Los hexágonos prohibidos se pintan en **gris sólido** (`BANNED_FILL`) y **no son seleccionables** (cursor `not-allowed`, sin hover-fill).
  2. La lista de hexes vetados es un **template en el doc maestro** (`BANNED_HEXES` en `Utils/projectData.ts`), a resolución `MIN_SELECTION_H3_RES`; un hex más fino hereda el veto de su ancestro (`isHexBanned`).
  3. Con la lista vacía (estado actual) el mapa se comporta igual que hoy — cero regresión; al poblarla, las zonas aparecen sin tocar más código.
  4. **(Pendiente datos)** Señal/tooltip que distinga "zona inviable: motivo" de "acércate para seleccionar" — se especifica al recibir los datos y motivos reales.
- **Tareas técnicas:**
  - ✅ Template `BANNED_HEXES` + helper `isHexBanned` (doc maestro + `Utils/h3/hexClassification.ts`).
  - ✅ Render gris sólido en la malla (`getTileData` marca `banned`; `renderSubLayers` colorea) + bloqueo en `toggleHex`.
  - 🟡 DATOS: poblar `BANNED_HEXES` con índices H3 reales + motivos de veto.
  - 🟡 UX: tooltip de motivo de veto (tras recibir datos).

---

# Épica US04 — Variables: Configuración de Dimensiones

> Subpágina de dimensiones, catálogo de 56 variables y cambios de alcance entregados en Scope 2. **Pendiente:** validación con datos reales.

---

### US04-01 — Variables: Pruebas con datos reales
- **Prioridad:** 🟡 Alta
- **Bloqueo:** 🟡 Externo — mismo blocker de datos reales que US03.
- **Criterios de Aceptación:**
  1. Las 4 dimensiones puntuables reflejan scores reales del modelo
  2. Regulatoria se muestra como bloque **informativo** (coherente con US-FB3-06)
  3. Pesos signados WLC (`Utils/variableWeights.ts`) validados con aval del cliente
  4. Catálogo de 56 variables mapeado 1:1 contra las columnas reales del parquet
- **Tareas técnicas:**
  - 📦 Reconciliar `Utils/variablesCatalog.ts` con columnas reales del `.h3.parquet`
  - 🤝 Aval del cliente sobre heatmap WLC + pesos signados (reunión)
  - 🧪 QA visual del heatmap por dimensión con datos reales

---

# Épica US05 — Proyecto: Características del Proyecto

> Formulario, MWPicker, categorías S/M/L y auto-detección onshore/offshore entregados en Scope 2. **Pendiente:** negociar puntos de alcance no contemplados.


# Épica US08 — Admin: Gestión de Usuarios

> ✅ **Concluida** (Scope 1 + feedback). Sin HUs pendientes — **fuera del Sprint 3**. Se lista por completitud del mapa de épicas.

---

# Resumen Consolidado


```
1. US06-01  Radar SVG dinámico          🔴 Crítica  — mayor valor, base ya hecha
2. US09-01/02  Toasts + alertas         🟢 Media    — habilita feedback para US06/US07
3. US07-01/02  Histórico cache + seam    🟢 Media    — depende de US06 (guarda informes)
4. US02-01/02/03  Onboarding modal       🔵 Baja     — cierre de UX, con placeholders
```

## Bloqueadas (documentadas, no consumen dev interno)

| HU | Tipo | Desbloquea |
|----|------|-----------|
| US01-01 (SMTP MailerSend) | ⛔ Externo | Cliente entrega credenciales + dominio |
| US05-01 (negociación alcance) | ⛔ Externo | Reunión con cliente |
| US03-01 / US04-01 (pruebas datos reales) | 🟡 Datos | Equipo de datos entrega `.h3.parquet` real (Camila) |

## Propuesta de asignación

| Dev | HUs |
|-----|-----|
| **Mavalan Software** | US06-01 (radar) + reviews + reuniones (US05-01) + config SMTP (US01-01 al desbloquear) |
| **Part-time A** | US09-01/02 (toasts/alertas) + US02-01/02/03 (onboarding) |
| **Part-time B** | US07-01/02 (histórico cache + seam) + QA pruebas datos reales (US03-01/US04-01 al llegar datos) |
