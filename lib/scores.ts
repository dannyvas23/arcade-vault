// Tipos y formateo de rankings. Los datos viven en Supabase (tabla `scores`) y
// se leen con `lib/data/scores.ts`.

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA"
};

export function formatScore(n: number): string {
  return n.toLocaleString("es-ES");
}

// Contador de partidas abreviado: 12400 → "12.4K", 18000 → "18.0K", 842 → "842".
export function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
