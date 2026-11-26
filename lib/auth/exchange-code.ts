import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra un enlace de correo (flujo PKCE): Supabase verifica el token y vuelve
// al `redirect_to` con `?code=...`. Se intercambia por una sesión y se redirige
// a `successPath`. Cualquier fallo vuelve a `/login` con un código cerrado,
// nunca con texto recibido por URL.
export async function exchangeCodeAndRedirect(
  request: NextRequest,
  successPath: string,
): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  function redirectTo(pathname: string, search = "") {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    return NextResponse.redirect(url);
  }
  const fail = (code: "enlace-invalido" | "enlace-caducado") =>
    redirectTo("/login", `?error=${code}`);

  // Si Supabase no pudo verificar el enlace, vuelve con ?error=... y
  // ?error_code=otp_expired (caducado o ya usado) u otro código.
  if (searchParams.has("error") || searchParams.has("error_code")) {
    return fail(
      searchParams.get("error_code") === "otp_expired"
        ? "enlace-caducado"
        : "enlace-invalido",
    );
  }

  const code = searchParams.get("code");
  if (!code) return fail("enlace-invalido");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail("enlace-invalido");

  return redirectTo(successPath);
}
