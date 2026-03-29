/* eslint-disable @typescript-eslint/no-unused-vars */
import { i18nBuilder } from "keycloakify/login";
import type { ThemeName } from "../kc.gen";

/** @see: https://docs.keycloakify.dev/features/i18n */
const { useI18n, ofTypeI18n } = i18nBuilder
    .withThemeName<ThemeName>()
    .withExtraLanguages({})
    .withCustomTranslations({
        es: {
            loginAccountTitle: "Iniciar sesión en Vento",
            registerTitle: "Crear cuenta en Vento",
            emailForgotTitle: "Recuperar contraseña",
            loginTitle: "Iniciar sesión",
            doLogIn: "Iniciar sesión",
            doRegister: "Crear cuenta",
            doSubmit: "Enviar",
            doForgotPassword: "¿Olvidaste tu contraseña?",
            noAccount: "¿No tienes cuenta?",
            backToLogin: "Volver al inicio de sesión",
            email: "Correo electrónico",
            password: "Contraseña",
            passwordConfirm: "Confirmar contraseña",
            firstName: "Nombre",
            lastName: "Apellido",
            username: "Correo electrónico"
        }
    })
    .build();

type I18n = typeof ofTypeI18n;

export { useI18n, type I18n };
