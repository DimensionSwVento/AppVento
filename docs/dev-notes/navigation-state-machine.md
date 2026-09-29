---
version: 4.0
date: 2026-04-15
status: activo
autor: wessley - mavalan software
scope: Navegación + SideBar responsive (mobile hamburguesa, colapsado con subpage, layout overlay)
---

# Notas de Desarrollo — Navegación por Estado Global

## 1. Resumen

La aplicación Vento utiliza un estado global (`AccionPrincipalContext`) como máquina de estados que controla:

- Qué subpágina se renderiza junto al SideBar.
- Si el mapa está activo (interactivo) o congelado (snapshot estático).
- Qué items del SideBar están habilitados o deshabilitados.
- Qué hexágonos H3 están seleccionados en el mapa (compartido entre Map y SideBar).

---

## 2. Máquina de Estados — Implementado

### 2.1 Estados Posibles

```
type Aprincipal = "seleccion-area" | "dimensiones" | "caracteristicas" | "informe" | null
```

Estado inicial: `"seleccion-area"`

### 2.2 Contexto Global (`AccionPrincipalContext`)

```typescript
interface AprincipalContext {
  accion: Aprincipal;
  setAccion: (accion: Aprincipal) => void;
  selectedHexes: Set<string>;           // hexágonos seleccionados en el mapa
  setSelectedHexes: Dispatch<SetStateAction<Set<string>>>;
}
```

`selectedHexes` se comparte entre:
- **Map.tsx** — escribe al seleccionar/deseleccionar hexágonos
- **SideBar.tsx** — lee para habilitar avance a `dimensiones`

### 2.3 Diagrama de Transiciones

```
   ┌─────────────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────┐
   │ seleccion-area  │───▶│ dimensiones  │───▶│ caracteristicas│───▶│ informe │
   └─────────────────┘    └──────────────┘    └────────────────┘    └─────────┘
           │                    │ ▲                  │ ▲                 │
           │ SOLO si hay        │ │                  │ │                 │
           │ hexágonos          └─┘                  └─┘                 │
           │ seleccionados       RETROCESO (libre por click en sidebar)  │
           │                                                             │
           └─────────────────────────────────────────────────────────────┘
                              RETROCESO (libre)
```

**Reglas de navegación:**

- **Retroceder:** Libre — click en cualquier paso anterior en el SideBar
- **Avanzar desde `seleccion-area`:** Solo si `selectedHexes.size > 0` — click en "Dimensiones" en SideBar
- **Avanzar desde otras fases:** Solo mediante el botón `NextStepButton` al final de la subpágina (children)
- **Saltar pasos adelante:** Bloqueado

### 2.4 Habilitación Visual (implementada en `SideBar.tsx`)

```typescript
function habilitado(paso) {
  const idx = ORDEN.indexOf(paso);
  if (idx < pasoActual) return true;  // retroceso siempre habilitado
  if (paso === "dimensiones" && accion === "seleccion-area" && haySeleccion) return true;
  return false;
}
```

Items deshabilitados: `cursor-not-allowed opacity-40`.
Item activo: `bg-blue-800`.

---

## 3. Jerarquía de Componentes — Implementado

### 3.1 Cadena de Providers

```
layout.tsx
  └─ AppProvider.tsx  (compone providers vía Utils/ProviderComposer.tsx — ADR-016)
       └─ AprincipalProvider  (accion, setAccion, selectedHexes, setSelectedHexes)
            └─ dashboard/page.tsx
                 ├─ SideBar (lee accion + selectedHexes, controla retroceso)
                 │    └─ children (subpágina según accion)
                 │         └─ NextStepButton (avanza al paso siguiente)
                 └─ MapView (lee accion para freeze, escribe selectedHexes)
```

### 3.2 Renderizado Condicional de Subpáginas (implementado en `dashboard/page.tsx`)

```typescript
switch (accion) {
  case "seleccion-area": return undefined       // sin panel lateral, solo mapa
  case "dimensiones":    return <Dimensions />  // incluye NextStepButton
  case "informe":        return <Report />      // incluye NextStepButton
  default:               return null
}
```

MapView se importa directamente (`"use client"` + import estándar — `dynamic()` se descartó porque rompía el rendering).

El SideBar recibe el resultado como `children` y lo muestra en un panel de `w-[30rem] h-full overflow-y-auto bg-[#cce1eeff]` con scroll vertical.

### 3.3 NextStepButton (`Components/NextStepButton.tsx`)

Card blanca al final de cada subpágina con:
- Texto "Siguiente paso" a la izquierda
- Icono `/next.svg` a la derecha
- Se oculta automáticamente en el último paso (informe)
- Avanza al paso siguiente vía `setAccion`

### 3.4 Efecto sobre el Mapa

| Transición | Efecto en MapView |
|-----------|-------------------|
| Entrar a `seleccion-area` | `unfreeze()` — limpia snapshot, reactiva DeckGL+MapLibre |
| Salir de `seleccion-area` | `freeze()` — captura canvas, muestra imagen estática |

---

## 3.5 Layout Responsive (v4.0)

El SideBar y el layout del dashboard se comportan distinto según viewport:

### SideBar

| Viewport | Estado | Comportamiento |
|---|---|---|
| Mobile + `seleccion-area` | Oculto | Botón hamburguesa (3 líneas) en top-left abre overlay |
| Mobile + subpágina activa | Colapsado | Solo iconos (3.5rem ancho), textos ocultos con `hidden md:inline-block` |
| Desktop (≥768px) | Expandido | Siempre visible, 14rem ancho, textos visibles |

### Dashboard

