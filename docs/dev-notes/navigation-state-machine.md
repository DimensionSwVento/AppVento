---
version: 1.0
date: 2026-03-30
status: activo
autor: wessley - mavalan software
scope: Máquina de estados de navegación, SideBar, subpáginas y ciclo de vida de componentes
---

# Notas de Desarrollo — Navegación por Estado Global

## 1. Resumen

La aplicación Vento utiliza un estado global (`AccionPrincipalContext`) como máquina de estados que controla:

- Qué subpágina se renderiza junto al SideBar.
- Si el mapa está activo (interactivo) o congelado (snapshot estático).
- Qué items del SideBar están habilitados o deshabilitados.

---

## 2. Máquina de Estados — Implementado

### 2.1 Estados Posibles

```
type Aprincipal = "seleccion-area" | "dimensiones" | "caracteristicas" | "informe" | null
```

Estado inicial: `"seleccion-area"`

### 2.2 Diagrama de Transiciones

```
                    ┌──────────────────────────────────────────────┐
                    │              AVANCE (solo +1 paso)           │
                    ▼                                              │
  ┌─────────────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────┐
  │ seleccion-area  │───▶│ dimensiones  │───▶│ caracteristicas│───▶│ informe │
  └─────────────────┘    └──────────────┘    └────────────────┘    └─────────┘
          ▲                    │ ▲                  │ ▲                 │
          │                    │ │                  │ │                 │
          └────────────────────┘ └──────────────────┘ └─────────────────┘
                         RETROCESO (libre a cualquier paso anterior)
```

**Reglas de navegación (implementadas en `SideBar.tsx:21-26`):**

- **Avanzar:** Solo al paso inmediato siguiente (`pasoDestino === pasoActual + 1`).
- **Retroceder:** Libre a cualquier paso anterior (`pasoDestino <= pasoActual`).
- **Saltar pasos adelante:** Bloqueado.

### 2.3 Habilitación Visual (implementada en `SideBar.tsx:29-32`)

```typescript
function habilitado(paso) {
  const idx = ORDEN.indexOf(paso);
  return idx <= pasoActual || idx === pasoActual + 1;
}
```

| Estado actual      | seleccion-area | dimensiones | caracteristicas | informe |
|--------------------|:-:|:-:|:-:|:-:|
| seleccion-area     | activo | habilitado | deshabilitado | deshabilitado |
| dimensiones        | habilitado | activo | habilitado | deshabilitado |
| caracteristicas    | habilitado | habilitado | activo | habilitado |
| informe            | habilitado | habilitado | habilitado | activo |

Items deshabilitados: `cursor-not-allowed opacity-40`.
Item activo: `bg-blue-800`.

---

## 3. Jerarquía de Componentes — Implementado

### 3.1 Cadena de Providers

```
layout.tsx
  └─ Providers.tsx
       └─ AprincipalProvider  (estado global: accion + setAccion)
            └─ dashboard/page.tsx
                 ├─ SideBar (lee accion, controla navegación)
                 │    └─ children (subpágina según accion)
                 └─ MapView (lee accion, freeze/unfreeze)
```

### 3.2 Renderizado Condicional de Subpáginas (implementado en `dashboard/page.tsx`)

```typescript
switch (accion) {
  case "seleccion-area": return undefined    // sin panel lateral, solo mapa
  case "dimensiones":    return <Dimensions />
  case "informe":        return <Report />
  default:               return null
}
```

El SideBar recibe el resultado como `children` y lo muestra en un panel de `w-[25rem] bg-[#cce1eeff]` solo si `accion !== "seleccion-area"`.

### 3.3 Efecto sobre el Mapa

El `MapView` siempre está montado en el DOM. La transición de estado afecta su comportamiento:

| Transición | Efecto en MapView |
|-----------|-------------------|
| Entrar a `seleccion-area` | `unfreeze()` — limpia snapshot, reactiva DeckGL+MapLibre |
| Salir de `seleccion-area` | `freeze()` — captura canvas, muestra imagen estática |

Detalle completo en `docs/dev-notes/map-rendering.md`.

---

## 4. Estructura del SideBar — Implementado

### 4.1 Layout con Flex

```
SideBar (flex row, bg-[#165170ff])
  ├─ Panel de navegación (w-[10rem], flex-col justify-between)
  │    ├─ Sección superior
  │    │    ├─ "ACCIONES PRINCIPALES"
  │    │    │    ├─ Selección de área
  │    │    │    ├─ Dimensiones
  │    │    │    ├─ Características del proyecto
  │    │    │    └─ Informe de viabilidad
  │    │    └─ "Histórico de viabilidad"
  │    └─ Sección inferior (justify-between lo empuja abajo)
  │         ├─ "GESTIÓN Y AYUDA DE USUARIO"
  │         │    ├─ Configuraciones
  │         │    ├─ Manual de uso
  │         │    └─ Soporte
  │         └─ Email del usuario
  └─ Panel de contenido (w-[25rem], bg-[#cce1eeff]) — solo visible fuera de seleccion-area
       └─ {children} → Dimensions | Report | null
```

