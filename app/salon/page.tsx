import HallOfFame from "@/components/hall-of-fame";
import { getGames } from "@/lib/data/games";

export default async function SalonPage() {
  const games = await getGames();
  return <HallOfFame games={games} />;
}
