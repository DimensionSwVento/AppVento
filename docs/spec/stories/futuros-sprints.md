---
version: 1.0
date: 2026-03-24
scope: futuros-sprints
status: backlog
---

# Historias de Usuario — Futuros Sprints

Origen: "Documentación del proyecto" (documentación oficial del proyecto general) y objetivos que exceden el scope de la primera entrega.

---

## Prioridad Alta — Sprint 4+ (Reportes)

### US-F10 — Generación Automática de Reporte de Viabilidad
- **Módulo:** Reportes
- **Origen:** Objetivos tempranos — "Reducir tiempo de creación de informe de 5 días a <30 segundos"
- **Prioridad:** 🟡 Alta
- **Criterios de Aceptación:**
  1. Generación de PDF profesional tras configuración de variables
  2. Tiempo de generación <30 segundos
  3. Incluye mapa, scores, variables seleccionadas
- **Requiere:** Backend API (FastAPI)

### US-F11 — Histórico de Análisis Previos
- **Módulo:** Reportes
- **Origen:** Solución — "Registro de todos los análisis previos para comparar evolución"
- **Prioridad:** 🟡 Alta
- **Criterios de Aceptación:**
  1. Guardar cada análisis realizado con fecha y parámetros
  2. Listar análisis previos
  3. Comparar evolución entre análisis
- **Requiere:** Backend API + persistencia

### US-F12 — Marca Institucional ANH/EAFIT en Reportes
- **Módulo:** Reportes
- **Origen:** Solución — "Generación de reportes profesionales con respaldo institucional"
- **Prioridad:** 🟢 Media
- **Criterios de Aceptación:**
  1. Logo y marca ANH en reportes
  2. Logo y marca EAFIT en reportes
  3. Formato profesional institucional

---

## Motor Multicriterio (Cuando el modelo esté listo)

### US-F01 — Integración Modelo Multicriterio AHP Completo
- **Módulo:** Motor
- **Origen:** Capítulo 9 — Modelo SIG-MCDM
- **Prioridad:** 🔵 Futura
- **Descripción:** Conectar el modelo multicriterio completo con la herramienta web para cálculos en vivo

### US-F02 — Aplicación Variables Excluyentes (Máscara Binaria)
- **Módulo:** Motor
- **Origen:** 9.3.2.1 — Delimitación zonas excluyentes
- **Prioridad:** 🔵 Futura
- **Descripción:** Zonas donde es imposible intervenir. Máscara binaria 0/1 aplicada dinámicamente

