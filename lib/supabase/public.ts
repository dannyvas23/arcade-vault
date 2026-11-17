import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Cliente de Supabase sin cookies ni sesión, para lecturas de datos públicos
// dentro de funciones con "use cache". Esas funciones no pueden llamar a
// `cookies()`, así que no sirven ni `server.ts` ni `client.ts`.
//
// No guarda sesión: siempre actúa con el rol `anon`.
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createSupabaseClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
