"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

const NAME_MAX = 10;

// Los argumentos de una Server Action llegan del navegador y no se pueden
// fiar del tipo que declara TypeScript: se valida en runtime. Que el juego
// exista lo garantiza la clave foránea de `scores.game_id`; el resto de reglas
// (nombre de 1 a 10 caracteres, puntuación >= 0) las repiten los `check` de la
// tabla.
export async function submitScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SubmitScoreResult> {
  const gameId = typeof input?.gameId === "string" ? input.gameId : "";
  const name =
    typeof input?.name === "string" ? input.name.trim().toUpperCase() : "";
  const score = input?.score;

  if (gameId === "") {
    return { ok: false, error: "Falta el juego." };
  }
  if (name.length < 1 || name.length > NAME_MAX) {
    return { ok: false, error: "El nombre debe tener entre 1 y 10 caracteres." };
  }
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0) {
    return { ok: false, error: "La puntuación debe ser un entero mayor o igual a 0." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: name, score });

    if (error) {
      return { ok: false, error: "No se pudo guardar la puntuación." };
    }
  } catch {
    return { ok: false, error: "No se pudo guardar la puntuación." };
  }

  // El insert cambia el ranking del juego y, por el trigger, `plays` y `best`
  // del catálogo. `updateTag` expira ambas etiquetas para que la próxima lectura
  // ya vea el dato nuevo, sin esperar al `cacheLife`.
  updateTag("games");
  updateTag(`scores:${gameId}`);

  return { ok: true };
}
