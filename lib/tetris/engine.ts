// Motor del juego TETRIS, portado de references/started-games/03-tetris/game.js.
// No depende de React ni lee el DOM: recibe el canvas, la paleta y los
// callbacks desde fuera. El tablero y el panel (SCORE, LINES, LEVEL, NEXT y
// CONTROLS) se dibujan en un único canvas de 800×600.

import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  Board,
  COLS,
  dropIntervalForLevel,
  H,
  HARD_DROP_POINTS,
  INITIAL_DROP_INTERVAL,
  KICKS,
  levelForLines,
  LINE_SCORES,
  PANEL_X,
  Piece,
  ROWS,
  SOFT_DROP_POINTS,
  W,
} from "./entities";

export type TetrisPalette = {
  pieces: string[]; // 8 colores: I, O, T, S, Z, J, L, N (índices 1 a 8 del original)
  grid: string; // cuadrícula             → var(--line-2)
  text: string; // valores del panel      → var(--cyan)
  label: string; // etiquetas y controles → var(--ink-dim)
  highlight: string; // brillo de bloque  → var(--ink)
};

export type TetrisStats = { score: number; level: number }; // sin vidas

export type TetrisCallbacks = {
  onStats: (s: TetrisStats) => void; // solo cuando cambia algún valor
  onGameOver: (s: TetrisStats) => void; // una vez por partida
};

type GameState = "playing" | "gameover";

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
]);

