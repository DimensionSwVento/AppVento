* version:1

# Contexto y Documentación sobre el Proyecto Vento

La siguiente información corresponde a contexto del proyecto y el actual plazo de desarrollo.

---

# PARTE 1: Flujo de Usuario y Alcance de Desarrollo

## 1.1 Flujo Esperado del Usuario en la Aplicación

- Loguin
- Selecion de area a realizar el analisis en el mapa interactivo
- Configurar las variables a configurar agrupadas por dimencion (Tecnica,ambiental,regulatoria,socioeconomica,macroeconomica)
- insertar las caracteristicas del proyecto configuracion de turbino o otro elemento tecnico con entradas como (selecion de capacidad en Mw, etc)
- informe de idoneidad del area selecionada con opcion de descarga
- opcion de ver historial de informes

## 1.2 Contexto de Alcance y Objetivos Tempranos

el primer contexto corresponde a a lo definido para el proyecto alcanzes y las primeras historias de usuario para el primer mes de desarrollo:

### 1.2.1 Resumen del Problema

Actualmente, evaluar la idoneidad de un proyecto de energía eólica en Colombia es
un proceso lento, fragmentado y costoso. Los analistas se enfrentan a tres
barreras principales:
● Dispersión de Datos: La información ambiental, técnica, regulatoria y
socioeconómica reside en diferentes fuentes y formatos. No hay un "lugar
único" para cruzarlos.
● Complejidad Geográfica: Identificar con precisión el área de mayor
potencial requiere herramientas SIG (Sistemas de Información Geográfica)
complejas que no todos los tomadores de decisiones saben operar.
● Incertidumbre en la Toma de Decisiones: Sin una forma rápida de
prototipar y simular variables, los informes de idoneidad tardan semanas, lo
que retrasa la inversión en energías limpias.

### 1.2.2 Objetivos del Alcance Temprano

Implementar/Usar un motor geoespacial basado en H3: Lograr que la selección
de áreas en el mapa de Colombia tenga una precisión de resolución estandarizada,
permitiendo cálculos de área automáticos sin intervención manual del usuario.
Automatizar la generación de reportes: Reducir el tiempo de creación de un
informe de idoneidad profesional de 5 días hábiles a menos de 30 segundos tras la
configuración de variables.
Garantizar la integridad de los datos: Centralizar 5 dimensiones de análisis
(Ambiental, Técnica, Regulatoria, Socioeconómica y económica) en una única
fuente de verdad técnica.

### 1.2.3 Solución Propuesta

Nuestra solución se fundamenta en los diseños de Figma derivados del discovery. A
partir de este insumo, garantizamos los siguientes aspectos:
Automatización: Cálculo inmediato de idoneidad basado en 5 dimensiones
críticas.
Sistema H3 Geo: Uso de hexágonos para una selección geográfica precisa y
estandarizada.
Histórico: Registro de todos los análisis previos para comparar la evolución
de los proyectos.
Autoridad Técnica: Generación de reportes profesionales con el respaldo
institucional de ANH y EAFIT.

### 1.2.4 Historias de Usuario del Scope Primera Entrega

A continuación, se presentan las historias de usuario para estructurar y priorizar el
proyecto. Los criterios de aceptación incluidos son una base mínima, sujetos a
expansión durante la planeación detallada

ID Módulo

Historia de
Usuario Criterios de Aceptación (Detallados) Prioridad

US01 Acceso

Login
Institucional

1. Validación de campos vacíos.
2. Restricción por dominio de correo.
3. Enlace a recuperación de contraseña. Alta

US03 Mapa

Selección
Territorial H3

1. Carga de mapa base Colombia.
2. Conversión de Click a ID Hexagonal
H3.
3. Pintado de hexágonos seleccionados.
Parte 1 (Visualización Mapa) Crítica

US08 Admin

Gestión de
Usuarios

1. CRUD (Crear, Leer, Actualizar,
Borrar).
Parte 1 Media

### 1.2.5 Exclusiones del Alcance (Primera Entrega)

NO incluye:
● Desarrollo del modelo multicriterio de análisis
● Mantenimiento del modelo multicriterio
● Despliegue y operación del modelo multicriterio
● Integración con sistemas externos no especificados en las historias de
usuario
● Migración de datos históricos previos al proyecto

## 1.3 Aclaraciones Técnicas del Mapa y Datos

