import { formatScore, type ScoreRow } from "@/lib/scores";

// Tabla «MEJORES PUNTUACIONES». Las 3 primeras filas van en dorado, plata y bronce.
export default function Leaderboard({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows.map((r, i) => (
        <div
          key={r.name}
          className={
            "lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
          }
        >
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
              }}
            >
              {r.date}
            </div>
          </div>
          <div className="sc">{formatScore(r.score)}</div>
        </div>
      ))}
    </div>
  );
}
