---
proyecto: Vento
sprint: 4 (Cuarta Entrega)
inicio: 2026-09-02
---

# Plan de ejecución — Sprint 4

Objetivo del plan: **meter la semana de feedback DENTRO del sprint** (lo que faltó
en Sprint 3, donde los requisitos llegaron 2 semanas antes del cierre y hubo que
negociar el doc fuera del sprint).

## Cronograma — 1 mes (2-sep → 1-oct-2026, días laborales)

| Fase | Fechas | Qué |
|---|---|---|
| **1 · Front + deploy a test** | **2 – 10 sep** | Completar Ola 3, `fix:` de part-time (US09-03/04), `tsc` + `vitest` + QA-04, resolver 404 auth → **deploy a test** (`USE_BACKEND=false`). |
| **2 · Backend** | **10 – 17 sep** | Contra el contrato (`docs/api/*`) + reuniones con áreas para definir fuentes (agenda = `docs/spec/datos-requeridos.md`). |
| **3 · Recolección de feedback** | **17 – 23 sep** | **Responsabilidad del cliente/áreas**: prueban la app en test y recolectan feedback. **Nosotros: asistimos a las reuniones y aplicamos hotfixes** (arreglos puntuales que surjan). |
| **4 · Aplicar feedback (nosotros)** | **23 – 30 sep** | Aplicar el feedback recolectado, **time-boxed**. |
| **5 · Revisión** | **1 oct** ⚠️ | Revisión/cierre. (Nota: septiembre **no tiene 31**; "el 31" = **1-oct**.) |

> Clave anti-Sprint-3: el front sale a **test en la 1ª semana**, así la superficie de feedback existe antes de la fase de recolección — el feedback se recoge y aplica **dentro** del sprint, sin negociar fuera.

**Roles en la Fase 3 (17–23 sep):** la recolección es del cliente/áreas; nosotros
damos soporte (reuniones + **hotfixes** puntuales). El grueso del feedback se aplica
en la Fase 4 (23–30 sep).

**Regla anti-Sprint-3:** en la Fase 3 el scope está **congelado**; solo entra lo
que quepa. Lo estructural o negociable se **documenta** y va a negociación / otro
sprint — no se traga a última hora.

---

## Aclaración: HU "Ingresar/actualizar variables y datasets" (US08-01)

Correcto: **NO consume la master** — es el lado de **ingesta** (subir/actualizar
datos), que *alimenta* la master. Solo necesita el **backend** (para persistir lo
que se sube), no que la master ya esté entregada. Lo que sí necesita la master es
la **consumición** (mapa, scores, valores del informe).

---

## Si el sprint cierra SIN que lleguen los datos: ¿qué queda cómo?

### A. Se puede **subir por la app** (admin) — necesita backend, no la master
Editable por el usuario admin en `/admin/*` (persistente con backend; hoy template en memoria):
- **Variables informativas**: crear / habilitar / deshabilitar / ver en mapa-menú / editar detalle.
- **Datasets**: actualizar el dataset de una variable (subir datos → alimenta la master).
- **Normas** regulatorias (CRUD + estado).
- **Escenarios** económicos (CRUD).

### B. Queda **en código** (lo cambia un dev, no hay UI)
- **Pesos AHP** por variable y por dimensión (`variableWeights`).
- **Geometría de capas del mapa** por variable (`mapSymbols` — coords template).
- **Fórmula/serie económica** (`economicScenarios`) y **impuestos clave**.
- **Rangos área↔capacidad** (`areaRangeForCapacity`) y **specs de aerogenerador** (`AEROGENERADORES`).
- **Descripción / cómo se calcula / relevancia / rango** por variable (`variableDetails`).
- **Normalización** de variables, **disclaimer** (`reportTemplates`), **fuentes+versión** (`reportSources`).
> (Si se quisiera, algunos de estos podrían pasar a admin en un sprint futuro; hoy son código.)

### C. Queda **MAL CALCULADO** sin datos (⚠️ se ve real pero es inventado)
Todo lo que se deriva de la master. Con `USE_BACKEND=false` el front usa
**placeholder determinista** → **parece real pero es fake**:
- **Score general** e **índice de viabilidad** (gauge).
- **Score por dimensión** y el **mapa de calor**.
- **Valor por variable / promedio del área** (tabla del informe + tabla cruda por hex).
- **Zonas excluidas** (`tipo_celda`) y **offshore/onshore** (`es_offshore`).
- **Nº de aerogeneradores** (usa specs placeholder → aproximado).
- **Alerta área vs capacidad** (rangos placeholder → aproximada).
- **Proyección económica** (serie template determinista → no real).

**Riesgo a comunicar al cliente:** la categoría **C se muestra con datos
plausibles pero FALSOS**. Antes de un uso "real" (no demo) hay que entregar la
master y los pesos, o marcar visiblemente que son datos de demostración.

---

## Qué comunicar al cliente
1. El **cronograma** de arriba (con la semana de feedback incluida).
2. Que traigan a las **reuniones de la Fase 2** el doc `datos-requeridos.md` para definir de dónde sale cada dato (categorías B y C).
3. Que la **categoría C** es demo hasta que lleguen master + pesos.
