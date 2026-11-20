// Motor del juego SNAKE. No depende de React ni lee el DOM: recibe el canvas, la
// paleta, la hoja de sprites (ya cargada, o null) y los callbacks desde fuera.
// Todo el tablero se dibuja en un único canvas de 800×600; la puntuación y el
// nivel se muestran solo en el HUD de la plataforma.

import {
  advanceSnake,
  CELL,
  type Cell,
  collides,
  COLS,
  createSnake,
  DIRECTION_DELTA,
  type Direction,
  FRUIT_POINTS,
  H,
  isOpposite,
  levelForFruits,
  MAX_QUEUED_TURNS,
  nextHead,
  pickFreeCell,
  ROWS,
  sameCell,
  START_DIRECTION,
  stepIntervalForLevel,
  W,
} from "./entities";
import { FRUIT_SPRITES, SPRITE_H, SPRITE_Y } from "./sprites";

export type SnakePalette = {
  body: string; // cuerpo de la serpiente      → var(--green)
  head: string; // cabeza                      → var(--cyan)
  grid: string; // cuadrícula                  → var(--line-2)
  fruitFallback: string; // fruta si no hay sprites → var(--magenta)
  text: string; // textos del canvas           → var(--ink)
};

export type SnakeStats = { score: number; level: number }; // sin vidas

export type SnakeCallbacks = {
  onStats: (s: SnakeStats) => void; // solo cuando cambia algún valor
  onGameOver: (s: SnakeStats) => void; // una vez por partida (derrota o tablero completo)
};

type GameState = "waiting" | "playing" | "gameover";
type EndReason = "lose" | "full";

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

const WAITING_TEXT = "PULSA UNA FLECHA PARA EMPEZAR";

export class SnakeEngine {
  private ctx: CanvasRenderingContext2D;

  // Estado de la partida
  private snake: Cell[] = createSnake(); // cabeza en el índice 0
  private direction: Direction = START_DIRECTION;
  private queue: Direction[] = []; // giros pendientes (hasta MAX_QUEUED_TURNS)
  private fruit: Cell | null = null;
  private fruitSprite = 0; // índice en FRUIT_SPRITES
  private fruits = 0; // frutas comidas
  private score = 0;
  private level = 1;
  private state: GameState = "waiting";
  private endReason: EndReason = "lose";
  private stepAccum = 0;
  private gameOverEmitted = false;

  // Teclado
  private listening = false;

  // Bucle
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private paused = false;
  private destroyed = false;

  // Última estadística emitida (null → forzar la próxima emisión)
  private lastStats: SnakeStats | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private palette: SnakePalette,
    private sprites: HTMLImageElement | null,
    private cb: SnakeCallbacks,
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

  /** Nueva partida (3 celdas, 0 puntos, nivel 1, a la espera de tecla). */
  restart(): void {
    if (this.destroyed) return;
    this.paused = false;
    this.initGame();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.queue = []; // un giro pulsado antes de la pausa no se aplica al reanudar
    this.stepAccum = 0;
    this.lastTime = null; // evita un salto de tiempo al reanudar
  }

