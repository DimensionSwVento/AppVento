---
version: 2.0
date: 2026-04-20
scope: contractual-segunda-entrega
origen: continuación del scope-primera-entrega.md
equipo: 1 fulltime (winx) + 2 part-time
estado: borrador propuesto — HUs descompuestas por responsabilidad única
---

# Scope Contractual — Segunda Entrega

Sigue al [scope-primera-entrega.md](./scope-primera-entrega.md). Continuación del flujo principal: selección → variables → características → informe. Cada HU mantiene **una sola responsabilidad** siguiendo el patrón del scope-1 (`US03-AC1`, `US03-AC2`, …).

> **Estado de las precondiciones**: scope-1 entregado con feedback cliente atendido. Hay HUs que requieren **reunión con equipo de datos / modelo multicriterio** antes de empezar — ver §Reuniones requeridas.

---

## Reuniones requeridas

| Reunión | Objetivo | Participantes | HUs bloqueadas |
|---------|----------|---------------|----------------|
| **Datos — Catálogo aerogeneradores** | Definir modelos soportados, campos, rangos válidos, mantenedor | winx + equipo de datos + cliente (mavalan) | US05-AC1, US05-AC2, US05-AC3, US05-AC5 |
| **Modelo multicriterio — Output esperado** | Confirmar entregables del modelo (scores, fórmulas, metadata) para diseñar template | winx + equipo investigación | US06-AC5 (datos reales) |
| **Cliente — Paleta colores GIS** | Confirmar viridis vs inferno + si los colores marcan jerarquía o solo agrupación | winx + cliente | US04-AC1 |

---

## Resumen de historias scope-dos

| Prioridad | ID | Historia | Épica | Estado |
|-----------|----|----------|-------|--------|
| 🔴 Crítica | **US03-AC10** | Cálculo de área km² de la selección | E2 | ✅ Listo |
| 🟡 Alta | **US04-AC1** | Agrupación visual de variables por dimensión | E4 | ⏸ Espera paleta colores |
| 🟡 Alta | **US04-AC2** | Tooltip con definición de variable | E4 | ✅ Listo |
| 🟡 Alta | **US04-AC3** | Indicador de progreso por categoría | E4 | ✅ Listo |
| 🟡 Alta | **US04-AC4** | Endpoint backend `/api/variables` | E4 | ✅ Listo |
| 🟡 Alta | **US04-AC5** | Persistencia sessionStorage variables | E4 | ✅ Listo |
| 🟡 Alta | **US05-AC1** | Formulario dinámico aerogeneradores | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC2** | Selector con catálogo + búsqueda | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC3** | Validación de rangos técnicos | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC4** | Persistencia sessionStorage proyecto | E5 | ✅ Listo |
| 🟡 Alta | **US05-AC5** | Fuente del catálogo (JSON estático vs BE) | E5 | ⏸ Reunión datos |
| 🔴 Crítica | **US06-AC1** | Generación PDF con placeholders | E6 | ⏸ ADR-013 |
| 🔴 Crítica | **US06-AC2** | Previsualización del PDF en pantalla | E6 | ⏸ ADR-013 |
| 🔴 Crítica | **US06-AC3** | Template del PDF (estructura y logos) | E6 | ✅ Listo |
| 🟡 Alta | **US06-AC4** | Marca "Datos de muestra" en informe | E6 | ✅ Listo |
| 🟢 Media | **US06-AC5** | Conexión a datos reales del modelo | E6 | ⏸ Modelo multicriterio |

---

# E2 — Mapa SIG (extensión)

> **Objetivo:** Completar el flujo de selección añadiendo cálculo automático del área en km², insumo para el informe de viabilidad.

**Dependencias:** US03, US03-AC6

---

### US03-AC10 — Cálculo de Área en km² de la Selección
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E2 (Mapa SIG — Parte 2)
- **Dependencia:** US03, US03-AC6
- **Criterios de Aceptación:**
  1. Cálculo de área usando `cellArea(h, 'km2')` de h3-js sumado sobre `selectedHexes`
  2. Área visible en la UI (SideBar o subpage "Selección de área") con formato `1,234.56 km²` con separadores de miles
  3. Actualización reactiva al añadir/quitar hexágonos sin recargar
  4. Cálculo correcto independiente de la resolución H3 (área por celda varía con resolución y latitud)
  5. Comportamiento con `0 hexágonos seleccionados` → `0 km²`, sin error
  6. Test unitario y test integración SideBar
