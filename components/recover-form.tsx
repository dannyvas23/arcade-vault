"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthAlert, AuthField, AuthHeader } from "@/components/auth-ui";
import { requestPasswordReset, type AuthFormState } from "@/lib/actions/auth";
import { EMAIL_MAX } from "@/lib/auth/validation";

export default function RecoverForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    null,
  );

  if (state?.ok) {
    return (
      <div className="auth-card">
        <div className="auth-sent" role="status">
          <div className="mail" aria-hidden="true"></div>
          <h1 className="neon-green">ENLACE ENVIADO</h1>
          <p>
            Si hay una cuenta con ese correo, recibirás un enlace para elegir
            una contraseña nueva. Ábrelo en este mismo navegador.
          </p>
          <p className="auth-prompt" aria-hidden="true">
            &gt; ESPERANDO TU CORREO<span className="auth-caret">_</span>
          </p>
          <p className="auth-hint">
            Si no llega en unos minutos, mira en la carpeta de spam.
          </p>
        </div>
        <div className="auth-links">
          <Link href="/login">VOLVER A ENTRAR</Link>
        </div>
      </div>
    );
  }

  const failure = state && !state.ok ? state : null;
  const fields = failure?.fields ?? {};
  const values = failure?.values ?? {};

  return (
    <div className="auth-card">
      <AuthHeader title="RECUPERAR" subtitle="CONTRASEÑA OLVIDADA" />

      <form action={formAction} noValidate>
        {failure ? <AuthAlert>{failure.error}</AuthAlert> : null}

        <p className="auth-lead">
          Escribe el correo de tu cuenta y te enviaremos un enlace para elegir
          una contraseña nueva.
        </p>

        <AuthField
          id="recover-email"
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          maxLength={EMAIL_MAX}
          required
          placeholder="jugador@correo.com"
          defaultValue={values.email}
          error={fields.email}
        />

        <button
          className="btn lg auth-submit"
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "ENVIANDO…" : "ENVIAR ENLACE"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/login">VOLVER A ENTRAR</Link>
      </div>
    </div>
  );
}
