import type { NextRequest } from "next/server";
import { exchangeCodeAndRedirect } from "@/lib/auth/exchange-code";

// Enlace del correo de confirmación de alta: abre sesión y lleva a `/`.
export async function GET(request: NextRequest) {
  return exchangeCodeAndRedirect(request, "/");
}
