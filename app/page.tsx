import Home from "@/components/home";
import { getGames } from "@/lib/data/games";

export default async function HomePage() {
  const games = await getGames();
  return <Home games={games} />;
}