---

## 5. Pendiente de Implementar

### 5.1 Persistencia de Estado en Refresh

**Estado actual:** El estado vive en `useState` — un refresh del navegador reinicia a `"seleccion-area"`. No hay persistencia.

**Pendiente:**
- Decidir si persistir en `sessionStorage`, `localStorage` o URL params.
- Si se persiste, restaurar el estado al montar `AprincipalProvider`.
- Evaluar si los datos de configuración de dimensiones/características también deben persistirse entre fases.

### 5.2 Validación de Avance Condicional

**Estado actual:** El avance de `seleccion-area` → `dimensiones` siempre está permitido. Hay un TODO en `SideBar.tsx:28`:

```
// to DO: avanzar de seleccion de area solo si hay hexagonos selecionados
```

**Pendiente:**
- Bloquear avance si no hay hexágonos seleccionados en el mapa.
- Requiere que `MapView` comunique al contexto global qué hexágonos están seleccionados.
- Evaluar si extender `AccionPrincipalContext` o crear un contexto separado para selección.

### 5.3 Subpágina "Caracteristicas"

**Estado actual:** No hay componente `Caracteristicas` implementado. En `dashboard/page.tsx`, el case `"caracteristicas"` cae al `default: return null`.

**Pendiente:**
- Crear componente de configuración de características del proyecto (turbinas, capacidad MW, etc.).
- Definir qué datos recibe de la fase anterior (dimensiones configuradas).

### 5.4 Histórico de Viabilidad

**Estado actual:** El item "Histórico de viabilidad" existe en el SideBar como texto estático. No tiene `onClick` ni funcionalidad.

**Pendiente:**
- Decidir si es una fase adicional o una vista independiente (modal/drawer).
- Requiere almacenamiento de informes previos (actualmente no existe persistencia de informes).

### 5.5 Gestión y Ayuda de Usuario

**Estado actual:** Los items "Configuraciones", "Manual de uso" y "Soporte" existen como texto estático sin funcionalidad.

**Pendiente:**
- Definir qué configuraciones se exponen al usuario.
- Manual de uso: enlace externo o contenido in-app.
- Soporte: formulario, email directo o integración externa.

### 5.6 Autenticación y Email Real

**Estado actual:** El email está hardcodeado como `"test@gmail.com"` en `SideBar.tsx:34`. No hay flujo de login funcional (`login/page.tsx` está vacío).

**Pendiente:**
- Integración con Keycloak (ADR-005).
- Obtener email del usuario autenticado.
- Proteger ruta `/dashboard` para usuarios no autenticados.

### 5.7 Flujo de Datos entre Fases

**Estado actual:** Cada fase es independiente. No hay datos que fluyan de una fase a la siguiente.

**Pendiente:**
- `seleccion-area` → `dimensiones`: pasar hexágonos seleccionados y área geográfica.
- `dimensiones` → `caracteristicas`: pasar configuración de variables/pesos por dimensión.
- `caracteristicas` → `informe`: pasar todas las configuraciones para generar el informe de viabilidad.
- Evaluar si todo vive en el contexto global o en contextos separados por fase.

---

## 6. Archivos Involucrados

| Archivo | Estado | Responsabilidad |
|---------|--------|----------------|
| `Utils/AccionPrincipalContext.tsx` | Implementado | Estado global, tipo `Aprincipal`, provider y hook |
| `Providers.tsx` | Implementado | Composición de providers (actualmente solo AccionPrincipal) |
| `layout.tsx` | Implementado | Root layout, wrapping con Providers |
| `dashboard/page.tsx` | Implementado | Switch de subpáginas, composición SideBar + MapView |
| `Components/SideBar.tsx` | Implementado | Navegación secuencial, habilitación, layout flex |
| `Components/Map.tsx` | Implementado | Consume `accion` para freeze/unfreeze |
| `Components/Dimensions.tsx` | Implementado (datos estáticos) | 6 cards de dimensiones hardcodeadas |
| `Components/Report.tsx` | Implementado (datos estáticos) | 6 cards de informe hardcodeadas |
| `Components/Card.tsx` | Implementado | Card reutilizable (title + description) |
| `login/page.tsx` | Vacío | Pendiente: flujo de autenticación |
