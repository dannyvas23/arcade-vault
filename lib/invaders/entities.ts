// Entidades y constantes del juego INVADERS. Sin React, sin acceso al DOM y sin
// dibujo: el motor (engine.ts) dibuja con la paleta que recibe. No hay código de
// origen: los valores y los mapas de bits son diseño propio de la SPEC 09. Las
// funciones son puras; la aleatoriedad llega como argumento.

// ── Dimensiones lógicas del canvas ───────────────────────────────────────────
export const W = 800;
export const H = 600;
export const PLAY_TOP = 40; // la zona de juego queda por debajo del HUD del canvas
export const GROUND_Y = 568; // línea de suelo, justo bajo el cañón (y 540 + 20)

// ── Cañón ────────────────────────────────────────────────────────────────────
export const CANNON_W = 40;
export const CANNON_H = 20;
export const CANNON_Y = 540;
export const CANNON_START_X = 380;
export const CANNON_SPEED = 300; // px/s
export const CANNON_MIN_X = 16;
export const CANNON_MAX_X = 744;

// ── Bala del jugador ─────────────────────────────────────────────────────────
export const PLAYER_SHOT_W = 4;
export const PLAYER_SHOT_H = 14;
export const PLAYER_SHOT_SPEED = 600; // px/s hacia arriba

// ── Formación ────────────────────────────────────────────────────────────────
export const FORMATION_COLS = 11;
export const FORMATION_ROWS = 5;
export const CELL_W = 48;
export const CELL_H = 40;
export const FORMATION_ORIGIN_X = 136;
export const FORMATION_BASE_Y = 80;
export const WAVE_Y_OFFSET = 24; // cada oleada nace 24 px más abajo
export const STEP_PX = 12; // paso horizontal
export const DROP_PX = 24; // descenso al tocar un borde
export const BOUNDS_MIN_X = 16;
export const BOUNDS_MAX_X = 784;
export const LOSE_LINE_Y = 540; // un invasor vivo con su borde inferior aquí o más abajo termina la partida

// Hitbox de invasor: 3 px por píxel del mapa de bits, alto 24, desplazada 8 px
// dentro de su celda y centrada en horizontal.
export const BITMAP_PIXEL = 3;
export const INVADER_HITBOX_H = 24;
export const INVADER_HITBOX_OFFSET_Y = 8;

export const MIN_STEP_INTERVAL = 40; // ms

// ── Disparo de los invasores ─────────────────────────────────────────────────
export const MAX_INVADER_SHOTS = 3;
export const INVADER_SHOT_W = 6;
export const INVADER_SHOT_H = 16;

// ── Escudos ──────────────────────────────────────────────────────────────────
export const SHIELD_COUNT = 4;
export const SHIELD_COLS = 8;
export const SHIELD_ROWS = 5;
export const SHIELD_CELL = 8; // px por celda → escudo de 64×40
export const SHIELD_Y = 440;
export const SHIELD_XS = [68, 268, 468, 668];
// Celdas que faltan en la fila de abajo (el arco del escudo): 40 - 2 = 38 celdas.
const SHIELD_GAP_COLS = [3, 4];
export const SHIELD_CELLS = SHIELD_COLS * SHIELD_ROWS - SHIELD_GAP_COLS.length; // 38

// ── Nave nodriza ─────────────────────────────────────────────────────────────
export const UFO_W = 48;
export const UFO_H = 20;
export const UFO_Y = 56;
export const UFO_SPEED = 120; // px/s
// Ventanas (en segundos desde el inicio de la oleada) en las que aparece cada una
// de las 2 naves nodrizas de la oleada.
export const UFO_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [10, 20],
  [30, 40]
];
// Puntos por la nave nodriza: UFO_SCORES[(disparos - 1) % 15], con `disparos` =
// disparos del jugador en la partida, contando el que acierta.
export const UFO_SCORES: number[] = [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100];