- el mapa debe ser de calor segun un score nacido del promedio de la idoneidad de todas las dimenciones
- el mapa debe soportar coloreo por variables criticas (aun no definidas) ademas del score promedio  permitir el filtrado en el mapa de calor renderizandolo pero esta vez con la variable selecionada en ves del score general
- cada hexagono al dar click debe disponer popup para visualizar info y/o variables
- aun esta por definir el proceso para el analisis de variables o dimenciones en areas maritimas dejar como historias y o tareas  finales
- cada hexagono debe mostrar un dato central que determina el calor del mapa sea el score general o la variable critica filtrada
- los hecagonos no disponibles se deben renderizar pero no interactuable o calculable solo decorativo
- nos encargamos de integrar el modelo multicriterio (aun en construccion) por lo que se debe hacer desarrollo pensando en integrar la informacion actual mas la futura
- ya se definieron algunas tecnologias como postgrade,h3 y talvez angular
- ya se brindan los datos que devolvera en formato .parquet con los datos en columnas asociados a un h3 index.
- en la informacion recibida abra variables informativas,scores,incluyentes y celdas excluidas
- van a ver meta dato de las variables para hacer rastreable el origen y vigencia de ellos
- al hacer click a hexagono se podria mostrar dentro informacion del score usado en el mapa de calor y 2 o 3 variables segundarias importantes en ese hexagono

---

# PARTE 2: Documentación Oficial del Proyecto General

este segundo contexto corresponde a un resumen de las partes claves de la documentacion oficial del proyecto general.

## 2.1 Objetivos del Proyecto

### 2.1.1 Objetivo General

Identificar zonas offshore y onshore en el territorio colombiano con potencial
eólico que sean viables para su explotación en generación eléctrica, desarrollando
una herramienta multicriterio basada en un Sistema de Información Geográfico
(SIG) que permita considerar simultáneamente aspectos socioeconómicos, técnicos
y ambientales con el fin de establecer recomendaciones que permitan evaluar la
idoneidad de implementación de proyectos de explotación de dicha fuente.

### 2.1.2 Objetivos Específicos

1. Identificar información relevante sobre el potencial eólico en Colombia, así
como indicadores técnicos, económicos, sociales y ambientales, a través de una
revisión exhaustiva de la literatura científica con casos de estudio relacionados,
bases de datos meteorológicas, estudios de impacto ambiental, documentos
gubernamentales y entrevistas con expertos, para establecer una base sólida de
requerimientos, datos e indicadores que permitan desarrollar una herramienta
multicriterio SIG precisa y eficaz para la identificación de zonas con potencial
eólico en Colombia.
2. Desarrollar la herramienta de software multicriterio basada en un SIG, in-
tegrando los datos e indicadores previamente identificados y desarrollando
algoritmos que permitan el análisis, para obtener resultados e identificar zonas
con potencial eólico.
3. Implementar la herramienta multicriterio basada en SIG para identificar zonas
offshore y onshore con potencial eólico en el territorio colombiano, ajustando
los parámetros según las condiciones específicas del país y validando los
resultados con información secundaria, para generar un mapa detallado de
zonas viables para la explotación eólica.
4. Divulgar los resultados obtenidos del proyecto y promover la apropiación
social de los mismos, a través de la publicación de artículos científicos, el
desarrollo de talleres y seminarios, la elaboración de informes técnicos y
material educativo para la comunidad y diferentes grupos de interés, y la
participación en congresos y foros relacionados con energías renovables, para
asegurar que los resultados del proyecto sean conocidos y utilizados por
la comunidad científica, las autoridades competentes, empresas del sector
energético y la sociedad en general, promoviendo así el desarrollo sostenible y
el uso de energías renovables en Colombia.

## 2.2 Contexto y Metodología del Proyecto

Estamos en la fase 2 con criterios para fase 3 de la Metodología del Proyecto

### 2.2.1 Fases Metodológicas

■ Fase 1 – Planeación y búsqueda de información: fuentes meteo/geo/socioam-
bientales; construcción de bases de datos; diseño de indicadores.
■ Fase 2 – Desarrollo de la herramienta SIG: requisitos, arquitectura, selección
tecnológica, algoritmo de modelo multicriterio, pruebas.
■ Fase 3 – Implementación y análisis: aplicación regional, evaluación de viabili-
dad, recomendaciones, validación con fuentes secundarias.

## 2.3 Condiciones de Emplazamiento Eólico

La selección del sitio de instalación suele basarse en el análisis del recurso eólico
y de las condiciones del entorno. Entre los factores más relevantes se encuentran
la velocidad y la dirección del viento, así como las características del terreno y la
presencia de obstáculos.
■ Velocidad. En términos generales, los aerogeneradores inician la generación a
velocidades bajas (del orden de algunos m/s) y alcanzan su potencia nominal
en rangos que dependen del diseño; además, incorporan límites de operación
por seguridad ante vientos intensos. Una mayor constancia del viento favorece
el aprovechamiento energético. Como referencia, la eficiencia aerodinámica
presenta un límite teórico máximo del 59,26 % (límite de Betz), mientras que en
condiciones reales los valores alcanzables suelen ser menores y dependen del
equipo y del sitio.
■ Dirección. El desempeño mejora cuando el viento incide de manera alineada con
el rotor. Para ello, se emplean mediciones de dirección (por ejemplo, mediante
registros tipo rosa de los vientos) y, en muchas turbinas, sistemas de orientación
que ajustan la góndola para favorecer la captura de energía.
■ Terreno y rugosidad. La rugosidad del terreno y los obstáculos modifican el
perfil vertical de velocidades y pueden intensificar la turbulencia, lo que influye en
la estimación del recurso y en decisiones de diseño, como la altura de torre.

