import type { InputHTMLAttributes } from "react";

// Piezas compartidas por las pantallas de acceso (registro, login, recuperar y
// restablecer). Reutilizan `.auth-card`, `.field` y compañía de `globals.css`.

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="auth-header">
      <div className="mark" aria-hidden="true"></div>
      <h1 className="neon-cyan">{title}</h1>
      <div className="auth-subtitle">{subtitle}</div>
    </div>
  );
}

// Aviso del formulario entero (no de un campo concreto).
export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-alert" role="alert">
      {children}
    </div>
  );
}

type AuthFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">;

// Campo con etiqueta, ayuda opcional y error asociado al input
// (`aria-invalid` + `aria-describedby`).
export function AuthField({ id, label, error, hint, ...input }: AuthFieldProps) {
  // Con un error visible la ayuda sobra: el error ya dice la regla.
  const showHint = Boolean(hint) && !error;
  const hintId = showHint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p id={errorId} className="auth-error">
          {error}
        </p>
      ) : null}
      {showHint ? (
        <p id={hintId} className="auth-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