- **Estimación:** 3-4h
- **Estado:** ✅ Sin bloqueantes — listo para arrancar

---

# E4 — Configuración de Dimensiones (Variables)

> **Objetivo:** Permitir al analista configurar las variables del análisis multicriterio, agrupadas por dimensión, con feedback visual claro de qué hace cada una y cuánto lleva configurado.

**Dependencias:** US01 (sesión válida), US03 (área seleccionada)

---

### US04-AC1 — Agrupación Visual de Variables por Dimensión con Colores GIS
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** US04-AC4 (datos del endpoint)
- **Criterios de Aceptación:**
  1. Variables agrupadas en 5 secciones colapsables correspondientes a las 5 dimensiones (técnica, ambiental, regulatoria, socioeconómica, macroeconómica)
  2. Cada sección tiene un código de color tipo heat-map GIS — paleta a definir con cliente: viridis (`#440154→#FDE725`) o inferno (`#420A68→#FCFFA4`)
  3. Header de cada sección muestra: nombre de dimensión + color asignado + número de variables totales
  4. Secciones se pueden expandir/colapsar individualmente
  5. Estado de expansión persiste mientras dure la sesión
- **Decisión pendiente:** confirmar con cliente paleta exacta y si los colores marcan **jerarquía de importancia** o solo **agrupación visual**
- **Estimación:** 4h
- **Estado:** ⏸ Espera consulta cliente sobre paleta

---

### US04-AC2 — Tooltip con Definición de cada Variable
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** US04-AC1 (variables ya agrupadas), US04-AC4 (definiciones del endpoint)
- **Criterios de Aceptación:**
  1. Cada variable tiene un icono ℹ (info) al lado del label
  2. Hover sobre el icono muestra tooltip con la definición en español
  3. En mobile, tap sobre el icono abre/cierra el tooltip (no hover)
  4. Tooltip se cierra al hacer click fuera
  5. Texto del tooltip viene del campo `definition` del endpoint `/api/variables`
  6. Test unitario: tooltip aparece y desaparece según interacción
- **Estimación:** 3h
- **Estado:** ✅ Sin bloqueantes

---

### US04-AC3 — Indicador de Progreso por Categoría
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** US04-AC1
- **Criterios de Aceptación:**
  1. Cada dimensión muestra una barra de progreso visible
  2. Barra refleja `N de M variables configuradas` para esa dimensión
  3. Color de la barra coincide con el color de la dimensión (US04-AC1)
  4. Texto numérico al lado: `3 / 8` o similar
  5. Actualización inmediata al configurar/deseleccionar una variable
  6. Test unitario: progreso refleja correctamente N/M
- **Estimación:** 2h
- **Estado:** ✅ Sin bloqueantes

---

### US04-AC4 — Endpoint Backend `/api/variables`
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables — backend)
- **Dependencia:** US-DDD (backend FastAPI funcionando)
- **Criterios de Aceptación:**
  1. Endpoint `GET /api/variables` en FastAPI
  2. Retorna `{ variables: [{ dimension, name, label, definition, type }] }`
  3. `dimension` ∈ las 5 dimensiones; `type` ∈ excluyente/incluyente/penalizante/informativa
  4. Datos vienen de la definición compartida con el equipo de investigación
  5. Frontend lo consume vía rewrite Next.js (mismo patrón que `/api/tiles` — ver [frontend-backend-integration.md](../../architecture/frontend-backend-integration.md))
  6. Test backend: endpoint retorna status 200 + JSON con estructura esperada
- **Estimación:** 3h backend + 1h rewrite frontend
- **Estado:** ✅ Sin bloqueantes

---

### US04-AC5 — Persistencia de la Configuración en sessionStorage
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** US04-AC1
- **Criterios de Aceptación:**
  1. Variables configuradas por el usuario se guardan en `sessionStorage` automáticamente
  2. Al navegar a otro paso (Características, Informe) y volver, la configuración se restaura
  3. Al cerrar pestaña o sesión, la configuración se pierde (intencional — `sessionStorage`, no `localStorage`)
  4. Helper reutilizable para serializar/deserializar
  5. Test unitario: setear → leer devuelve mismo valor; clear borra todo
