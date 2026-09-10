---
proyecto: Vento
sprint: 4 (Cuarta Entrega)
tipo: Lista de revisión / QA de lo NUEVO
---

# Lista de revisión — Sprint 4

Marca de verificación de todo lo nuevo. `[F]` = feature (nuevo), `[X]` = fix.
El backend real es del Proyecto 2; con `NEXT_PUBLIC_USE_BACKEND=false` todo corre
en modo **template** (la UI funciona; los datos por hex/scores vienen vacíos o
placeholder). Convenciones: no pushear desde aquí, no tocar `deploy-prod`.

## 0. Preparación
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx vitest run` verde (incluye `projectData.test.ts`, `capacity.test.ts`).
- [ ] App levanta (`npm run dev`) sin errores de consola.

## 1. [X] Gestión de usuarios — US08-04 (`/admin/users`)
- [ ] Editar analista → Administrador: sale **diálogo de confirmación** (rojo) antes de aplicar; al confirmar dispara el correo (`notify`).
- [ ] Editar admin → Analista: diálogo "Quitar rol" (sin correo). Cancelar/ESC no cambia nada.
- [ ] Cambiar solo nombre/estado (sin tocar rol): guarda directo, sin diálogo.
- [ ] "Eliminar" dice **"Desactivar"** (fila + diálogo) con copy honesto (queda inactivo, reactivable).
- [ ] Toasts al crear / editar / desactivar / activar.
- [ ] Buscador insensible a tildes ("gomez" ↔ "Gómez") y por correo.
- [ ] Filtro por **estado** (Todos/Activos/Inactivos) funciona.
- [ ] Filtro por **rol** (Admin/Analista) — activo cuando el backend incluya `roles` en el listado (BFF ya lo propaga).
- [ ] Desactivar es acción directa (no abre el formulario completo).

## 2. [F] Admin de catálogo — US08-01/02/03
BFF `/api/admin/catalog/*` → FastAPI (ver `docs/api/admin-catalog.md`). Fallback template.
- [ ] **AdminNav** navega entre Usuarios / Variables / Normativa / Escenarios.
- [ ] **Variables y datasets** (`/admin/variables`): pestañas Modelo / Informativas.
  - [ ] Modelo: NO se puede deshabilitar; sí "Actualizar dataset" y "Editar detalle".
  - [ ] Informativas: crear nueva, habilitar/deshabilitar, toggles en mapa/menú.
  - [ ] Panel de detalle (nombre, dimensión, fuente, unidad, rango, dataset, excluyente).
- [ ] **Normativa** (`/admin/normativa`): crear/editar/eliminar norma + estado (semáforo).
- [ ] **Escenarios** (`/admin/escenarios`): crear/editar/eliminar escenario + horizonte.
- [ ] Solo accesible como **admin** (middleware + layout redirigen si no).

## 3. [F] Preconfigurar informe — US06-03
- [ ] Panel "Configuración del informe" (en el builder): toggles de dimensiones, secciones, y **tipo de gráfico** (radar/circular/barras) — la vista se actualiza en vivo.
- [ ] Desactivar una dimensión la quita del gráfico, barras y fuentes.
- [ ] Toggle **Mapa del área** oculta/muestra el mapa del resumen (conectado).
- [ ] Toggle **Detalle de variables puntuadas** oculta/muestra la tabla "Variables consideradas" (conectado).
- [ ] "Detalle interno del modelo" (off por defecto) añade la columna Criterio.
- [ ] Toggle **Variables excluyentes** muestra/oculta el bloque de excluyentes.
- [ ] Variables **informativas** en el informe muestran su **descripción** (qué es/cómo opera), no solo valor.
- [ ] Score general (gauge) + score por dimensión.
- [ ] Al **restaurar un informe del histórico**, se rehidrata su configuración (secciones/gráfico), no vuelve a los defaults.

## 4. [F] Informe PDF multipágina (hojas) — US06-04
- [ ] Botones **Previsualizar** / **Descargar PDF** abren el **ReportBuilder** a pantalla completa (65% malla de hojas / 35% opciones + Cancelar/Descargar). El editor NO está en la vista inline.
- [ ] Hojas en orden: Índice+Resumen ejecutivo → Técnica → Ambiental → Social → Económica (Inf) → Regulatoria (Inf) → Variables informativas → Fuentes → Disclaimer.
- [ ] Header de cada hoja: **logo de aerogenerador + "Idoneidad eólica"** en negrilla.
- [ ] Resumen ejecutivo: mapa de calor **completo** (no recortado) + gauge de viabilidad + gráfico + barras por dimensión.
- [ ] Hojas de dimensión: **score** y **peso en el índice** en esquinas, **variables que más influyen** (barras suma/resta SVG, salen en el PDF), tabla, **Resumen del cálculo** (fórmula con pesos).
- [ ] Tablas largas → mini-tablas en hojas extra (no se cortan a mitad).
- [ ] **Descargar PDF**: una hoja = una página A4; el PDF = la malla.

## 5. [F] Dimensión económica — US04-02
- [ ] En el menú de Dimensiones aparece **"Económica — Análisis prospectivo"** al activar ≥1 variable económica → abre el **modal**.
- [ ] Modal: capacidad nominal (0/10/20/50/100 MW), escenario, horizonte, chips + "Seleccionar todas", **Comparar escenarios**, gráfica de proyección, **Incluir en el informe PDF**, Restablecer/Guardar.
- [ ] Nota "**no se puntúa**" visible.
- [ ] Con "Agregar al informe" activo, la sección económica sale en el informe/PDF.

## 6. [F] Dimensión regulatoria — US04-05
- [ ] En el menú aparece **"Regulatoria — Marco normativo"** → abre el **modal**.
- [ ] Modal: **semáforo** (Aplica / Requiere trámite / Requiere verificación / No aplica), **normas** con etiquetas (desde `catalogApi.fetchNormas`), **autoridades**, información normativa, toggle **Agregar al informe**.
- [ ] La sección regulatoria del informe respeta ese toggle.

## 7. [F] Alerta área vs capacidad — US04-04 (fase Características)
- [ ] Al elegir capacidad: si el área seleccionada queda fuera del rango esperado → **alerta amber inline** ("Amplía el área o reduce la capacidad" / viceversa) con la banda esperada.
- [ ] La alerta **NO bloquea** el botón "Siguiente paso".

## 8. [F] Selección por polígono / coordenadas — US03-04 (fase Selección)
> El **pincel** se retiró (arrastre poco fiable). La opción nueva es **polígono por puntos** (estilo Google Maps).
- [ ] Botón **polígono** en la barra del mapa; con el modo activo, **cada clic pone un vértice** (cursor de cruz) y se dibuja el contorno + los puntos.
- [ ] **Deshacer** quita el último punto; **Aplicar (N)** (≥3 puntos) selecciona los hexágonos **dentro** del polígono (filtra excluidos y fuera de Colombia).
- [ ] **Selección por coordenadas** (panel bajo el buscador): escribir `lat, lng` → **Añadir** → el mapa vuela ahí y suma el vértice; lista de puntos con ✕; **Seleccionar área (N)**.
- [ ] Clic en el mapa y coordenadas alimentan el **mismo** polígono.
- [ ] Con el modo apagado, el clic simple sigue haciendo toggle de hexágono.
- [ ] **Movimiento del buscador**: al elegir un resultado el mapa hace un **salto directo** (rápido), no el slide cinematográfico.

## 9. [F] Legibilidad / verificabilidad (trazabilidad)
- [ ] Tabla por dimensión: columnas **Variable · Tipo · Peso · Valor · Fecha · Fuente**.
- [ ] Botón **admin** "Datos por hex" en el informe (solo admin): descarga PNG con la **tabla cruda por hexágono** + **leyenda de fuentes por variable (Código · Variable · Fecha · Fuente)** + nota de verificación en SIG.
- [ ] Hoja de Fuentes: tabla con **versión + enlace** + fuentes por dimensión + bloque **"Trazabilidad y verificación"** (cadena general → dimensional → tabla área → crudo).

## 10. [X] Fixes puntuales
- [ ] **Buscador de regiones**: la auto-selección ya **no incluye zonas excluidas**.
- [ ] **SideBar**: ya no muestra identidad falsa "test@gmail.com" (muestra `—`/"Sin sesión" si no hay sesión).
- [ ] **Mapa de calor** del informe: se ve completo (revertido el recorte `object-cover`).
- [ ] Detección admin centralizada en `useIsAdmin()` (SideBar + informe).
- [ ] ⚠️ **404 `/api/auth/*`**: pendiente de entorno del usuario (verificar `AUTH_URL=http://localhost:3000`, `AUTH_SECRET`, `.env`). No es bug de código.

## 11b. [F] Capas de mapa en hexágonos res8 — US04-03 (método)
> El **valor real** por hex viene de la máster (backend); aquí queda el **método** conectado a un seam.
- [ ] **Heatmap de viento** (velocidad/densidad): colorea los hex del **grid** (res según zoom), viridis, relleno translúcido (20%); densidad ↔ velocidad son **mutuamente excluyentes**.
- [ ] **Capas de área** (resguardos, humedales, nodos…): hexágonos de cobertura con relleno 20% + borde 100% del color.
- [ ] Heatmap de idoneidad del informe con relleno translúcido (sin borde).
- [ ] Sin costuras entre tiles (relleno por hex "dueño" del tile).
- [ ] Contrato de datos res8 documentado para el backend (`map-res8-contract`).

## 11c. [X] Navegación "Siguiente paso" unificada — US09-03
- [ ] Mismo patrón/skin y redacción ("Siguiente paso: {fase}") en todas las fases (CTA flotante del mapa + botón del panel), vía `usePhaseNav`.
- [ ] En Características con errores: botón deshabilitado con el motivo.

## 11d. [X] Fixes de auditoría (falsamente conectado)
- [ ] Versión de fuente sin match muestra **"s/v"** (no un "2024" inventado).
- [ ] Normativa marcada como **ilustrativa** (no evaluación jurídica).
- [ ] Contador `activas/total` de cada dimensión coincide con la lista real.

## 11. Infra — sync-stories
- [ ] `.github/stories/` reorganizado en `sprint-01/`, `sprint-02/`, `sprint-04/`.
- [ ] Workflow **manual** (`workflow_dispatch`), solo procesa `sprint-04/`, milestone **"Cuarta Entrega"**, Project #2.
- [ ] 14 stories en `sprint-04/` con prefijo `feature:`/`fix:` en el título.

---

### Pendiente (no en esta entrega)
- **US04-03 (datos reales)** — el método de capas/heatmap res8 está listo; falta el **valor real por hex** de la máster/parquet (backend).
- **US09-04** — solo el **texto del disclaimer** (aprobación EAFIT); el código ya lo muestra al inicio y al final.
- **US05-AC2** — catálogo de modelos reales de aerogenerador (definición de datos del cliente).
- **QA-04** (tests, transversal). Versión persistente de dataset con fecha (api+bd).
- Backend FastAPI de `/api/admin/catalog/*`, `/api/tiles/variable` y `users.roles` — Proyecto 2.

> Nota: **US09-03** (navegación) y **US03-04** (selección por polígono/coordenadas) quedaron **hechos** en esta entrega (ya no son part-time/pendiente).
