// Tipos y constantes del catálogo. Los datos viven en Supabase (tabla `games`,
// vista `games_catalog`) y se leen con `lib/data/games.ts`.

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string; // slug de la ruta, p. ej. "bloque-buster"
  title: string; // "BLOQUE BUSTER"
  short: string; // descripción de la tarjeta
  long: string; // descripción de la pantalla de detalle
  cat: GameCategory; // columna `category`
  cover: string; // clase CSS de globals.css, p. ej. "cover-bricks"
  color: GameColor; // define el color del botón JUGAR en la tarjeta
  best: number; // MAX(score) del juego (columna `best` de games_catalog)
  plays: number; // entero (12400); se muestra con formatPlays
};

export const CATS: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
