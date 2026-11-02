# Solicitud al encargado — entorno y permisos para performance

> Copiar/pegar y ajustar nombres. El detalle técnico está en
> [`performance-testing-plan.md`](performance-testing-plan.md).

## Mensaje

Hola,

Estamos montando las pruebas de performance de Vento (frontend y backend). Ya
tenemos el arnés y una línea base local, pero para producir números confiables y
repetibles necesitamos un **entorno de test** y permisos acotados. Hoy solo
responde `https://www.proyectovento.com`; `test.proyectovento.com` y
`staging.proyectovento.com` no responden.

Lo que necesitamos:

1. **URL pública de test** con TLS (idealmente `test.proyectovento.com`), separada
   de producción. Si hay VPN/allowlist, indícanos cómo entrar desde GitHub
   Actions y desde la máquina de Alejandro.
2. **Paridad con producción**: mismo esquema Next + FastAPI privado + Postgres,
   mismos workers/RAM y datos de volumen comparable (~1,6 M hexágonos). Si test
   tiene menos recursos, lo documentamos, pero no podremos comparar cifras
   absolutas.
3. **Keycloak de test** (realm/cliente separados) y un usuario de prueba
   `perf-user` con rol `user`, sin MFA y con sesión suficientemente larga. Si se
   van a probar pantallas de administración, un `perf-admin`.
4. **Credenciales como secretos de GitHub** en el repo `AppVento---Backend`:
   - secrets: `PERF_USER`, `PERF_PASSWORD`
   - variables: `PERF_TEST_URL`, opcional `PERF_PROD_URL`
   No necesitamos acceso a la base ni a Keycloak admin para la corrida; solo un
   usuario de prueba.
5. **Autorización para pruebas de carga en test** (no en prod): `load` 20 VUs
   5 min, `stress` hasta 100 VUs y `spike`. Proponemos una ventana acordada y
   avisar al equipo antes/después. En producción solo haremos **smoke de lectura**
   (login, abrir mapa, un detalle) después de cada deploy.
6. **Monitoreo durante las pruebas**: CPU/RAM del front y del back, conexiones y
   cache-hit de Postgres, 5xx de nginx. Con acceso de lectura o una captura
   durante la ventana nos basta.
7. **Acceso de lectura al backend privado** (opcional): URL interna +
   `INTERNAL_API_SECRET` o token de servicio, si quieren que midamos FastAPI sin
   pasar por el BFF. Si no, medimos la ruta completa por el BFF, que es la que
   siente el usuario.
8. **Ventana y presupuesto** para un nightly (06:00 UTC) y para las corridas de
   estrés. Si el nightly debe estar apagado, lo dejamos manual.
9. Confirmar que en los runners de Actions se puede ejecutar `npm`,
   `npx playwright install` y Docker. La política de la organización ya bloquea
   actions de marketplace; el workflow nuevo no las usa.

Con eso podemos entregar: línea base oficial, comparación antes/después de cada
fix, y un semáforo de SLOs (NFR-P2 < 5 s, NFR-P3 < 2 s, error < 1 %).

Gracias.

## Checklist para nosotros (interno)

- [ ] `vars.PERF_TEST_URL` configurada en `AppVento---Backend`
- [ ] `secrets.PERF_USER` / `secrets.PERF_PASSWORD`
- [ ] `vars.PERF_PROD_URL` (opcional; si falta se usa `https://www.proyectovento.com`)
- [ ] `vars.PERF_FRONT_BRANCH` (opcional; por defecto `develop`)
- [ ] Probar `workflow_dispatch` con `target=test`, `profile=smoke`, `strict=false`
- [ ] Revisar el job summary (Playwright + k6 + SLOs)
- [ ] Programar nightly y avisar al equipo
- [ ] Repetir `endpoints` + `journey load` 3 veces y guardar medianas
- [ ] Registrar commit, versión de master y fecha en el reporte