// ── Reglas ───────────────────────────────────────────────────────────────────
export const INITIAL_LIVES = 3;
export const WAVE_COUNT = 4;
export const CANNON_HIT_FREEZE = 1000; // ms con la formación congelada y el cañón en explosión
export const WAVE_BANNER_DURATION = 1500; // ms del cartel «OLEADA n»
export const EXPLOSION_DURATION = 150; // ms, desvanecido del invasor destruido
export const MAX_DT = 0.05; // s, tope del paso de tiempo

// ── HUD del canvas ───────────────────────────────────────────────────────────
export const HUD_MARGIN = 16;
export const HUD_BASELINE_Y = 28;
export const LIFE_ICON_W = 20;
export const LIFE_ICON_H = 10;
export const LIFE_ICON_SPACING = 6;

// ── Tipos ────────────────────────────────────────────────────────────────────
export type Rect = { x: number; y: number; w: number; h: number };

export type InvaderKind = "squid" | "crab" | "octopus";

export type Invader = {
  kind: InvaderKind;
  col: number; // 0 a 10
  row: number; // 0 a 4
  alive: boolean;
  fade: number; // ms que quedan de desvanecido tras destruirlo (0 = no se dibuja)
};

export type Formation = {
  x: number; // esquina superior izquierda de la parrilla de 11×5 celdas
  y: number;
  dir: 1 | -1; // sentido horizontal actual
  frame: 0 | 1; // fotograma de mapa de bits, alterna en cada paso
  invaders: Invader[]; // por filas: índice = row × 11 + col
};

// Escudo: matriz de celdas booleanas (true = celda en pie), indexada [fila][columna].
export type Shield = { x: number; y: number; cells: boolean[][] };

// ── Mapas de bits de los invasores ───────────────────────────────────────────
// 2 fotogramas por tipo (frames[fotograma][fila], '#' = píxel). Tamaños 8×8, 11×8
// y 12×8; con BITMAP_PIXEL = 3 dan hitboxes de 24×24, 33×24 y 36×24.
export const INVADER_BITMAPS: Record<InvaderKind, string[][]> = {
  squid: [
    [
      "...##...",
      "..####..",
      ".######.",
      "##.##.##",
      "########",
      "..#..#..",
      ".#.##.#.",
      "#.#..#.#"
    ],
    [
      "...##...",
      "..####..",
      ".######.",
      "##.##.##",
      "########",
      ".#.##.#.",
      "#......#",
      ".#....#."
    ]
  ],
  crab: [
    [
      "..#.....#..",
      "...#...#...",
      "..#######..",
      ".##.###.##.",
      "###########",
      "#.#######.#",
      "#.#.....#.#",
      "...##.##..."
    ],
    [
      "..#.....#..",
      "#..#...#..#",
      "#.#######.#",
      "###.###.###",
      "###########",
      ".#########.",
      "..#.....#..",
      ".#.......#."
    ]
  ],
  octopus: [
    [
      "....####....",
      ".##########.",
      "############",
      "###..##..###",
      "############",
      "...##..##...",
      "..##.##.##..",
      "##........##"
    ],
    [
      "....####....",
      ".##########.",
      "############",
      "###..##..###",
      "############",
      "..###..###..",
      ".##..##..##.",
      "..##....##.."
    ]
  ]
};

// Ancho en píxeles lógicos de cada tipo de invasor (píxeles del mapa × 3).
export const INVADER_WIDTH: Record<InvaderKind, number> = {
  squid: INVADER_BITMAPS.squid[0][0].length * BITMAP_PIXEL, // 24
  crab: INVADER_BITMAPS.crab[0][0].length * BITMAP_PIXEL, // 33
  octopus: INVADER_BITMAPS.octopus[0][0].length * BITMAP_PIXEL // 36
};

// ── Puntos y ritmo ───────────────────────────────────────────────────────────
export const INVADER_POINTS: Record<InvaderKind, number> = {
  squid: 30,
  crab: 20,
  octopus: 10
};