### US-F03 — Cálculo Índice Viabilidad V con Pesos AHP
- **Módulo:** Motor
- **Origen:** 9.3.2.3 — Análisis multicriterio mínimo viable
- **Prioridad:** 🔵 Futura
- **Descripción:** V = Σ(wi · x'i) donde wi son pesos AHP y x'i son variables normalizadas

### US-F04 — Inclusión Variables Penalizantes
- **Módulo:** Motor
- **Origen:** 9.3.2.4 — Refinamiento de aptitud
- **Prioridad:** 🔵 Futura
- **Descripción:** Variables que reducen score sin excluir. Factor multiplicativo o criterio adicional en suma ponderada

### US-F05 — Despliegue Variables Informativas
- **Módulo:** Motor
- **Origen:** 9.3.2.5 — Lectura integral del territorio
- **Prioridad:** 🔵 Futura
- **Descripción:** Variables que no alteran índice pero enriquecen interpretación del resultado

### US-F06 — Validación TOPSIS + Análisis de Sensibilidad
- **Módulo:** Motor
- **Origen:** 9.2.6 — Validación y robustez
- **Prioridad:** 🔵 Futura
- **Descripción:** Ordenamiento alternativo TOPSIS, variación de pesos ±10%, estabilidad espacial

---

## Expansión Geoespacial

### US-F07 — Análisis Áreas Marítimas / Offshore
- **Módulo:** Mapa
- **Origen:** 3.1.3 — Condiciones marinas (batimetría, oleaje)
- **Prioridad:** 🔵 Futura
- **Nota:** Proceso pendiente de definir para dimensiones en áreas marítimas

### US-F08 — Visualización Diferenciada Onshore vs Offshore
- **Módulo:** Mapa
- **Origen:** Capítulo 8 — Aplicación SIG multicriterio
- **Prioridad:** 🔵 Futura
- **Descripción:** Diferenciar visualmente zonas terrestres y marítimas en el mapa

### US-F09 — Recomendación Tipo Aerogenerador por Zona
- **Módulo:** Mapa
- **Origen:** Requisitos generales — "Idealidad del modelo"
- **Prioridad:** 🔵 Futura
- **Descripción:** HAWT si vientos fuertes/constantes. VAWT si turbulencia/dirección variable

---

## Pipeline y Datos

### US-F13 — Pipeline Ingesta Multi-formato
- **Módulo:** Motor
- **Origen:** 9.4.3 — Ingesta y normalización
- **Prioridad:** 🔵 Futura
- **Descripción:** Soportar Shapefile, GeoJSON, GeoPackage, GeoTIFF, CSV, Excel

### US-F14 — Trazabilidad con Hash SHA-256
- **Módulo:** Motor
- **Origen:** 9.4.5 — Base de datos y trazabilidad
- **Prioridad:** 🔵 Futura
- **Descripción:** Hash por archivo para evitar reprocesamientos y facilitar auditoría

### US-F15 — Normalización Variables a Escala [0,1]
- **Módulo:** Datos
- **Origen:** 9.4 — Fase 2 Normalización
- **Prioridad:** 🔵 Futura
- **Descripción:** Estandarización de variables a escala común para integración multicriterio

### US-F16 — Exportar Resultados para Publicaciones/Talleres
- **Módulo:** Divulgación
- **Origen:** O.E.4 — Divulgación de resultados
- **Prioridad:** 🔵 Futura
- **Descripción:** Productos cartográficos y reportes para comunidad científica, congresos, material educativo

---

## Flujo de Usuario — Pasos Pendientes (Configuración + Análisis + Reportes)

Estas historias corresponden a los pasos 3-6 del flujo de usuario declarado que NO entran en la primera entrega.

### US-F17 — Panel de Configuración de Variables por Dimensión
- **Módulo:** Análisis
- **Origen:** Flujo usuario paso 3 — "Configurar las variables agrupadas por dimensión"
- **Paso del flujo:** 3
- **Prioridad:** 🟡 Alta
- **Descripción:** UI con las 5 dimensiones desplegables (Técnica, Ambiental, Regulatoria, Socioeconómica, Macroeconómica). El usuario selecciona qué variables considerar para su análisis mediante checkboxes/toggles agrupados por dimensión
- **Nota:** Diferente de US03-AC2 (filtrado visual del mapa). Este paso configura el ANÁLISIS, no solo la visualización

### US-F18 — Input de Características del Proyecto (Parámetros Técnicos)
- **Módulo:** Análisis
- **Origen:** Flujo usuario paso 4 — "Insertar características del proyecto"
- **Paso del flujo:** 4
- **Prioridad:** 🟡 Alta
- **Descripción:** Formulario donde el usuario ingresa parámetros técnicos de su proyecto específico: selección de capacidad en MW, tipo de turbina u otro elemento técnico. Permite personalizar el análisis de viabilidad según el escenario del usuario
- **Requiere:** Definir lista de parámetros técnicos aceptados

### US-F19 — Cálculo de Viabilidad Personalizado
- **Módulo:** Motor
- **Origen:** Flujo usuario pasos 3+4→5 (combinación)
- **Paso del flujo:** 3-4→5
- **Prioridad:** 🟡 Alta
- **Descripción:** Motor que combine: área seleccionada (paso 2) + variables configuradas (paso 3) + parámetros técnicos del proyecto (paso 4) para generar un score de viabilidad personalizado
- **Requiere:** Backend API + modelo multicriterio integrado

---

---

## Prioridad Media — UX del Mapa (post-entrega)

### US-F-MAP-AB — Pruebas A/B de Modos de Visualización del Mapa
- **Módulo:** Mapa SIG / UX
- **Origen:** Sesión de planning con cliente — dos modos identificados con casos de uso distintos
- **Prioridad:** 🟡 Alta (post-entrega)
- **Contexto:** Durante la implementación se identificaron dos modos de uso del mapa con perfiles de usuario diferentes:
  - **Modo dirigido** (Opción A): el usuario sabe exactamente dónde quiere el informe — mapa en blanco para selección, hexágonos coloreados solo en estado dimensiones
  - **Modo exploratorio** (Opción B): el usuario explora el territorio guiado por variables/dimensiones — heatmap visible siempre durante la selección
- **Criterios de Aceptación:**
  1. Implementar toggle entre los dos modos en preferencias de usuario
  2. Modo dirigido: en `seleccion-area` el mapa muestra solo basemap + hexágonos seleccionados, sin heatmap
  3. Modo exploratorio: en `seleccion-area` el heatmap está visible (comportamiento actual)
  4. Ambos modos en `dimensiones` muestran heatmap completo con leyenda y filtros
  5. Diseñar y ejecutar prueba A/B con usuarios reales (analistas ANH/EAFIT)
  6. Métricas: tiempo de selección de área, satisfacción, errores de selección, tasa de re-selección
  7. Documentar resultados y elegir modo por defecto basado en evidencia
- **Requiere:** Primera entrega completada + base de usuarios para pruebas

---

## Resumen Backlog Futuro

| Grupo | Cantidad | Prerequisito |
|-------|----------|-------------|
| Flujo usuario (config + análisis) | 3 historias | Backend API + modelo multicriterio |
| Reportes | 3 historias | Backend API (FastAPI) |
| Motor Multicriterio | 6 historias | Modelo completo del equipo investigación |
| Expansión Geoespacial | 3 historias | Definir proceso offshore |
| Pipeline y Datos | 4 historias | Backend API + pipeline Python |
| UX del Mapa (A/B) | 1 historia | Primera entrega completada |

**Total historias futuras:** 19
