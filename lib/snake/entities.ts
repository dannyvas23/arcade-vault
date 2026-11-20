// Entidades y constantes del juego SNAKE. Sin React, sin acceso al DOM y sin
// dibujo: el motor (engine.ts) dibuja con la paleta que recibe. Todas las
// funciones son puras; la aleatoriedad llega como argumento.

// ── Dimensiones lógicas del canvas ───────────────────────────────────────────
export const W = 800;
export const H = 600;

// ── Tablero ──────────────────────────────────────────────────────────────────
export const COLS = 32;
export const ROWS = 24;
export const CELL = 25; // tamaño de celda en píxeles lógicos → tablero 800×600

// ── Reglas ───────────────────────────────────────────────────────────────────
export const START_LENGTH = 3;
// Centro del tablero: columna 16, fila 12 con 32×24. Derivada de COLS y ROWS para
// que la serpiente inicial siga cabiendo si se reduce el tablero para probar el
// fin por tablero completo.
export const START_HEAD: Cell = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
export const START_DIRECTION: Direction = "right";
export const FRUIT_POINTS = 10;
export const FRUITS_PER_LEVEL = 5;
export const MAX_QUEUED_TURNS = 2;

export const INITIAL_STEP_INTERVAL = 150; // ms por celda en el nivel 1
export const MIN_STEP_INTERVAL = 60;
export const STEP_INTERVAL_DECREASE = 10; // ms menos por cada nivel

export const levelForFruits = (fruits: number): number =>
  1 + Math.floor(fruits / FRUITS_PER_LEVEL);

export const stepIntervalForLevel = (level: number): number =>
  Math.max(MIN_STEP_INTERVAL, INITIAL_STEP_INTERVAL - (level - 1) * STEP_INTERVAL_DECREASE);

// ── Tipos ────────────────────────────────────────────────────────────────────
export type Cell = { x: number; y: number }; // columna y fila, origen arriba a la izquierda
export type Direction = "up" | "down" | "left" | "right";

export const DIRECTION_DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

export const isOpposite = (a: Direction, b: Direction): boolean => OPPOSITE[a] === b;

// ── Serpiente ────────────────────────────────────────────────────────────────
// La serpiente es un array de celdas con la cabeza en el índice 0 y la cola al final.

// Serpiente inicial: 3 celdas hacia la izquierda de la cabeza, mirando a la derecha.
export function createSnake(): Cell[] {
  return Array.from({ length: START_LENGTH }, (_, i) => ({
    x: START_HEAD.x - i,
    y: START_HEAD.y
  }));
}

export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

export const isInsideBoard = (cell: Cell): boolean =>
  cell.x >= 0 && cell.x < COLS && cell.y >= 0 && cell.y < ROWS;

// Celda a la que iría la cabeza al avanzar un paso en `direction`.
export function nextHead(snake: Cell[], direction: Direction): Cell {
  const delta = DIRECTION_DELTA[direction];
  return { x: snake[0].x + delta.x, y: snake[0].y + delta.y };
}

// ¿Muere la serpiente al entrar la cabeza en `head`? Muere al salir del tablero o
// al entrar en su propio cuerpo. Si no come, la cola se retira en este mismo paso,
// así que su celda no cuenta como ocupada; si come, la cola no se mueve y sí cuenta.
export function collides(snake: Cell[], head: Cell, grows: boolean): boolean {
  if (!isInsideBoard(head)) return true;
  const occupied = grows ? snake : snake.slice(0, -1);
  return occupied.some((cell) => sameCell(cell, head));
}

// Serpiente tras un paso: añade la cabeza y retira la cola salvo que crezca.
export function advanceSnake(snake: Cell[], head: Cell, grows: boolean): Cell[] {
  const next = [head, ...snake];
  if (!grows) next.pop();
  return next;
}

// Elige una celda libre del tablero con `random()` (un valor en [0, 1)).
// Devuelve null si la serpiente ocupa todas las celdas.
export function pickFreeCell(snake: Cell[], random: () => number): Cell | null {
  const freeCount = COLS * ROWS - snake.length;
  if (freeCount <= 0) return null;
  const occupied = new Set(snake.map((cell) => cell.y * COLS + cell.x));
  let target = Math.min(freeCount - 1, Math.floor(random() * freeCount));
  for (let index = 0; index < COLS * ROWS; index++) {
    if (occupied.has(index)) continue;
    if (target === 0) return { x: index % COLS, y: Math.floor(index / COLS) };
    target--;
  }
  return null;
}
