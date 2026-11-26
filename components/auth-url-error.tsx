"use client";

import { useSearchParams } from "next/navigation";
import { AuthAlert } from "@/components/auth-ui";
import { authErrorMessage } from "@/lib/auth/messages";

// Muestra el error que viaja en `?error=<codigo>`. Nunca pinta el texto
// recibido: el código se resuelve con `authErrorMessage` (un código
// desconocido da un mensaje genérico). Lee la URL con `useSearchParams`, así
// que debe renderizarse dentro de un <Suspense> (regla de `cacheComponents`).
export default function AuthUrlError() {
  const message = authErrorMessage(useSearchParams().get("error"));
  return message ? <AuthAlert>{message}</AuthAlert> : null;
}
