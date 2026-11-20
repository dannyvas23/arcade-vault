// Entidades y constantes del juego TETRIS, portadas de
// references/started-games/03-tetris/game.js. Sin React, sin acceso al DOM y
// sin dibujo: el motor (engine.ts) dibuja con la paleta que recibe.

// ── Dimensiones lógicas del canvas ───────────────────────────────────────────
export const W = 800;
export const H = 600;

// ── Tablero ──────────────────────────────────────────────────────────────────
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30; // tamaño de celda en píxeles lógicos → tablero 300×600
export const BOARD_X = 100; // origen del tablero dentro del canvas
export const BOARD_Y = 0;
export const PANEL_X = 460; // origen del panel (SCORE, LINES, LEVEL, NEXT, CONTROLS)

// ── Reglas ───────────────────────────────────────────────────────────────────
export const LINE_SCORES = [0, 100, 300, 500, 800]; // por 0, 1, 2, 3 y 4 líneas (× nivel)
export const SOFT_DROP_POINTS = 1; // por fila bajada con ↓
export const HARD_DROP_POINTS = 2; // por celda recorrida con Espacio
export const LINES_PER_LEVEL = 10;
export const KICKS = [0, -1, 1, -2, 2]; // desplazamientos al rotar pegada a la pared

export const INITIAL_DROP_INTERVAL = 1000; // ms por fila a nivel 1
export const MIN_DROP_INTERVAL = 100;
export const DROP_INTERVAL_STEP = 90; // ms menos por cada nivel

export const levelForLines = (lines: number): number =>
  Math.floor(lines / LINES_PER_LEVEL) + 1;

export const dropIntervalForLevel = (level: number): number =>
  Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (level - 1) * DROP_INTERVAL_STEP);

// ── Piezas ───────────────────────────────────────────────────────────────────
export type Shape = number[][];

// Índices 1 a 8 = I, O, T, S, Z, J, L, N (tuerca). El índice 0 es «celda vacía».
export const PIECE_COUNT = 7;
export const SHAPES: Shape[] = [
  [],
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]] // L
  //[[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (tuerca)
];

// Giro de 90° en sentido horario: transpuesta + filas invertidas.
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}

export class Piece {
  type: number; // 1..8, índice en SHAPES y en la paleta
  shape: Shape;
  x: number;
  y: number;

  constructor(type: number) {
    this.type = type;
    this.shape = SHAPES[type].map((row) => [...row]);
    this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
    this.y = 0;
  }

  // Los 8 tipos con la misma probabilidad (sin bolsa), como el original.
  static random(): Piece {
    return new Piece(Math.floor(Math.random() * PIECE_COUNT) + 1);
  }

  rotated(): Shape {
    return rotateCW(this.shape);
  }
}

// ── Tablero ──────────────────────────────────────────────────────────────────
export class Board {
  cells: number[][]; // [fila][columna]: 0 = vacía, 1..8 = tipo de pieza fijada

  constructor() {
    this.cells = Board.emptyCells();
  }

  private static emptyCells(): number[][] {
    return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
  }

  reset(): void {
    this.cells = Board.emptyCells();
  }

  // ¿Choca `shape` colocada en (ox, oy) con las paredes, el suelo o bloques fijados?
  // Las filas por encima del tablero (ny < 0) no cuentan como colisión.
  collide(shape: Shape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && this.cells[ny][nx]) return true;
      }
    }
    return false;
  }

  // Fija la pieza en el tablero.
  merge(piece: Piece): void {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          this.cells[piece.y + r][piece.x + c] = piece.shape[r][c];
        }
      }
    }
  }

  // Elimina las filas completas (de abajo hacia arriba) y devuelve cuántas fueron.
  clearLines(): number {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.cells[r].every((v) => v !== 0)) {
        this.cells.splice(r, 1);
        this.cells.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++; // la fila que bajó ocupa ahora este índice: se vuelve a comprobar
      }
    }
    return cleared;
  }
}
