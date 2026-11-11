"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useScores } from "@/components/scores-provider";
import { GAMES } from "@/lib/games";
import { formatScore, seededScores } from "@/lib/scores";

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

export default function HallOfFame() {
  const [tab, setTab] = useState(GAMES[0].id);
  const { bestScore } = useScores();

  const rows = useMemo(() => seededScores(tab, ROWS), [tab]);
  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];

  // Con `ready: false` (servidor y primer render) bestScore devuelve null,
  // así que la fila se pinta como «sin puntuaciones» sin cambiar el layout.
  const mine = bestScore(tab);
  // Posición dentro del Top 12 si la marca entra; si no, «—».
  const rawRank = mine ? rows.filter((r) => r.score > mine.score).length + 1 : null;
  const myRank = rawRank !== null && rawRank <= ROWS ? rawRank : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
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

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{rows[1].name}</div>
          <div className="score">{formatScore(rows[1].score)}</div>
          <div className="date">{rows[1].date}</div>
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
          <div className="name">{rows[0].name}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {formatScore(rows[0].score)}
          </div>
          <div className="date">{rows[0].date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{rows[2].name}</div>
          <div className="score">{formatScore(rows[2].score)}</div>
          <div className="date">{rows[2].date}</div>
        </div>
      </div>

      <div className="hall-table">
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
              "tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{pad(r.rank)}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{formatScore(r.score)}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
        <div
          className="tr you"
          style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
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
        <Link href="/" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
