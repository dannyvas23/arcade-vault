import HallOfFame from "@/components/hall-of-fame";
import { getGames } from "@/lib/data/games";
import { getTopScores } from "@/lib/data/scores";
import type { ScoreRow } from "@/lib/scores";

// Filas del ranking de cada juego en el Salón de la Fama.
const HALL_ROWS = 12;

export default async function SalonPage() {
  const games = await getGames();

  // Se cargan los 8 rankings en la página y se pasan por props: cambiar de
  // pestaña no necesita ir a la red. Un ranking que falla llega como `null`.
  const entries = await Promise.all(
    games.map(
      async (g) => [g.id, await getTopScores(g.id, HALL_ROWS)] as const,
    ),
  );
  const scores: Record<string, ScoreRow[] | null> = Object.fromEntries(entries);

  return <HallOfFame games={games} scores={scores} />;
}