## 2.4 Revisión de Literatura — Análisis Multicriterio para Energía Eólica

Se realizó una revisión sistemática de la literatura orientada a encontrar informa-
ción sobre trabajos en los que el análisis multicriterio fuera aplicado a la selección de
sitios para proyectos de energía eólica, con el propósito de comprender la evolución
de estas metodologías e identificar herramientas comparables. Adicionalmente,
se efectuó un sondeo de parámetros y variables reportados en la literatura para
este tipo de análisis de idoneidad. A través de esta revisión se buscó identificar la
siguiente información:

Limitantes y factores técnicos considerados en el desarrollo de proyectos
eólicos on-shore y off-shore, así como las variables empleadas durante la
planeación y su relevancia según el contexto de aplicación.

Modelos de análisis multicriterio asociados a estas herramientas de selección,
incluyendo estrategias de ponderación, criterios de asignación de pesos, parti-
cipación de stakeholders y mecanismos empleados para evaluar y clasificar los
resultados obtenidos

os procesos de selección de emplazamientos (áreas priorizadas) para proyectos
eólicos presentan limitaciones significativas asociadas con la dispersión de datos
geoespaciales, la heterogeneidad de criterios ambientales, técnicos y socioeconómi-
cos y la integración aún limitada de herramientas avanzadas de análisis espacial en
la planificación energética. Esta situación dificulta la toma de decisiones estratégicas
por parte de entidades gubernamentales, inversionistas y desarrolladores, quienes
requieren información precisa, actualizada y reproducible para priorizar zonas de
desarrollo con menor incertidumbre.
Adicionalmente, una parte de los estudios de idoneidad desarrollados en el
país se apoya en metodologías tradicionales que no incorporan de manera integral
factores multicriterio ni avances recientes en sensores remotos, modelación SIG,
inteligencia artificial o análisis predictivo. Como resultado, aumenta el riesgo de
seleccionar sitios con baja productividad energética, conflictos de uso del suelo o
impactos ambientales significativos, lo que afecta la sostenibilidad y la idoneidad
económica de los proyectos.
La revisión de antecedentes científico-tecnológicos realizada en el marco del
proyecto evidencia una tendencia global hacia la adopción de plataformas basadas
en SIG, enfoques de análisis multicriterio de decisión (MCDM)

### 2.4.1 Casos de Estudio Internacionales — Implementaciones SIG en Energía Eólica

En la literatura se han reportado implementaciones de SIG para estimar la
producción anual de energía (AEP) en parques eólicos on-shore ubicados en Kansas
[ 172]. En este tipo de enfoques, el uso de SIG permite modelar y validar pérdidas
por efecto estela, las cuales pueden oscilar entre 8.7 % y 20 % según la disposición
del parque. Adicionalmente, se introduce un coeficiente de eficiencia reducida para
evaluar el impacto del diseño del parque.
También se ha reportado la evaluación de idoneidad de un parque eólico on-shore
en la isla Terceira [ 338]. En dicho análisis se utilizó SIG y un análisis costo–
beneficio, obteniendo un VPN de 3.3 millones de euros, una TIR de 26 % y un
costo nivelado de energía cercano a 0.04 euros/kWh, las cuales son las tres métricas
financieras clave en la evaluación de impacto.
Otro ejemplo en Brasil, presenta un análisis económico para la implementación
de parques eólicos en la costa brasileña, enfocado en turbinas off-shore de 10 MW
agrupadas en un parque hipotético de 300 MW. Entre los beneficios reportados se
encuentra un alto potencial de generación, especialmente en la región noreste del
país, donde la producción anual puede alcanzar hasta 1579 GWh con factores de
capacidad entre 45 % y 60 %. Además, se describen costos competitivos a nivel
internacional, con un CAPEX mínimo de 2.34 millones de dólares por MW y
un LCOE de 69.9 dólares por MWh. También se resalta la cercanía a centros de
consumo en las regiones sudeste y sur, lo cual reduce pérdidas por transmisión
y favorece la integración al sistema eléctrico. En esta aplicación se emplearon
sistemas de información geográfica mediante Quantum GIS (QGIS) para integrar y
analizar datos de viento, batimetría y subestaciones, lo que permitió delimitar con
mayor precisión las áreas favorables en las que finalmente se realizó la instalación