  /** Termina la partida (botón FIN), por la misma ruta que perder. */
  finish(): void {
    if (this.destroyed) return;
    this.endGame("lose");
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

  // Fuera de los campos de texto se evita la acción por defecto de las ocho
  // teclas (no desplazan la página), aunque haya pausa o la partida haya terminado.
  private onKeyDown = (e: KeyboardEvent): void => {
    if (SnakeEngine.isTextField(e.target)) return;
    const dir = KEY_DIRECTIONS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (this.paused || this.state === "gameover") return;
    this.turn(dir);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (KEY_DIRECTIONS[e.code] && !SnakeEngine.isTextField(e.target)) {
      e.preventDefault();
    }
  };

  // Aplica el giro en el momento: encola hasta MAX_QUEUED_TURNS y se ignora la
  // inversión de 180° y repetir la última dirección encolada. En la espera, la
  // primera dirección válida inicia la partida.
  private turn(dir: Direction): void {
    if (this.state === "waiting") {
      if (isOpposite(this.direction, dir)) return;
      // La tecla entra en la cola como cualquier giro (salvo seguir recto), para
      // que el primer paso vaya en su dirección y un segundo giro rápido no la pise.
      if (dir !== this.direction) this.queue.push(dir);
      this.state = "playing";
      this.stepAccum = 0;
      this.lastTime = null;
      return;
    }
    if (this.queue.length >= MAX_QUEUED_TURNS) return;
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.direction;
    if (dir === last || isOpposite(last, dir)) return;
    this.queue.push(dir);
  }

  // ── Estado de la partida ───────────────────────────────────────────────────

  // Math.random se llama aquí (start/restart) y al comer, nunca en el constructor
  // ni durante el render.
  private initGame(): void {
    this.snake = createSnake();
    this.direction = START_DIRECTION;
    this.queue = [];
    this.fruits = 0;
    this.score = 0;
    this.level = 1;
    this.state = "waiting";
    this.endReason = "lose";
    this.stepAccum = 0;
    this.gameOverEmitted = false;
    this.lastStats = null;
    this.lastTime = null;
    this.spawnFruit();
    this.emitStats();
  }

  // Coloca una fruta nueva en una celda libre con un sprite al azar. Sin celda
  // libre el tablero está completo y la partida termina.
  private spawnFruit(): void {
    this.fruit = pickFreeCell(this.snake, Math.random);
    this.fruitSprite = Math.floor(Math.random() * FRUIT_SPRITES.length);
    if (!this.fruit) this.endGame("full");
  }

  // Un paso de la serpiente: aplica el siguiente giro encolado, avanza una
  // celda y resuelve muerte, fruta y nivel.
  private step(): void {
    const queued = this.queue.shift();
    if (queued) this.direction = queued;

    const head = nextHead(this.snake, this.direction);
    const eats = this.fruit !== null && sameCell(head, this.fruit);
    if (collides(this.snake, head, eats)) {
      this.endGame("lose");
      return;
    }
    this.snake = advanceSnake(this.snake, head, eats);
    if (!eats) return;

    this.fruits++;
    this.score += FRUIT_POINTS;
    this.level = levelForFruits(this.fruits);
    this.spawnFruit();
    this.emitStats();
  }

  // Fin de partida: la usan el choque, el tablero completo y el botón FIN.
  private endGame(reason: EndReason): void {
    if (this.state === "gameover") return;
    this.state = "gameover";
    this.endReason = reason;
    this.queue = [];
    this.emitStats();
    if (!this.gameOverEmitted) {
      this.gameOverEmitted = true;
      this.cb.onGameOver(this.stats());
    }
  }

  private stats(): SnakeStats {
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

  // Acumulador de intervalo: como máximo un paso por fotograma. Se conserva el
  // resto para mantener el ritmo, y si un fotograma largo (pestaña en segundo
  // plano) deja un exceso de un paso entero o más, se descarta.
  private update(dt: number): void {
    if (this.state !== "playing") return;
    const interval = stepIntervalForLevel(this.level);
    this.stepAccum += dt;
    if (this.stepAccum < interval) return;
    this.stepAccum -= interval;
    if (this.stepAccum >= interval) this.stepAccum = 0;
    this.step();
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, ROWS * CELL);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(COLS * CELL, r * CELL + 0.5);
    }
    ctx.stroke();
  }

  // Sprite escalado sin deformar para caber en la celda y centrado en ella; sin
  // hoja (la imagen no cargó), un círculo de respaldo.
  private drawFruit(): void {
    if (!this.fruit) return;
    const ctx = this.ctx;
    const px = this.fruit.x * CELL;
    const py = this.fruit.y * CELL;
    if (!this.sprites) {
      ctx.fillStyle = this.palette.fruitFallback;
      ctx.beginPath();
      ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const sprite = FRUIT_SPRITES[this.fruitSprite];
    const scale = Math.min(CELL / sprite.w, CELL / SPRITE_H);
    const dw = sprite.w * scale;
    const dh = SPRITE_H * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      this.sprites,
      sprite.x,
      SPRITE_Y,
      sprite.w,
      SPRITE_H,
      px + (CELL - dw) / 2,
      py + (CELL - dh) / 2,
      dw,
      dh,
    );
  }

  // Cuerpo en verde que se atenúa hacia la cola; cabeza en cian con brillo y ojos.
  private drawSnake(): void {
    const ctx = this.ctx;
    const last = this.snake.length - 1;
    ctx.fillStyle = this.palette.body;
    for (let i = last; i >= 1; i--) {
      const { x, y } = this.snake[i];
      ctx.globalAlpha = 1 - 0.45 * (i / Math.max(last, 1));
      ctx.beginPath();
      ctx.roundRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 6);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const head = this.snake[0];
    const hx = head.x * CELL;
    const hy = head.y * CELL;
    ctx.save();
    ctx.shadowColor = this.palette.head;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.palette.head;
    ctx.beginPath();
    ctx.roundRect(hx + 1, hy + 1, CELL - 2, CELL - 2, 7);
    ctx.fill();
    ctx.restore();

    // Ojos: dos puntos hacia delante, a ambos lados del eje de avance.
    const f = DIRECTION_DELTA[this.direction];
    const cx = hx + CELL / 2 + f.x * 4;
    const cy = hy + CELL / 2 + f.y * 4;
    ctx.fillStyle = "#000";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx - f.y * side * 5, cy + f.x * side * 5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWaiting(): void {
    const ctx = this.ctx;
    const cy = 190;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, cy - 40, W, 64);
    ctx.restore();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = this.palette.text;
    ctx.font = "bold 28px monospace";
    ctx.fillText(WAITING_TEXT, W / 2, cy);
  }

  private drawOverlay(): void {
    const ctx = this.ctx;
    const cx = W / 2;
    const cy = H / 2;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillStyle = this.palette.text;
    ctx.font = "bold 36px monospace";
    ctx.fillText(this.endReason === "full" ? "¡TABLERO COMPLETO!" : "GAME OVER", cx, cy - 12);
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
    this.drawGrid();
    this.drawFruit();
    this.drawSnake();
    if (this.state === "waiting") this.drawWaiting();
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
