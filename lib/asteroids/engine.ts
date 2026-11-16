// Motor del juego ROCAS (Asteroids), portado de
// references/started-games/02-asteroids/game.js. No depende de React ni lee el
// DOM: recibe el canvas, la paleta y los callbacks desde fuera.

import {
  Asteroid,
  Bullet,
  H,
  Particle,
  POINTS,
  PowerUp,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  rand,
  Ship,
  W,
  dist,
  type Keys,
} from "./entities";

export type AsteroidsPalette = {
  ship: string; // nave            → var(--cyan)
  flame: string; // llama          → var(--yellow)
  bullet: string; // balas         → var(--yellow)
  asteroid: string; // asteroides  → var(--magenta)
  powerUp: string; // power-up 3x  → var(--green)
  text: string; // HUD del canvas  → var(--cyan)
};

export type AsteroidsStats = { score: number; lives: number; level: number };

export type AsteroidsCallbacks = {
  onStats: (s: AsteroidsStats) => void; // solo cuando cambia algún valor
  onGameOver: (s: AsteroidsStats) => void; // una vez por partida
};

type GameState = "playing" | "dead" | "gameover";

// Partícula de explosión con el color del objeto que explota.
type Spark = { p: Particle; color: string };

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);
const SAFE_DIST = 130;
const MAX_DT = 0.05;

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;

  // Estado de la partida
  private ship = new Ship();
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private sparks: Spark[] = [];
  private powerUps: PowerUp[] = [];
  private score = 0;
  private lives = 3;
  private level = 1;
  private state: GameState = "playing";
  private deadTimer = 0;
  private powerUpSpawned = false;
  private killsSinceSpawn = 0;
  private gameOverEmitted = false;

  // Teclado
  private keys: Keys = {};
  private justPressed: Keys = {};
  private listening = false;

  // Bucle
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private paused = false;
  private destroyed = false;

  // Última estadística emitida (null → forzar la próxima emisión)
  private lastStats: AsteroidsStats | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private palette: AsteroidsPalette,
    private cb: AsteroidsCallbacks,
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
    this.clearJustPressed();
    this.lastTime = null; // evita un salto de tiempo al reanudar
  }

  /** Termina la partida (botón FIN), por la misma ruta que perder la última vida. */
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

  private onKeyDown = (e: KeyboardEvent): void => {
    if (AsteroidsEngine.isTextField(e.target)) return;
    if (this.paused || this.state === "gameover") return;
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (!this.keys[e.code] && !e.repeat) this.justPressed[e.code] = true;
    this.keys[e.code] = true;
  };

  // Siempre actualiza el estado de las teclas (evita teclas «pegadas»); solo
  // evita la acción por defecto si no se está escribiendo en un campo.
  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
    if (GAME_KEYS.has(e.code) && !AsteroidsEngine.isTextField(e.target)) {
      e.preventDefault();
    }
  };

  private consume(code: string): boolean {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  private clearJustPressed(): void {
    this.justPressed = {};
  }

  // ── Estado de la partida ───────────────────────────────────────────────────

  private initGame(): void {
    this.ship = new Ship();
    this.bullets = [];
    this.asteroids = [];
    this.sparks = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.deadTimer = 0;
    this.gameOverEmitted = false;
    this.lastStats = null;
    this.lastTime = null;
    this.clearJustPressed();
    this.spawnAsteroids(4);
    this.emitStats();
  }

  private spawnAsteroids(count: number): void {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  private nextLevel(): void {
    this.level++;
    this.bullets = [];
    this.sparks = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }

  private explode(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++)
      this.sparks.push({ p: new Particle(x, y), color });
  }

  private killShip(): void {
    this.explode(this.ship.x, this.ship.y, 14, this.palette.ship);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.endGame();
    } else {
      this.state = "dead";
      this.deadTimer = 2;
    }
  }

  // Fin de partida: la usan la pérdida de la última vida y el botón FIN.
  private endGame(): void {
    if (this.state === "gameover") return;
    if (!this.ship.dead) {
      this.explode(this.ship.x, this.ship.y, 14, this.palette.ship);
      this.ship.dead = true;
    }
    this.state = "gameover";
    this.emitStats();
    if (!this.gameOverEmitted) {
      this.gameOverEmitted = true;
      this.cb.onGameOver(this.stats());
    }
  }

  private stats(): AsteroidsStats {
    return { score: this.score, lives: this.lives, level: this.level };
  }

  private emitStats(): void {
    const s = this.stats();
    const last = this.lastStats;
    if (
      last &&
      last.score === s.score &&
      last.lives === s.lives &&
      last.level === s.level
    )
      return;
    this.lastStats = s;
    this.cb.onStats({ ...s });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  private updateSparks(dt: number): void {
    this.sparks.forEach((s) => s.p.update(dt));
    this.sparks = this.sparks.filter((s) => !s.p.dead);
  }

  private update(dt: number): void {
    if (this.state === "gameover") {
      this.updateSparks(dt);
      return;
    }

    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.updateSparks(dt);
      this.asteroids.forEach((a) => a.update(dt));
      if (this.deadTimer <= 0) {
        this.state = "playing";
        this.ship.reset();
      }
      return;
    }

    // Disparar
    if (this.consume("Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }

    this.ship.update(dt, this.keys);
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt));
    this.sparks.forEach((s) => s.p.update(dt));
    this.powerUps.forEach((p) => p.update(dt));

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.sparks = this.sparks.filter((s) => !s.p.dead);
    this.powerUps = this.powerUps.filter((p) => !p.dead);

    for (const p of this.powerUps) {
      if (!p.dead && dist(this.ship, p) < this.ship.radius + p.radius) {
        p.dead = true;
        this.ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          this.score += POINTS[a.size];
          this.explode(a.x, a.y, a.size * 5, this.palette.asteroid);
          newAsteroids.push(...a.split());
          if (!this.powerUpSpawned) {
            this.killsSinceSpawn++;
            const guaranteed = this.killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              this.powerUps.push(new PowerUp(a.x, a.y));
              this.powerUpSpawned = true;
            }
          }
        }
      }
    }
    this.asteroids = this.asteroids
      .filter((a) => !a.dead)
      .concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          this.killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (this.state === "playing" && this.asteroids.length === 0)
      this.nextLevel();
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  private drawLifeIcon(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = this.palette.ship;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private drawHUD(): void {
    const ctx = this.ctx;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = this.palette.text;
    ctx.font = "15px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, 14, 26);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, W / 2, 26);

    for (let i = 0; i < this.lives; i++)
      this.drawLifeIcon(W - 16 - i * 22, 18);

    if (this.ship.tripleShot > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = this.palette.powerUp;
      ctx.fillText(`3x  ${this.ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  private drawOverlay(title: string, sub: string): void {
    const ctx = this.ctx;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillStyle = this.palette.text;
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.font = "18px monospace";
    ctx.fillText(sub, W / 2, H / 2 + 22);
    ctx.restore();
  }

  private draw(): void {
    const ctx = this.ctx;
    const pal = this.palette;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    this.sparks.forEach((s) => s.p.draw(ctx, s.color));
    this.asteroids.forEach((a) => a.draw(ctx, pal.asteroid));
    this.powerUps.forEach((p) => p.draw(ctx, pal.powerUp));
    this.bullets.forEach((b) => b.draw(ctx, pal.bullet));
    this.ship.draw(ctx, pal);

    this.drawHUD();

    if (this.state === "gameover")
      this.drawOverlay("GAME OVER", `PUNTAJE: ${this.score}`);
  }

  // ── Bucle principal ────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (this.destroyed) return;
    if (this.paused) {
      this.lastTime = null;
    } else {
      const dt =
        this.lastTime === null
          ? 0
          : Math.min((ts - this.lastTime) / 1000, MAX_DT);
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