- **Estimación:** 2h
- **Estado:** ✅ Sin bloqueantes

---

# E5 — Características del Proyecto

> **Objetivo:** Capturar parámetros técnicos del proyecto eólico (turbinas, capacidad, alturas) para alimentar el informe.

**Dependencias:** US03 (área), US04 (variables configuradas)

> ⏸ **Bloque grueso bloqueado** — la mayoría de HUs depende de reunión con equipo de datos. Solo US05-AC4 (persistencia) puede preparar el scaffolding antes.

---

### US05-AC1 — Formulario Dinámico de Aerogeneradores
- **Prioridad:** 🟡 Alta
- **Épica origen:** E5 (Proyecto)
- **Dependencia:** US05-AC5 (catálogo disponible)
- **Criterios de Aceptación:**
  1. Formulario con los campos definidos en la reunión con equipo de datos (capacidad MW, número de turbinas, altura buje, diámetro rotor, …)
  2. Campos se renderizan dinámicamente según definición — añadir/quitar campos no requiere rediseño
  3. Cada campo tiene label en español, tipo apropiado (number/select/text) y placeholder
  4. Layout responsive (grid en desktop, columna en mobile)
  5. Test unitario: render con N campos, valores se capturan correctamente
- **Estado:** ⏸ Bloqueada — reunión equipo de datos
- **Estimación tras desbloqueo:** 4h

---

### US05-AC2 — Selector con Catálogo de Modelos
- **Prioridad:** 🟡 Alta
- **Épica origen:** E5 (Proyecto)
- **Dependencia:** US05-AC5
- **Criterios de Aceptación:**
  1. Selector con dropdown searchable de modelos del catálogo
  2. Búsqueda filtra por fabricante y/o nombre del modelo
  3. Al seleccionar un modelo, los campos relevantes del formulario se autocompletan con sus valores nominales (capacidad, alturas, etc.)
  4. Opción "modelo personalizado" permite ingresar valores manualmente
  5. Test unitario: búsqueda filtra correctamente; selección autocompleta
- **Estado:** ⏸ Bloqueada — reunión equipo de datos
- **Estimación tras desbloqueo:** 3h

---

### US05-AC3 — Validación de Rangos Técnicos
- **Prioridad:** 🟡 Alta
- **Épica origen:** E5 (Proyecto)
- **Dependencia:** US05-AC1, US05-AC5
- **Criterios de Aceptación:**
  1. Cada campo numérico valida que el valor caiga dentro del rango técnico permitido (definido en la reunión con datos)
  2. Mensaje inline en español al usuario si el valor está fuera de rango (ej. "La altura debe estar entre 50 y 200 metros")
  3. El botón "Siguiente paso" queda deshabilitado mientras haya errores
  4. Errores se limpian cuando el usuario corrige el valor
  5. Test unitario: valor fuera de rango bloquea; valor válido permite avanzar
- **Estado:** ⏸ Bloqueada — reunión equipo de datos (rangos exactos no definidos)
- **Estimación tras desbloqueo:** 2h

---

### US05-AC4 — Persistencia del Formulario en sessionStorage
- **Prioridad:** 🟡 Alta
- **Épica origen:** E5 (Proyecto)
- **Dependencia:** US04-AC5 (mismo helper)
- **Criterios de Aceptación:**
  1. Valores del formulario se guardan en `sessionStorage` automáticamente al cambiar cualquier campo
  2. Al navegar a otro paso y volver, los valores se restauran
  3. Limpieza al cerrar pestaña (no `localStorage`)
  4. Test unitario
- **Estado:** ✅ Sin bloqueantes (scaffolding aunque el formulario aún no exista)
- **Estimación:** 1h

---

