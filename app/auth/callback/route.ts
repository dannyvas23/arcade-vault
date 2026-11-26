import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra el flujo OAuth (Google, GitHub): el proveedor vuelve a Supabase,
// Supabase vuelve aquí con `?code=...` y se intercambia por una sesión (el
// verificador PKCE lo guardó `signInWithProvider` en las cookies). Éxito: `/`.
// Si el jugador cancela o algo falla: `/login?error=<codigo>`, nunca con texto
// recibido por URL.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  function redirectTo(pathname: string, search = "") {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    return NextResponse.redirect(url);
  }
  const fail = (code: "oauth-cancelado" | "oauth-fallo") =>
    redirectTo("/login", `?error=${code}`);

  // Al cancelar en el proveedor, Supabase vuelve con ?error=access_denied.
  if (searchParams.has("error") || searchParams.has("error_code")) {
    return fail(
      searchParams.get("error") === "access_denied"
        ? "oauth-cancelado"
        : "oauth-fallo",
    );
  }

  const code = searchParams.get("code");
  if (!code) return fail("oauth-fallo");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail("oauth-fallo");

  return redirectTo("/");
}
