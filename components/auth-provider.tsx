"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";

export type AuthState =
  | { status: "loading" } // servidor y primer render del cliente
  | { status: "guest" }
  | { status: "authed"; user: User };

const AuthContext = createContext<AuthState | null>(null);

// Estado de sesión para pintar la interfaz. Ninguna decisión de acceso se toma
// con él: esas se toman en el servidor con `getClaims()`.
//
// Parte de `loading` para que el servidor y el primer render del cliente
// coincidan (no se lee `cookies()` en el layout).
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    // `INITIAL_SESSION` llega al suscribirse y resuelve el estado inicial; los
    // demás eventos (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED...) lo mantienen.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session?.user
          ? { status: "authed", user: session.user }
          : { status: "guest" },
      );
    });

    // Sin esto, Strict Mode y la navegación acumularían suscripciones.
    return () => subscription.unsubscribe();
  }, [supabase]);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
