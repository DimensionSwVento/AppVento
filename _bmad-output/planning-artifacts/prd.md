---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: ['docs/project_knowledge.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 1
classification:
  projectType: web_app
  domain: energy_scientific
  complexity: high
  projectContext: greenfield
---

# Product Requirements Document - Vento-

**Author:** mavalan Software
**Date:** 2026-03-24

## Executive Summary

Vento es una plataforma web de análisis geoespacial que permite evaluar la idoneidad de proyectos de energía eólica en Colombia. Integra datos de múltiples dimensiones — técnica, ambiental, regulatoria, socioeconómica y económica — sobre un mapa interactivo basado en hexágonos H3, eliminando un proceso que hoy se realiza de forma manual, fragmentada y costosa.

La plataforma está dirigida a analistas del sector energético, tomadores de decisiones de inversión, investigadores y entidades gubernamentales que necesitan identificar zonas con potencial eólico de manera rápida y fundamentada. Vento centraliza la información dispersa en una única fuente de verdad geoespacial, reduciendo el tiempo de evaluación de semanas a segundos.

El proyecto es desarrollado con respaldo institucional de la Universidad EAFIT y la Agencia Nacional de Hidrocarburos (ANH), en el marco de la fase 2-3 de un proyecto de investigación que busca impulsar la transición energética en Colombia.

### What Makes This Special

No existe hoy una herramienta que consolide todas las dimensiones de idoneidad eólica en Colombia en una sola plataforma con visualización geoespacial interactiva. Las alternativas actuales requieren dominio de herramientas SIG complejas (QGIS, ArcGIS), acceso a múltiples fuentes de datos dispersas, y semanas de trabajo manual para producir un informe de idoneidad.

Vento democratiza el acceso al análisis multicriterio: un profesional sin experiencia en SIG puede seleccionar un área en el mapa, visualizar scores de idoneidad por dimensión, filtrar por variables críticas y obtener un análisis integrado. El motor multicriterio (MCDM) — desarrollado por el equipo científico — alimenta la plataforma con datos pre-procesados en formato H3, garantizando precisión geoespacial estandarizada y reproducibilidad.

El momento es ahora porque Colombia tiene potencial eólico sin explotar, hay apetito de inversión en energías renovables, y los datos e investigación científica ya existen — falta la herramienta que los haga accesibles para la toma de decisiones.

## Project Classification

| Aspecto | Clasificación |
|---------|---------------|
| **Tipo de proyecto** | Web App (SPA — Angular/React + Leaflet + H3) |
| **Dominio** | Energía + Científico (análisis multicriterio geoespacial para idoneidad eólica) |
| **Complejidad** | Alta — dominio regulado (energía/gobierno), datos geoespaciales complejos (H3, .parquet), múltiples stakeholders (universidad, agencia gubernamental, +50 personas en datos) |
| **Contexto** | Greenfield — producto nuevo, sin código existente |

## Success Criteria

### User Success

- Un analista puede visualizar el mapa de calor de idoneidad eólica de Colombia en menos de 5 segundos tras iniciar sesión
- El usuario puede filtrar el mapa por cualquier variable crítica y entender la distribución territorial de esa variable sin asistencia técnica ni conocimiento de SIG
- Al hacer click en un hexágono, el usuario obtiene información inmediata del score y variables secundarias — sin necesidad de consultar fuentes externas
- Los hexágonos excluidos son visualmente claros, eliminando confusión sobre qué zonas son analizables
- El momento "aha!": ver por primera vez el territorio colombiano coloreado por idoneidad eólica y poder explorar dimensión por dimensión con un click

### Business Success

- La primera entrega es aceptada por los stakeholders institucionales (Universidad EAFIT y ANH) como base funcional del proyecto
- La plataforma demuestra que los datos del motor multicriterio pueden ser consumidos y visualizados correctamente en un entorno web accesible
- Se valida la idoneidad técnica del stack (H3 + Leaflet + Keycloak + Clean Architecture) para soportar las entregas futuras (reportes, MCDM interactivo, análisis marítimo)
- El equipo de +50 personas en datos puede verificar que sus datos se representan correctamente en la plataforma

### Technical Success

- Renderizado de ~30,000 hexágonos H3 sin degradación perceptible de rendimiento (Canvas renderer)
- Re-renderizado del mapa de calor al cambiar variable en <2 segundos
- Autenticación via Keycloak OIDC funcional con roles admin/analista
- Pipeline CI ejecutando lint, type-check, tests y audit de seguridad en cada push
- Backend con Clean Architecture + DDD donde el dominio no importa de infraestructura
- Cache de datos geoespaciales funcional (segunda visita sin re-descarga)

### Measurable Outcomes

| Métrica | Target | Método de medición |
|---------|--------|--------------------|
| Carga inicial del mapa con hexágonos | <5 segundos | Performance testing en navegador |
| Re-renderizado al cambiar filtro | <2 segundos | Performance testing |
| Cobertura de tests unitarios (backend) | >70% | CI pipeline |
| Disponibilidad del sistema (dev/staging) | >95% | Monitoreo Docker |
| Datos del .parquet representados correctamente | 100% hexágonos renderizados | Validación script vs. mapa |

## Product Scope

### MVP — Primera Entrega (18 historias)

**Fundación (E0):** Monorepo, variables de entorno, backend Clean Architecture + DDD, Keycloak, pipeline CI

**Login y Auth (E1):** Login via Keycloak OIDC, protección de rutas autenticadas

**Mapa SIG (E2):** Mapa base Colombia, renderizado hexágonos H3, ingesta .parquet → JSON, mapa de calor por score general, filtrado por variable, popup informativo, hexágonos decorativos, dato central visible, panel de control con leyenda y selector, cache de datos geoespaciales, metadata de variables

**Admin (E3):** CRUD de usuarios via Keycloak

### Growth Features (Post-MVP)

- Selección multi-hexágono para definir áreas de análisis territorial
- Generación de informes de idoneidad del área seleccionada (<30 segundos)
- Descarga de informes en PDF
- Historial de informes con opción de ver análisis previos
- Backend API REST completo (FastAPI) con endpoints públicos
- Sistema de roles y permisos avanzado

### Vision (Futuro)

- Integración completa del modelo multicriterio (MCDM) con configuración interactiva de variables por dimensión
- Análisis de variables en áreas marítimas (offshore)
- Análisis de sensibilidad con variación de pesos
- Comparación de escenarios entre zonas
- Metodología TOPSIS integrada

## User Journeys

### Journey 1: Carolina — Analista de idoneidad Eólica (Happy Path)

**Quién es:** Carolina es ingeniera ambiental y trabaja como consultora para una empresa de energía que evalúa proyectos de inversión eólica en Colombia. Necesita identificar zonas viables rápidamente para presentar recomendaciones a inversores.

**Opening Scene:** Carolina recibe una solicitud urgente: evaluar si la zona norte del Cesar tiene potencial eólico viable para un parque de 50MW. Normalmente esto le tomaría una semana cruzando datos de viento, regulación, uso de suelo y factores socioeconómicos en Excel y QGIS.

**Rising Action:** Carolina accede a Vento, se autentica con su correo via Keycloak y llega al mapa interactivo. Ve Colombia coloreada por score general de idoneidad — inmediatamente nota que la zona del Cesar tiene tonos cálidos. Hace zoom, filtra por la dimensión técnica para verificar velocidad de viento. Cambia a dimensión regulatoria para confirmar que no hay restricciones. Hace click en hexágonos específicos y lee los scores detallados y variables secundarias en el popup.

**Climax:** En 10 minutos, Carolina tiene una visión clara de la idoneidad multidimensional de la zona — algo que antes le tomaba días. Puede ver exactamente qué hexágonos son viables, cuáles están excluidos y por qué.

**Resolution:** Carolina presenta una recomendación preliminar fundamentada a su cliente el mismo día. La información es trazable (origen y vigencia de cada variable) y respaldada institucionalmente.

---

### Journey 2: Carolina — Analista en Zona Sin Datos (Edge Case)

**Opening Scene:** Carolina necesita evaluar una zona costera del Pacífico. Accede al mapa y hace zoom.

**Rising Action:** Al llegar a la zona, ve que la mayoría de hexágonos están en gris (decorativos/excluidos). Intenta hacer click pero no hay interacción — entiende inmediatamente que no hay datos disponibles para esa área. Cambia al panel de control y filtra por diferentes variables, pero la zona sigue sin cobertura.

**Climax:** Carolina entiende que la zona no está cubierta por el modelo multicriterio actual. No hay ambigüedad — los hexágonos decorativos le indican claramente los límites de los datos.

**Resolution:** Carolina reporta a su cliente que la zona requiere estudio de campo adicional, y orienta su búsqueda hacia zonas donde sí hay cobertura del modelo. No perdió tiempo intentando interpretar datos inexistentes.

---

### Journey 3: Profesor Ramírez — Administrador del Sistema (Universidad)

**Quién es:** El profesor Ramírez coordina el proyecto desde EAFIT. Es responsable de gestionar quién tiene acceso a la plataforma — investigadores, estudiantes de posgrado, y personal de la ANH.

**Opening Scene:** Un nuevo grupo de 5 investigadores del equipo de datos necesita acceso a Vento para validar que sus variables se representan correctamente en el mapa.

**Rising Action:** Ramírez inicia sesión con su rol de administrador. Accede al panel de gestión de usuarios y crea las 5 cuentas con rol "analista". Verifica en el listado que los usuarios aparecen activos. Uno de los investigadores reporta que no puede acceder — Ramírez busca su correo en la tabla, ve que el estado es activo, y le indica que revise su correo de verificación de Keycloak.

**Climax:** Los 5 investigadores acceden al mapa y comienzan a validar que los hexágonos reflejan correctamente los datos de su .parquet. Reportan que todo coincide.

**Resolution:** Ramírez tiene control claro de quién accede a la plataforma. Cuando un estudiante termina su pasantía, lo desactiva desde el panel. El proceso es simple y no requiere intervención técnica.

---

### Journey 4: Dr. Muñoz — Investigador del Equipo de Datos

**Quién es:** El Dr. Muñoz forma parte del equipo de +50 personas que construye el motor multicriterio. Es experto en variables técnicas de viento y necesita verificar que los datos que entregó en el .parquet se visualizan correctamente.

**Opening Scene:** El equipo de datos acaba de entregar una nueva versión del .parquet con scores actualizados para la dimensión técnica. Muñoz necesita validar que la plataforma refleja los cambios.

**Rising Action:** Muñoz inicia sesión como analista. Va al mapa de calor con score general y compara visualmente con sus resultados esperados. Filtra por la variable "velocidad de viento" y verifica que los rangos de color corresponden a los valores que conoce. Hace click en hexágonos específicos donde sabe que los valores cambiaron y revisa el popup con score y variables secundarias. Consulta la metadata de la variable para confirmar vigencia y origen.

**Climax:** Muñoz confirma que los datos se ingestan y visualizan correctamente. Detecta un hexágono donde el score parece anómalo, toma nota del H3 index del popup para reportarlo al equipo de procesamiento.

**Resolution:** El ciclo de validación datos → plataforma funciona. El equipo de datos puede confiar en que lo que entregan en el .parquet es lo que los analistas ven en pantalla.

---

### Journey Requirements Summary

| Journey | Capacidades reveladas |
|---------|----------------------|
| **Carolina - Happy Path** | Login OIDC, mapa de calor, filtrado por variable, popup con scores, hexágonos interactivos, leyenda, panel de control, metadata trazable |
| **Carolina - Edge Case** | Hexágonos decorativos claros, estados de "sin datos", UX que comunica límites sin confusión |
| **Prof. Ramírez - Admin** | CRUD usuarios, asignación de roles, búsqueda de usuarios, activar/desactivar cuentas, panel admin protegido por rol |
| **Dr. Muñoz - Investigador** | Validación visual de datos, filtrado por variable específica, popup detallado con H3 index, metadata de variables (origen, vigencia), consistencia datos→visualización |

## Domain-Specific Requirements

### Compliance y Regulatorio

- **Datos gubernamentales:** Los datos provienen parcialmente de fuentes gubernamentales (ANH). La plataforma debe garantizar trazabilidad del origen y vigencia de cada variable para cumplir con estándares de reproducibilidad científica
- **Acceso abierto a profesionales:** Por decisión de negocio (ADR-005), el acceso NO se restringe a dominio institucional. Cualquier profesional con correo válido puede registrarse — esto amplía el alcance pero requiere que los datos mostrados sean públicos o autorizados para distribución
- **Propiedad intelectual:** El motor multicriterio (MCDM) es propiedad del proyecto de investigación EAFIT/ANH. La plataforma consume datos pre-procesados pero no expone el modelo ni sus algoritmos internos
- **Publicación científica:** Los resultados del proyecto pueden derivar en publicaciones científicas. La integridad y reproducibilidad de los datos visualizados es requisito del contexto académico

### Restricciones Técnicas del Dominio

- **Precisión geoespacial:** El sistema H3 a resolución 5-6 define la granularidad del análisis (~4,500-31,000 hexágonos). La precisión está limitada por la resolución elegida — no es análisis a nivel de parcela
- **Datos estáticos vs dinámicos:** En primera entrega, los datos se sirven como JSON estático pre-procesado desde .parquet. No hay consultas en tiempo real al motor multicriterio. La actualización de datos requiere re-ejecución del script de ingesta
- **Volumen de datos:** ~30,000 hexágonos con múltiples variables por hexágono. El rendimiento del Canvas renderer de Leaflet es crítico — si se degrada, la plataforma pierde utilidad
- **Esquema de variables:** Las variables se clasifican como excluyentes (binarias), de decisión (graduadas), informativas (contexto) y penalizantes (fricción). Esta taxonomía debe respetarse en la visualización

### Integración con Ecosistema de Datos

- **Motor multicriterio (externo):** Desarrollado offline por el equipo científico. Entrega archivos .h3.parquet. La plataforma NO ejecuta el modelo — solo consume y visualiza resultados
- **Pipeline de datos unidireccional:** .parquet → script Python → JSON/GeoJSON → frontend. No hay flujo de vuelta desde la plataforma hacia el motor
- **Actualización manual:** Cuando el equipo de datos entrega nueva versión del .parquet, se re-ejecuta el script de ingesta. Proceso documentado pero no automatizado en primera entrega
- **Dimensiones del modelo:** 5 dimensiones (Técnica, Ambiental, Regulatoria, Socioeconómica, económica) con ~46 variables tentativas en la dimensión técnica. La plataforma debe ser flexible para incorporar nuevas variables sin rediseño

### Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Rendimiento con ~30K hexágonos | Mapa inutilizable si hay lag | Canvas renderer + validación en spike técnico (semana 1) |
| Formato .parquet cambia sin aviso | Ingesta falla, datos corruptos | Validación de esquema en script Python (conteo, rangos, nulos) |
| Datos sensibles expuestos a usuarios no autorizados | Riesgo reputacional/legal | Keycloak OIDC + rutas protegidas + roles admin/analista |
| Motor multicriterio no entrega a tiempo | Primera entrega sin datos reales | Datos de prueba/mock para desarrollo; integración real cuando esté disponible |
| Storage definitivo no decidido (S3 vs BD) | Arquitectura atada a decisión futura | Cache frontend como capa intermedia (ADR-006); backend preparado para ambos escenarios |

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Democratización del análisis geoespacial multicriterio:** La combinación de sistema H3 + mapa de calor multidimensional + interfaz web accesible elimina la dependencia de herramientas SIG profesionales (QGIS, ArcGIS) que requieren entrenamiento especializado
- **Integración de 5 dimensiones en una sola visualización:** No se conoce una herramienta en Colombia que permita visualizar y filtrar idoneidad eólica cruzando dimensiones técnica, ambiental, regulatoria, socioeconómica y económica sobre un mismo mapa interactivo
- **Modelo de datos H3 como unidad estándar:** Usar hexágonos H3 como unidad territorial estandarizada permite que diferentes fuentes de datos (de diferentes equipos y formatos) se integren en una misma grilla geoespacial, habilitando comparaciones y análisis consistentes

### Market Context & Competitive Landscape

- **Herramientas existentes (internacionales):** Global Wind Atlas (DTU/World Bank) ofrece visualización de recursos eólicos pero sin análisis multicriterio. WindPRO y WAsP son herramientas de diseño de parques, no de idoneidad territorial multicriterio
- **En Colombia:** No existe una plataforma pública que combine datos de viento con restricciones regulatorias, ambientales y socioeconómicas en una interfaz web. Los estudios existentes usan metodologías ad-hoc con SIG de escritorio
- **Brecha que Vento llena:** El espacio entre "datos científicos en archivos" y "decisión de inversión informada" — accesible sin ser experto en SIG

### Validation Approach

- **Spike técnico (semana 1):** Validar que H3 + Leaflet + Canvas renderer soporta ~30K hexágonos con datos reales del .parquet
- **Validación con equipo de datos:** +50 investigadores verifican que la visualización refleja correctamente sus datos
- **Aceptación institucional:** EAFIT y ANH aprueban la primera entrega como base funcional del proyecto

### Risk Mitigation

| Innovación | Riesgo | Fallback |
|------------|--------|----------|
| H3 + Leaflet a escala Colombia | Rendimiento insuficiente con ~30K hexágonos | Migrar a Deck.gl o MapLibre (documentado en spike) |
| Visualización multicriterio en web | Usuarios no entienden los scores/colores | UX con leyenda clara, tooltips, y documentación de variables |
| Datos estáticos pre-procesados | Limitación percibida vs. análisis dinámico | Arquitectura preparada para migrar a API/BD (ADR-006) |

## Web App — Requisitos Específicos

### Project-Type Overview

Vento es una SPA (Single Page Application) con interacción intensiva sobre un mapa geoespacial. No requiere SEO ni indexación pública (acceso tras login). El foco técnico está en rendimiento de renderizado de mapa, experiencia de filtrado fluida, y diseño responsivo para pantallas de escritorio.

### Technical Architecture Considerations

**Navegadores soportados:**

| Navegador | Versión mínima | Notas |
|-----------|---------------|-------|
| Chrome | Últimas 2 versiones | Navegador principal de desarrollo |
| Firefox | Últimas 2 versiones | Soporte completo |
| Edge | Últimas 2 versiones (Chromium) | Soporte completo |
| Safari | No requerido | Fuera de alcance primera entrega |
| Móvil | No requerido | Fuera de alcance primera entrega |

**Responsive Design:**
- Optimizado para pantallas de escritorio (≥1280px) — el mapa interactivo es el core de la experiencia
- Mínimo funcional en tablets (≥768px) para presentaciones
- Móvil fuera de alcance para primera entrega

**Performance Targets:**

| Métrica | Target | Contexto |
|---------|--------|----------|
| Carga inicial (mapa + hexágonos) | <5 segundos | ~30K hexágonos via Canvas renderer |
| Re-renderizado al cambiar filtro | <2 segundos | Cambio de variable en mapa de calor |
| Time to Interactive (TTI) | <3 segundos | Después de login, llegar al mapa usable |
| Tamaño JSON de datos | <10MB | Asset estático pre-procesado del .parquet |
| Cache hit (segunda visita) | 0 segundos descarga | Service Worker + HTTP Cache |

**SEO:** No requerido. Toda la funcionalidad está detrás de autenticación Keycloak.

**Accesibilidad (WCAG):**
- Fuera del alcance directo del equipo de desarrollo — la accesibilidad del contenido científico y del modelo multicriterio es responsabilidad del equipo de datos
- Buenas prácticas básicas de accesibilidad web sí se aplican: contraste de colores adecuado, navegación por teclado donde sea posible, textos alternativos en elementos críticos

### Frescura y Vigencia de Datos

- Los datos del modelo multicriterio provienen de estudios que pueden tardar meses (suelos, leyes, variables ambientales). No hay datos en tiempo real
- Cada variable debe mostrar su metadata de vigencia (fecha/periodo de los datos) y origen (fuente) para que el usuario sepa qué tan recientes son
- La plataforma debe comunicar claramente cuándo fue la última actualización del dataset completo

### Implementation Considerations

- **Framework:** Angular 17+ o React (pendiente decisión con equipo — ADR-001)
- **Herramienta monorepo:** Turborepo (si React) o Nx (si Angular) — ADR-007
- **Mapa:** Leaflet con Canvas renderer para rendimiento con ~30K polígonos
- **Auth:** keycloak-js u oidc-client-ts para integración OIDC
- **State management:** Necesario para manejar estado del mapa (variable seleccionada, hexágonos visibles, filtros activos, datos cacheados)
- **Build:** Optimización de bundle size crítica — los datos JSON del mapa son el asset más pesado

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — entregar la capacidad mínima que permite a un analista visualizar y explorar idoneidad eólica en Colombia sin herramientas SIG externas.

**Resource Requirements:** 1 desarrollador fulltime + 2 part-time, plazo 1 mes. Stack: Angular/React + Leaflet + Node.js (Clean Architecture) + PostgreSQL + Keycloak.

### MVP Feature Set (Phase 1 — Primera Entrega, 18 historias)

**Core User Journeys Supported:**
- Carolina (analista) — happy path: login → mapa de calor → filtrar variable → popup hexágono → explorar territorio
- Carolina (analista) — edge case: zonas sin datos (hexágonos decorativos)
- Prof. Ramírez (admin) — gestión básica de usuarios
- Dr. Muñoz (investigador) — validación visual de datos

**Must-Have Capabilities (🔴 Críticas):**
- Infraestructura: monorepo, backend Clean Architecture + DDD, Keycloak, pipeline CI
- Auth: login OIDC via Keycloak, protección de rutas
- Mapa: mapa base Colombia, renderizado ~30K hexágonos H3, mapa de calor por score, filtrado por variable, popup informativo, ingesta .parquet → JSON

**Should-Have (🟡 Alta — necesarias pero no bloqueantes):**
- Variables de entorno, hexágonos decorativos, dato central en hexágono, panel de control (leyenda + selector), cache de datos geoespaciales

**Nice-to-Have (🟢 Media — posponibles si hay presión de tiempo):**
- Metadata de variables, CRUD de usuarios integrado en Vento (Keycloak admin console como fallback)

### Post-MVP Features

**Phase 2 — Growth (Entregas futuras cercanas):**
- Selección multi-hexágono para definir áreas de análisis territorial
- Generación de informes de idoneidad (<30 segundos)
- Descarga de informes en PDF
- Historial de informes
- Backend API REST completo (FastAPI) con endpoints públicos
- Sistema de roles y permisos avanzado

**Phase 3 — Expansion (Visión a largo plazo):**
- Integración completa del MCDM con configuración interactiva de variables por dimensión
- Análisis de áreas marítimas (offshore)
- Análisis de sensibilidad con variación de pesos
- Comparación de escenarios entre zonas
- Metodología TOPSIS integrada

### Risk Mitigation Strategy

**Technical Risks:**
- Riesgo mayor: rendimiento de ~30K hexágonos en Leaflet Canvas. Mitigación: spike técnico en semana 1; fallback a Deck.gl/MapLibre documentado
- Riesgo secundario: formato .parquet cambie sin aviso. Mitigación: validación de esquema en script Python

**Market Risks:**
- El MVP no incluye reportes ni MCDM interactivo — el valor percibido depende de que la visualización del mapa sea suficientemente útil por sí sola
- Mitigación: validación con equipo de datos (+50 personas) y stakeholders institucionales (EAFIT/ANH) durante el desarrollo

**Resource Risks:**
- Equipo pequeño (1+2 part-time) para 18 historias en 1 mes. Si hay retrasos, las historias 🟢 Media (metadata variables, CRUD integrado) se posponen — Keycloak admin console cubre la gestión de usuarios como fallback
- Decisiones técnicas pendientes (framework frontend, herramienta monorepo) pueden retrasar el arranque. Mitigación: reunión de decisiones arquitectónicas programada

## Functional Requirements

### Acceso y Autenticación

- **FR1:** Un usuario puede registrarse con correo electrónico general (no restringido a dominio institucional) via Keycloak
- **FR2:** Un usuario registrado puede iniciar sesión mediante flujo OIDC (Keycloak)
- **FR3:** Un usuario puede recuperar su contraseña mediante el flujo nativo de Keycloak
- **FR4:** El sistema redirige a usuarios no autenticados a la pantalla de login al intentar acceder a rutas protegidas
- **FR5:** El sistema redirige a login con mensaje "Sesión expirada" cuando el token OIDC ha expirado

### Visualización Geoespacial

- **FR6:** Un usuario autenticado puede visualizar un mapa interactivo de Colombia centrado con zoom apropiado
- **FR7:** El sistema renderiza hexágonos H3 (resolución 5-6) sobre el territorio colombiano usando datos pre-procesados
- **FR8:** Un usuario puede interactuar con el mapa: zoom (scroll/botones), paneo (drag)
- **FR9:** El sistema colorea los hexágonos como mapa de calor según el score general de idoneidad (promedio de las 5 dimensiones)
- **FR10:** El sistema muestra una leyenda con la escala de colores y valores min/max de la variable activa
- **FR11:** Cada hexágono activo muestra un valor numérico central correspondiente al dato que determina su color
- **FR12:** El valor numérico central se oculta en niveles de zoom alejados para evitar sobrecarga visual
- **FR13:** El sistema muestra un indicador de progreso mientras se cargan los hexágonos
- **FR14:** El sistema muestra un mensaje de error claro si falla la carga de datos

### Filtrado y Exploración de Datos

- **FR15:** Un usuario puede seleccionar una variable crítica específica desde un selector/dropdown
- **FR16:** Al seleccionar una variable, el mapa se re-renderiza usando los valores de esa variable en vez del score general
- **FR17:** Un usuario puede volver al modo score general desde el selector
- **FR18:** Un usuario puede hacer click en un hexágono activo para ver un popup con: score actual del mapa de calor, 2-3 variables secundarias importantes, e identificador H3
- **FR19:** El popup se cierra al hacer click fuera de él o en el botón de cerrar
- **FR20:** El popup no aparece en hexágonos excluidos/decorativos

### Hexágonos Excluidos

- **FR21:** El sistema renderiza hexágonos con tipo_celda="excluida" con estilo visual diferenciado (gris, opacidad reducida)
- **FR22:** Los hexágonos excluidos no son interactuables (sin click, sin popup)
- **FR23:** Los hexágonos excluidos no participan en cálculos ni en el mapa de calor

### Panel de Control

- **FR24:** El sistema muestra un panel de control visible con leyenda de colores y selector de variable
- **FR25:** El panel de control es colapsable/minimizable para no obstruir el mapa
- **FR26:** Al cambiar variable en el selector, se actualizan simultáneamente: mapa de calor, leyenda y datos centrales de hexágonos

### Trazabilidad de Datos

- **FR27:** Un usuario puede consultar la metadata de cada variable: fuente de origen y fecha/periodo de vigencia
- **FR28:** La metadata es accesible desde la interfaz (tooltip, panel lateral, o popup)
- **FR29:** El sistema comunica cuándo fue la última actualización del dataset completo

### Gestión de Usuarios (Admin)

- **FR30:** Un administrador puede crear nuevos usuarios
- **FR31:** Un administrador puede listar usuarios con búsqueda por nombre o correo
- **FR32:** Un administrador puede editar datos de un usuario (nombre, estado, rol)
- **FR33:** Un administrador puede desactivar o eliminar un usuario
- **FR34:** El panel de administración solo es accesible por usuarios con rol admin
- **FR35:** El sistema muestra error si se intenta crear usuario con correo duplicado

### Ingesta de Datos

- **FR36:** Un script Python convierte archivos .h3.parquet a JSON/GeoJSON con estructura: h3_index, scores, variables, tipo_celda, metadata
- **FR37:** El script valida integridad de datos: conteo de hexágonos, rangos de scores [0-1], ausencia de h3_index nulos/duplicados
- **FR38:** El JSON resultante se sirve como asset estático del frontend

### Cache y Performance

- **FR39:** El sistema cachea datos geoespaciales en el navegador via Service Worker
- **FR40:** En segunda visita, los datos se cargan desde cache local sin re-descarga
- **FR41:** Cuando hay datos nuevos (nuevo hash), el cache se invalida automáticamente
- **FR42:** El sistema muestra indicador visual cuando descarga datos nuevos vs. usa cache

## Non-Functional Requirements

### Performance

| NFR | Criterio | Contexto |
|-----|----------|----------|
| **NFR-P1** | Renderizado de ~30,000 hexágonos H3 sin degradación perceptible | Canvas renderer de Leaflet |
| **NFR-P2** | Carga inicial del mapa con hexágonos en <5 segundos | Primera visita, conexión estándar |
| **NFR-P3** | Re-renderizado del mapa al cambiar filtro de variable en <2 segundos | Cambio en selector de variable |
| **NFR-P4** | Time to Interactive (TTI) <3 segundos tras login | Redirección Keycloak → mapa usable |
| **NFR-P5** | JSON de datos geoespaciales <10MB | Tamaño del asset estático pre-procesado |
| **NFR-P6** | Segunda visita carga datos en 0 segundos de descarga | Service Worker + HTTP Cache |

### Security

| NFR | Criterio | Contexto |
|-----|----------|----------|
| **NFR-S1** | Autenticación basada en tokens OIDC stateless emitidos por Keycloak | No se almacenan sesiones en backend propio |
| **NFR-S2** | Rutas protegidas inaccesibles sin token OIDC válido | Frontend y backend validan token |
| **NFR-S3** | Backend rechaza peticiones sin token válido con 401 Unauthorized | Resource server OIDC |
| **NFR-S4** | Secretos y credenciales nunca en repositorio | .env en .gitignore, .env.example documentado |
| **NFR-S5** | Políticas de contraseña gestionadas por Keycloak (mínimo 8 caracteres, 1 mayúscula, 1 número) | Configuración del realm Keycloak |
| **NFR-S6** | Bloqueo temporal tras intentos fallidos de login gestionado por Keycloak | Brute-force protection nativo |
| **NFR-S7** | Audit de dependencias y scan de secretos en pipeline CI | npm audit + gitleaks en cada push |

### Reliability

| NFR | Criterio | Contexto |
|-----|----------|----------|
| **NFR-R1** | El sistema muestra estados de error claros cuando falle la carga de datos, conexión a BD o servicios externos | Sin pantallas en blanco |
| **NFR-R2** | Si Keycloak no está disponible, el sistema muestra mensaje de error informativo en vez de fallar silenciosamente | Dependencia externa crítica |
| **NFR-R3** | El script de ingesta Python valida la integridad del .parquet antes de generar el JSON | Prevención de datos corruptos |
| **NFR-R4** | El sistema es reproducible: misma entrada de datos = misma salida visual | Requisito de contexto científico |

### Integration

| NFR | Criterio | Contexto |
|-----|----------|----------|
| **NFR-I1** | Pipeline de datos unidireccional: .parquet → Python → JSON → frontend | No hay flujo de vuelta al motor MCDM |
| **NFR-I2** | Backend se integra con Keycloak como resource server (validación de tokens OIDC) | No auth propio |
| **NFR-I3** | Docker-compose levanta todos los servicios con un solo comando | Frontend + Backend + PostgreSQL + Keycloak |
| **NFR-I4** | Arquitectura preparada para migrar de datos estáticos a API/BD sin rediseño del frontend | ADR-006: storage definitivo pendiente |

### Deployment

| NFR | Criterio | Contexto |
|-----|----------|----------|
| **NFR-D1** | Todos los servicios ejecutan en contenedores Docker | Consistencia entre entornos |
| **NFR-D2** | Pipeline CI ejecuta lint + type-check + tests + build + audit en cada push | Branch protection en main y develop |
| **NFR-D3** | Mínimo 1 aprobación requerida antes de merge | Code review obligatorio |

## User Stories — Primera Entrega (MVP)

> Referencia detallada: `docs/spec/stories/scope-primera-entrega.md` (v2.0)
> Las siguientes historias están organizadas por épica y prioridad. Cada historia incluye criterios de aceptación explícitos.

---

### Épica 0: Fundación e Infraestructura

#### US-MONO — Estructura Monorepo del Proyecto
**Como** desarrollador del equipo,
**Quiero** tener el repositorio organizado como monorepo con estructura estandarizada,
**Para que** todos los miembros del equipo puedan desarrollar sobre una base consistente desde el día 1.

**Prioridad:** 🔴 Crítica | **ADR:** ADR-007 | **FRs:** Infraestructura base para todos los FRs

**Criterios de Aceptación:**
1. Repositorio organizado como monorepo con workspaces (npm/yarn/pnpm)
2. Estructura: `apps/web/` (frontend), `apps/api/` (backend), `packages/shared-types/`, `packages/h3-processor/`, `infra/`
3. Herramienta monorepo configurada (Turborepo si React, Nx si Angular)
4. `docker-compose up` levanta todos los servicios (frontend, backend, PostgreSQL+PostGIS, Keycloak)
5. Scripts compartidos desde la raíz: `dev`, `build`, `test`, `lint`
6. Tipos TypeScript compartidos entre frontend y backend via `packages/shared-types/`
7. Proyecto frontend inicializado con stack definido + Leaflet como dependencia
8. Configuración de linting y formateo

---

#### US-ENV — Variables de Entorno
**Como** desarrollador del equipo,
**Quiero** tener todas las variables de entorno documentadas y configuradas,
**Para que** el setup local sea reproducible y los secretos nunca se suban al repositorio.

**Prioridad:** 🟡 Alta | **ADR:** ADR-007 | **NFRs:** NFR-S4

**Criterios de Aceptación:**
1. `.env.example` en la raíz con todas las variables documentadas con comentarios descriptivos
2. Variables cubren: base de datos, Keycloak, aplicación, datos geoespaciales
3. `.env` incluido en `.gitignore`
4. Docker-compose consume variables desde `.env`
5. Valores de ejemplo funcionales para desarrollo local

---

#### US-DDD — Backend con Arquitectura Limpia y DDD
**Como** desarrollador del equipo,
**Quiero** implementar el backend siguiendo Clean Architecture y DDD,
**Para que** el dominio esté desacoplado de la infraestructura y sea testeable de forma independiente.

**Prioridad:** 🔴 Crítica | **ADR:** ADR-007 | **FRs:** Base para FR4, FR5, FR30-FR35

**Criterios de Aceptación:**
1. Backend estructurado: `domain/`, `application/`, `infrastructure/`, `shared/`
2. Capa domain: entidades (User, Hexagon), value objects (H3Index, Score), ports (interfaces de repositorio)
3. Capa application: casos de uso, DTOs
4. Capa infrastructure: implementaciones PostgreSQL, adapter Keycloak, controllers HTTP
5. Dependencias apuntan hacia adentro: domain no importa de infrastructure
6. Al menos un caso de uso completo con test unitario que NO requiere infraestructura
7. Endpoints: health check, proxy/cache datos geoespaciales, endpoints admin protegidos
8. Integración con Keycloak como resource server (validación tokens OIDC)
9. Esquema BD PostgreSQL+PostGIS con migraciones versionadas y usuario admin seed

---

#### US-KEY — Integración Keycloak como Proveedor de Identidad
**Como** usuario de la plataforma,
**Quiero** autenticarme mediante Keycloak (OIDC),
**Para que** el acceso sea seguro sin que el equipo de desarrollo construya un sistema de auth propio.

**Prioridad:** 🔴 Crítica | **ADR:** ADR-005 | **FRs:** FR1, FR2, FR3 | **NFRs:** NFR-S1, NFR-S5, NFR-S6

**Criterios de Aceptación:**
1. Keycloak desplegado como contenedor en docker-compose
2. Realm "vento" configurado con roles: `admin`, `analista`
3. Registro y login via formulario Keycloak (no desarrollo propio)
4. Frontend integrado con keycloak-js u oidc-client-ts
5. Backend valida tokens OIDC emitidos por Keycloak
6. Correo electrónico general (NO restringido a dominio institucional)
7. Recuperación de contraseña gestionada por Keycloak

---

#### US-CI — Pipeline CI Mínimo
**Como** desarrollador del equipo,
**Quiero** un pipeline CI que valide calidad en cada push,
**Para que** los errores se detecten temprano y el código en main/develop sea siempre estable.

**Prioridad:** 🟡 Alta | **ADR:** ADR-007 | **NFRs:** NFR-S7, NFR-D2, NFR-D3

**Criterios de Aceptación:**
1. GitHub Actions ejecuta en cada push y pull request
2. Stage de calidad: lint + type-check + tests unitarios
3. Stage de build: verificar que el proyecto compila correctamente
4. Stage de seguridad: audit de dependencias + scan de secretos (gitleaks)
5. Branch protection activo en `main` y `develop` — no push directo
6. Review obligatorio: mínimo 1 aprobación antes de merge
7. Pipeline documenta errores claramente cuando falla

---

### Épica 1: Login y Autenticación

#### US01 — Login de Usuario (via Keycloak)
**Como** usuario profesional del sector energético,
**Quiero** iniciar sesión en Vento con mi correo electrónico,
**Para que** pueda acceder al mapa de idoneidad eólica de forma segura.

**Prioridad:** 🔴 Crítica | **ADR:** ADR-005 | **FRs:** FR1, FR2, FR3

**Criterios de Aceptación:**
1. El frontend redirige a Keycloak para autenticación (flujo OIDC Authorization Code)
2. Usuarios se registran y logean con correo electrónico general
3. Recuperación de contraseña gestionada por Keycloak
4. Token OIDC almacenado de forma segura en el frontend
5. Redirección al mapa principal tras login exitoso
6. Credenciales incorrectas: Keycloak muestra error (no desarrollo propio)

---

#### US-AUTH-GUARD — Protección de Rutas Autenticadas
**Como** sistema de seguridad,
**Quiero** que las rutas protegidas sean inaccesibles sin autenticación,
**Para que** usuarios no autorizados no accedan a funcionalidad restringida.

**Prioridad:** 🔴 Crítica | **FRs:** FR4, FR5 | **NFRs:** NFR-S2, NFR-S3

**Criterios de Aceptación:**
1. Rutas protegidas (/mapa, /admin) redirigen a Keycloak si no hay token OIDC válido
2. Token expirado: redirección a login con mensaje "Sesión expirada"
3. Backend rechaza peticiones sin token válido (401 Unauthorized)
4. Guard implementado como middleware reutilizable en frontend y backend

---

### Épica 2: Mapa SIG Interactivo

#### US03 — Mapa Base + Renderizado Hexágonos H3
**Como** usuario analista,
**Quiero** ver un mapa interactivo de Colombia con hexágonos H3 superpuestos,
**Para que** pueda visualizar las unidades de análisis territorial desde el momento en que ingreso.

**Prioridad:** 🔴 Crítica | **FRs:** FR6, FR7, FR8, FR13, FR14 | **NFRs:** NFR-P1, NFR-P2, NFR-R1

**Criterios de Aceptación:**
1. Mapa base de Colombia centrado con zoom apropiado (OpenStreetMap o similar)
2. Soporta interacciones: zoom (scroll/botones), paneo (drag), responsivo
3. Hexágonos H3 (res 5-6, ~4,500-31,000) renderizados sobre el territorio usando Canvas renderer
4. Click en hexágono convierte a ID hexagonal H3
5. Hexágonos seleccionados se pintan con estilo diferenciado
6. Carga inicial <5s, sin lag al pan/zoom
7. Indicador de progreso/spinner mientras cargan hexágonos
8. Mensaje de error claro si falla la carga de datos

---

#### US03-AC6 — Ingesta de Datos .h3.parquet
**Como** desarrollador del equipo,
**Quiero** un script que convierta .h3.parquet a JSON/GeoJSON validado,
**Para que** el frontend pueda consumir los datos geoespaciales como asset estático.

**Prioridad:** 🔴 Crítica | **FRs:** FR36, FR37, FR38 | **NFRs:** NFR-R3, NFR-R4, NFR-I1

**Criterios de Aceptación:**
1. Script Python lee archivo .h3.parquet (pandas + pyarrow)
2. Convierte a JSON/GeoJSON con estructura: h3_index, scores, variables, tipo_celda, metadata
3. JSON resultante servido como asset estático del frontend (<10MB)
4. Valida integridad: conteo hexágonos esperado, rangos scores [0-1], ausencia h3_index nulos/duplicados
5. Reproducible: misma entrada = misma salida
6. Documentado el proceso de actualización cuando el equipo entregue nueva versión del .parquet

---

#### US03-AC1 — Mapa de Calor por Score General
**Como** usuario analista,
**Quiero** que los hexágonos se coloreen según el score general de idoneidad,
**Para que** pueda identificar visualmente las zonas con mayor y menor potencial eólico.

**Prioridad:** 🔴 Crítica | **FRs:** FR9, FR10

**Criterios de Aceptación:**
1. Hexágonos coloreados según score_general (promedio idoneidad de las 5 dimensiones)
2. Escala de color continua (gradiente) proporcional al score
3. Leyenda visible con escala de colores y valores min/max
4. Zonas de mayor score se distinguen claramente de las de menor
5. Actualización visual al cargar datos

---

#### US03-AC2 — Filtrado Mapa por Variable Crítica
**Como** usuario analista,
**Quiero** poder cambiar la variable que colorea el mapa de calor,
**Para que** pueda analizar la distribución territorial de cada variable individualmente.

**Prioridad:** 🔴 Crítica | **FRs:** FR15, FR16, FR17 | **NFRs:** NFR-P3

**Criterios de Aceptación:**
1. Selector/dropdown de variables disponibles
2. Al seleccionar variable, mapa se re-renderiza con esa variable en vez del score general
3. Leyenda se actualiza según la variable seleccionada
4. Opción de volver al score general
5. Re-renderizado completa en <2 segundos

---

#### US03-AC3 — Popup Hexágono con Información
**Como** usuario analista,
**Quiero** que al hacer click en un hexágono se muestre información detallada,
**Para que** pueda consultar datos específicos de cada zona sin salir del mapa.

**Prioridad:** 🔴 Crítica | **FRs:** FR18, FR19, FR20

**Criterios de Aceptación:**
1. Click en hexágono activo muestra popup
2. Popup muestra: score usado en el mapa de calor actual
3. Popup muestra: 2-3 variables secundarias importantes del hexágono
4. Popup muestra: identificador H3
5. Popup no aparece en hexágonos excluidos/decorativos
6. Se cierra al click fuera o botón cerrar

---

#### US03-AC5 — Hexágonos No Disponibles (Decorativos)
**Como** usuario analista,
**Quiero** que los hexágonos excluidos sean visibles pero claramente diferenciados,
**Para que** entienda la cobertura del territorio y sepa cuáles zonas están excluidas.

**Prioridad:** 🟡 Alta | **FRs:** FR21, FR22, FR23

**Criterios de Aceptación:**
1. Hexágonos con tipo_celda="excluida" se renderizan con estilo diferenciado (gris, opacidad reducida)
2. No son interactuables (sin click, sin popup)
3. No participan en cálculos ni en el mapa de calor
4. No son seleccionables
5. Se distinguen claramente de los hexágonos activos

---

#### US03-AC4 — Dato Central Visible en Hexágono
**Como** usuario analista,
**Quiero** que cada hexágono muestre un valor numérico central,
**Para que** pueda leer valores sin necesidad de abrir el popup.

**Prioridad:** 🟡 Alta | **FRs:** FR11, FR12

**Criterios de Aceptación:**
1. Cada hexágono activo muestra valor numérico central
2. El valor corresponde al dato que determina el color (score general o variable filtrada)
3. Texto legible según nivel de zoom (se oculta en zoom alejado)
4. Valor se actualiza cuando se cambia el filtro de variable

---

#### US03-AC9 — Panel de Control: Leyenda + Selector de Variables
**Como** usuario analista,
**Quiero** un panel de control visible con leyenda y selector de variable,
**Para que** pueda interpretar el mapa y cambiar filtros sin buscar en menús ocultos.

**Prioridad:** 🟡 Alta | **FRs:** FR24, FR25, FR26

**Criterios de Aceptación:**
1. Panel visible (sidebar o overlay) con leyenda de colores y escala min/max
2. Dropdown para cambiar entre "Score General" y variables críticas
3. Indicador de variable actualmente visualizada
4. Panel colapsable/minimizable
5. Cambio de variable actualiza simultáneamente: mapa, leyenda y datos centrales

---

#### US-CACHE — Cache de Datos Geoespaciales en Frontend
**Como** usuario recurrente,
**Quiero** que los datos del mapa se cacheen en mi navegador,
**Para que** la segunda visita cargue instantáneamente sin re-descargar todo.

**Prioridad:** 🟡 Alta | **ADR:** ADR-006 | **FRs:** FR39, FR40, FR41, FR42 | **NFRs:** NFR-P6

**Criterios de Aceptación:**
1. Service Worker implementado para cache de datos del mapa
2. Archivos JSON/GeoJSON versionados con hash (`hexagons-{hash}.json`)
3. HTTP Cache con headers `Cache-Control` y `ETag`
4. Segunda visita carga desde cache local
5. Datos nuevos (nuevo hash) invalidan cache automáticamente
6. Indicador visual al descargar datos nuevos vs. usar cache

---

#### US03-AC7 — Metadata de Variables
**Como** usuario analista o investigador,
**Quiero** consultar la metadata de cada variable (origen, vigencia),
**Para que** pueda evaluar qué tan recientes y confiables son los datos que estoy viendo.

**Prioridad:** 🟢 Media | **FRs:** FR27, FR28, FR29

**Criterios de Aceptación:**
1. Cada variable muestra fuente de origen
2. Cada variable muestra fecha/periodo de vigencia
3. Accesible desde la interfaz (tooltip, panel lateral, o popup)
4. El sistema comunica la fecha de última actualización del dataset

---

### Épica 3: Admin y CRUD de Usuarios

#### US08 — Gestión de Usuarios (CRUD)
**Como** administrador del sistema (coordinador universitario),
**Quiero** gestionar las cuentas de los usuarios de la plataforma,
**Para que** pueda controlar quién tiene acceso y con qué rol.

**Prioridad:** 🟢 Media | **FRs:** FR30, FR31, FR32, FR33, FR34, FR35

**Criterios de Aceptación:**
1. Crear usuario (via Keycloak Admin API o consola)
2. Listar usuarios con tabla: nombre, correo, fecha creación, estado, rol
3. Búsqueda por nombre o correo
4. Paginación si >20 usuarios
5. Editar datos: nombre, estado (activo/inactivo), rol
6. Eliminar/desactivar usuario con confirmación
7. Solo accesible por usuario con rol `admin`
8. Error claro si correo duplicado

**Nota:** Si hay presión de tiempo, Keycloak admin console sirve como fallback para esta funcionalidad.

---

## Trazabilidad FR → User Story

| FR | User Story | Épica |
|----|-----------|-------|
| FR1, FR2, FR3 | US01, US-KEY | E0, E1 |
| FR4, FR5 | US-AUTH-GUARD | E1 |
| FR6, FR7, FR8, FR13, FR14 | US03 | E2 |
| FR9, FR10 | US03-AC1 | E2 |
| FR11, FR12 | US03-AC4 | E2 |
| FR15, FR16, FR17 | US03-AC2 | E2 |
| FR18, FR19, FR20 | US03-AC3 | E2 |
| FR21, FR22, FR23 | US03-AC5 | E2 |
| FR24, FR25, FR26 | US03-AC9 | E2 |
| FR27, FR28, FR29 | US03-AC7 | E2 |
| FR30-FR35 | US08 | E3 |
| FR36, FR37, FR38 | US03-AC6 | E2 |
| FR39, FR40, FR41, FR42 | US-CACHE | E2 |

## Decisiones Arquitectónicas Referenciadas

| ADR | Decisión | Impacto |
|-----|----------|---------|
| ADR-005 | Keycloak como proveedor de identidad OIDC | Elimina auth propio, simplifica login y gestión de usuarios |
| ADR-006 | Storage y cache de datos geoespaciales | Service Worker + HTTP Cache; storage definitivo (S3 vs BD) pendiente decisión con cliente |
| ADR-007 | Backend Clean Architecture + DDD + Monorepo | Define estructura del proyecto y backend desde primera entrega (supersede ADR-003) |
