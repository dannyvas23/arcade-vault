// Códigos cerrados que viajan en la URL (`?error=<codigo>`). Nunca se pinta un
// texto recibido por URL: se resuelve el código con `authErrorMessage`.
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "enlace-invalido":
    "EL ENLACE NO ES VÁLIDO O YA SE USÓ. PIDE UNO NUEVO. (ÁBRELO EN EL MISMO NAVEGADOR DONDE LO PEDISTE)",
  "enlace-caducado": "EL ENLACE HA CADUCADO. PIDE UNO NUEVO.",
  "oauth-cancelado": "CANCELASTE EL ACCESO. PUEDES INTENTARLO DE NUEVO.",
  "oauth-fallo": "NO SE PUDO COMPLETAR EL ACCESO CON EL PROVEEDOR.",
  "correo-sin-confirmar":
    "CONFIRMA TU CORREO: REVISA TU BANDEJA DE ENTRADA Y PULSA EL ENLACE.",
};

const GENERIC_ERROR_MESSAGE = "ALGO SALIÓ MAL. INTÉNTALO DE NUEVO.";

export function authErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return Object.hasOwn(AUTH_ERROR_MESSAGES, code)
    ? AUTH_ERROR_MESSAGES[code]
    : GENERIC_ERROR_MESSAGE;
}
