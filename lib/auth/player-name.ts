import type { User } from "@supabase/supabase-js";

export const PLAYER_NAME_MAX = 10;
// Tras recortar y pasar a mayúsculas.
export const PLAYER_NAME_PATTERN = /^[A-Z0-9 _-]{1,10}$/;

const FALLBACK_NAME = "JUGADOR";

// Recorta y pasa a mayúsculas. No sanea: un nombre con caracteres no válidos
// debe rechazarse con `isValidPlayerName`, no arreglarse en silencio.
export function normalizePlayerName(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidPlayerName(name: string): boolean {
  return PLAYER_NAME_PATTERN.test(name);
}

// Convierte un texto libre (nombre de un proveedor OAuth, parte local de un
// email) en un nombre válido: sin acentos, en mayúsculas, solo [A-Z0-9 _-],
// recortado y de 10 caracteres como máximo. Puede devolver "".
function sanitizePlayerName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, "")
    .trim()
    .slice(0, PLAYER_NAME_MAX)
    .trim();
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// Nombre que se muestra del jugador. Solo para pintar la interfaz:
// `user_metadata` lo puede editar el propio usuario, así que ninguna regla de
// acceso debe leerlo.
export function getPlayerName(user: User | null): string {
  if (!user) return FALLBACK_NAME;

  const metadata = user.user_metadata ?? {};

  // 1) Nombre elegido en el registro por email.
  const chosen = asString(metadata.player_name);
  if (chosen !== null) {
    const normalized = normalizePlayerName(chosen);
    if (isValidPlayerName(normalized)) return normalized;
  }

  // 2) Nombre que aporta el proveedor OAuth, y 3) parte local del email.
  const candidates = [
    asString(metadata.user_name),
    asString(metadata.full_name),
    asString(metadata.name),
    user.email ? user.email.split("@")[0] : null,
  ];
  for (const candidate of candidates) {
    if (candidate === null) continue;
    const sanitized = sanitizePlayerName(candidate);
    if (sanitized) return sanitized;
  }

  return FALLBACK_NAME;
}
