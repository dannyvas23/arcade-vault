// Motor del juego ARKANOID, portado de references/started-games/04-arkanoid/game.js.
// No depende de React ni lee el DOM: recibe el canvas, la paleta, los audios y
// los callbacks desde fuera. Todo (bloques, pala, pelota, HUD y pantallas de
// fin) se dibuja en un único canvas de 800×600.

import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  buildBlocks,
  collideAABB,
  EXPLOSION_DURATION,
  H,
  HUD_MARGIN,
  INITIAL_LIVES,
  LEVEL_COUNT,
  LIFE_BALL_SIZE,
  LIFE_BALL_SPACING,
  MAX_DT,
  PADDLE_BOUNCE_TOLERANCE,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  POINTS_PER_BLOCK,
  W,
  type Ball,
  type Block,
  type Paddle,
} from "./entities";
import { LEVELS, type BlockColor } from "./levels";

export type { BlockColor } from "./levels";

export type ArkanoidPalette = {
  blocks: Record<BlockColor, string>; // colores de bloque → variables CSS
  paddle: string; // pala             → var(--silver)
  ball: string; // pelota y vidas     → var(--ink)
  text: string; // HUD y pantallas    → var(--ink)
};

export type ArkanoidSounds = {
  bounce: HTMLAudioElement; // ball-bounce.mp3, creado por el wrapper
  break: HTMLAudioElement; // break-sound.mp3, creado por el wrapper
};

export type ArkanoidStats = { score: number; lives: number; level: number };

export type ArkanoidCallbacks = {
  onStats: (s: ArkanoidStats) => void; // solo cuando cambia algún valor
  onGameOver: (s: ArkanoidStats) => void; // una vez por partida (derrota o victoria)
};

type GameState = "playing" | "gameover" | "win";

// Desvanecido de un bloque roto (sustituye a la explosión por fotogramas).
type Explosion = Block & { elapsed: number }; // ms

type GameKey = "ArrowLeft" | "ArrowRight";

const isGameKey = (key: string): key is GameKey => key === "ArrowLeft" || key === "ArrowRight";

export class ArkanoidEngine {
  private ctx: CanvasRenderingContext2D;

