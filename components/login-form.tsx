"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import AuthUrlError from "@/components/auth-url-error";
import { AuthAlert, AuthField, AuthHeader } from "@/components/auth-ui";
import { signIn, type AuthFormState } from "@/lib/actions/auth";
import { EMAIL_MAX, PASSWORD_MAX } from "@/lib/auth/validation";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signIn,
    null,
  );

  const failure = state && !state.ok ? state : null;
  const fields = failure?.fields ?? {};
  const values = failure?.values ?? {};

  return (
    <div className="auth-card">
      <AuthHeader title="ENTRAR" subtitle="ACCESO AL SISTEMA" />

      {/* Errores que llegan por la URL (enlace caducado, OAuth cancelado...) */}
      <Suspense fallback={null}>
        <AuthUrlError />
      </Suspense>

      <form action={formAction} noValidate>
        {failure ? <AuthAlert>{failure.error}</AuthAlert> : null}

        <AuthField
          id="login-email"
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="username"
          maxLength={EMAIL_MAX}
          required
          placeholder="jugador@correo.com"
          defaultValue={values.email}
          error={fields.email}
        />
        <AuthField
          id="login-password"
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          maxLength={PASSWORD_MAX}
          required
          error={fields.password}
        />

        <button
          className="btn lg auth-submit"
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "ENTRANDO…" : "ENTRAR AL VAULT"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/recuperar">¿OLVIDASTE TU CONTRASEÑA?</Link>
      </div>
      <div className="auth-links">
        <span>¿PRIMERA VEZ?</span>
        <Link href="/registro">CREAR CUENTA</Link>
      </div>
    </div>
  );
}
