// Motor del juego INVADERS (SPEC 09). No depende de React ni lee el DOM: recibe el
// canvas, la paleta y los callbacks desde fuera. Todo (formación, escudos, nave
// nodriza, HUD y pantallas de fin) se dibuja en un único canvas de 800×600.

import {
  BITMAP_PIXEL,
  BOUNDS_MAX_X,
  BOUNDS_MIN_X,
  buildFormation,
  buildShields,
  CANNON_H,
  CANNON_HIT_FREEZE,
  CANNON_MAX_X,
  CANNON_MIN_X,
  CANNON_SPEED,
  CANNON_START_X,
  CANNON_W,
  CANNON_Y,
  CELL_W,
  collideAABB,
  DROP_PX,
  EXPLOSION_DURATION,
  FORMATION_COLS,
  FORMATION_ROWS,
  GROUND_Y,
  H,
  HUD_BASELINE_Y,
  HUD_MARGIN,
  INITIAL_LIVES,
  INVADER_BITMAPS,
  INVADER_POINTS,
  INVADER_SHOT_H,
  INVADER_SHOT_W,
  invaderFireInterval,
  invaderRect,
  invaderShotSpeed,
  LIFE_ICON_H,
  LIFE_ICON_SPACING,
  LIFE_ICON_W,
  LOSE_LINE_Y,
  MAX_DT,
  MAX_INVADER_SHOTS,
  PLAY_TOP,
  PLAYER_SHOT_H,
  PLAYER_SHOT_SPEED,
  PLAYER_SHOT_W,
  SHIELD_CELL,
  SHIELD_COLS,
  SHIELD_ROWS,
  SHIELD_Y,
  shieldCellRect,
  STEP_PX,
  stepIntervalMs,
  UFO_H,
  UFO_SPEED,
  UFO_W,
  UFO_Y,
  ufoPoints,
  ufoSpawnTimes,
  W,
  WAVE_BANNER_DURATION,
  WAVE_COUNT,
  type Formation,
  type Invader,
  type InvaderKind,
  type Rect,
  type Shield,
} from "./entities";

export type InvadersPalette = {
  squid: string; // invasor de la fila 0       → var(--magenta)
  crab: string; // invasores de las filas 1-2  → var(--yellow)
  octopus: string; // invasores de las filas 3-4 → var(--green)
  cannon: string; // cañón y vidas              → var(--cyan)
  playerShot: string; // bala del jugador       → var(--ink)
  invaderShot: string; // balas de los invasores → var(--orange)
  ufo: string; // nave nodriza                  → var(--purple)
  shield: string; // escudos                    → var(--green)
  ground: string; // línea de suelo             → var(--ink-faint)
  text: string; // HUD y pantallas              → var(--ink)
};

export type InvadersStats = { score: number; lives: number; level: number };

export type InvadersCallbacks = {
  onStats: (s: InvadersStats) => void; // solo cuando cambia algún valor
  onGameOver: (s: InvadersStats) => void; // una vez por partida (derrota o victoria)
};

type GameState = "playing" | "gameover" | "win";

type Ufo = { x: number; dir: 1 | -1 };

type Keys = { left: boolean; right: boolean; fire: boolean };

type GameKey = "ArrowLeft" | "ArrowRight" | "Space";

const isGameKey = (code: string): code is GameKey =>
  code === "ArrowLeft" || code === "ArrowRight" || code === "Space";

export class InvadersEngine {
  private ctx: CanvasRenderingContext2D;

  // Estado de la partida (se crea en initGame, nunca en el constructor)
  private cannon: Rect = { x: CANNON_START_X, y: CANNON_Y, w: CANNON_W, h: CANNON_H };
  private playerShot: Rect | null = null;
  private invaderShots: Rect[] = [];
  private formation: Formation = buildFormation(1);
  private shields: Shield[] = [];
  private ufo: Ufo | null = null;
  private ufoTimes: number[] = []; // instantes (s desde el inicio de la oleada) aún por salir
  private ufoLaunched = 0; // naves lanzadas en la partida: decide el sentido (alterna)
  private shotsFired = 0; // disparos del jugador en la partida
  private score = 0;
  private lives = INITIAL_LIVES;
  private wave = 1;
  private state: GameState = "playing";

