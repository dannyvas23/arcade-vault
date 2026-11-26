"use client";

import type { Session, User } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSupabase } from "@/components/supabase-provider";

export type AuthState =
  | { status: "loading" } // servidor y primer render del cliente
  | { status: "guest" }
  | { status: "authed"; user: User };

const AuthContext = createContext<AuthState | null>(null);
const AuthSyncContext = createContext<(() => void) | null>(null);

function toState(session: Session | null): AuthState {
  return session?.user
    ? { status: "authed", user: session.user }
    : { status: "guest" };
}

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
      setState(toState(session));
    });

    // Sin esto, Strict Mode y la navegación acumularían suscripciones.
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Las acciones de servidor (`signIn`, `signOut`) escriben las cookies de
  // sesión en el servidor y redirigen sin recargar la página: el cliente de
  // Supabase del navegador no se entera y `onAuthStateChange` no emite nada.
  // Esta función vuelve a leer la sesión de las cookies (solo para pintar la
  // interfaz) y la fijan quienes saben que la sesión pudo cambiar.
  const sync = useCallback(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setState((prev) => {
        const next = toState(data.session);
        return prev.status === "guest" && next.status === "guest" ? prev : next;
      });
    });
  }, [supabase]);

  return (
    <AuthContext value={state}>
      <AuthSyncContext value={sync}>
        {/* `usePathname` suspende en rutas dinámicas sin generateStaticParams */}
        <Suspense fallback={null}>
          <AuthRouteSync />
        </Suspense>
        {children}
      </AuthSyncContext>
    </AuthContext>
  );
}

// Tras una redirección de una acción de servidor (login, restablecer) la ruta
// cambia: se aprovecha para releer la sesión.
function AuthRouteSync() {
  const pathname = usePathname();
  const sync = useAuthSync();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    sync();
  }, [pathname, sync]);

  return null;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}

// Pide releer la sesión de las cookies. Para el caso en que la ruta no cambia
// (p. ej. `SALIR` estando ya en `/`).
export function useAuthSync(): () => void {
  const ctx = useContext(AuthSyncContext);
  if (!ctx) {
    throw new Error("useAuthSync debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
