# Vento

**Herramienta web para identificar dónde tiene sentido instalar parques eólicos en Colombia.**

Un convenio entre la **ANH** (Agencia Nacional de Hidrocarburos) y la **Universidad EAFIT**, desarrollado por **Mavalan Software**, para acelerar la transición energética del país.

> Este README es la **vista general del proyecto** — pensado para que cualquiera
> (técnico o no) entienda qué es Vento, cómo está organizado y dónde encontrar
> cada cosa. Los detalles técnicos viven en [`docs/`](docs/).

---

## ¿Qué es Vento?

Vento es una aplicación web que muestra un **mapa interactivo de Colombia** dividido en pequeños hexágonos. El usuario elige una zona, indica las características del proyecto eólico que imagina, y recibe un **informe de idoneidad**: qué tan buena es esa zona para generar energía eólica, con una calificación por cada dimensión (ambiental, técnica, social, económica).

| Pregunta | Respuesta |
|----------|-----------|
| **¿Qué problema resuelve?** | Decidir dónde instalar un parque eólico normalmente toma semanas y obliga a cruzar datos de muchas fuentes. Vento reúne todo en un solo mapa. |
| **¿Para quién es?** | Analistas de energía, investigadores y tomadores de decisiones de la ANH y EAFIT. |
| **¿Qué muestra el mapa?** | Un mapa de calor: las zonas amarillas son las más aptas, las moradas las menos aptas. |
| **¿Qué evalúa?** | Una calificación general que combina 3 dimensiones puntuables — Ambiental, Técnica y Social (+ económica y Regulatoria, informativas). |
| **¿De dónde salen los datos?** | El equipo de investigación de EAFIT/ANH genera los datos ya procesados; Vento los muestra sobre el mapa. |

---

## ¿Cómo se usa?

El usuario avanza por cuatro pasos, en orden, desde el menú lateral:

```
1. Iniciar sesión (institucional)
        │
        ▼
2. Seleccionar el área en el mapa (en tierra o en el mar)
        │
        ▼
3. Elegir qué dimensiones y variables analizar
        │
        ▼
4. Indicar las características del proyecto (capacidad, tipo de aerogenerador)
        │
        ▼
   ➜ Informe de idoneidad (mapa de calor + calificaciones + descarga en PDF)
```

Se puede volver libremente a un paso anterior para ajustar la selección.

📖 Guía paso a paso para el usuario final: **[Manual de usuario](docs/manual-usuario.md)**.

---

## Estado del proyecto

| Etapa | Estado | En breve |
|-------|--------|----------|
| **Scope 1** — Acceso + Mapa + Administración | 🟢 Entregado | Login institucional, mapa de hexágonos y gestión de usuarios, funcionando en producción. |
| **Scope 2** — Flujo completo de idoneidad | 🟢 Entregado | Selección de área, variables, características e informe con PDF. |
| **Tercera entrega** — Feedback v2 + catálogo definitivo | 🟢 Entregado (modo template) | Catálogo definitivo de variables, informe (previsualización a pantalla completa, captura del mapa, PDF, disclaimer, fuentes), emplazamiento mar/tierra, histórico. Valores reales del modelo pendientes. |
| **Datos reales del modelo** | 🟠 Pendiente (externo) | Hoy el mapa usa datos de ejemplo; el equipo de investigación entregará los datos definitivos. |
| **Notificaciones por correo** | 🔴 Bloqueado (externo) | A la espera de que el cliente provea el servidor de correo (SMTP). |

Estado detallado, historia por historia: [`docs/project-status.md`](docs/project-status.md).

---

## Estructura del proyecto

El repositorio junta el software, su documentación y los entregables al cliente:

```
AppVento/
├── README.md              → Este archivo: la vista general del proyecto
│
├── Vento/                 → El software (frontend web, Next.js)
│   └── README.md            · Cómo levantar el proyecto en tu computador
│
├── docs/                  → Toda la documentación técnica y del proyecto
│   ├── README.md            · Índice maestro: por dónde empezar según tu rol
│   ├── manual-usuario.md    · Guía para el usuario final del software
│   ├── stories/             · Qué se construye (historias, scopes, feedback, sprints)
│   ├── adr/                 · Decisiones de arquitectura (ADRs)
│   ├── architecture/        · Arquitectura del sistema y del stack
│   ├── testing/             · Cómo se prueba el software y cómo replicar las pruebas
│   ├── dev-notes/           · Notas técnicas de cómo funciona por dentro
│   ├── ops/ · infra/        · Cómo se despliega y opera (servidores, Keycloak)
│   └── security/            · Cómo funciona el inicio de sesión y la protección de rutas
│
├── Reportes_Entregas/     → Entregables formales al cliente (informes de cierre por fase)
│
└── infra/                 → Configuración de Keycloak (identidad / login)
```

El **backend** (el servidor que procesa y sirve los datos, hecho en Python/FastAPI) vive en un **repositorio aparte** (`AppVento---Backend`).

---

## ¿Dónde encuentro…?

| Quiero… | Ir a |
|---------|------|
| **Levantar el proyecto en mi computador** | [`Vento/README.md`](Vento/README.md) |
| **Entender la documentación (soy dev nuevo, PM o stakeholder)** | [`docs/README.md`](docs/README.md) — índice maestro |
| **Usar el software como usuario final** | [Manual de usuario](docs/manual-usuario.md) |
| **Ver qué se entregó al cliente en cada fase** | [`Reportes_Entregas/`](Reportes_Entregas/) |
| **Saber qué se está construyendo ahora** | [`docs/stories/`](docs/stories/) |
| **Entender una decisión técnica** | [`docs/adr/`](docs/adr/) — registros de decisiones |

---

## Equipo y contexto

| Aspecto | Detalle |
|---------|---------|
| **Convenio** | ANH — Universidad EAFIT |
| **Desarrollo** | Mavalan Software |
| **Fase** | Fase 2 (desarrollo de la herramienta SIG), con criterios hacia Fase 3 |
| **Metodología** | Ágil, con apoyo del framework BMAD para planificación asistida por IA |

---

## Glosario mínimo

| Término | En palabras simples |
|---------|---------------------|
| **SIG** | Sistema de Información Geográfica — un mapa que además guarda datos por cada zona. |
| **Hexágono / H3** | Colombia se divide en pequeños hexágonos; cada uno es una zona con su propia calificación. |
| **Idoneidad** | Qué tan apta es una zona para un proyecto eólico — un primer análisis antes de estudios costosos (antes "prefactibilidad"). |
| **Onshore / Offshore** | En tierra firme (onshore) o en el mar (offshore). |
| **Aerogenerador** | La turbina eólica — el "molino" que genera la energía. |
| **Mapa de calor (Viridis)** | La escala de color del mapa: amarillo = zona muy apta, morado = poco apta. |

> ¿Buscas el glosario técnico completo (H3, OIDC, WLC, tile-based, etc.)?
> Está en el [índice maestro de documentación](docs/README.md#glosario).