### 2.4.2 Análisis Económicos y Costo-Beneficio en Proyectos SIG

Entre los beneficios de incorporar análisis económicos en proyectos de aeroge-
neración se encuentra la posibilidad de modelar pérdidas asociadas a fenómenos
aerodinámicos y de evaluar alternativas de ubicación cercanas a centros de consumo,
con impactos potenciales en costos y desempeño del sistema [172, 123].
Al considerar los costos iniciales asociados a proyectos basados en SIG, se ha
reportado una evaluación financiera y técnica de la adopción de SIG en Ghana.
La metodología integró dos aproximaciones: (i) estudios comparativos de ahorro
por uso de SIG (basados en experiencias internacionales) y (ii) la investment
evaluation methodology (IEM), que utiliza un proceso de ponderación y puntuación
para evaluar beneficios tangibles e intangibles. En este caso, los costos iniciales
incluyeron conversión de bases de datos y digitalización de mapas, capacitación de
personal y mantenimiento del sistema, además de costos operativos y de soporte
técnico. Como resultados, se reportó un ahorro neto anual de 172 875 euros a partir

Para estimar beneficios mediante ACB (Análisis Costo–Beneficio), en la literatura
se encuentran criterios para evaluar la adopción de SIG bajo este enfoque. En
general, el ACB busca determinar si los beneficios esperados superan los costos
de inversión. Los beneficios suelen agruparse en reducción o eliminación de
costos, aumento de ingresos, habilitación de nuevos servicios y mejoras en la
toma de decisiones. Respecto a los

## 2.5 Evaluaciones de Impacto Geoespacial (GIE)

Los GIE combinan datos espaciales
de intervenciones y resultados con métodos cuasi-experimentales para estimar
efectos causales, con el propósito de aproximar resultados comparables a ensayos
controlados aleatorizados (RCT). Entre los beneficios reportados se encuentran
reducciones de costo y tiempo en comparación con RCT (100 000–150 000 y 6–12
meses para GIE, frente a 500 000–1 millón y 5 años para RCT), así como mayor
aplicabilidad ética y logística en contextos donde no es viable la aleatorización.
También se reportan aplicaciones de análisis costo–beneficio; por ejemplo, en
proyectos de degradación de tierras se estima una captura promedio de 43.5 t de
carbono por hectárea, generando 7.5 millones USD en beneficios por proyecto frente
a un costo medio de 4.2 millones. En relación con datos y herramientas, se mencionan
fuentes de datos georreferenciados de intervención (por ejemplo, Banco Mundial,
BID, AfDB, UNDP), datos espaciales de resultados y covariables (DHS, LSMS,
Afrobarometer, NOAA, MODIS, Landsat), herramientas de integración (AidData
geo) y paquetes econométricos en R (geoSIMEX y geoMATCH). Finalmente, se
encuentran aplicaciones como el proyecto PPTAL en Brasil, donde por medio de
GIE reportaron una reducción de conflictos d

Estos beneficios se derivan de la integración de información geoespacial, criterios
normativos y modelos de análisis AHP en una sola plataforma, lo que puede
contribuir a mejorar eficiencia operativa, precisión técnica y toma de decisiones
basada en evidencia. A continuación se sintetizan los aportes esperados para la
planificación energética y territorial del país

## 2.6 Variables de Carácter Técnico — Dimensión Técnica

Con base en esta organización, el análisis se
enfocó en las variables de carácter técnico, las cuales se agruparon en las siguientes
categorías:
■ Recurso eólico: variables que describen la disponibilidad y características del
viento en distintos espacios geográficos, así como efectos adversos que pueden
condicionar la instalación o la selección de tecnologías de generación.
■ Condiciones geológicas: características del terreno relevantes para definir
limitantes de instalación o requerimientos de cimentación.
■ Condiciones meteorológicas: variables asociadas con la ocurrencia de fenó-
menos potencialmente destructivos para instalaciones eólicas.
■ Condiciones marinas: limitantes asociadas a tecnologías eólicas off-shore.
■ Uso del espacio: variables vinculadas con restricciones de proximidad a zonas
y elementos del sistema interconectado, con interacción directa con aspectos
regulatorios y ambientales.
■ Logística: variables asociadas con infraestructura que facilite instalación,
operación y mantenimiento de turbinas y otros elementos del proyecto.
■ Implementación: variables asociadas a tecnologías específicas, optimización
de espacio y costos, incluyendo indicadores como el LCOE.

