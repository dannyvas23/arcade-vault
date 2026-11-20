// Contrato común de los juegos con motor real (solo tipos). Cada juego notifica
// al Reproductor su puntuación y, si los tiene, sus vidas y su nivel.
export type GameStats = { score: number; lives?: number; level?: number };

export type GameHandle = { restart(): void; finish(): void };

export type GameCanvasProps = {
  ref: React.Ref<GameHandle>;
  paused: boolean;
  onStats: (s: GameStats) => void;
  onGameOver: (s: GameStats) => void;
};