### US05-AC5 — Fuente del Catálogo de Aerogeneradores
- **Prioridad:** 🟡 Alta
- **Épica origen:** E5 (Proyecto — decisión técnica)
- **Dependencia:** Reunión equipo de datos
- **Criterios de Aceptación:**
  1. Catálogo de modelos accesible al frontend con estructura `{ id, fabricante, modelo, capacidad_MW, altura_min, altura_max, rotor_diametro, ... }`
  2. **Decisión pendiente** en reunión:
     - Opción A: JSON estático en `public/data/turbines.json` (rápido, sin latencia, requiere redeploy para actualizar)
     - Opción B: endpoint backend `/api/turbines` (actualizable sin redeploy, +complejidad)
  3. ADR-014 escribiendo la decisión (winx)
  4. Test: 5+ modelos cargan correctamente y son seleccionables
- **Estado:** ⏸ Bloqueada — reunión equipo de datos
- **Estimación tras desbloqueo:** 2h (JSON) o 4h (BE)

---

# E6 — Reportes (PDF)

> **Objetivo:** Generar informe de viabilidad descargable en PDF, con previsualización antes de descarga.

**Dependencias:** US03, US04, US05; modelo multicriterio (diferible)

---

### US06-AC1 — Generación del PDF (con placeholders)
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E6 (Reportes)
- **Dependencia:** ADR-013 (decisión técnica), US04, US05 (datos del flujo)
- **Criterios de Aceptación:**
  1. Generación de PDF a partir de: hexágonos seleccionados, dimensiones configuradas, características del proyecto
  2. Endpoint/función retorna `application/pdf` válido ≥ 1KB
  3. Datos pueden ser **placeholders** mientras el modelo multicriterio avanza
  4. Manejo robusto de `0 hexágonos seleccionados` → mensaje de error claro, sin crash
  5. Test unitario: generación con dataset placeholder retorna PDF válido
- **Decisión técnica pendiente (ADR-013):**
  - WeasyPrint (Python backend, HTML/CSS → PDF, calidad pro) — **recomendado**
  - ReportLab (Python backend, PDF nativo programático)
  - jsPDF + html2canvas (frontend, sin backend, calidad inferior)
- **Estimación:** 6-12h según tecnología
- **Estado:** ⏸ Espera ADR-013

---

### US06-AC2 — Previsualización del PDF en Pantalla
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E6 (Reportes)
- **Dependencia:** US06-AC1
- **Criterios de Aceptación:**
  1. Pantalla de informe muestra el PDF embebido en un `<iframe src=...>`
  2. Usuario puede scroll dentro del iframe para ver todas las páginas
  3. Botón para regenerar el PDF si el usuario cambia datos del flujo
  4. Indicador de carga mientras se genera (puede tardar segundos)
  5. Mensaje de error claro si la generación falla
  6. Test unitario: el iframe recibe la URL del PDF generado
- **Estimación:** 2h
- **Estado:** ⏸ Espera US06-AC1

---

### US06-AC3 — Template del PDF (Estructura y Branding)
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E6 (Reportes)
- **Dependencia:** ADR-013
- **Criterios de Aceptación:**
  1. Template incluye: portada con título, fecha de generación, mapa estático del área seleccionada, tabla de variables configuradas, características técnicas del proyecto, scores por dimensión
  2. Encabezado con logos institucionales: Vento + ANH + EAFIT + mavalan
  3. Pie de página con número de página y fecha
  4. Tipografía y colores consistentes con el branding de la app
  5. Saltos de página adecuados — secciones no se cortan mal
  6. Test visual manual + snapshot del HTML/template
- **Estimación:** 4h
- **Estado:** ✅ Diseño puede arrancar (independiente de ADR-013)

---

### US06-AC4 — Marca "Datos de Muestra" Mientras el Modelo Esté en Desarrollo
- **Prioridad:** 🟡 Alta
- **Épica origen:** E6 (Reportes)
- **Dependencia:** US06-AC3
- **Criterios de Aceptación:**
  1. Mientras los datos del informe vengan de placeholders, el PDF muestra una **banda visible** en la portada y en el encabezado de cada página: **"Datos de muestra — modelo multicriterio en desarrollo"**
  2. Banda visualmente distinta (color de advertencia, ej. naranja claro)
  3. Feature flag `USING_REAL_MODEL_DATA` controla la visibilidad — `false` por defecto
  4. Al activar `USING_REAL_MODEL_DATA=true`, la banda desaparece automáticamente
  5. Test: con flag off → banda presente; con flag on → ausente
