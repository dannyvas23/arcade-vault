import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Pantallas de acceso: con sesión no tienen sentido, se vuelve a la home.
const GUEST_ONLY_PATHS = ["/login", "/registro", "/recuperar"];
// Solo se llega con la sesión de recuperación que abre el enlace del correo.
const AUTHED_ONLY_PATHS = ["/restablecer"];

function redirectTo(
  request: NextRequest,
  pathname: string,
  session: NextResponse,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  // Conserva las cookies de sesión que el refresco haya renovado.
  session.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  const { response, isAuthed } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isAuthed && GUEST_ONLY_PATHS.includes(pathname)) {
    return redirectTo(request, "/", response);
  }
  if (!isAuthed && AUTHED_ONLY_PATHS.includes(pathname)) {
    return redirectTo(request, "/recuperar", response);
  }

  // El proxy no protege ninguna otra ruta: la plataforma sigue abierta a
  // invitados. Solo refresca la sesión.
  return response;
}

export const config = {
  matcher: [
    // Todas las rutas salvo recursos estáticos: _next/static, _next/image,
    // favicon, los assets de los juegos (/games/) y las imágenes estáticas.
    "/((?!_next/static|_next/image|favicon.ico|games/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
