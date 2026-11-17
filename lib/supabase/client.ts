import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Cliente de Supabase para componentes de cliente. En el navegador,
// createBrowserClient ya es un singleton: llamar a esta función varias veces
// devuelve siempre la misma instancia.
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
