import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra el enlace del correo de confirmación de alta (flujo PKCE): Supabase
// verifica el token y vuelve aquí con `?code=...`. Se intercambia por una
// sesión y se va a `/`. Cualquier fallo vuelve a `/login` con un código
// cerrado, nunca con texto recibido por URL.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  function fail(code: "enlace-invalido" | "enlace-caducado") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?error=${code}`;
    return NextResponse.redirect(url);
  }

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

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}
