"use client";

import Link from "next/link";
import GameCover from "@/components/game-cover";
import type { Game } from "@/lib/games";
import { formatScore } from "@/lib/scores";

// Toda la tarjeta es un único enlace al detalle: un solo punto de Tab, Enter
// la activa y navega una sola vez. El «JUGAR» es solo visual (un <span>, no un
// segundo control interactivo anidado dentro del enlace).
export default function GameCard({ game }: { game: Game }) {
  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };
  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = "";
  };

  const btnColor =
    game.color === "magenta" ? " magenta" : game.color === "yellow" ? " yellow" : "";

  return (
    <Link
      href={`/juegos/${game.id}`}
      className="card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="cover">
        <GameCover cover={game.cover} />
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{formatScore(game.best)}</b>
          </div>
          <span className={"btn" + btnColor}>JUGAR</span>
        </div>
      </div>
    </Link>
  );
}
