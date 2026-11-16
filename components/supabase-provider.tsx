"use client";

import { createContext, useContext, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SupabaseContextValue = ReturnType<typeof createClient>;

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // El inicializador perezoso crea el cliente una sola vez por montaje del
  // provider, así todos los consumidores reciben la misma instancia.
  const [supabase] = useState(() => createClient());

  return <SupabaseContext value={supabase}>{children}</SupabaseContext>;
}

export function useSupabase(): SupabaseContextValue {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase debe usarse dentro de <SupabaseProvider>");
  }
  return ctx;
}
