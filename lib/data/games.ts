import { cacheLife, cacheTag } from "next/cache";
import type { Game, GameCategory, GameColor } from "@/lib/games";
import type { Tables } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

// Capa de lectura del catálogo. Lee la vista `games_catalog` (columnas de
// `games` más `best`) con el cliente sin cookies, porque "use cache" no admite
// `cookies()`. La etiqueta "games" la invalida `submitScore` al guardar una
// puntuación (cambian `best` y `plays`).
//
// Si la lectura falla, las funciones lanzan: no hay respaldo del catálogo
// (decisión de la spec) y Next muestra su pantalla de error por defecto. Un
// error lanzado dentro de "use cache" no se guarda en la caché.

// Las columnas de una vista llegan tipadas como `T | null` aunque en la
// práctica vienen de `games`, donde son NOT NULL. Una fila incompleta se
// descarta en lugar de falsear el dato.
function toGame(row: Tables<"games_catalog">): Game | null {
  if (
    row.id === null ||
    row.title === null ||
    row.short === null ||
    row.long === null ||
    row.category === null ||
    row.cover === null ||
    row.color === null
  ) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.category as GameCategory, // check constraint en la BD
    cover: row.cover,
    color: row.color as GameColor, // check constraint en la BD
    best: row.best ?? 0,
    plays: row.plays ?? 0,
  };
}

// Catálogo completo, ordenado por `sort_order`.
export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("games");

  const { data, error } = await createPublicClient()
    .from("games_catalog")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`No se pudo leer el catálogo de juegos: ${error.message}`);
  }

  return data.flatMap((row) => toGame(row) ?? []);
}

// Un juego por id (slug), o `null` si no existe.
export async function getGame(id: string): Promise<Game | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("games");

  const { data, error } = await createPublicClient()
    .from("games_catalog")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el juego "${id}": ${error.message}`);
  }

  return data ? toGame(data) : null;
}
