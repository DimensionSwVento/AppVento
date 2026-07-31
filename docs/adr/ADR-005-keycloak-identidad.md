---
id: ADR-005
title: Keycloak como Proveedor de Identidad desde Primera Entrega
status: aceptado
date: 2026-03-24
---

# ADR-005: Keycloak como Proveedor de Identidad desde Primera Entrega

## Contexto

Vento es un sistema de escala nacional con múltiples stakeholders institucionales (ANH, EAFIT, Agencia Nacional de Monocarbonos), más de 50 personas en el área de datos, especialistas de laboratorio universitario y usuarios profesionales de todo el país. Los usuarios NO serán solo institucionales — cualquier profesional con correo válido podrá acceder.

Construir un sistema de autenticación propio desde cero para este nivel de escala implica:
- Reimplementar funcionalidad ya resuelta (SSO, MFA, gestión de sesiones, roles)
- Riesgo de seguridad en software con alcance gubernamental
- Deuda técnica: migrar de JWT propio a Keycloak después es más costoso que empezar con Keycloak

## Decisión

**Integrar Keycloak como proveedor de identidad desde la primera entrega.** Reemplaza el JWT propio planteado originalmente.

## Alcance Primera Entrega

- Keycloak desplegado como contenedor Docker (docker-compose)
- Realm configurado para Vento
- Registro y login de usuarios vía Keycloak
- Validación de correo electrónico (no restringido a dominio institucional)
- Protección de rutas frontend vía tokens OIDC/OAuth2
- Roles básicos: `admin`, `analista`
- Gestión de usuarios desde la consola admin de Keycloak (reduce carga de desarrollo de CRUD propio)

## Alcance Futuro

- Federación con Active Directory institucional (ANH, EAFIT)
- MFA (autenticación multifactor) — requerido para software gubernamental
- SSO entre sistemas de la agencia
- Roles granulares (Epic E10)
- Auditoría de sesiones y accesos (cumplimiento normativo)

## Justificación

- **Escala nacional:** Profesionales de todo Colombia requieren un sistema de identidad robusto, no artesanal
- **Múltiples instituciones:** Keycloak permite federar proveedores de identidad a medida que se sumen entidades
- **Seguridad gubernamental:** Cumple estándares OAuth2/OIDC, soporta MFA, auditoría de accesos
- **Reduce desarrollo:** No hay que construir CRUD de usuarios, recuperación de contraseña, ni gestión de sesiones — Keycloak lo incluye
- **Estándar abierto:** OpenID Connect es el estándar de industria para autenticación

## Consecuencias

- Se agrega Keycloak como servicio en docker-compose (consumo de recursos ~512MB RAM)
- El frontend se integra con Keycloak via librería OIDC (keycloak-js, oidc-client-ts o similar)
- El backend valida tokens emitidos por Keycloak en lugar de emitir JWT propio
- Se elimina la necesidad de construir: pantalla de login propia, recuperación de contraseña, CRUD de usuarios básico
- **Supersede parcialmente ADR-003:** El backend ya no necesita micro-API de auth propia; Keycloak asume esa responsabilidad

## Impacto en Historias Existentes

| Historia | Impacto |
|----------|---------|
| US01 (Login) | Se simplifica: frontend redirige a Keycloak, no construye form propio |
| E1.6 (Micro-API Auth) | Se reduce: solo valida tokens Keycloak, no emite JWT |
| E2.2 (Dominio institucional) | Cambia: validación de correo general, no solo institucional |
| E2.3 (Recuperar pwd) | Se elimina: Keycloak lo maneja |
| US08 (CRUD usuarios) | Se simplifica: Keycloak admin console cubre lo básico |
| E4 (Admin) | Se reduce alcance: solo funcionalidad adicional no cubierta por Keycloak |
