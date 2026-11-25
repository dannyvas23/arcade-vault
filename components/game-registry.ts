import type { ComponentType } from "react";
import ArkanoidCanvas from "@/components/arkanoid-canvas";
import AsteroidsCanvas from "@/components/asteroids-canvas";
import InvadersCanvas from "@/components/invaders-canvas";
import SnakeCanvas from "@/components/snake-canvas";
import TetrisCanvas from "@/components/tetris-canvas";
import type { GameCanvasProps } from "@/lib/game-types";

export type GameEntry = {
  Canvas: ComponentType<GameCanvasProps>;
  // false → el HUD de la plataforma muestra «—» en ese campo
  hud: { lives: boolean; level: boolean };
};

// Juegos con motor real, por id del catálogo. Los que no están aquí siguen con
// la simulación del Reproductor.
export const GAME_REGISTRY: Record<string, GameEntry> = {
  rocas: { Canvas: AsteroidsCanvas, hud: { lives: true, level: true } },
  // TETRIS no tiene vidas: el HUD de la plataforma muestra «—» en Vidas.
  tetris: { Canvas: TetrisCanvas, hud: { lives: false, level: true } },
  arkanoid: { Canvas: ArkanoidCanvas, hud: { lives: true, level: true } },
  // SNAKE no tiene vidas: el HUD de la plataforma muestra «—» en Vidas.
  snake: { Canvas: SnakeCanvas, hud: { lives: false, level: true } },
  invaders: { Canvas: InvadersCanvas, hud: { lives: true, level: true } },
};