// Panel lateral
const NEXT_Y = 262;
const NEXT_SIZE = 4 * BLOCK; // 120×120
const CONTROLS = [
  "←  →     mover",
  "↑  X     rotar",
  "↓        bajar",
  "ESPACIO  caída",
];

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;

  // Estado de la partida
  private board = new Board();
  private current: Piece = new Piece(1);
  private next: Piece = new Piece(1);
  private score = 0;
  private lines = 0;
  private level = 1;
  private state: GameState = "playing";
  private dropInterval = INITIAL_DROP_INTERVAL;
  private dropAccum = 0;
  private gameOverEmitted = false;

  // Teclado
  private listening = false;

  // Bucle
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private paused = false;
  private destroyed = false;

  // Última estadística emitida (null → forzar la próxima emisión)
  private lastStats: TetrisStats | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private palette: TetrisPalette,
    private cb: TetrisCallbacks,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    canvas.width = W;
    canvas.height = H;
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /** Nueva partida e inicio del bucle requestAnimationFrame. */
  start(): void {
    if (this.destroyed) return;
    this.stopLoop();
    this.addListeners();
    this.initGame();
    this.rafId = requestAnimationFrame(this.loop);
  }

  /** Nueva partida (puntuación 0, 0 líneas, nivel 1). */
  restart(): void {
    if (this.destroyed) return;
    this.paused = false;
    this.initGame();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.lastTime = null; // evita un salto de tiempo al reanudar
  }

  /** Termina la partida (botón FIN), por la misma ruta que una pieza que no cabe. */
  finish(): void {
    if (this.destroyed) return;
    this.endGame();
  }

  /** Cancela el bucle y quita los listeners de teclado. */
  destroy(): void {
    this.destroyed = true;
    this.stopLoop();
    this.removeListeners();
  }

  // ── Teclado ────────────────────────────────────────────────────────────────

  private addListeners(): void {
    if (this.listening) return;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.listening = true;
  }

  private removeListeners(): void {
    if (!this.listening) return;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.listening = false;
  }

  private static isTextField(target: EventTarget | null): boolean {
    const tag = (target as HTMLElement | null)?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA";
  }

  // Cada tecla aplica su acción en el momento (no hay estado de teclas) y deja
  // pasar la auto-repetición del navegador, como el original. Fuera de los
  // campos de texto se evita la acción por defecto de las teclas del juego (no
  // desplazan la página ni activan el botón enfocado), aunque haya pausa.
  private onKeyDown = (e: KeyboardEvent): void => {
    if (TetrisEngine.isTextField(e.target)) return;
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (this.paused || this.state === "gameover") return;
    switch (e.code) {
      case "ArrowLeft":
        if (!this.board.collide(this.current.shape, this.current.x - 1, this.current.y))
          this.current.x--;
        break;
      case "ArrowRight":
        if (!this.board.collide(this.current.shape, this.current.x + 1, this.current.y))
          this.current.x++;
        break;
      case "ArrowDown":
        this.softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        this.tryRotate();
        break;
      case "Space":
        this.hardDrop();
        break;
    }
  };

  // Soltar una tecla del juego no tiene efecto propio, pero Espacio activa un
  // botón enfocado al soltarse: se evita fuera de los campos de texto.
  private onKeyUp = (e: KeyboardEvent): void => {
    if (GAME_KEYS.has(e.code) && !TetrisEngine.isTextField(e.target)) {
      e.preventDefault();
    }
  };

  // ── Estado de la partida ───────────────────────────────────────────────────

  // Math.random se llama aquí (start/restart), nunca durante el render.
  private initGame(): void {
    this.board.reset();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.state = "playing";
    this.dropInterval = INITIAL_DROP_INTERVAL;
    this.dropAccum = 0;
    this.gameOverEmitted = false;
    this.lastStats = null;
    this.lastTime = null;
    this.next = Piece.random();
    this.spawn();
    this.emitStats();
  }

  private spawn(): void {
    this.current = this.next;
    this.next = Piece.random();
    if (this.board.collide(this.current.shape, this.current.x, this.current.y)) {
      this.endGame();
    }
  }

  private lockPiece(): void {
    this.board.merge(this.current);
    this.clearLines();
    this.spawn();
  }

  private clearLines(): void {
    const cleared = this.board.clearLines();
    if (!cleared) return;
    this.lines += cleared;
    this.score += (LINE_SCORES[cleared] || 0) * this.level;
    this.level = levelForLines(this.lines);
    this.dropInterval = dropIntervalForLevel(this.level);
  }

  private ghostY(): number {
    let gy = this.current.y;
    while (!this.board.collide(this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }

  private hardDrop(): void {
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * HARD_DROP_POINTS;
    this.current.y = gy;
    this.lockPiece();
  }

  private softDrop(): void {
    if (!this.board.collide(this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += SOFT_DROP_POINTS;
    } else {
      this.lockPiece();
    }
  }

  // Giro horario con _wall kicks_: si ningún desplazamiento cabe, no gira.
  private tryRotate(): void {
    const rotated = this.current.rotated();
    for (const kick of KICKS) {
      if (!this.board.collide(rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  // Fin de partida: la usan una pieza que no cabe y el botón FIN.
  private endGame(): void {
    if (this.state === "gameover") return;
    this.state = "gameover";
    this.emitStats();
    if (!this.gameOverEmitted) {
      this.gameOverEmitted = true;
      this.cb.onGameOver(this.stats());
    }
  }

  private stats(): TetrisStats {
    return { score: this.score, level: this.level };
  }

  private emitStats(): void {
    const s = this.stats();
    const last = this.lastStats;
    if (last && last.score === s.score && last.level === s.level) return;
    this.lastStats = s;
    this.cb.onStats({ ...s });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  // Acumulador de intervalo: cada `dropInterval` ms la pieza baja una fila o se
  // fija. `dt` va en milisegundos y no tiene tope, como en el original.
  private update(dt: number): void {
    if (this.state === "gameover") return;
    this.dropAccum += dt;
    if (this.dropAccum >= this.dropInterval) {
      this.dropAccum = 0;
      if (!this.board.collide(this.current.shape, this.current.x, this.current.y + 1)) {
        this.current.y++;
      } else {
        this.lockPiece();
      }
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  private drawBlock(px: number, py: number, type: number, size: number, alpha = 1): void {
    if (!type) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.palette.pieces[type - 1];
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    ctx.globalAlpha = 0.12 * alpha; // brillo superior del bloque
    ctx.fillStyle = this.palette.highlight;
    ctx.fillRect(px + 1, py + 1, size - 2, 4);
    ctx.globalAlpha = 1;
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
    }
    ctx.stroke();
  }

  private drawBoard(): void {
    const ctx = this.ctx;
    this.drawGrid();

    ctx.strokeStyle = this.palette.label;
    ctx.lineWidth = 1;
    ctx.strokeRect(BOARD_X - 0.5, BOARD_Y + 0.5, COLS * BLOCK + 1, ROWS * BLOCK - 1);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.drawBlock(BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, this.board.cells[r][c], BLOCK);
      }
    }

    if (this.state === "gameover") return; // la pieza nueva puede solaparse con los bloques

    const { shape, x, y } = this.current;
    const gy = this.ghostY();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          this.drawBlock(BOARD_X + (x + c) * BLOCK, BOARD_Y + (gy + r) * BLOCK, shape[r][c], BLOCK, 0.2);
        }
      }
    }
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        this.drawBlock(BOARD_X + (x + c) * BLOCK, BOARD_Y + (y + r) * BLOCK, shape[r][c], BLOCK);
      }
    }
  }

  private drawStat(label: string, value: string, y: number): void {
    const ctx = this.ctx;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = this.palette.label;
    ctx.font = "bold 13px monospace";
    ctx.fillText(label, PANEL_X, y);
    ctx.fillStyle = this.palette.text;
    ctx.font = "bold 28px monospace";
    ctx.fillText(value, PANEL_X, y + 32);
  }

  private drawNext(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.palette.label;
    ctx.lineWidth = 1;
    ctx.strokeRect(PANEL_X + 0.5, NEXT_Y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);
    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        this.drawBlock(PANEL_X + (offX + c) * BLOCK, NEXT_Y + (offY + r) * BLOCK, shape[r][c], BLOCK);
      }
    }
  }

  private drawPanel(): void {
    const ctx = this.ctx;
    this.drawStat("SCORE", this.score.toLocaleString("es-ES"), 40);
    this.drawStat("LINES", String(this.lines), 110);
    this.drawStat("LEVEL", String(this.level), 180);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = this.palette.label;
    ctx.font = "bold 13px monospace";
    ctx.fillText("NEXT", PANEL_X, NEXT_Y - 12);
    this.drawNext();

    ctx.fillText("CONTROLS", PANEL_X, 424);
    ctx.font = "14px monospace";
    CONTROLS.forEach((line, i) => ctx.fillText(line, PANEL_X, 450 + i * 24));
  }

  private drawOverlay(): void {
    const ctx = this.ctx;
    const cx = BOARD_X + (COLS * BLOCK) / 2;
    const cy = BOARD_Y + (ROWS * BLOCK) / 2;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#000";
    ctx.fillRect(BOARD_X, BOARD_Y, COLS * BLOCK, ROWS * BLOCK);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillStyle = this.palette.text;
    ctx.font = "bold 36px monospace";
    ctx.fillText("GAME OVER", cx, cy - 12);
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.font = "18px monospace";
    ctx.fillText(`PUNTAJE: ${this.score}`, cx, cy + 24);
    ctx.restore();
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    this.drawBoard();
    this.drawPanel();
    if (this.state === "gameover") this.drawOverlay();
  }

  // ── Bucle principal ────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (this.destroyed) return;
    if (this.paused) {
      this.lastTime = null;
    } else {
      const dt = this.lastTime === null ? 0 : ts - this.lastTime;
      this.lastTime = ts;
      this.update(dt);
      this.emitStats();
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