  // Temporizadores de la oleada
  private bannerMs = 0; // cartel «OLEADA n»: todo congelado salvo el cañón
  private freezeMs = 0; // congelado de 1 s tras un impacto en el cañón
  private waveTime = 0; // s de juego activo desde el inicio de la oleada
  private stepAccum = 0; // ms acumulados hacia el próximo paso de la formación
  private fireTimer = 0; // s desde el último disparo de los invasores

  // Teclado: mapa de teclas mantenidas
  private keys: Keys = { left: false, right: false, fire: false };
  private listening = false;

  // Dibujo
  private cannonDown = false; // el cañón está destruido (explosión tras un impacto)
  private now = 0; // marca de tiempo del último fotograma (ms), para el parpadeo
  private sprites = new Map<string, Path2D>(); // mapas de bits de invasor ya trazados

  // Bucle
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private paused = false;
  private destroyed = false;

  // Última estadística emitida (null → forzar la próxima emisión)
  private lastStats: InvadersStats | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private palette: InvadersPalette,
    private cb: InvadersCallbacks,
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

  /** Nueva partida (3 vidas, oleada 1, puntuación 0). */
  restart(): void {
    if (this.destroyed) return;
    this.paused = false;
    this.initGame();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.lastTime = null; // evita un salto de tiempo al reanudar
    this.stepAccum = 0; // y un paso de formación acumulado durante la pausa
    this.releaseKeys();
  }

