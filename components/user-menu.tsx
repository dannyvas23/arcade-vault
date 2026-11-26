"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useAuth, useAuthSync } from "@/components/auth-provider";
import { signOut } from "@/lib/actions/auth";
import { getPlayerName } from "@/lib/auth/player-name";

// Botón de `SALIR`. Debe ser hijo del <form> para leer su estado de envío.
function SignOutButton() {
  const { pending } = useFormStatus();
  const sync = useAuthSync();
  const wasPending = useRef(false);

  // `signOut` redirige a `/`. Si ya se estaba en `/` la ruta no cambia y
  // `AuthProvider` no se entera: al terminar el envío se pide releer la sesión.
  useEffect(() => {
    if (wasPending.current && !pending) sync();
    wasPending.current = pending;
  }, [pending, sync]);

  return (
    <button
      type="submit"
      className="btn ghost auth-signout"
      disabled={pending}
      aria-busy={pending}
    >
      SALIR
    </button>
  );
}

// Zona de sesión de la nav. En la barra reserva un hueco de ancho fijo para
// que el diseño no salte mientras se resuelve el estado (`loading`).
// En el panel móvil se muestra la misma información en vertical.
export default function UserMenu({
  variant,
  onNavigate,
}: {
  variant: "bar" | "panel";
  onNavigate?: () => void;
}) {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <div className={`auth-slot ${variant}`} aria-hidden="true"></div>;
  }

  if (auth.status === "guest") {
    return (
      <div className={`auth-slot ${variant}`}>
        <Link href="/login" className="btn auth-btn" onClick={onNavigate}>
          ACCEDER
        </Link>
      </div>
    );
  }

  return (
    <div className={`auth-slot ${variant}`}>
      <span className="auth-user" title="Jugador con sesión iniciada">
        <span className="auth-dot" aria-hidden="true"></span>
        {getPlayerName(auth.user)}
      </span>
      <form action={signOut} onSubmit={onNavigate}>
        <SignOutButton />
      </form>
    </div>
  );
}
