import type { NextRequest } from "next/server";
import { exchangeCodeAndRedirect } from "@/lib/auth/exchange-code";

// Enlace del correo de recuperación: abre la sesión de recuperación y lleva a
// `/restablecer` para fijar la contraseña nueva.
export async function GET(request: NextRequest) {
  return exchangeCodeAndRedirect(request, "/restablecer");
}
