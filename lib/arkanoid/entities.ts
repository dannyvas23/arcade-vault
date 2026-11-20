// Entidades y constantes del juego ARKANOID, portadas de
// references/started-games/04-arkanoid/game.js. Sin React, sin acceso al DOM y
// sin dibujo: el motor (engine.ts) dibuja con la paleta que recibe.

import { LEVELS, type BlockColor } from "./levels";

// ── Dimensiones lógicas del canvas ───────────────────────────────────────────
export const W = 800;
export const H = 600;

// ── Pala ─────────────────────────────────────────────────────────────────────
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_BOUNCE_TOLERANCE = 8; // px bajo la pala en los que aún rebota

// ── Pelota ───────────────────────────────────────────────────────────────────
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200; // px/s, se multiplica por `speed` del nivel
export const BASE_BALL_VY = -300;

// ── Bloques ──────────────────────────────────────────────────────────────────
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;

// ── Reglas ───────────────────────────────────────────────────────────────────
export const POINTS_PER_BLOCK = 10;
export const INITIAL_LIVES = 3;
export const LEVEL_COUNT = LEVELS.length; // 5
export const EXPLOSION_DURATION = 150; // ms, desvanecido del bloque roto
export const MAX_DT = 0.05; // s, tope del paso de tiempo

// ── HUD del canvas ───────────────────────────────────────────────────────────
export const HUD_MARGIN = 10;
export const LIFE_BALL_SIZE = 16;
export const LIFE_BALL_SPACING = 4;

// ── Tipos ────────────────────────────────────────────────────────────────────
export type Rect = { x: number; y: number; w: number; h: number };

export type Paddle = Rect;

export type Ball = Rect & { vx: number; vy: number };

export type Block = Rect & { color: BlockColor; alive: boolean };

// ¿Se solapan dos rectángulos? (bordes que solo se tocan no cuentan)
export function collideAABB(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Bloques del nivel `level` (1 a 5), todos vivos y en su posición del canvas.
export function buildBlocks(level: number): Block[] {
  return LEVELS[level - 1].blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}
