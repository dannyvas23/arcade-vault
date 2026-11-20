// Niveles del juego ARKANOID, portados de
// references/started-games/04-arkanoid/levels.js. Datos puros: sin React, sin
// acceso al DOM y sin colores reales (el motor traduce cada BlockColor a la
// paleta que recibe).

// Nombres del original. Siguen el aspecto del spritesheet, no el nombre:
// `magenta` es morado y `hotpink` es naranja (ver el mapeo en engine.ts).
export type BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

export type LevelBlock = { col: number; row: number; color: BlockColor };
export type Level = { speed: number; blocks: LevelBlock[] };

const COLS = 10;
const ROWS = 6;

const ROW_COLORS_1: BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const ROW_COLORS_2: BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
const ROW_COLORS_4: BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

// Nivel 1: parrilla completa de 10×6 (60 bloques).
function level1(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      blocks.push({ col, row, color: ROW_COLORS_1[row] });
    }
  }
  return blocks;
}

// Nivel 2: pirámide (40 bloques).
function level2(): LevelBlock[] {
  const start = [4, 3, 2, 1, 0, 0];
  const end = [5, 6, 7, 8, 9, 9];
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = start[row]; col <= end[row]; col++) {
      blocks.push({ col, row, color: ROW_COLORS_2[row] });
    }
  }
  return blocks;
}

// Nivel 3: ajedrez, celdas con (col + row) par (30 bloques).
function level3(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if ((col + row) % 2 === 0) {
        blocks.push({ col, row, color: row < 3 ? "yellow" : "magenta" });
      }
    }
  }
  return blocks;
}

// Nivel 4: huecos fijos por fila (39 bloques). El original no usa Math.random().
function level4(): LevelBlock[] {
  const gaps = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!gaps[row].includes(col)) {
        blocks.push({ col, row, color: ROW_COLORS_4[row] });
      }
    }
  }
  return blocks;
}

// Nivel 5: marco más cruz (columna 4 y fila 2) (39 bloques).
function level5(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const isFrame = col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross) {
        blocks.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
      }
    }
  }
  return blocks;
}

// `speed` multiplica la velocidad base de la pelota (200, -300).
export const LEVELS: Level[] = [
  { speed: 1.0, blocks: level1() },
  { speed: 1.1, blocks: level2() },
  { speed: 1.21, blocks: level3() },
  { speed: 1.33, blocks: level4() },
  { speed: 1.46, blocks: level5() },
];
