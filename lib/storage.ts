// Persistencia de puntuaciones en localStorage.
// Todo va envuelto en try/catch: si el almacenamiento no está disponible
// (modo privado, cuota llena, SSR) se degrada a "sin datos".

export type SavedScore = {
  gameId: string;
  name: string;
  score: number;
  at: number; // Date.now()
};

export const SCORES_KEY = "av:v1:scores";

export function readScores(): SavedScore[] {
  try {
    const raw = window.localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedScore[]) : [];
  } catch {
    return [];
  }
}

export function appendScore(s: SavedScore): void {
  try {
    const next = [...readScores(), s];
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(next));
  } catch {
    // sin persistencia: la app sigue funcionando
  }
}