  // Estado de la partida
  private paddle: Paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  private ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];
  private score = 0;
  private lives = INITIAL_LIVES;
  private level = 1;
  private state: GameState = "playing";

  // Teclado: mapa de teclas mantenidas
  private keys: Record<GameKey, boolean> = { ArrowLeft: false, ArrowRight: false };
  private listening = false;

  // Sonido: copias en reproducción, para poder detenerlas
  private activeSounds = new Set<HTMLAudioElement>();

  // Bucle
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private paused = false;
  private destroyed = false;

  // Última estadística emitida (null → forzar la próxima emisión)
  private lastStats: ArkanoidStats | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private palette: ArkanoidPalette,
    private sounds: ArkanoidSounds,
    private cb: ArkanoidCallbacks,
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

  /** Nueva partida (3 vidas, nivel 1, puntuación 0). */
  restart(): void {
    if (this.destroyed) return;
    this.paused = false;
    this.initGame();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.lastTime = null; // evita un salto de tiempo al reanudar
    this.releaseKeys();
    if (paused) this.stopSounds();
  }

  /** Termina la partida (botón FIN), por la misma ruta que perder la última vida. */
  finish(): void {
    if (this.destroyed) return;
    this.stopSounds();
    this.endGame("gameover");
  }

  /** Cancela el bucle, quita los listeners de teclado y detiene los sonidos. */
  destroy(): void {
    this.destroyed = true;
    this.stopLoop();
    this.removeListeners();
    this.stopSounds();
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

  private releaseKeys(): void {
    this.keys.ArrowLeft = false;
    this.keys.ArrowRight = false;
  }

  // Se ignora en los campos de texto (el modal de iniciales). Fuera de ellos se
  // evita la acción por defecto de las flechas (no desplazan la página) aunque
  // haya pausa o la partida haya terminado, pero solo se registran si se juega.
  private onKeyDown = (e: KeyboardEvent): void => {
    if (ArkanoidEngine.isTextField(e.target)) return;
    if (!isGameKey(e.key)) return;
    e.preventDefault();
    if (this.paused || this.state !== "playing") return;
    this.keys[e.key] = true;
  };

  // keyup siempre actualiza el mapa, incluso con pausa, partida terminada o foco
  // en un campo de texto, para que una flecha soltada nunca quede «pegada».
  private onKeyUp = (e: KeyboardEvent): void => {
    if (!isGameKey(e.key)) return;
    this.keys[e.key] = false;
    if (!ArkanoidEngine.isTextField(e.target)) e.preventDefault();
  };

  // ── Sonido ─────────────────────────────────────────────────────────────────

  // Reproduce una copia para que los sonidos puedan solaparse. El rechazo de
  // play() (política de reproducción automática, pause() inmediato) se ignora.
  private playSound(base: HTMLAudioElement): void {
    if (this.destroyed) return;
    const copy = base.cloneNode() as HTMLAudioElement;
    const release = () => this.activeSounds.delete(copy);
    copy.addEventListener("ended", release, { once: true });
    copy.addEventListener("error", release, { once: true });
    this.activeSounds.add(copy);
    try {
      void copy.play()?.catch(release);
    } catch {
      release();
    }
  }

  private stopSounds(): void {
    for (const sound of this.activeSounds) sound.pause();
    this.activeSounds.clear();
  }

  // ── Estado de la partida ───────────────────────────────────────────────────

  // Todo el estado se crea aquí (start/restart), nunca durante el render. El
  // original no usa Math.random(), así que el motor tampoco.
  private initGame(): void {
    this.stopSounds();
    this.releaseKeys();
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.state = "playing";
    this.lastStats = null;
    this.lastTime = null;
    this.paddle.x = (W - this.paddle.w) / 2;
    this.loadLevel(1);
    this.emitStats();
  }

  // Carga el nivel `n`: bloques nuevos y pelota sobre la pala. La pala no se
  // recentra y la puntuación se conserva.
  private loadLevel(n: number): void {
    this.level = n;
    this.blocks = buildBlocks(n);
    this.explosions = [];
    this.placeBall();
  }

  // Pelota sobre la pala, ya en movimiento, con la velocidad del nivel actual.
  private placeBall(): void {
    const speed = LEVELS[this.level - 1].speed;
    const ball = this.ball;
    ball.x = this.paddle.x + (this.paddle.w - ball.w) / 2;
    ball.y = this.paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  // Fin de partida: la usan perder la última vida, la victoria y el botón FIN.
  private endGame(kind: Exclude<GameState, "playing">): void {
    if (this.state !== "playing") return;
    this.state = kind;
    this.emitStats();
    this.cb.onGameOver(this.stats());
  }

  private stats(): ArkanoidStats {
    return { score: this.score, lives: this.lives, level: this.level };
  }

  private emitStats(): void {
    const s = this.stats();
    const last = this.lastStats;
    if (last && last.score === s.score && last.lives === s.lives && last.level === s.level) return;
    this.lastStats = s;
    this.cb.onStats({ ...s });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  // `dt` va en segundos. Los desvanecidos avanzan también tras el fin de la
  // partida, para que el último bloque roto no se quede congelado en pantalla.
  private update(dt: number): void {
    if (this.state === "playing") this.step(dt);
    for (const exp of this.explosions) exp.elapsed += dt * 1000;
    this.explosions = this.explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
  }

  private step(dt: number): void {
    const { paddle, ball } = this;
    let bounced = false;
    let broke = false;
    let outcome: "gameover" | "win" | null = null;

    // Pala: con las dos flechas a la vez no se mueve.
    const dir = (this.keys.ArrowRight ? 1 : 0) - (this.keys.ArrowLeft ? 1 : 0);
    if (dir !== 0) {
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x + dir * PADDLE_SPEED * dt));
    }

    // Pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Rebotes en pared izquierda, derecha y techo
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      bounced = true;
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      bounced = true;
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      bounced = true;
    }

    // Rebote en la pala: solo bajando; no depende del punto de impacto
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_BOUNCE_TOLERANCE
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      bounced = true;
    }

    // Colisión con bloques: un solo bloque por fotograma; siempre invierte vy
    for (const block of this.blocks) {
      if (!block.alive || !collideAABB(ball, block)) continue;
      block.alive = false;
      this.explosions.push({ ...block, elapsed: 0 });
      this.score += POINTS_PER_BLOCK;
      ball.vy = -ball.vy;
      broke = true;
      if (this.blocks.every((b) => !b.alive)) {
        if (this.level < LEVEL_COUNT) this.loadLevel(this.level + 1);
        else outcome = "win";
      }
      break;
    }

    // Un fotograma suena como mucho un efecto: romper un bloque, si no, rebotar.
    if (broke) this.playSound(this.sounds.break);
    else if (bounced) this.playSound(this.sounds.bounce);

    // Pelota perdida
    if (!outcome && ball.y > H) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        outcome = "gameover";
      } else {
        this.placeBall();
      }
    }

    if (outcome) this.endGame(outcome);
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  private drawBlock(b: Block, alpha: number): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.palette.blocks[b.color];
    ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.globalAlpha = 0.28 * alpha; // borde superior iluminado
    ctx.fillStyle = this.palette.text;
    ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 3);
    ctx.globalAlpha = 0.3 * alpha; // base en sombra
    ctx.fillStyle = "#000";
    ctx.fillRect(b.x + 1, b.y + b.h - 4, b.w - 2, 3);
    ctx.globalAlpha = 1;
  }

  // Un círculo con halo neón: lo único que brilla en la partida es lo que se mueve.
  private drawGlowBall(x: number, y: number, size: number, glow: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.palette.ball;
    ctx.shadowColor = this.palette.ball;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPaddle(): void {
    const ctx = this.ctx;
    const p = this.paddle;
    ctx.save();
    ctx.fillStyle = this.palette.paddle;
    ctx.shadowColor = this.palette.paddle;
    ctx.shadowBlur = 12;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.restore();
    ctx.globalAlpha = 0.35; // brillo superior
    ctx.fillStyle = this.palette.text;
    ctx.fillRect(p.x, p.y, p.w, 3);
    ctx.globalAlpha = 1;
  }

  private drawHud(): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.palette.text;
    ctx.font = "bold 18px monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${this.score}`, HUD_MARGIN, HUD_MARGIN);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL: ${this.level}`, W / 2, HUD_MARGIN);
    for (let i = 0; i < this.lives; i++) {
      const bx = W - HUD_MARGIN - (this.lives - i) * (LIFE_BALL_SIZE + LIFE_BALL_SPACING);
      this.drawGlowBall(bx, HUD_MARGIN, LIFE_BALL_SIZE, 0);
    }
  }

  // Ajusta el tamaño de letra para que el texto quepa en `maxWidth` píxeles.
  private fitFont(text: string, size: number, maxWidth: number): void {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px monospace`;
    const width = ctx.measureText(text).width;
    if (width > maxWidth) {
      ctx.font = `bold ${Math.floor((size * maxWidth) / width)}px monospace`;
    }
  }

  private drawOverlay(title: string, size: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.fillStyle = this.palette.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    this.fitFont(title, size, W - 40);
    ctx.fillText(title, W / 2, H / 2 - 20);
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.font = "bold 24px monospace";
    ctx.fillText(`PUNTAJE: ${this.score}`, W / 2, H / 2 + 36);
    ctx.restore();
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (const block of this.blocks) {
      if (block.alive) this.drawBlock(block, 1);
    }
    for (const exp of this.explosions) {
      this.drawBlock(exp, Math.max(0, 1 - exp.elapsed / EXPLOSION_DURATION));
    }

    this.drawPaddle();
    this.drawGlowBall(this.ball.x, this.ball.y, this.ball.w, 10);

    if (this.state === "playing") this.drawHud();
    if (this.state === "gameover") this.drawOverlay("GAME OVER", 64);
    if (this.state === "win") this.drawOverlay("¡COMPLETASTE EL JUEGO!", 40);
  }

  // ── Bucle principal ────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (this.destroyed) return;
    if (this.paused) {
      this.lastTime = null;
    } else {
      const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, MAX_DT);
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
