import { Suspense } from "react";
import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import { GAMES, getGame } from "@/lib/games";

// Los 8 ids se conocen en build: `params` se resuelve en el prerender.
export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

// La página no espera `params`: lo lee un componente interno dentro de
// <Suspense>, para que ids no listados en generateStaticParams (p. ej.
// /juegos/no-existe/jugar) no bloqueen el shell estático.
export default function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense fallback={null}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({
  params,
}: {
  params: PageProps<"/juegos/[id]/jugar">["params"];
}) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
