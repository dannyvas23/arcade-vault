import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Refresca la sesión de Supabase en cada petición de página (se llama desde
// `proxy.ts`). Crea un cliente sobre las cookies de la petición, pregunta por
// los claims y reescribe en la respuesta las cookies que Supabase haya
// renovado.
//
// `getClaims()` valida la firma del JWT; nunca se usa `getSession()` para
// decidir acceso porque lee una cookie que el cliente puede manipular.
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  isAuthed: boolean;
}> {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Primero en la petición, para que los Server Components que se
        // rendericen después vean la sesión ya renovada...
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        // ...y después en la respuesta, para que llegue al navegador.
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Una respuesta con cookies de sesión no debe cachearse en CDN.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  return { response, isAuthed: Boolean(data?.claims) };
}