  /** Termina la partida (botón FIN), por la misma ruta que perder la última vida. */
  finish(): void {
    if (this.destroyed) return;
    this.endGame("gameover");
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

  private releaseKeys(): void {
    this.keys.left = false;
    this.keys.right = false;
    this.keys.fire = false;
  }

  private setKey(code: GameKey, down: boolean): void {
    if (code === "ArrowLeft") this.keys.left = down;
    else if (code === "ArrowRight") this.keys.right = down;
    else this.keys.fire = down;
  }

  // Se ignora en los campos de texto (el modal de iniciales). Fuera de ellos se
  // evita la acción por defecto de las tres teclas (no desplazan la página y
  // Espacio no activa el botón enfocado) aunque haya pausa o la partida haya
  // terminado, pero solo se registran si se juega.
  private onKeyDown = (e: KeyboardEvent): void => {
    if (InvadersEngine.isTextField(e.target)) return;
    if (!isGameKey(e.code)) return;
    e.preventDefault();
    if (this.paused || this.state !== "playing") return;
    this.setKey(e.code, true);
  };

  // keyup siempre actualiza el mapa, incluso con pausa, partida terminada o foco
  // en un campo de texto, para que una tecla soltada nunca quede «pegada».
  private onKeyUp = (e: KeyboardEvent): void => {
    if (!isGameKey(e.code)) return;
    this.setKey(e.code, false);
    if (!InvadersEngine.isTextField(e.target)) e.preventDefault();
  };

  // ── Estado de la partida ───────────────────────────────────────────────────

  // Todo el estado se crea aquí (start/restart), nunca durante el render ni en el
  // constructor: la nave nodriza usa Math.random().
  private initGame(): void {
    this.releaseKeys();
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.state = "playing";
    this.shotsFired = 0;
    this.ufoLaunched = 0;
    this.lastStats = null;
    this.lastTime = null;
    this.cannon.x = CANNON_START_X;
    this.cannonDown = false;
    this.startWave(1);
    this.emitStats();
  }

  // Prepara la oleada `n`: formación y escudos nuevos, sin balas ni nave nodriza,
  // instantes de la nave nodriza sorteados y cartel de 1,5 s. El cañón no se
  // recoloca y la puntuación y las vidas se conservan.
  private startWave(n: number): void {
    this.wave = n;
    this.formation = buildFormation(n);
    this.shields = buildShields();
    this.playerShot = null;
    this.invaderShots = [];
    this.ufo = null;
    this.ufoTimes = ufoSpawnTimes(Math.random);
    this.waveTime = 0;
    this.stepAccum = 0;
    this.fireTimer = 0;
    this.freezeMs = 0;
    this.bannerMs = WAVE_BANNER_DURATION;
  }

  // Fin de partida: la usan perder la última vida, la invasión, la victoria y el
  // botón FIN.
  private endGame(kind: Exclude<GameState, "playing">): void {
    if (this.state !== "playing") return;
    this.state = kind;
    this.releaseKeys();
    this.emitStats();
    this.cb.onGameOver(this.stats());
  }

  private stats(): InvadersStats {
    return { score: this.score, lives: this.lives, level: this.wave };
  }

  private emitStats(): void {
    const s = this.stats();
    const last = this.lastStats;
    if (last && last.score === s.score && last.lives === s.lives && last.level === s.level) return;
    this.lastStats = s;
    this.cb.onStats({ ...s });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  // `dt` va en segundos. Los desvanecidos avanzan también con el cartel, el
  // congelado y tras el fin de la partida, para que el último invasor destruido no
  // se quede congelado en pantalla.
  private update(dt: number): void {
    const ms = dt * 1000;
    for (const inv of this.formation.invaders) {
      if (!inv.alive && inv.fade > 0) inv.fade = Math.max(0, inv.fade - ms);
    }
    if (this.state !== "playing") return;

    // Cartel de oleada: solo se mueve el cañón y no se puede disparar.
    if (this.bannerMs > 0) {
      this.moveCannon(dt);
      this.bannerMs = Math.max(0, this.bannerMs - ms);
      return;
    }

    // Congelado tras un impacto: el cañón en explosión reaparece centrado.
    if (this.freezeMs > 0) {
      this.freezeMs = Math.max(0, this.freezeMs - ms);
      if (this.freezeMs === 0) {
        this.cannonDown = false;
        this.cannon.x = CANNON_START_X;
        this.stepAccum = 0;
        this.fireTimer = 0;
      }
      return;
    }

    this.step(dt);
  }

  private step(dt: number): void {
    this.waveTime += dt;
    this.moveCannon(dt);
    if (this.keys.fire && !this.playerShot) this.fire();
    this.moveShots(dt);
    this.updateUfo(dt);

    this.stepAccum += dt * 1000;
    if (this.stepAccum >= stepIntervalMs(this.aliveCount(), this.wave)) {
      this.stepAccum = 0; // como mucho un paso por fotograma: el exceso se descarta
      this.stepFormation();
      if (this.state !== "playing") return;
    }

    this.invaderFire(dt);
    this.resolveCollisions();
  }

  // Cañón: con las dos flechas a la vez no se mueve.
  private moveCannon(dt: number): void {
    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (dir === 0) return;
    const c = this.cannon;
    c.x = Math.max(CANNON_MIN_X, Math.min(CANNON_MAX_X, c.x + dir * CANNON_SPEED * dt));
  }

  // Bala del jugador: nace en el centro del cañón, una a la vez.
  private fire(): void {
    const c = this.cannon;
    this.playerShot = {
      x: c.x + (c.w - PLAYER_SHOT_W) / 2,
      y: c.y - PLAYER_SHOT_H,
      w: PLAYER_SHOT_W,
      h: PLAYER_SHOT_H,
    };
    this.shotsFired++;
  }

  // Mueve las balas y retira las que salen de la zona de juego.
  private moveShots(dt: number): void {
    if (this.playerShot) {
      this.playerShot.y -= PLAYER_SHOT_SPEED * dt;
      if (this.playerShot.y < PLAY_TOP) this.playerShot = null;
    }
    const dy = invaderShotSpeed(this.wave) * dt;
    for (const s of this.invaderShots) s.y += dy;
    this.invaderShots = this.invaderShots.filter((s) => s.y < GROUND_Y);
  }

  // Nave nodriza: sale cuando la oleada alcanza su instante y alterna el sentido
  // en cada una (la primera de la partida va hacia la derecha).
  private updateUfo(dt: number): void {
    if (!this.ufo && this.ufoTimes.length > 0 && this.waveTime >= this.ufoTimes[0]) {
      this.ufoTimes.shift();
      const dir = this.ufoLaunched % 2 === 0 ? 1 : -1;
      this.ufoLaunched++;
      this.ufo = { x: dir === 1 ? -UFO_W : W, dir };
    }
    const ufo = this.ufo;
    if (!ufo) return;
    ufo.x += ufo.dir * UFO_SPEED * dt;
    if (ufo.x > W || ufo.x + UFO_W < 0) this.ufo = null;
  }

  private ufoRect(ufo: Ufo): Rect {
    return { x: ufo.x, y: UFO_Y, w: UFO_W, h: UFO_H };
  }

  private aliveCount(): number {
    let n = 0;
    for (const inv of this.formation.invaders) if (inv.alive) n++;
    return n;
  }

  // Un paso de la formación: avanza 12 px; si el paso sacaría las columnas vivas de
  // x 16–784 (medido por celdas de 48 px), baja 24 px e invierte el sentido en su
  // lugar. Alterna el fotograma, destruye las celdas de escudo que solapa y termina
  // la partida si un invasor llega a la línea de y 540.
  private stepFormation(): void {
    const f = this.formation;
    let minCol = FORMATION_COLS;
    let maxCol = -1;
    for (const inv of f.invaders) {
      if (!inv.alive) continue;
      if (inv.col < minCol) minCol = inv.col;
      if (inv.col > maxCol) maxCol = inv.col;
    }
    if (maxCol < 0) return;

    const left = f.x + minCol * CELL_W;
    const right = f.x + (maxCol + 1) * CELL_W;
    const blocked = f.dir === 1 ? right + STEP_PX > BOUNDS_MAX_X : left - STEP_PX < BOUNDS_MIN_X;
    if (blocked) {
      f.y += DROP_PX;
      f.dir = f.dir === 1 ? -1 : 1;
    } else {
      f.x += f.dir * STEP_PX;
    }
    f.frame = f.frame === 0 ? 1 : 0;

    for (const inv of f.invaders) {
      if (!inv.alive) continue;
      const rect = invaderRect(f, inv);
      this.crushShields(rect);
      if (rect.y + rect.h >= LOSE_LINE_Y) {
        this.lives = 0; // la invasión termina la partida aunque queden vidas
        this.endGame("gameover");
        return;
      }
    }
  }

  // Un invasor destruye todas las celdas de escudo que solapa.
  private crushShields(rect: Rect): void {
    if (rect.y + rect.h <= SHIELD_Y || rect.y >= SHIELD_Y + SHIELD_ROWS * SHIELD_CELL) return;
    for (const shield of this.shields) {
      for (let row = 0; row < SHIELD_ROWS; row++) {
        for (let col = 0; col < SHIELD_COLS; col++) {
          if (shield.cells[row][col] && collideAABB(rect, shieldCellRect(shield, row, col))) {
            shield.cells[row][col] = false;
          }
        }
      }
    }
  }

  // Dispara el invasor más bajo de una columna viva elegida al azar, como máximo 3
  // balas a la vez. Con el tope alcanzado el disparo espera a que quede un hueco.
  private invaderFire(dt: number): void {
    const interval = invaderFireInterval(this.wave);
    this.fireTimer = Math.min(this.fireTimer + dt, interval);
    if (this.fireTimer < interval || this.invaderShots.length >= MAX_INVADER_SHOTS) return;

    const shooters: Invader[] = [];
    for (let col = 0; col < FORMATION_COLS; col++) {
      for (let row = FORMATION_ROWS - 1; row >= 0; row--) {
        const inv = this.formation.invaders[row * FORMATION_COLS + col];
        if (inv.alive) {
          shooters.push(inv);
          break;
        }
      }
    }
    if (shooters.length === 0) return;

    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    const rect = invaderRect(this.formation, shooter);
    this.invaderShots.push({
      x: rect.x + (rect.w - INVADER_SHOT_W) / 2,
      y: rect.y + rect.h,
      w: INVADER_SHOT_W,
      h: INVADER_SHOT_H,
    });
    this.fireTimer = 0;
  }

  // Una bala destruye la celda de escudo que toca y desaparece. Devuelve true si
  // ha tocado alguna. Las celdas se recorren desde el lado por el que llega la bala
  // (de abajo arriba si sube, de arriba abajo si baja).
  private hitShield(shot: Rect, movingUp: boolean): boolean {
    for (const shield of this.shields) {
      for (let i = 0; i < SHIELD_ROWS; i++) {
        const row = movingUp ? SHIELD_ROWS - 1 - i : i;
        for (let col = 0; col < SHIELD_COLS; col++) {
          if (shield.cells[row][col] && collideAABB(shot, shieldCellRect(shield, row, col))) {
            shield.cells[row][col] = false;
            return true;
          }
        }
      }
    }
    return false;
  }

  // Colisiones del fotograma: bala contra bala, bala del jugador contra nave
  // nodriza, invasores y escudos, y balas de invasores contra escudos y cañón.
  private resolveCollisions(): void {
    // Bala contra bala: desaparecen las dos, sin puntos.
    if (this.playerShot) {
      const shot = this.playerShot;
      const i = this.invaderShots.findIndex((s) => collideAABB(shot, s));
      if (i >= 0) {
        this.invaderShots.splice(i, 1);
        this.playerShot = null;
      }
    }

    if (this.playerShot && this.resolvePlayerShot(this.playerShot)) {
      this.playerShot = null;
      if (this.aliveCount() === 0) {
        this.clearWave();
        return;
      }
    }

    const survivors: Rect[] = [];
    for (const s of this.invaderShots) {
      if (collideAABB(s, this.cannon)) {
        this.hitCannon();
        return;
      }
      if (!this.hitShield(s, false)) survivors.push(s);
    }
    this.invaderShots = survivors;
  }

  // Resuelve el impacto de la bala del jugador. Devuelve true si la bala ha dado en
  // algo (y por tanto desaparece).
  private resolvePlayerShot(shot: Rect): boolean {
    if (this.ufo && collideAABB(shot, this.ufoRect(this.ufo))) {
      this.score += ufoPoints(this.shotsFired);
      this.ufo = null;
      return true;
    }
    for (const inv of this.formation.invaders) {
      if (inv.alive && collideAABB(shot, invaderRect(this.formation, inv))) {
        inv.alive = false;
        inv.fade = EXPLOSION_DURATION;
        this.score += INVADER_POINTS[inv.kind];
        return true; // una bala solo destruye un invasor
      }
    }
    return this.hitShield(shot, true);
  }

  // Oleada limpia: pasa a la siguiente, o termina con victoria tras la cuarta.
  private clearWave(): void {
    if (this.wave < WAVE_COUNT) this.startWave(this.wave + 1);
    else this.endGame("win");
  }

  // Impacto en el cañón: resta una vida y borra todas las balas. Sin vidas termina
  // la partida; si no, congela la formación 1 s con el cañón en explosión.
  private hitCannon(): void {
    this.lives--;
    this.cannonDown = true;
    this.playerShot = null;
    this.invaderShots = [];
    if (this.lives <= 0) {
      this.lives = 0;
      this.endGame("gameover");
      return;
    }
    this.freezeMs = CANNON_HIT_FREEZE;
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  // Mapa de bits de un invasor como un único Path2D (sus píxeles contiguos de cada
  // fila se agrupan en un solo rectángulo), trazado una vez y reutilizado.
  private sprite(kind: InvaderKind, frame: 0 | 1): Path2D {
    const key = `${kind}${frame}`;
    const cached = this.sprites.get(key);
    if (cached) return cached;
    const path = new Path2D();
    INVADER_BITMAPS[kind][frame].forEach((line, row) => {
      let col = 0;
      while (col < line.length) {
        if (line[col] !== "#") {
          col++;
          continue;
        }
        const start = col;
        while (col < line.length && line[col] === "#") col++;
        path.rect(
          start * BITMAP_PIXEL,
          row * BITMAP_PIXEL,
          (col - start) * BITMAP_PIXEL,
          BITMAP_PIXEL,
        );
      }
    });
    this.sprites.set(key, path);
    return path;
  }

  // Invasores vivos y, con alfa decreciente, los recién destruidos. Con un halo
  // neón: lo que se mueve brilla; los escudos y el suelo no.
  private drawInvaders(): void {
    const ctx = this.ctx;
    const f = this.formation;
    ctx.save();
    for (const inv of f.invaders) {
      if (!inv.alive && inv.fade <= 0) continue;
      const r = invaderRect(f, inv);
      const color = this.palette[inv.kind];
      ctx.globalAlpha = inv.alive ? 1 : inv.fade / EXPLOSION_DURATION;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.setTransform(1, 0, 0, 1, r.x, r.y);
      ctx.fill(this.sprite(inv.kind, f.frame));
    }
    ctx.restore();
  }

  // Escudos: una celda es un cuadrado de 8×8; las celdas en pie contiguas de una
  // fila se dibujan como un solo rectángulo y las destruidas no se dibujan.
  private drawShields(): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.palette.shield;
    for (const shield of this.shields) {
      for (let row = 0; row < SHIELD_ROWS; row++) {
        let col = 0;
        while (col < SHIELD_COLS) {
          if (!shield.cells[row][col]) {
            col++;
            continue;
          }
          const start = col;
          while (col < SHIELD_COLS && shield.cells[row][col]) col++;
          ctx.fillRect(
            shield.x + start * SHIELD_CELL,
            shield.y + row * SHIELD_CELL,
            (col - start) * SHIELD_CELL,
            SHIELD_CELL,
          );
        }
      }
    }
  }

  // Silueta del cañón en su caja de 40×20, con `scale` para los iconos de vida.
  private drawCannonShape(x: number, y: number, scale: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillRect(0, 12, CANNON_W, 8); // base
    ctx.fillRect(4, 8, CANNON_W - 8, 4); // cuerpo
    ctx.fillRect(CANNON_W / 2 - 3, 2, 6, 6); // torreta
    ctx.fillRect(CANNON_W / 2 - 1, 0, 2, 2); // punta
    ctx.restore();
  }

  private drawCannon(): void {
    const ctx = this.ctx;
    const c = this.cannon;
    ctx.save();
    ctx.fillStyle = this.palette.cannon;
    if (this.cannonDown) {
      // Explosión: restos que parpadean entre dos disposiciones (sin azar).
      const flip = Math.floor(this.now / 90) % 2 === 0;
      const bits = flip
        ? [[2, 12, 8, 6], [16, 6, 6, 6], [30, 10, 8, 8], [10, 2, 4, 4], [24, 0, 4, 4]]
        : [[6, 14, 6, 6], [14, 2, 6, 6], [26, 12, 8, 6], [34, 4, 4, 4], [0, 6, 4, 4]];
      ctx.shadowColor = this.palette.cannon;
      ctx.shadowBlur = 10;
      for (const [dx, dy, w, h] of bits) ctx.fillRect(c.x + dx, c.y + dy, w, h);
    } else {
      ctx.shadowColor = this.palette.cannon;
      ctx.shadowBlur = 10;
      this.drawCannonShape(c.x, c.y, 1);
    }
    ctx.restore();
  }

  private drawShots(): void {
    const ctx = this.ctx;
    ctx.save();
    if (this.playerShot) {
      const s = this.playerShot;
      ctx.fillStyle = this.palette.playerShot;
      ctx.shadowColor = this.palette.playerShot;
      ctx.shadowBlur = 8;
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
    ctx.fillStyle = this.palette.invaderShot;
    ctx.shadowColor = this.palette.invaderShot;
    ctx.shadowBlur = 8;
    for (const s of this.invaderShots) {
      // Zigzag dentro de la hitbox de 6×16: cuatro tramos de 4 px alternando 0 y 2 px.
      const phase = Math.floor(s.y / 4) % 2;
      for (let i = 0; i < 4; i++) {
        const dx = (i + phase) % 2 === 0 ? 0 : 2;
        ctx.fillRect(s.x + dx, s.y + i * 4, 4, 4);
      }
    }
    ctx.restore();
  }

  private drawUfo(): void {
    if (!this.ufo) return;
    const ctx = this.ctx;
    const { x, y } = this.ufoRect(this.ufo);
    ctx.save();
    ctx.fillStyle = this.palette.ufo;
    ctx.shadowColor = this.palette.ufo;
    ctx.shadowBlur = 10;
    ctx.fillRect(x + 14, y, 20, 4); // cúpula
    ctx.fillRect(x + 6, y + 4, 36, 4);
    ctx.fillRect(x, y + 8, UFO_W, 8); // casco
    ctx.fillRect(x + 10, y + 16, 8, 4); // patas
    ctx.fillRect(x + 30, y + 16, 8, 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000"; // ventanillas
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 6 + i * 7, y + 10, 4, 4);
    ctx.restore();
  }

  private drawGround(): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(BOUNDS_MIN_X, GROUND_Y, BOUNDS_MAX_X - BOUNDS_MIN_X, 2);
  }

  private drawHud(): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.palette.text;
    ctx.font = "bold 18px monospace";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${this.score}`, HUD_MARGIN, HUD_BASELINE_Y);
    ctx.textAlign = "center";
    ctx.fillText(`OLEADA: ${this.wave}`, W / 2, HUD_BASELINE_Y);
    // Un cañón de 20×10 por vida, alineado a la derecha.
    ctx.fillStyle = this.palette.cannon;
    const scale = LIFE_ICON_W / CANNON_W; // 0,5
    for (let i = 0; i < this.lives; i++) {
      const x = W - HUD_MARGIN - (this.lives - i) * (LIFE_ICON_W + LIFE_ICON_SPACING) + LIFE_ICON_SPACING;
      this.drawCannonShape(x, HUD_BASELINE_Y - LIFE_ICON_H, scale);
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

  // Cartel «OLEADA n» de 1,5 s sobre una banda oscura.
  private drawBanner(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, H / 2 - 44, W, 88);
    ctx.restore();
    ctx.fillStyle = this.palette.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    this.fitFont(`OLEADA ${this.wave}`, 40, W - 40);
    ctx.fillText(`OLEADA ${this.wave}`, W / 2, H / 2);
  }

  // Pantalla de fin: campo oscurecido, título y puntaje, sin texto de reinicio.
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

    this.drawGround();
    this.drawShields();
    this.drawInvaders();
    this.drawUfo();
    this.drawShots();
    this.drawCannon();

    if (this.state === "playing") {
      this.drawHud();
      if (this.bannerMs > 0) this.drawBanner();
    }
    if (this.state === "gameover") this.drawOverlay("GAME OVER", 64);
    if (this.state === "win") this.drawOverlay("¡INVASIÓN REPELIDA!", 40);
  }

  // ── Bucle principal ────────────────────────────────────────────────────────

  private loop = (ts: number): void => {
    if (this.destroyed) return;
    this.now = ts;
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