| Viewport | Layout |
|---|---|
| Mobile | Mapa `absolute top-0 h-[60%]` + Subpágina `absolute bottom-0 h-[50%]` (10% overlap) con `rounded-t-2xl` y `border-t-2 border-[#165170ff]` |
| Desktop | `flex-row` normal: SideBar + Subpágina (30rem) + Mapa (flex-1) |

**Key state:** `hasSubpage = !isAdminPage && accion !== "seleccion-area"` controla todo el modo responsive del sidebar.

---

## 4. Estructura del SideBar — Implementado

### 4.1 Layout con Flex

```
SideBar (flex row, bg-[#165170ff])
  ├─ Panel de navegación (w-[15rem], flex-col justify-between)
  │    ├─ Logo (vento_logo.svg, 111x36px)
  │    ├─ Sección superior
  │    │    ├─ "ACCIONES PRINCIPALES"
  │    │    │    ├─ 📍 Selección de área (area.png 20x20)
  │    │    │    ├─ 📊 Dimensiones (dim.png 20x20)
  │    │    │    ├─ ⚙️ Características del proyecto (caracteristicas.png 20x20)
  │    │    │    └─ 📋 Informe de idoneidad (viab.png 20x20)
  │    │    └─ 📁 Histórico de idoneidad (hist.png 20x20)
  │    └─ Sección inferior
  │         ├─ "GESTIÓN Y AYUDA DE USUARIO"
  │         │    ├─ Configuraciones (config.png 20x20)
  │         │    ├─ Manual de uso (manual.png 20x20)
  │         │    └─ Soporte (soporte.png 20x20)
  │         └─ Email del usuario (user.png 20x20)
  └─ Panel de contenido (w-[30rem], overflow-y-auto, bg-[#cce1eeff])
       └─ {children} → Dimensions + NextStepButton | Report + NextStepButton | null
```

### 4.2 Selección de Hexágonos como Gate

En la fase `seleccion-area`, el item "Dimensiones" se habilita visualmente y permite click solo si `selectedHexes.size > 0`. Esto conecta la interacción del mapa (seleccionar hexágonos) con la navegación del SideBar.

---

## 5. Pendiente de Implementar

### 5.1 Persistencia de Estado en Refresh

**Estado actual:** El estado vive en `useState` — un refresh reinicia a `"seleccion-area"` y pierde selección.

**Pendiente:**
- Decidir si persistir en `sessionStorage`, `localStorage` o URL params.
- Persistir también `selectedHexes`.

### 5.2 Subpágina "Caracteristicas"

**Estado actual:** No hay componente implementado. Cae al `default: return null`.

**Pendiente:**
- Crear componente de configuración (turbinas, capacidad MW, etc.).
- Definir qué datos recibe de la fase "dimensiones".

### 5.3 Histórico de idoneidad

**Estado actual:** Texto estático sin funcionalidad.

**Pendiente:**
- Decidir si es vista independiente (modal/drawer) o fase adicional.
- Requiere almacenamiento de informes previos.

### 5.4 Gestión y Ayuda de Usuario

**Estado actual:** Items estáticos sin funcionalidad.

**Pendiente:** Definir configuraciones, manual de uso, soporte.

### 5.5 Autenticación y Email Real

**Estado actual:** PR de auth mergeado con NextAuth + Keycloak. SideBar muestra el email real del usuario autenticado. Login implementado en `page.tsx` (landing) con `SignInButton` que redirige a Keycloak.

**Pendiente:** Enviar Bearer token en fetches a FastAPI cuando `AUTH_ENABLED=true` (US-AUTH-GUARD).

### 5.6 Flujo de Datos entre Fases

**Estado actual:** `selectedHexes` se comparte. No hay otros datos entre fases.

**Pendiente:**
- `seleccion-area` → `dimensiones`: hexágonos seleccionados ya disponibles vía contexto.
- `dimensiones` → `caracteristicas`: configuración de variables/pesos.
- `caracteristicas` → `informe`: todas las configuraciones para generar informe.

---

## 6. Archivos Involucrados

| Archivo | Estado | Responsabilidad |
|---------|--------|----------------|
| `Utils/AccionPrincipalContext.tsx` | Implementado | Estado global: accion, selectedHexes |
| `AppProvider.tsx` + `Utils/ProviderComposer.tsx` | Implementado | Composición de providers (ADR-016) |
| `layout.tsx` | Implementado | Root layout, wrapping con `AppProvider` |
| `dashboard/page.tsx` | Implementado | Dynamic import MapView, switch subpáginas |
| `Components/SideBar.tsx` | Implementado | Retroceso libre, avance condicional, iconos, logo |
| `Components/NextStepButton.tsx` | Implementado | Botón de avance al final de cada subpágina |
| `Components/Map.tsx` | Implementado | Cuadrícula client-side + selección (sin API, sin heatmap) |
| `Components/HeatmapDemo.tsx` | Implementado (demo) | Features heatmap: tiles API, leyenda, selector, popup, freeze |
| `Components/Dimensions.tsx` | Implementado (datos estáticos) | 5 cards + NextStepButton |
| `Components/Report.tsx` | Implementado (datos estáticos) | 6 cards + NextStepButton |
| `Components/Card.tsx` | Implementado | Card reutilizable (title + description) |
| `login/page.tsx` | Vacío | Login se maneja desde page.tsx (landing) con NextAuth + Keycloak |
| `Components/Map.test.tsx` | Implementado | Test unitario del mapa (Vitest + mocks DeckGL/MapLibre) |
| `Components/SideBar.test.tsx` | Implementado | Test unitario navegación SideBar |
| `Components/NextStepButton.test.tsx` | Implementado | Test unitario avance entre estados |