este marco, la dimensión técnica adopta 46 variables tentativas, clasificadas
en las subdimensiones descritas. Considerando etapas posteriores de evaluación
multicriterio para determinar la factibilidad de sitios de instalación, las variables se
organizaron bajo un esquema de Exclusión–Decisión. Las variables excluyentes
corresponden a criterios con decisión binaria (Sí/No) que limitan directamente la
idoneidad en una zona (por ejemplo, áreas protegidas). Por su parte, las variables
de decisión ingresan a la evaluación multicriterio con valores graduados según
favorezcan o perjudiquen la idoneidad de un proyecto (Inclusión/Penalización).
A continuación se presenta un desglose de variables del componente técnico,
describiendo sus características y una caracterización preliminar de rangos esperados.
Este segmento corresponde a la actividad 3, relacionada con la búsqueda de
información en bases de datos geográficas, con el fin de contextualizar estas
variables para el territorio de interés.

Desde la perspectiva del proyecto marco, los resultados de esta tesis aportan
directamente a la construcción de una herramienta multicriterio para la evaluación
de proyectos eólicos, al proveer estimaciones más robustas y confiables del recurso,
así como métricas determinísticas y probabilísticas que permiten cuantificar la
incertidumbre asociada. En este sentido, el modelo propuesto constituye un compo-
nente técnico fundamental para la toma de decisiones en etapas de prefactibilidad
y planificación, contribuyendo a una evaluación más objetiva del potencial de
generación, la idoneidad técnica y el riesgo asociado a los proyectos eólicos en el pais

## 2.7 Requisitos Generales del Modelo

### 2.7.1 Idealidad del Modelo según Potencial Eólico y Variables Específicas (Features Opcionales)

Si vientos fuertes, constantes y altura disponible → HAWT
Si turbulencias, dirección variable o espacio limitado → VAWT
HAWT suele ser más eficiente en vientos laminares y constantes.
VAWT tolera vientos turbulentos y multidireccionales cerca del suelo.

## 2.8 Aplicación de Software SIG Multicriterio

En cumplimiento a los objetivos específicos "O.E.2 – Desarrollar la herramienta
de software multicriterio basada en un SIG, integrando los datos e indicadores
previamente identificados y desarrollando algoritmos que permitan el análisis, para
obtener resultados e identificar zonas con potencial eólico." y "O.E.3 – Implementar
la herramienta multicriterio basada en SIG, para identificar zonas offshore y onshore
con potencial eólico en el territorio colombiano, ajustando los parámetros según
las condiciones específicas del país y validando los resultados con información
secundaria, para generar un mapa detallado de zonas viables para la explotación
eólica y establecer recomendaciones sobre la idoneidad de implementación de
proyectos eólicos en dichas zonas", se presenta este capítulo.
Un sistema de información geográfica (SIG) es una herramienta tecnológica que
permite capturar, gestionar, analizar y visualizar información georreferenciada [34].
Mientras un SIG corresponde a una instalación de software y datos para un uso
específico (junto con hardware, personal e instituciones asociadas), una aplicación
de software SIG es un programa con un propósito definido, diseñado para su uso en
ámbitos como gestión ambiental, conservación, energía y monitoreo de recursos
naturales [ 56 ]. La aplicación presentada integra datos espaciales de las dimensiones
técnica, ambiental, socioeconómica, económica y regulatoria, junto con un
modelo multicriterio orientado a apoyar la toma de decisiones en la planificación y
desarrollo de proyectos eólicos en Colombia

### 2.8.1 Metodología para Selección de Tecnologías

La selección tecnológica se orientó mediante un technology selection framework
que combina vigilancia tecnológica, revisión comparativa y validación práctica
mediante pruebas de concepto (PoC). La metodología se estructura en tres fases:
■ Fase 1. Búsqueda y recolección: revisión de literatura científica, documenta-
ción técnica y fuentes institucionales (incluida literatura gris).
■ Fase 2. Análisis y validación: comparación funcional y validación mediante
PoC, usando criterios de madurez, integración, desempeño e interoperabilidad.
■ Fase 3. Toma de decisiones: recomendaciones sobre adopción tecnológica,
brechas y oportunidades de transferencia de conocimiento.

### 2.8.2 Análisis de Tecnologías y Pruebas de Concepto

Se identifica un ecosistema SIG híbrido que combina plataformas GIS tradi-
cionales con tecnologías emergentes open-source y arquitecturas web. Entre las
tecnologías clave se incluyen bibliotecas geoespaciales en Python (GeoPandas,
Shapely, GDAL, Rasterio), análisis numérico (NumPy, Pandas) y visualiza-
ción (Matplotlib, Folium), además de frameworks backend (Flask, FastAPI,
Django) e integración con PostgreSQL/PostGIS. Este ecosistema habilita flujos
reproducibles y escalables, aunque evidencia una brecha: la mayoría de soluciones
existentes priorizan dimensiones técnicas/ambientales y no integran de forma nativa
variables sociales y territoriales.
Se realizaron dos PoCs para evaluar integración y idoneidad técnica.

