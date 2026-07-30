---
version: 1.0
date: 2026-07-29
audience: equipo dev · PM
scope: Correcciones del Sprint 3 (resultado de reunión de seguimiento) + hand-off a Sprint 4
maintainer: mavalan Software
---

# Sprint 3 — Correcciones de idoneidad

> Resultado de la reunión de seguimiento del Sprint 3. Checklist accionable por área para el daily.
> Terminología clave del proyecto: la herramienta evalúa **idoneidad** (antes "prefactibilidad") por
> hexágonos H3 sobre 5 dimensiones: **ambiental, técnica, social, regulatoria, económica**.

Relacionado: [scope-dos.md](./scope-dos.md) · [feedback-cliente-v2.md](./feedback-cliente-v2.md) · [futuros-sprints.md](./futuros-sprints.md).

---

## 1. Menú y visualización de variables
- [ ] **Depurar el menú**: mostrar solo las variables que el usuario puede activar/mover en el mapa (las del modelo visibles + las informativas). Las demás variables del modelo se usan en el cálculo pero **no van al menú** (hoy está saturado).
- [ ] Mantener visibles las **5 dimensiones**.
- [ ] Agregar **variables informativas** al menú y al mapa: nodos de conexión, velocidad del viento, distancias — cada una con su **representación gráfica y leyenda**.

## 2. Zonas excluidas
- [ ] Pintarlas con los **colores del formato de idoneidad** (morado/matiz = cero idoneidad), respetando la **gradación por porcentaje** (hoy se ven en gris).
- [ ] Al pasar el cursor sobre el hexágono, mostrar una **leyenda con la razón de la exclusión**.

## 3. Informe (US06) — informe de **2–3 páginas**
- [ ] Contenido: **score general** + **aporte de cada dimensión** + **región seleccionada** + datos generales y características del proyecto.
- [ ] **Previsualización a pantalla completa** antes de descargar (hoy solo un panel pequeño a la izquierda).
- [ ] Incluir **captura del área seleccionada en el mapa** dentro del informe.
- [ ] **Disclaimer** al inicio y al final: la herramienta es **informativa**, no constituye certificado legal ante alcaldías o curadurías. *(Texto lo gestiona el cliente con Secretaría General de la universidad — dependencia externa.)*
- [ ] Incluir **fuentes de datos** para respaldar la información.
- [ ] **Histórico de descargas de PDF**, listado por fechas.

## 4. Cambios de nomenclatura (transversales)
- [ ] "Prefactibilidad" → **"idoneidad"** en **toda la plataforma**.
- [ ] "Informe de prefactibilidad" → **"informe de idoneidad"**.
- [ ] "Histórico de prefactibilidad" → **"histórico de informes"**.

> ⚠️ Corrige un feedback previo que decía "informe de viabilidad": el término acordado es **idoneidad**, no "viabilidad".

## 5. Otros ajustes técnicos
- [ ] **Capacidad nominal** con ingreso manual, teclado y saltos configurables *(en proceso)*.
- [ ] **Activación automática onshore/offshore** según zona (mar/tierra) + **tipo de aerogenerador**; incluir **límites offshore**.
- [ ] Mover la **dimensión regulatoria fuera del score** → queda solo **informativa**.
- [ ] **Pruebas con datos reales** *(pendiente)*.

## 6. Dependencias externas (bloquean parte de lo anterior)
- [ ] **Excel actualizado de variables** — el equipo dev tiene una versión vieja; el cliente debe compartir la nueva.
- [ ] **Texto del disclaimer** — lo consulta el cliente con Secretaría General.
- [ ] **Ejemplo de informe extenso** — lo comparte el cliente.

---

## 7. Hand-off a Sprint 4 (NO entra en Sprint 3)
- **Informe preconfigurable**: el usuario elige dimensiones y nivel de detalle según su perfil (financiero vs. técnico). Primero mostrar pantallas a usuarios para acotar "qué tan configurable".
- **Detalles técnicos por dimensión**, detalle de variables informativas (sobre todo la **regulatoria**) y **variables excluyentes**.
- Todo el **cálculo económico**.
- Reestructuración del informe si entra mucha variable.
- **Manual de usuario** (ver abajo).

### Manual de usuario (tema abierto, cierra en Sprint 4)
Opciones en evaluación:
- Paso a paso externo con link compartible (tipo Scribe), editable en colaboración con el cliente.
- **Onboarding embebido** en la app que resalta secciones y explica botones.
- Complementar con **videos** por nivel de detalle.
- Incluir las **definiciones conceptuales del Excel** (qué es una dimensión, un subcriterio) para usuarios no técnicos.
- Cierra en Sprint 4 (requiere la app terminada), pero hay que **evidenciar avance** porque está en el contrato.

---

## 8. Riesgos / bloqueos
- 🔴 **Ambiente de test caído**: el proveedor de certificados y dominios dejó de operar por una migración → las apps demo no están accesibles. Mitigación en curso: **subdominio propio** apuntando a las URLs.
- 🟠 La **configuración de ambientes con el usuario del cliente** consume el saldo destinado a eso.
- 🟡 Pendiente decidir: **plataforma de envío de correos** (capa gratuita ~500/mes) para trazabilidad de notificaciones, errores y campañas.

---

## Resumen ejecutable (orden sugerido)
1. **Renombrado transversal** prefactibilidad → idoneidad (barato, alto impacto de percepción).
2. **Zonas excluidas** (color idoneidad + leyenda de motivo).
3. **Menú depurado** + variables informativas con leyenda.
4. **Informe 2–3 págs**: preview full-screen + captura de mapa + disclaimer + fuentes + histórico de descargas.
5. **Ajustes técnicos**: capacidad nominal manual, onshore/offshore auto, regulatoria fuera del score.
6. **Datos reales** cuando llegue el Excel actualizado.
