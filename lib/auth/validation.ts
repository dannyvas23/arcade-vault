import {
  PLAYER_NAME_MAX,
  isValidPlayerName,
  normalizePlayerName,
} from "@/lib/auth/player-name";

// Reglas compartidas por los formularios y las Server Actions. La validación
// del servidor es la que manda; la del formulario solo ahorra un viaje.
export const PASSWORD_MIN = 6; // mínimo de Supabase
export const PASSWORD_MAX = 72; // límite de bcrypt
export const EMAIL_MAX = 254;

// Cada función devuelve el mensaje de error, o null si el valor es válido.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Escribe tu correo.";
  if (value.length > EMAIL_MAX) {
    return `El correo no puede superar ${EMAIL_MAX} caracteres.`;
  }
  if (!EMAIL_PATTERN.test(value)) return "Escribe un correo válido.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`;
  }
  return null;
}

export function validatePlayerName(name: string): string | null {
  const value = normalizePlayerName(name);
  if (!value) return "Elige un nombre de jugador.";
  if (value.length > PLAYER_NAME_MAX) {
    return `El nombre no puede superar ${PLAYER_NAME_MAX} caracteres.`;
  }
  if (!isValidPlayerName(value)) {
    return "Usa solo letras sin acento, números, espacios, «_» o «-».";
  }
  return null;
}