## 2.9 Modelo Multicriterio SIG–MCDM

### 2.9.1 Agregación Ponderada

Sobre las áreas elegibles se calcula el índice:
𝑉 =
𝑛∑︁
𝑖=1
𝑤𝑖 · 𝑥′
𝑖
donde 𝑤𝑖 es el peso AHP del criterio 𝑖 y 𝑥′
𝑖 es la variable normalizada/puntuada.
Salida: mapa continuo de idoneidad 𝑉 (0–1 o escala equivalente), junto con
capas intermedias de elegibilidad y de cada criterio normalizado.

### 2.9.2 Validación, Robustez y Visualización de Resultados (TOPSIS + Análisis de Sensibilidad)

Propósito: evaluar la estabilidad del resultado y comunicarlo de manera inter-
pretable.
Validación por contraste (TOPSIS). Se calcula un ordenamiento alternativo
según cercanía a la solución ideal, y se compara con el ordenamiento basado en 𝑉
para identificar zonas sensibles a la metodología de ordenamiento.
Análisis de sensibilidad. Se varían pesos en rangos definidos (p. ej., ±10 %) o
por escenarios y se analiza:
■ estabilidad espacial de las zonas mejor clasificadas,
■ cambios por dimensión,
■ robustez de resultados frente a incertidumbre en ponderaciones.
Salida: mapas temáticos (clases de idoneidad), ranking de alternativas, re-
porte de parámetros del escenario y productos cartográficos para el capítulo de
resultados/implementación.

### 2.9.3 Definición de Criterios y Tipología de Variables

Para garantizar coherencia metodológica, transparencia y flexibilidad entre
escenarios, las variables se organizan según la selección de un usuario.

■ Variables excluyentes: reglas duras de no intervención: Las variables exclu-
yentes definen restricciones absolutas: zonas donde, por normativa, inidoneidad
técnica evidente o prohibiciones explícitas, no se debe considerar la instalación.
En términos SIG, estas capas operan como máscaras binarias (0 = no elegible, 1
= elegible). Su función es reducir el espacio de búsqueda y evitar que el índice
final asigne puntajes favorables a zonas que, desde el inicio, resultan inviables.

■ Variables de mínimo viable: núcleo indispensable para calcular aptitud: El
mínimo viable corresponde al conjunto básico sin el cual el análisis multicriterio
pierde sentido (p. ej., recurso eólico mínimo, criterios base de conexión/pen-
diente/uso del suelo según el alcance del estudio). Estas variables se incorporan
en el cálculo del índice y constituyen el primer mapa de aptitud utilizable para
la toma de decisiones tempranas.

■ Variables penalizantes: refinamiento gradual sin excluir completamente:
Las variables penalizantes incorporan fricciones o costos adicionales (sociales,
ambientales o técnicos) que no necesariamente prohíben un proyecto, pero
sí reducen su atractivo comparativo. Metodológicamente, esto se traduce en
funciones de penalización (por distancia, sensibilidad, conflictividad, etc.), que
disminuyen el puntaje sin eliminar completamente la alternativa.

■ Variables informativas: contexto para interpretar y comunicar resultados:
Las variables informativas no alteran el índice, pero resultan decisivas para
explicar el resultado, justificar recomendaciones y priorizar acciones (p. ej.,
variables que describen dinámicas territoriales, entorno socioeconómico o
condiciones de accesibilidad). Su incorporación mejora la lectura del mapa
final y la trazabilidad del análisis.

### 2.9.4 Modelo Jerárquico Incremental

La metodología se concibe como una construcción incremental (de lo no
negociable a lo preferible), lo que facilita la trazabilidad, la verificación por etapas
y el uso por escenarios.

#### Paso 1: Delimitación de Zonas Excluyentes
Propósito: definir de forma explícita dónde es imposible (o no permitido)
intervenir.
Insumos: capas de áreas protegidas estrictas, restricciones legales, cuerpos de
agua/zonas no aptas (según alcance onshore/offshore), pendientes extremas (si
aplica), zonas de seguridad o exclusión técnica.
Procesamiento SIG (típico):
■ Homologación de CRS, validación geométrica y limpieza topológica.
■ Generación de buffers (si la restricción exige distancia mínima).
■ Unión espacial (union/dissolve) para consolidar la máscara de exclusión.
■ Rasterización o normalización a la unidad de análisis (celda/polígono).
Salida: una máscara binaria 𝑀exc que indica elegibilidad inicial.

#### Paso 2: Áreas Disponibles (Espacio Real de Trabajo)
Propósito: obtener el universo de alternativas sobre el cual tiene sentido calcular
aptitud.
Operación conceptual:
𝐴disp = 𝐴total \ 𝐴excl
Salida: capa de área disponible que define el dominio final del análisis multicriterio.

