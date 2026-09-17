---
version: 1.0
date: 2026-09-15
scope: Triage del feedback de Sprint 3 (RetroalimentacionSprint3_respondido.csv)
decision: Por feedback tardío, en Sprint 4 SOLO se desarrollan los FIXES. Las
  nuevas HUs se cotizan y desarrollan APARTE (costo adicional).
---

# Triage del feedback de Sprint 3

> **Regla acordada (2026-09-15):** el feedback llegó tarde respecto al plan de
> Sprint 4. Por eso **solo se desarrollan los FIXES** (correcciones de algo que
> ya existe y está roto/confuso), sin costo adicional. Todo lo que sea **nueva
> funcionalidad (Nueva HU)** se documenta aquí y se **cotiza aparte**. Las
> **decisiones de producto** y lo **bloqueado por datos/infra externa** no se
> dimensionan hasta resolver su gate.
>
> Los FIXES se suben al GitHub Project #2 como issues con la etiqueta
> **`feedback-fix`** (ver `.github/stories/feedback-fixes/` + `sync-stories.yml`).

## Resumen
| Categoría | Cantidad | Se desarrolla en S4 |
|---|---|---|
| ✅ **Fixes** | 24 | **Sí** (sin costo adicional) |
| 🆕 Nuevas HUs | ~20 | No — **cotización aparte** |
| 🧭 Decisiones de producto | 6 | No — requieren definición |
| ⛔ Bloqueado (datos/infra externa) | 4 | No — gate externo |
| 💬 Comentarios / Duplicados / Fuera de alcance / Overlap S4 | resto | No aplica |

**Estimación de los fixes:** ≈ **7–9 h** de desarrollo (suma de estimaciones), la
mayoría front puntual.

---

## ✅ FIXES a desarrollar (Sprint 4, sin costo adicional)

| ID | Item del feedback | Corrección | Est. | Área |
|---|---|---|---|---|
| FB-FIX-01 | Informativas seleccionadas no se pintan en el mapa (pantalla final) | Sincronizar estado de selección de informativas ↔ capas del mapa | 20–30m | front |
| FB-FIX-02 | El scroll para el zoom es extraño | Ajustar sensibilidad/comportamiento del zoom por scroll | 15–20m | front |
| FB-FIX-03 | El PDF tiene errores en el salto de página | Ajustar layout del render (evitar corte de tabla/bloque entre páginas) | 20–30m | front |
| FB-FIX-04 | No deja deseleccionar hexágonos grandes (solo pequeños) | Arreglar deselección de hexágonos grandes | 30–45m | front |
| FB-FIX-05 | Login redirige al home y obliga a dar clic en "Iniciar sesión" otra vez | Arreglar redirección post-login | 15–20m | auth/front |
| FB-FIX-06 | El modal de onboarding aparece cada vez que se entra al menú | Mostrarlo solo la primera vez / cada cierto período (flag persistente) | 20–30m | front |
| FB-FIX-07 | El diálogo de eliminar informe usa el diálogo nativo del navegador | Reemplazar por modal propio (patrón ya usado en la app) | 20–30m | front |
| FB-FIX-08 | Hover en "Capas del Mapa" mantiene cursor default | Cursor pointer en hover | 5m | front |
| FB-FIX-09 | Nomenclatura inconsistente: Gestión / Gestión de usuarios / Administración | Unificar en un solo término | 10m | front |
| FB-FIX-10 | El botón "Inicio" no reinicia el flujo del módulo | Que "Inicio" reinicie el flujo del módulo | 15–20m | front |
| FB-FIX-11 | El campo de búsqueda no se limpia al hacer clic fuera | Limpiar el campo al clic fuera | 10m | front |
| FB-FIX-12 | Color por rol sin etiqueta de texto (riesgo a11y) | Agregar etiqueta de texto junto al color | 10–15m | front |
| FB-FIX-13 | No hay confirmación visible tras crear un usuario | Toast/mensaje de éxito al crear usuario | 15m | front |
| FB-FIX-14 | Buscador de usuarios sensible a tildes (no encuentra "Gomez") | Normalizar el query para ignorar tildes | 20–30m | front/back |
| FB-FIX-15 | Confirmación de edición de usuario con baja visibilidad | Mejorar tamaño/posición del mensaje | 10–15m | front |
| FB-FIX-16 | Crítico: sin confirmación antes de otorgar permisos de admin | Modal de confirmación antes de otorgar admin | 20–30m | front |
| FB-FIX-17 | Incertidumbre sobre revertir rol admin→analista | Aclarar en el mensaje que el downgrade es reversible (si no se borró de Keycloak) | 10–15m | front |
| FB-FIX-18 | Desactivar usuario pasa por el form completo de edición | Que desactivar sea directo | 20–30m | front |
| FB-FIX-19 | Card lateral del informe repite coords/área/variables activas | Eliminar la duplicación | 20–30m | front |
| FB-FIX-20 | Mensaje "Paso 2 (informativas)" aparece durante variables del modelo → confuso | Aclarar en qué paso aparece el mensaje | 10m | front |
| FB-FIX-21 | Búsqueda por municipio: hexágonos no corresponden / no aparecen; modo activo poco claro | Hacer visible la etiqueta del modo activo (autoselección vs exploración) | 15–20m | front |
| FB-FIX-22 | Borré todas las variables y el resultado no cambió | Disparar recálculo al cambiar variables (bug de estado/caché) | 30–50m | front/back |
| FB-FIX-23 | Búsqueda predictiva de corregimiento no muestra todas las opciones | Corregir la búsqueda predictiva (config front / índice back) | 15–20m | front* |
| FB-FIX-24 | No se distingue "recurso" (viento) de "técnica" (aerogenerador) | Si es solo etiqueta/agrupación visual → renombrar/agrupar | 10–15m | front* |