// Tipo de invasor de la fila `row`: 0 → squid; 1 y 2 → crab; 3 y 4 → octopus.
export function kindForRow(row: number): InvaderKind {
  if (row === 0) return "squid";
  return row <= 2 ? "crab" : "octopus";
}

// Intervalo entre pasos de la formación (ms): 515 con 55 vivos en la oleada 1 y
// nunca menos de 40.
export const stepIntervalMs = (alive: number, wave: number): number =>
  Math.max(MIN_STEP_INTERVAL, 20 + 9 * alive - 30 * (wave - 1));

// Velocidad de las balas de los invasores (px/s): 240, 270, 300 y 330.
export const invaderShotSpeed = (wave: number): number => 240 + 30 * (wave - 1);

// Intervalo entre disparos de los invasores (s): 1,10, 0,95, 0,80 y 0,65.
export const invaderFireInterval = (wave: number): number =>
  Math.max(0.45, 1.1 - 0.15 * (wave - 1));

// Puntos de la nave nodriza con el disparo número `shots` de la partida (≥ 1).
export const ufoPoints = (shots: number): number => UFO_SCORES[(shots - 1) % UFO_SCORES.length];

// Instantes (s desde el inicio de la oleada) de las 2 naves nodrizas, sorteados con
// `random()` (un valor en [0, 1)) dentro de sus ventanas.
export const ufoSpawnTimes = (random: () => number): number[] =>
  UFO_WINDOWS.map(([from, to]) => from + random() * (to - from));

// ── Colisiones ───────────────────────────────────────────────────────────────
// ¿Se solapan dos rectángulos? (bordes que solo se tocan no cuentan)
export function collideAABB(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Formación ────────────────────────────────────────────────────────────────
// Formación de la oleada `wave` (1 a 4): 55 invasores vivos, mirando a la derecha,
// con origen en x 136 e y `80 + 24 × (oleada - 1)`.
export function buildFormation(wave: number): Formation {
  const invaders: Invader[] = [];
  for (let row = 0; row < FORMATION_ROWS; row++) {
    for (let col = 0; col < FORMATION_COLS; col++) {
      invaders.push({ kind: kindForRow(row), col, row, alive: true, fade: 0 });
    }
  }
  return {
    x: FORMATION_ORIGIN_X,
    y: FORMATION_BASE_Y + WAVE_Y_OFFSET * (wave - 1),
    dir: 1,
    frame: 0,
    invaders
  };
}

// Hitbox de un invasor en el canvas: ancho según su tipo, alto 24, desplazada 8 px
// dentro de su celda de 48×40 y centrada en horizontal.
export function invaderRect(formation: Formation, invader: Invader): Rect {
  const w = INVADER_WIDTH[invader.kind];
  return {
    x: formation.x + invader.col * CELL_W + (CELL_W - w) / 2,
    y: formation.y + invader.row * CELL_H + INVADER_HITBOX_OFFSET_Y,
    w,
    h: INVADER_HITBOX_H
  };
}

// ── Escudos ──────────────────────────────────────────────────────────────────
// Los 4 escudos de una oleada, completos (38 celdas en pie cada uno).
export function buildShields(): Shield[] {
  return SHIELD_XS.map((x) => ({
    x,
    y: SHIELD_Y,
    cells: Array.from({ length: SHIELD_ROWS }, (_, row) =>
      Array.from(
        { length: SHIELD_COLS },
        (_, col) => !(row === SHIELD_ROWS - 1 && SHIELD_GAP_COLS.includes(col))
      )
    )
  }));
}

// Rectángulo de 8×8 de la celda (`row`, `col`) de un escudo, en el canvas.
export function shieldCellRect(shield: Shield, row: number, col: number): Rect {
  return {
    x: shield.x + col * SHIELD_CELL,
    y: shield.y + row * SHIELD_CELL,
    w: SHIELD_CELL,
    h: SHIELD_CELL
  };
}