#### Paso 3: Aplicación del Análisis Multicriterio en el Mínimo Viable
Propósito: producir un primer mapa de aptitud robusto usando únicamente el
conjunto básico de variables indispensables.
Acciones principales:
■ Definición del árbol jerárquico: objetivo → dimensiones → criterios →
subcriterios/indicadores.
■ Estandarización de variables a una escala común (p. ej., [0, 1]).
■ Asignación de pesos (AHP) y cálculo de un índice inicial mediante suma
ponderada.
Salida: mapa de aptitud mínimo viable 𝑉MV.

#### Paso 4: Inclusión de Variables Penalizantes (Refinamiento de la Aptitud)
Propósito: refinar la aptitud incorporando fricciones que afectan la idoneidad
sin excluir totalmente áreas.
Idea metodológica: las penalizaciones se pueden introducir de dos maneras:
■ Como criterios adicionales dentro de la suma ponderada (tras estandarización).
■ Como factor multiplicativo o corrector sobre el índice base.
Salida: mapa refinado 𝑉REF.

#### Paso 5: Despliegue de Variables Informativas (Lectura Integral del Territorio)
Propósito: enriquecer la interpretación del resultado para soportar recomenda-
ciones, comunicación y toma de decisiones.
Salida: conjunto de mapas y estadísticas descriptivas que acompañan el índice
final (sin modificarlo).

## 2.10 Pipeline de Normalización y Estandarización de Variables (Datos)

La estrategia de trabajo se orientó a construir un pipeline (flujo de trabajo)
reproducible que reduzca la fricción asociada a la integración de fuentes heterogé-
neas. En lugar de acoplar la solución a una herramienta particular de consumo, se
priorizó la conversión hacia un estándar operativo basado en indexación espacial
H3 y almacenamiento columnar en Parquet. El resultado esperado es
un conjunto de salidas coherentes, principalmente archivos *.h3.parquet, que
pueden integrarse entre dimensiones mediante una clave espacial común gracias al
sistema de indexación H3.

### 2.10.1 Objetivo Técnico del Pipeline
El objetivo técnico consistió en implementar un flujo de transformación y
unificación que permita:
■ Ingerir datos geoespaciales y tabulares desde múltiples formatos, incluyendo
Shapefile, GeoJSON, GeoPackage, geodatabases, GeoTIFF, CSV y Excel.
■ Normalizar nombres de columnas, tipos de datos y convenciones.
■ Generar un identificador espacial h3_index a una resolución definida.
■ Exportar salidas en formatos columnar y geoespacialmente interoperables,
con énfasis en Parquet y GeoParquet.

### 2.10.2 Arquitectura General del Pipeline
El pipeline se organiza como una secuencia de etapas automatizadas:
1. Inicialización del entorno mediante contenedores Docker, incluyendo un motor
PostgreSQL y la aplicación de transformación.
2. Aplicación de un esquema SQL para registrar insumos y resultados en una base
de datos con capacidades espaciales (PostgreSQL + PostGIS).
3. Normalización de capas administrativas (por ejemplo, DANE MGN) hacia
formatos de intercambio (GeoJSON).
4. Generación y llenado de una tabla maestra de celdas H3 que cubra el área de
estudio.
5. Generación de una malla H3 como producto vectorial (GeoParquet o Shapefile).
6. Ingesta de datos vectoriales a GeoParquet, asegurando EPSG:4326.
7. Procesamiento de rásters (GeoTIFF) mediante muestreo en centroides de
celdas H3.
8. Conversión final desde GeoParquet hacia .h3.parquet, reteniendo únicamente
h3_index y atributos normalizados.
9. Registro de trazabilidad (incluyendo hashes SHA-256) para evitar reprocesa-
mientos y facilitar auditoría.

### 2.10.3 Ingesta y Normalización de Datos
■ Fuentes vectoriales: GeoPandas para lectura y transformación, Fiona para formatos
con múltiples capas, GeoJSON como formato de intercambio (RFC 7946).
CRS estandarizado a EPSG:4326.
■ Fuentes ráster: Muestreo sobre centroides de celdas H3 para producir variables
compatibles con el estándar por h3_index.
■ Fuentes tabulares: Detección de columnas geográficas (latitud/longitud) y
posterior asignación a h3_index. Python + Pandas como base.

### 2.10.4 Salida Estándar: GeoParquet y H3 Parquet
■ GeoParquet (.parquet): archivo vectorial con geometrías y atributos nor-
malizados en EPSG:4326.
■ H3 Parquet (.h3.parquet): archivo tabular indexado por h3_index, donde
las variables quedan disponibles para integración multicriterio.

### 2.10.5 Base de Datos y Trazabilidad
PostgreSQL con PostGIS para almacenar entidades administrativas, relaciones
jerárquicas y metadatos de archivos procesados. SQLAlchemy y psycopg2 para
conexión. Hash SHA-256 por archivo para control de cambios y auditoría.

