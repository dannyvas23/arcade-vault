"use client";

import { useState } from "react";
import Link from "next/link";
import { useScores } from "@/components/scores-provider";
import type { Game } from "@/lib/games";
import { formatScore, type ScoreRow } from "@/lib/scores";

const ROWS = 12;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(at: number): string {
  return new Date(at).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// `scores` trae el Top 12 de cada juego, cargado en la página: `null` si esa
// lectura falló y `[]` si el juego aún no tiene puntuaciones.
export default function HallOfFame({
  games,
  scores,
}: {
  games: Game[];
  scores: Record<string, ScoreRow[] | null>;
}) {
  const [tab, setTab] = useState(games[0].id);
  const { bestScore } = useScores();

  const rows = scores[tab] ?? null;
  const game = games.find((g) => g.id === tab) ?? games[0];
  // Puestos del podio; los que falten (1 o 2 filas) se pintan con «—».
  const [first, second, third] = rows ?? [];

  // Con `ready: false` (servidor y primer render) bestScore devuelve null,
  // así que la fila se pinta como «sin puntuaciones» sin cambiar el layout.
  const mine = bestScore(tab);
  // Posición dentro del Top 12 si la marca entra; si no, «—». Sin ranking
  // cargado (error) no se puede calcular.
  const rawRank =
    mine && rows ? rows.filter((r) => r.score > mine.score).length + 1 : null;
  const myRank = rawRank !== null && rawRank <= ROWS ? rawRank : null;

  const hasRows = rows !== null && rows.length > 0;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            aria-pressed={tab === g.id}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows === null && (
        <div
          role="alert"
          className="pixel"
          style={{
            padding: "56px 16px",
            textAlign: "center",
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--magenta)",
          }}
        >
          NO SE PUDO CARGAR EL RANKING
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <div
          role="status"
          className="pixel"
          style={{
            padding: "56px 16px",
            textAlign: "center",
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--ink-faint)",
          }}
        >
          SIN PUNTUACIONES TODAVÍA
        </div>
      )}

      {hasRows && (
        <div className="podium">
          <div className="podium-slot silver">
            <div className="rank-num">02</div>
            <div className="name">{second?.name ?? "—"}</div>
            <div className="score">{second ? formatScore(second.score) : "—"}</div>
            <div className="date">{second?.date ?? "—"}</div>
          </div>
          <div className="podium-slot gold">
            <div
              className="pixel"
              style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
            >
              CAMPEÓN
            </div>
            <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
              01
            </div>
            <div className="name">{first?.name ?? "—"}</div>
            <div className="score" style={{ fontSize: 20 }}>
              {first ? formatScore(first.score) : "—"}
            </div>
            <div className="date">{first?.date ?? "—"}</div>
          </div>
          <div className="podium-slot bronze">
            <div className="rank-num">03</div>
            <div className="name">{third?.name ?? "—"}</div>
            <div className="score">{third ? formatScore(third.score) : "—"}</div>
            <div className="date">{third?.date ?? "—"}</div>
          </div>
        </div>
      )}

      <div className="hall-table">
        {hasRows && (
          <>
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={`${tab}-${i}`}
                className={
                  "tr" +
                  (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{pad(r.rank)}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{formatScore(r.score)}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </>
        )}
        <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
        <div
          className="tr you"
          style={{ animationDelay: `${(rows?.length ?? 0) * 50 + 50}ms` }}
        >
          <div className="rk" style={{ color: "var(--yellow)" }}>
            {myRank !== null ? `#${pad(myRank)}` : "—"}
          </div>
          <div className="pl" style={{ color: "var(--yellow)" }}>
            {mine ? mine.name : "—"}
          </div>
          <div
            className="sc"
            style={{
              color: "var(--yellow)",
              textShadow: "0 0 6px rgba(245,255,0,0.5)",
            }}
          >
            {mine ? formatScore(mine.score) : "—"}
          </div>
          <div className="dt">{mine ? formatDate(mine.at) : "—"}</div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
