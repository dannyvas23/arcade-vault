"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthAlert, AuthField, AuthHeader } from "@/components/auth-ui";
import { updatePassword, type AuthFormState } from "@/lib/actions/auth";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/validation";

export default function ResetForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    null,
  );

  const failure = state && !state.ok ? state : null;
  const fields = failure?.fields ?? {};

  return (
    <div className="auth-card">
      <AuthHeader title="NUEVA CLAVE" subtitle="ELIGE TU CONTRASEÑA" />

      <form action={formAction} noValidate>
        {failure ? <AuthAlert>{failure.error}</AuthAlert> : null}

        <AuthField
          id="reset-password"
          name="password"
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          required
          error={fields.password}
          hint={`Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`}
        />
        <AuthField
          id="reset-confirm"
          name="confirm"
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          required
          error={fields.confirm}
        />

        <button
          className="btn lg auth-submit"
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/recuperar">PEDIR OTRO ENLACE</Link>
      </div>
    </div>
  );
}
