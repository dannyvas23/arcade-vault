"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthAlert, AuthField, AuthHeader } from "@/components/auth-ui";
import { signUp, type AuthFormState } from "@/lib/actions/auth";
import {
  EMAIL_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/lib/auth/validation";
import { PLAYER_NAME_MAX } from "@/lib/auth/player-name";

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signUp,
    null,
  );

  if (state?.ok) {
    return (
      <div className="auth-card">
        <div className="auth-sent" role="status">
          <div className="mail" aria-hidden="true"></div>
          <h1 className="neon-green">REVISA TU CORREO</h1>
          <p>
            Te hemos enviado un enlace para confirmar tu cuenta. Ábrelo en este
            mismo navegador y entrarás directo al Vault.
          </p>
          <p className="auth-prompt" aria-hidden="true">
            &gt; ESPERANDO CONFIRMACIÓN<span className="auth-caret">_</span>
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
      <AuthHeader title="CREAR CUENTA" subtitle="NUEVO JUGADOR" />

      <form action={formAction} noValidate>
        {failure ? <AuthAlert>{failure.error}</AuthAlert> : null}

        <AuthField
          id="reg-email"
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
        <AuthField
          id="reg-player"
          name="playerName"
          label="Nombre de jugador"
          type="text"
          autoComplete="nickname"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={PLAYER_NAME_MAX}
          required
          placeholder="PX_KAI"
          defaultValue={values.playerName}
          error={fields.playerName}
          hint={`Hasta ${PLAYER_NAME_MAX} caracteres: letras sin acento, números, espacio, «_» o «-».`}
        />
        <AuthField
          id="reg-password"
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          required
          error={fields.password}
          hint={`Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`}
        />
        <AuthField
          id="reg-confirm"
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
          {pending ? "CREANDO CUENTA…" : "CREAR CUENTA"}
        </button>
      </form>

      <div className="auth-links">
        <span>¿YA TIENES CUENTA?</span>
        <Link href="/login">ENTRAR</Link>
      </div>
    </div>
  );
}
