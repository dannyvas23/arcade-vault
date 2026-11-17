import { formatScore, type ScoreRow } from "@/lib/scores";

// Tabla «MEJORES PUNTUACIONES». Las 3 primeras filas van en dorado, plata y bronce.
// `rows` es `null` cuando la lectura del ranking falló y `[]` cuando el juego
// aún no tiene puntuaciones.
export default function Leaderboard({ rows }: { rows: ScoreRow[] | null }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows === null && (
        <div
          role="alert"
          className="pixel"
          style={{
            padding: "28px 16px",
            textAlign: "center",
            fontSize: 11,
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
            padding: "28px 16px",
            textAlign: "center",
            fontSize: 11,
            lineHeight: 1.6,
            color: "var(--ink-faint)",
          }}
        >
          SIN PUNTUACIONES TODAVÍA
        </div>
      )}
      {rows?.map((r, i) => (
        // Un mismo jugador puede repetirse en el ranking: la clave es el puesto.
        <div
          key={r.rank}
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
