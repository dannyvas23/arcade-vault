import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Cliente de Supabase para Server Components, Server Functions y Route Handlers.
// Se crea en cada llamada y no se guarda en una variable de módulo: depende de
// las cookies de cada petición.
//
// `cookies()` es un acceso en tiempo de petición: con `cacheComponents`, quien
// llame a esta función debe hacerlo dentro de un <Suspense> para que el resto
// de la ruta se siga prerenderizando.
export async function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Un Server Component no puede escribir cookies. Se ignora: sin Auth
          // aún no hay sesión que refrescar (el proxy llegará con esa spec).
        }
      },
    },
  });
}