---

# PARTE 3: Detalle de Variables Técnicas

## 3.1 Recurso Eólico

Estas variables buscan caracterizar el comportamiento del viento a través del
tiempo para entender cómo este y los fenómenos meteorológicos asociados facilitan
o impiden el desarrollo de infraestructura de energía eólica en el país, tanto en el
continente como costa afuera.

### 3.1.1 Velocidad de Viento
Esta variable describe la rapidez con la que se desplaza el viento y constituye
uno de los indicadores clave de idoneidad en proyectos eólicos.

Wind Power Class Resource Potential Wind Power Density (𝑊/𝑚2) Wind Speed (𝑚/𝑠))
1 Poor 0 - 200 0.0 - 5.9
2 Marginal 200 - 300 5.9 - 6.7
3 Fair 300 - 400 6.7 - 7.4
4 Good 400 - 500 7.4 - 7.9
5 Excellent 500 - 600 7.9 - 8.4
6 Outstanding 600 - 800 8.4 - 9.3
7 Superb > 800 > 9,3

Fuentes: Global Wind Atlas (GWA), capas a 10 m, 50 m, 100 m y 150 m.
Tipo: Variable de decisión incluyente (puede ser híbrida/excluyente en categoría marginal).

### 3.1.2 Densidad Energética Eólica
𝑊𝐷𝑃 = 1/2 ∗ 𝜌 ∗ 𝑉³
Fuente: GWA a diferentes alturas (10 m, 50 m, 100 m y 150 m).
Tipo: Variable de decisión incluyente.

### 3.1.3 Dirección del Viento
Describe el vector de velocidad del viento. Se calcula a partir de componentes Norte y Este.
Fuente: ERA5 a 10 m y 100 m. Representación: rosas de viento.
Tipo: Variable informativa.

### 3.1.4 Tiempo Efectivo
Distribución temporal de la velocidad del viento (horas al día con viento utilizable, variación anual).
Tipo: Variable informativa.

### 3.1.5 Turbulencia
Intensidad turbulenta (%) = desviación estándar velocidad / velocidad media.
Estándar IEC 61400-1:2019.

Turbine Class IEC I High Wind IEC II Medium Wind IEC III Low Wind
Annual average wind speed 10 m/s 8.5 m/s 7.5 m/s
Extreme 50-year gust 70 m/s 59.5 m/s 52.5 m/s
Turbulence classes A 18 % B 16 %

Fuente: GWA (clase de aerogenerador según IEC, incluye efecto wake).
Tipo: Variable informativa.

## 3.2 Condiciones Geológicas

### 3.2.1 Pendiente y Elevación del Terreno
Grado de inclinación. Límites reportados: 10-20% recomendado, hasta 30% posible con estudios.
Fuente: Modelo de Elevación Digital (DEM).
Tipo: Variable de decisión penalizante.

### 3.2.2 Composición del Terreno
Rocas ígneas, sedimentarias y metamórficas. Determina capacidad portante del suelo.
Tipo: Variable informativa.

### 3.2.3 Profundidad de Roca
Espesor desde superficie hasta nivel restrictivo. Categorías: muy superficial a muy profunda.
Fuente: IDEAM por departamentos.
Tipo: Variable informativa.

### 3.2.4 Fallas Geológicas
Fracturas en corteza terrestre. NSR-10: <20 km de falla activa = estudios específicos, <5 km = microzonificación.
Tipo: Variable relevante para evaluación de idoneidad y seguridad.

### 3.2.5 Amenaza Sísmica
Probabilidad de sismo con PGA superior a umbral. Criterios IEC 61400-1.
Periodo de retorno: 475 años (10% excedencia en 50 años). Incluye Sa(0.2).
Tipo: Variable compleja de diseño estructural.

### 3.2.6 Longitud de Escala de Rugosidad (Z₀)
Altura teórica donde velocidad viento ≈ 0. Escala Davenport–Wieringa.
Fuente: DTU (exponente de cizalladura del viento).
Tipo: Variable informativa / peso reducido.

## 3.3 Condiciones Marinas (Offshore)

### 3.3.1 Batimetría
Profundidad del fondo marino. Límite para anclaje fijo: ~100 m.
Tipo: Variable de decisión.

### 3.3.2 Altura y Periodo de Oleaje
Altura significativa de ola y frecuencia. Mayor oleaje = mayor riesgo fatiga y costos operativos.
Fuentes: Copernicus Marine Service, ERA5.
Tipo: Variables de decisión penalizantes.

### 3.3.3 Composición del Lecho Marino
Misma clasificación que tipo de roca terrestre, aplicada al fondo marino.
Tipo: Variable informativa para prefactibilidad offshore.
