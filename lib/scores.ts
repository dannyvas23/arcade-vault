// Rankings mock deterministas. Portado de references/templates/data.jsx

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
};

const PLAYERS = [
  "PX_KAI", "NEONFOX", "Z3R0COOL", "M00NRYU", "VAULT_07", "GLITCHA",
  "ATARI_KID", "CYBER_LU", "MAGENTA88", "SCANLINE", "BIT_LORD", "ARKADYA",
  "DROID_X", "RGB_QUEEN", "PIXEL_DAD", "RETROVIRA", "VECTORX", "JOY_STK",
];

const MODULUS = 233280;

// Hash estable (djb2) del id, acotado al módulo del generador congruencial.
// Sustituye al `id.length` de la plantilla para que dos juegos nunca
// compartan ranking.
function hashSeed(gameId: string): number {
  let h = 5381;
  for (let i = 0; i < gameId.length; i++) {
    h = (h * 33 + gameId.charCodeAt(i)) % MODULUS;
  }
  return h;
}

export function seededScores(gameId: string, count: number): ScoreRow[] {
  let s = hashSeed(gameId);
  const rand = () => (s = (s * 9301 + 49297) % MODULUS) / MODULUS;
  const used = new Set<string>();
  const rows: ScoreRow[] = [];

  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);

    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    rows.push({
      rank: i + 1,
      name,
      score: Math.max(score, 1000),
      date: `${day}/${mon}/2026`,
    });
  }

  return rows
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export function formatScore(n: number): string {
  return n.toLocaleString("es-ES");
}
