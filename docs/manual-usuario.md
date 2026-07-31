# Manual de Usuario — Plataforma Vento

**Versión:** 1.0
**Fecha:** Abril 2026
**Dirigido a:** Analistas y administradores de la plataforma

---

## Introducción

**Vento** es una plataforma web para evaluar la viabilidad de proyectos de energía eólica en Colombia. Permite seleccionar áreas geográficas con precisión hexagonal, configurar dimensiones de análisis y generar informes de viabilidad.

Este manual cubre las funciones disponibles en la versión actual desplegada.

---

## Índice

1. [Acceso a la plataforma](#1-acceso-a-la-plataforma)
2. [Pantalla principal — Mapa](#2-pantalla-principal--mapa)
3. [Selección de área en el mapa](#3-selección-de-área-en-el-mapa)
4. [Flujo de análisis paso a paso](#4-flujo-de-análisis-paso-a-paso)
5. [Panel de dimensiones](#5-panel-de-dimensiones)
6. [Informe de viabilidad](#6-informe-de-viabilidad)
7. [Panel de administración](#7-panel-de-administración)
8. [Gestión de sesión](#8-gestión-de-sesión)
9. [Preguntas frecuentes](#9-preguntas-frecuentes)

---

## 1. Acceso a la Plataforma

### 1.1 Iniciar sesión

1. Ingresa a la URL de la plataforma en tu navegador.
2. En la pantalla de inicio verás el botón **"Iniciar sesión"**.
3. Haz clic — serás redirigido a la pantalla de autenticación.
4. Ingresa tu **correo institucional** y **contraseña**.
5. Haz clic en **"Iniciar sesión"**.
6. Si las credenciales son correctas, accederás automáticamente al dashboard.

> La plataforma usa autenticación segura institucional. No almacena tu contraseña directamente.

### 1.2 Registrarse (si aún no tienes cuenta)

1. En la pantalla de autenticación, haz clic en **"Registrarse"**.
2. Completa el formulario con tu **correo institucional** y una contraseña.
3. La contraseña debe cumplir: mínimo 8 caracteres, una mayúscula, un número y un carácter especial.
4. Al completar el registro serás dirigido al inicio de sesión.
5. Ingresa con tus nuevas credenciales para acceder.

> Todo usuario nuevo entra como **analista**. Un administrador puede promoverte a admin si es necesario.

### 1.3 Recuperar contraseña

1. En la pantalla de autenticación, haz clic en **"¿Olvidaste tu contraseña?"**.
2. Ingresa tu correo institucional.
3. Recibirás un correo con un enlace para restablecerla.
4. El enlace expira en un tiempo limitado — úsalo pronto.

### 1.4 Cerrar sesión

1. En el menú lateral izquierdo, al fondo, encontrarás tu correo de usuario.
2. Haz clic en el botón de cierre de sesión.
3. Serás redirigido a la pantalla de inicio.

> Si tu sesión expira por inactividad (15 minutos), verás un mensaje de aviso y serás redirigido al inicio de sesión automáticamente después de 3 segundos.

---

## 2. Pantalla Principal — Mapa

Al iniciar sesión llegas al **dashboard** con el mapa de Colombia.

### 2.1 Elementos del mapa

| Elemento | Descripción |
|----------|-------------|
| Cuadrícula hexagonal | Hexágonos H3 que cubren todo el territorio colombiano, incluyendo islas y zonas offshore |
| Controles de zoom | Botones `+` y `−` en la esquina inferior derecha (solo en desktop) |
| Botón pantalla completa | En la esquina superior derecha (mobile) o inferior derecha (desktop) |
| Barra lateral izquierda | Menú de navegación con los pasos del análisis |

### 2.2 Navegación en el mapa

- **Desplazar:** Arrastra el mapa con el cursor o el dedo.
- **Zoom:** Usa los botones `+` / `−` o la rueda del mouse.
- **Colombia completa:** El mapa incluye el territorio continental, el archipiélago de San Andrés y Providencia, y las zonas marítimas.

### 2.3 Resolución de hexágonos según zoom

La plataforma ajusta automáticamente el tamaño de los hexágonos según el nivel de zoom:

| Zoom | Tamaño aproximado del hexágono |
|------|-------------------------------|
| Alejado (país completo) | ~59 km de lado |
| Intermedio (región) | ~8–22 km de lado |
| Cercano (departamento) | ~1.2–3.2 km de lado |

---

## 3. Selección de Área en el Mapa

La selección de hexágonos es el primer paso del análisis. Define el territorio que quieres evaluar.

### 3.1 Seleccionar hexágonos

1. Haz clic sobre cualquier hexágono del mapa.
2. El hexágono cambiará de color a **gris-azulado** — esto indica que está seleccionado.
3. Puedes seleccionar tantos hexágonos como necesites.
4. Para **deseleccionar**, haz clic sobre un hexágono ya seleccionado.

> En desktop, al pasar el cursor sobre un hexágono verás un ícono `+` que indica que es seleccionable.

### 3.2 Ver el ID del hexágono seleccionado

Los hexágonos seleccionados muestran su identificador H3 (últimos 7 caracteres) sobre el hexágono cuando el nivel de zoom es suficiente. Esto permite rastrear áreas específicas.

### 3.3 Avanzar al siguiente paso

Una vez tengas al menos un hexágono seleccionado, el botón **"Dimensiones"** en el menú lateral se habilitará. Haz clic en él para continuar.

> Si intentas avanzar sin haber seleccionado ningún hexágono, el botón permanecerá deshabilitado.

---

## 4. Flujo de Análisis Paso a Paso

El análisis sigue un flujo lineal de cuatro etapas visibles en el menú lateral:

```
Selección de área  →  Dimensiones  →  Características  →  Informe de viabilidad
```

**Reglas de navegación:**
- Puedes **retroceder** libremente a cualquier paso anterior haciendo clic en el menú lateral.
- Para **avanzar** desde "Selección de área", necesitas tener hexágonos seleccionados.
- Para **avanzar** desde "Dimensiones" y "Características", usa el botón **"Siguiente paso"** al final de cada panel.
- No es posible saltar pasos hacia adelante.

### En mobile

- En la fase de selección de área, el mapa ocupa toda la pantalla. Usa el botón hamburguesa (≡) en la esquina superior izquierda para abrir el menú.
- En fases posteriores, el panel de contenido aparece en la parte inferior de la pantalla sobre el mapa.

---

## 5. Panel de Dimensiones

Al avanzar a "Dimensiones", el mapa se congela como imagen de referencia y aparece el panel lateral con las **5 dimensiones de análisis**:

| Dimensión | Qué evalúa |
|-----------|-----------|
| Ambiental | Condiciones del entorno natural del área seleccionada |
| Técnica | Viabilidad técnica para instalación de infraestructura eólica |
| Regulatoria | Marco legal y normativo aplicable al territorio |
| Socioeconómica | Impacto y contexto social y económico de la zona |
| Macroeconómica | Variables económicas de contexto nacional y regional |

> El mapa congelado sigue mostrando tu selección de área como referencia visual mientras configuras las dimensiones.

Haz clic en **"Siguiente paso"** al final del panel para continuar a "Características".

---

## 6. Informe de Viabilidad

Al completar el flujo, accedes al panel de **Informe de viabilidad** con el resumen del análisis.

El informe presenta:
- Resumen del área seleccionada
- Evaluación por dimensión
- Indicadores de viabilidad
- Recomendaciones

> Para volver a editar la selección o las dimensiones, usa el menú lateral para retroceder. El mapa se reactivará al volver a "Selección de área".

---

## 7. Panel de Administración

> Esta sección es exclusiva para usuarios con rol **administrador**.

### 7.1 Acceder al panel de administración

El panel de administración está disponible en el menú lateral bajo **"Gestión y ayuda de usuario"**.

### 7.2 Ver usuarios

La tabla de usuarios muestra:
- Nombre y correo del usuario
- Rol actual con un badge visual: **admin** o **analista**
- Estado de la cuenta

### 7.3 Crear un usuario nuevo

1. Haz clic en **"Crear usuario"**.
2. Completa el formulario con el correo institucional del nuevo usuario.
3. Selecciona el rol: **analista** (acceso estándar) o **admin** (acceso completo).
4. Haz clic en **"Guardar"**.
5. El nuevo usuario podrá ingresar con ese correo y establecer su contraseña.

### 7.4 Editar un usuario

1. En la tabla de usuarios, haz clic en el botón de editar del usuario correspondiente.
2. Puedes modificar el rol asignado.
3. El cambio se refleja inmediatamente sin necesidad de recargar la página.

### 7.5 Diferencia entre roles

| Rol | Acceso |
|-----|--------|
| **Analista** | Flujo completo de análisis (selección, dimensiones, informe) |
| **Admin** | Todo lo del analista + gestión de usuarios y configuración |

---

## 8. Gestión de Sesión

### 8.1 Tiempo de sesión

- La sesión activa tiene una duración de **15 minutos** de inactividad.
- La sesión máxima es de **10 horas** continuas.

### 8.2 Qué pasa cuando la sesión expira

Si tu sesión expira mientras usas la plataforma:
1. Aparecerá un mensaje: **"Tu sesión ha expirado"**.
2. Después de 3 segundos serás redirigido automáticamente al inicio de sesión.
3. Vuelve a ingresar con tus credenciales para continuar.

> El trabajo no guardado (selección de hexágonos, configuración de dimensiones) se perderá si la sesión expira. Guarda o avanza al informe antes de dejar la plataforma sin usar por períodos largos.

---

## 9. Preguntas Frecuentes

**¿Por qué no puedo avanzar a "Dimensiones"?**
Necesitas seleccionar al menos un hexágono en el mapa. El botón se habilita automáticamente cuando hay una selección activa.

**¿Puedo seleccionar hexágonos en el mar o en las islas?**
Sí. El mapa incluye todo el territorio colombiano: continente, San Andrés, Providencia y las zonas económicas exclusivas offshore. Los hexágonos en esas áreas son seleccionables aunque aún no tengan datos de heatmap.

**¿Por qué el mapa se congela cuando avanzo de paso?**
El mapa se congela intencionalmente para liberar recursos del navegador y mantener tu selección visible como referencia mientras trabajas en las dimensiones. Al volver a "Selección de área" se reactiva completamente.

**¿Qué hago si el mapa tarda en cargar?**
La primera carga puede tomar algunos segundos porque el sistema prepara el índice de datos geoespaciales. Verás el mensaje "... cargando mapa" mientras esto ocurre. Es normal — espera a que desaparezca antes de interactuar.

**¿Qué pasa si cierro el navegador con un análisis en curso?**
El estado del análisis (selección, configuración) no se guarda entre sesiones en la versión actual. Al volver a ingresar, comenzarás desde el inicio.

**No recibí el correo de recuperación de contraseña.**
Revisa la carpeta de spam. Si el correo no llega en 5 minutos, contacta a tu administrador de plataforma.

**¿Cómo sé cuál es mi rol actual?**
Tu correo aparece en la parte inferior del menú lateral. Si ves la sección de administración disponible, tienes rol **admin**. Si no aparece, tienes rol **analista**.

---

*Manual de Usuario — Plataforma Vento v1.0 — Mavalan Software — Abril 2026*
