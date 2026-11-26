"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth/messages";
import { normalizePlayerName } from "@/lib/auth/player-name";
import {
  validateEmail,
  validatePassword,
  validatePlayerName,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

// Estado que devuelven las acciones de formulario (`useActionState`).
// `values` devuelve lo escrito (nunca la contraseña): React vacía el formulario
// al terminar la acción y así el jugador no pierde lo que tecleó.
export type AuthFormField = "email" | "password" | "confirm" | "playerName";
export type AuthFormState =
  | null
  | {
      ok: false;
      error: string;
      fields?: Partial<Record<AuthFormField, string>>;
      values?: Partial<Record<"email" | "playerName", string>>;
    }
  | { ok: true; notice: "revisa-correo" | "enlace-enviado" };

// Los datos de un FormData llegan del navegador: se comprueba el tipo en runtime.
function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

// Origen de la petición para construir las URLs de retorno. Supabase solo
// acepta las que están en su lista de Redirect URLs, así que una cabecera
// falsa no abre una redirección a otro dominio.
async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function signUpFailure(
  error: AuthError,
  values: NonNullable<Extract<AuthFormState, { ok: false }>["values"]>,
): Extract<AuthFormState, { ok: false }> {
  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return {
        ok: false,
        error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
        values,
      };
    case "email_address_not_authorized":
      return {
        ok: false,
        error:
          "Este correo aún no puede recibir mensajes de la plataforma. Prueba con otro.",
        fields: { email: "Este correo no está autorizado todavía." },
        values,
      };
    case "email_address_invalid":
      return {
        ok: false,
        error: "Revisa los campos marcados.",
        fields: { email: "Escribe un correo válido." },
        values,
      };
    case "weak_password":
      return {
        ok: false,
        error: "Revisa los campos marcados.",
        fields: { password: "Esa contraseña es demasiado débil." },
        values,
      };
    case "signup_disabled":
      return {
        ok: false,
        error: "El registro está desactivado temporalmente.",
        values,
      };
    default:
      return {
        ok: false,
        error: "No se pudo crear la cuenta. Inténtalo de nuevo.",
        values,
      };
  }
}

// Alta por email. Con «Confirm email» activo no hay sesión hasta que el jugador
// pulsa el enlace del correo (`/auth/confirm`). Un correo que ya existe
// responde igual que uno nuevo: Supabase lo oculta para no revelar qué
// correos tienen cuenta, y aquí tampoco se distingue.
export async function signUp(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const email = text(form.get("email")).trim();
  const password = text(form.get("password"));
  const confirm = text(form.get("confirm"));
  const playerName = normalizePlayerName(text(form.get("playerName")));
  const values = { email, playerName };

  const fields: Partial<Record<AuthFormField, string>> = {};
  const emailError = validateEmail(email);
  if (emailError) fields.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) fields.password = passwordError;
  else if (password !== confirm) fields.confirm = "Las contraseñas no coinciden.";
  const nameError = validatePlayerName(playerName);
  if (nameError) fields.playerName = nameError;

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Revisa los campos marcados.", fields, values };
  }

  try {
    const supabase = await createClient();
    const origin = await getOrigin();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { player_name: playerName },
        emailRedirectTo: `${origin}/auth/confirm`,
      },
    });
    if (error) return signUpFailure(error, values);
  } catch {
    return {
      ok: false,
      error: "No se pudo crear la cuenta. Inténtalo de nuevo.",
      values,
    };
  }

  return { ok: true, notice: "revisa-correo" };
}

function signInFailure(
  error: AuthError,
  values: NonNullable<Extract<AuthFormState, { ok: false }>["values"]>,
): Extract<AuthFormState, { ok: false }> {
  switch (error.code) {
    case "email_not_confirmed":
      return {
        ok: false,
        error: AUTH_ERROR_MESSAGES["correo-sin-confirmar"],
        values,
      };
    case "invalid_credentials":
      // El mismo mensaje exista o no la cuenta: no se revela qué correos la
      // tienen.
      return { ok: false, error: "CORREO O CONTRASEÑA INCORRECTOS", values };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return {
        ok: false,
        error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
        values,
      };
    default:
      return {
        ok: false,
        error: "No se pudo entrar. Inténtalo de nuevo.",
        values,
      };
  }
}

// Login con correo y contraseña. Éxito: `redirect("/")` (siempre a la home, sin
// `?next=`). `redirect` lanza una excepción, así que va fuera del try/catch.
export async function signIn(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const email = text(form.get("email")).trim();
  const password = text(form.get("password"));
  const values = { email };

  const fields: Partial<Record<AuthFormField, string>> = {};
  const emailError = validateEmail(email);
  if (emailError) fields.email = emailError;
  if (!password) fields.password = "Escribe tu contraseña.";

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Revisa los campos marcados.", fields, values };
  }

  let failure: AuthFormState = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) failure = signInFailure(error, values);
  } catch {
    failure = {
      ok: false,
      error: "No se pudo entrar. Inténtalo de nuevo.",
      values,
    };
  }
  if (failure) return failure;

  redirect("/");
}

// Cierra la sesión de este navegador (`scope: "local"`: no echa al jugador de
// sus otros dispositivos) y vuelve a la home.
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Aunque falle la llamada, se vuelve a la home: el proxy refrescará o
    // descartará la sesión en la siguiente petición.
  }
  redirect("/");
}