\* Condicional: si la causa resulta ser de backend/datos, sube de estimación y se re-evalúa.

---

## 🆕 Nuevas HUs (NO en Sprint 4 — cotización aparte)
Variables no georreferenciadas al PDF · "Seleccionar todas las variables" · Disclaimer
de área recortada en PDF · Expandir gráfico de araña (detalle por eje) · Ordenar lista
de variables del PDF · Nombre editable de informe (+persistencia) · "Eliminar toda la
selección" · 3 cambios de copy de la imagen introductoria · Mostrar lat/long en el mapa ·
Selector de capas (satélite/vial/topografía) · Control de escala de distancias · Tooltips/
leyenda de capas del mapa · Mostrar mín/máx del score · Nombre de histórico más detallado ·
Filtros por rol/estado en usuarios · Etiquetar dimensión de cada variable en el informe ·
Mostrar la escala en las barras de puntaje · Copy "informativas no afectan el puntaje" ·
Reordenar informe (resumen antes que detalle) · Subir botones Descargar/Guardar.

## 🧭 Decisiones de producto (bloqueadas hasta definir)
Reordenar el flujo (características antes de variables) · Área calculada por cantidad/tipo
de aerogeneradores (y qué pasa si el área es menor/mayor) · Borrado real de usuario (rama
A: aclarar texto / rama B: borrar también en Keycloak) · Timeout de sesión a 30 min (avisar
vs ampliar) · Alcance del modelo (variables de conexión, recurso vs técnica, tamaño de
aerogenerador) · Selección de hexágonos separados / doble escala.

## ⛔ Bloqueado por datos/infra externa
Recuperar contraseña (SMTP) · Variables sin fuente de datos · "Zona no interconectada"
predefinida (falta master de no-elegibles) · Botón de manual de uso (planeado para el
cierre de Sprint 4).

## 💬 Sin acción (comentarios positivos, duplicados, fuera de alcance, overlap Sprint 4)
Comentarios positivos (bloqueo offshore, feature de variables que más afectan) · Múltiples
duplicados dentro del propio CSV · Soporte móvil (fuera de alcance) · Ítems de metodología/
escala del informe que ya cubre la HU "Preconfigurar informe" de Sprint 4.