- **Estimación:** 1h
- **Estado:** ✅ Sin bloqueantes

---

### US06-AC5 — Conexión a Datos Reales del Modelo Multicriterio
- **Prioridad:** 🟢 Media
- **Épica origen:** E6 (Reportes)
- **Dependencia:** Modelo multicriterio en versión avanzada, US06-AC1
- **Criterios de Aceptación:**
  1. Reemplazar placeholders por consumo del endpoint `/api/score/{h3Index}` (o similar — definir con backend)
  2. Validar que los scores reales aparecen correctamente en el template
  3. Quitar feature flag (US06-AC4) y banda "Datos de muestra"
  4. Validación stakeholders del informe con datos reales
  5. Tests: endpoint retorna scores; PDF refleja valores correctos
- **Estado:** ⏸ Bloqueada — modelo multicriterio en desarrollo
- **Estimación tras desbloqueo:** 4-6h

---

# Resumen Consolidado scope-dos

## Estimación total

| Bloque | Horas |
|--------|-------|
| E2 (US03-AC10) | 3-4h |
| E4 (US04-AC1 a AC5) | 14h |
| E5 (US05-AC1 a AC5) | 12-14h |
| E6 (US06-AC1 a AC5) | 17-23h |
| **Total** | **46-55h** |

Con buffer 20%: **55-66h** = ~2 semanas con el equipo (1 FT + 2 PT).

## Dependencias entre HUs

```
US03-AC10 ──────────────────────────────────► (independiente)

US04-AC4 ──► US04-AC1 ──┬─► US04-AC2
                        ├─► US04-AC3
                        └─► US04-AC5

US05-AC5 ──► US05-AC1 ──┬─► US05-AC3
              │         └─► US05-AC4
              └─► US05-AC2

ADR-013 ──► US06-AC1 ──► US06-AC2
            US06-AC3 (paralelo)
            US06-AC4 (paralelo)
                        │
                        ▼
                     US06-AC5 (cuando modelo entregue)
```

## Decisiones técnicas a tomar antes del sprint

1. **Paleta colores US04-AC1** — viridis vs inferno — consulta cliente
2. **Catálogo aerogeneradores US05-AC5** — JSON estático vs BE — reunión equipo de datos → ADR-014
3. **PDF generation US06-AC1** — WeasyPrint vs ReportLab vs jsPDF → ADR-013
4. **Persistencia formularios** — confirmado sessionStorage (US04-AC5, US05-AC4)

## Plan de arranque

### Fase 0 — Agendamiento y decisiones (3-5 días)
- Agendar reuniones datos y modelo multicriterio
- Consulta cliente sobre paleta colores
- Escribir ADR-013 (PDF) y borrador ADR-014 (catálogo)

### Fase 1 — Sin bloqueantes (semana 1, ~22h)
- US03-AC10 (3-4h)
- US04-AC2, AC3, AC4, AC5 (~10h)
- US06-AC3, AC4 (5h)
- US05-AC4 scaffolding (1h)

### Fase 2 — Tras desbloqueos (semana 2, ~25h)
- US04-AC1 si paleta confirmada
- US05-AC1, AC2, AC3, AC5 si reunión cerró
- US06-AC1, AC2 tras ADR-013

### Fase 3 — Integración y demo
- Tests end-to-end del flujo
- Deploy a `deploy-test`
- Demo cliente

## Propuesta de asignación

| Dev | HUs |
|-----|-----|
| **Winx** | Decisiones + ADR-013/014 + US06-AC1/AC2/AC3 + reviews |
| **Part-time A** | US04-AC1/AC2/AC3/AC4/AC5 |
| **Part-time B** | US03-AC10 + US05-AC1/AC2/AC3/AC4/AC5 (tras desbloqueo) |

---

## Cierre esperado del scope-dos

- ✅ 16 sub-HUs (3 críticas, 12 altas, 1 media) cerradas, con la excepción de US06-AC5 (esperando modelo)
- ✅ ADR-013 y ADR-014 escritos
- ✅ Paleta colores GIS confirmada con cliente
- ✅ Tests para cada AC
- ✅ Deploy a `deploy-test` validado
- ✅ Demo end-to-end con placeholders en informe PDF
