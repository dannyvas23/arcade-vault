import { cacheLife, cacheTag } from "next/cache";
import type { ScoreRow } from "@/lib/scores";
import { createPublicClient } from "@/lib/supabase/public";

// Capa de lectura de los rankings. La etiqueta `scores:<gameId>` la invalida
// `submitScore` al guardar una puntuación de ese juego.

// `timeZone: "UTC"` fija el día sin importar la zona del servidor o del
// navegador, para que el HTML del servidor y el del cliente coincidan.
const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

// Lectura cacheada. Lanza si Supabase falla: así el error no se guarda en la
// caché y la siguiente petición vuelve a intentarlo.
async function fetchTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`scores:${gameId}`);

  const { data, error } = await createPublicClient()
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(
      `No se pudo leer el ranking de "${gameId}": ${error.message}`,
    );
  }

  return data.map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: DATE_FORMAT.format(new Date(row.created_at)),
  }));
}

// Mejores `limit` puntuaciones de un juego (score descendente y, a igualdad,
// la más antigua primero). Devuelve `null` si la lectura falla, para que la
// vista muestre su estado de error sin tumbar el resto de la página; una lista
// vacía significa que el juego aún no tiene puntuaciones.
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[] | null> {
  try {
    return await fetchTopScores(gameId, limit);
  } catch {
    return null;
  }
}
