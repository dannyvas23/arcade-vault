import Link from "next/link";
import { notFound } from "next/navigation";
import GameCover from "@/components/game-cover";
import Leaderboard from "@/components/leaderboard";
import { GAMES, getGame } from "@/lib/games";
import { formatScore, seededScores } from "@/lib/scores";

// Los 8 ids se conocen en build: `params` se resuelve en el prerender.
export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function GameDetailPage({
  params,
}: PageProps<"/juegos/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  const scores = seededScores(game.id, 10);

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <GameCover cover={game.cover} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {formatScore(game.best)}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard rows={scores} />
      </aside>
    </div>
  );
}
