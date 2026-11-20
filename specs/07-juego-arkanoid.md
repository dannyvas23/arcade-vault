# SPEC 07 — Juego ARKANOID jugable en el Reproductor

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (Reproductor, catálogo y `ScoresProvider`), SPEC 04 (juego ROCAS), SPEC 05 (tabla de juegos y leaderboard en Supabase), SPEC 06 (juego TETRIS y registro de juegos)
> **Fecha:** 2026-11-20
> **Objetivo:** Portar a TypeScript el Arkanoid de `references/started-games/04-arkanoid/`, renombrar el juego BLOQUE BUSTER del catálogo a ARKANOID y conectarlo al HUD, los botones, el modal de guardado y el leaderboard de la plataforma mediante el registro de juegos.

---

## Por qué existe esta spec

`references/started-games/04-arkanoid/` es un Arkanoid completo: pala, pelota, 5 niveles de bloques con velocidad creciente, 3 vidas, animación de explosión de bloques y dos efectos de sonido. Está escrito como un `game.js` con globales y `levels.js` y `spritesheet.js` cargados con `<script>`. El `game.js` busca el canvas con `document.getElementById`, registra los listeners de teclado en `document` y el de ratón en el canvas, y dibuja con un spritesheet de terceros (`assets/spritesheet-breakout.png`). Su pausa usa `P` o `Esc` y ofrece un salto de nivel de depuración.

La plataforma ya tiene dos juegos reales, ROCAS (SPEC 04) y TETRIS (SPEC 06). El registro de juegos (`components/game-registry.ts`) ya existe, así que esta spec solo añade una entrada. No hay refactor del Reproductor.

En el catálogo ya existe **BLOQUE BUSTER** (`id: "bloque-buster"`, `cover-bricks`, `sort_order` 1, `plays` 12400, 5 puntuaciones sembradas), el equivalente mock de este juego, igual que CAÍDA lo era de Tetris. No se añade una entrada nueva: pasa a llamarse **ARKANOID** (`id: "arkanoid"`). Como `scores.game_id` referencia `games.id` sin `ON UPDATE CASCADE`, el renombrado no puede ser un `UPDATE` del `id`: se copia la fila y se borra la antigua.

Las 5 puntuaciones sembradas no se conservan. El máximo real del juego es 2080 puntos (10 por bloque y 208 bloques en los 5 niveles), mientras que los seeds van de 109681 a 228057: ninguna partida real podría entrar jamás en el Top 5. Borrar la fila antigua las elimina por `ON DELETE CASCADE`, y el ranking empieza vacío.

El juego se **porta, no se rediseña**: reglas, constantes, niveles y puntuación se conservan. Los cambios necesarios para integrarlo están en «Decisiones».

## Alcance

**Dentro:**

- Motor de ARKANOID en TypeScript, sin React ni acceso global al DOM, en `lib/arkanoid/`: pala, pelota, bloques, 5 niveles, vidas, colisiones, puntuación y fin de partida, con los valores del original.
- Componente de cliente `components/arkanoid-canvas.tsx` con un canvas de 800×600 lógicos escalado al marco CRT, que crea los audios al montar y destruye el motor al desmontarse.
- HUD propio en el canvas (`SCORE`, `NIVEL` y una bola por vida) y pantallas de fin (`GAME OVER` y victoria) dibujadas en el canvas.
- El motor notifica puntuación, vidas, nivel y fin de partida al HUD, los botones y el modal de la plataforma.
- Todos los botones y pantallas del Reproductor funcionan con el motor: PAUSA/REANUDAR («EN PAUSA»), FIN, SALIR, modal «FIN DEL JUEGO», «GUARDAR PUNTUACIÓN», «JUGAR DE NUEVO» y «VOLVER AL VAULT».
- Sonido: `ball-bounce.mp3` y `break-sound.mp3` copiados a `public/games/arkanoid/`, reproducidos por el motor y detenidos en pausa, fin, reinicio y destrucción.
- Dibujo vectorial neón con colores de las variables CSS de `app/globals.css`; sin spritesheet.
- Entrada `arkanoid` en `GAME_REGISTRY` con `hud: { lives: true, level: true }`.
- Controles de teclado: `←` y `→` mueven la pala.
- Migración del catálogo: `bloque-buster` pasa a `arkanoid` (título `ARKANOID`, `long` reescrito) conservando `short`, categoría, color, portada `cover-bricks`, `sort_order` 1, `plays` y `created_at`; sus 5 puntuaciones sembradas se eliminan.
- Actualizar el texto «Bloque Buster» de la actividad reciente de la home (`lib/home.ts`) a «Arkanoid».
- Que las flechas no desplacen la página.

**Fuera de alcance (para otras specs):**

- Control con ratón (`mousemove` sobre el canvas) y controles táctiles o botones en pantalla.
- Control de volumen, mute y música de fondo.
- Tecla de pausa `P` o `Esc` y selector de nivel desde la pausa: la pausa es solo el botón de la plataforma.
- El spritesheet de Petraheim y la animación de explosión por fotogramas.
- Cambios de reglas o de balance: ángulo de rebote según el punto de la pala, power-ups, bloques de varios golpes, más niveles.
- Los demás juegos sin motor real: siguen con la simulación.
- Sembrar un ranking nuevo ajustado a la escala del juego.
- Sincronizar o migrar las marcas de `localStorage` que usan `gameId: "bloque-buster"`.
- Redirección de `/juegos/bloque-buster` a `/juegos/arkanoid`.
- Renombrar o rediseñar la portada `cover-bricks`.
- Auth, antitrampas, cambios en el esquema de Supabase más allá de la migración de datos descrita.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Modificar `references/started-games/04-arkanoid/` (se queda como referencia).
- Corregir los criterios históricos de las SPEC 01, 02, 04, 05 y 06 que citan BLOQUE BUSTER.
- Tests automatizados (no hay framework instalado).

## Modelo de datos

No hay datos persistentes nuevos: las puntuaciones se guardan con el `SavedScore` y la clave `av:v1:scores` de la SPEC 01 y con `submitScore` de la SPEC 05, con `gameId: "arkanoid"`. Se añade el contrato del motor. `GameStats`, `GameHandle` y `GameCanvasProps` ya existen en `lib/game-types.ts` (SPEC 06).

```ts
// lib/arkanoid/engine.ts
export type BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export type ArkanoidPalette = {
  blocks: Record<BlockColor, string>; // colores de bloque → variables CSS (ver «Convenciones»)
  paddle: string;  // pala              → var(--silver)
  ball: string;    // pelota y vidas    → var(--ink)
  text: string;    // HUD y pantallas   → var(--ink)
};
export type ArkanoidSounds = {
  bounce: HTMLAudioElement; // ball-bounce.mp3, creado por el wrapper
  break: HTMLAudioElement;  // break-sound.mp3, creado por el wrapper
};
export type ArkanoidStats = { score: number; lives: number; level: number };
export type ArkanoidCallbacks = {
  onStats: (s: ArkanoidStats) => void;    // solo cuando cambia algún valor
  onGameOver: (s: ArkanoidStats) => void; // una vez por partida (derrota o victoria)
};
export class ArkanoidEngine {
  constructor(canvas: HTMLCanvasElement, palette: ArkanoidPalette, sounds: ArkanoidSounds, cb: ArkanoidCallbacks);
  start(): void;   // nueva partida e inicio del bucle requestAnimationFrame
  restart(): void; // nueva partida (3 vidas, nivel 1, puntuación 0)
  setPaused(paused: boolean): void;
  finish(): void;  // termina la partida (botón FIN)
  destroy(): void; // cancela el bucle, quita los listeners y detiene los sonidos
}
```

```ts
// lib/arkanoid/levels.ts
export type LevelBlock = { col: number; row: number; color: BlockColor };
export type Level = { speed: number; blocks: LevelBlock[] };
export const LEVELS: Level[]; // 5 niveles, mismos patrones y velocidades que levels.js
```

```sql
-- Migración del catálogo (se aplica en la implementación con apply_migration, en una transacción)
insert into public.games (id, title, short, "long", category, cover, color, plays, sort_order, created_at)
select 'arkanoid', 'ARKANOID', short,
       'Mueve la pala con las flechas y rebota la pelota para romper todos los bloques de cada nivel. Tienes 3 vidas y 5 niveles con patrones distintos, y la pelota gana un 10 % de velocidad en cada uno. Cada bloque suma 10 puntos.',
       category, cover, color, plays, 99, created_at
from public.games where id = 'bloque-buster';                  -- sort_order 99 provisional (es unique)
delete from public.games where id = 'bloque-buster';           -- scores_game_id_fkey (ON DELETE CASCADE) borra sus 5 seeds
update public.games set sort_order = 1 where id = 'arkanoid';
```

Convenciones:

- Archivos del motor: `lib/arkanoid/levels.ts` (niveles), `lib/arkanoid/entities.ts` (constantes, tipos de pala, pelota y bloque, `collideAABB`, construcción de los bloques de un nivel) y `lib/arkanoid/engine.ts`. Las entidades no leen el DOM ni dibujan con colores propios.
- Canvas de 800×600 píxeles lógicos, con origen arriba a la izquierda, escalado con CSS al 100 % del `.crt-screen` (ya 4:3). Velocidades en píxeles por segundo.
- Valores conservados del original (`game.js`, `levels.js`):

| Concepto | Valor |
| -------- | ----- |
| Pala | `w` 81, `h` 14, `y` 560, centrada en `x = (800 - 81) / 2` al empezar; velocidad `PADDLE_SPEED` 400 |
| Pelota | 16×16; velocidad base `vx` 200, `vy` -300, multiplicada por `speed` del nivel |
| Bloques | 10 columnas × 6 filas de 64×24, origen `x = (800 - 640) / 2 = 80`, `y = 80` |
| Puntuación | 10 puntos por bloque, acumulada entre niveles |
| Vidas | 3 |
| Velocidad por nivel | ×1,00 · ×1,10 · ×1,21 · ×1,33 · ×1,46 (niveles 1 a 5) |
| Bloques por nivel | 60 · 40 · 30 · 39 · 39 (208 en total; puntuación máxima 2080) |
| Patrones | 1 parrilla 10×6; 2 pirámide (`[4,3,2,1,0,0]` a `[5,6,7,8,9,9]`); 3 ajedrez (`(col + row)` par); 4 huecos fijos `[2,5,8]`, `[0,4,7,9]`, `[1,3,6]`, `[2,5,8,9]`, `[0,4,7]`, `[1,3,6,9]`; 5 marco más cruz (columna 4 y fila 2) |
| Rebote en pala | solo con `vy > 0` y `ball.y + 16` entre `paddle.y` y `paddle.y + 14 + 8`; fija `vy = -abs(vy)` y no cambia `vx` |
| Rebote en bloque | `vy = -vy`; un solo bloque por fotograma |
| Explosión | 150 ms (`EXPLOSION_DURATION`) |

- Mapeo a la plataforma: `score` = puntuación; `lives` = vidas restantes (0 a 3); `level` = nivel (1 a 5).
- Colores (ningún literal en `lib/arkanoid/` salvo el fondo `#000`). Los bloques siguen el aspecto del spritesheet, no el nombre del original (en él `magenta` es morado y `hotpink` es naranja): `red` → `--magenta`, `yellow` → `--yellow`, `cyan` → `--cyan`, `magenta` → `--purple`, `hotpink` → `--orange`, `green` → `--green`, `gray` → `--silver`. Pala `--silver`, pelota y vidas `--ink`, textos `--ink`. Los oscurecidos del original (`rgba(0,0,0,0.6)`) pasan a `#000` con `globalAlpha`.
- Los bloques se dibujan como rectángulos con un margen de 1 px y una franja de brillo con `globalAlpha` sobre `--ink`; el detalle visual lo afina la implementación con `frontend-design` sin cambiar medidas ni colisiones. La explosión pasa a un desvanecido del bloque (`globalAlpha` de 1 a 0 en 150 ms).
- Tiempo: bucle con `requestAnimationFrame` y `dt` en segundos con tope de 0,05 s; al reanudar se reinicia `lastTime`.
- Sonido: el wrapper crea los dos `HTMLAudioElement` al montar y se los pasa al motor. El motor reproduce una copia (`cloneNode()`), captura el rechazo de `play()` y lleva la cuenta de las copias activas para detenerlas. `ball-bounce` suena al rebotar en pared o pala; `break-sound` suena al romper un bloque, nunca los dos a la vez.
- HUD del canvas, solo durante la partida: `SCORE: n` a la izquierda, `NIVEL: n` centrado y una bola de 16 px con separación de 4 px por vida, a la derecha.
- Pantallas de fin del canvas: derrota `GAME OVER`; victoria `¡COMPLETASTE EL JUEGO!` con un tamaño de letra que quepa en 800 px; ambas con `PUNTAJE: n` debajo y sin ningún texto de reinicio.
- La pelota sale moviéndose desde el principio y tras cada vida perdida, sin tecla de lanzamiento, como en el original.
- `onStats` se emite al iniciar y solo cuando cambia `score`, `lives` o `level`, nunca en cada fotograma.
- Teclado: el motor registra `keydown` y `keyup` en `window` al iniciar y los quita en `destroy()`. Usa `e.key` (`ArrowLeft`, `ArrowRight`) y un mapa de teclas mantenidas. `keyup` siempre lo actualiza. `keydown` se ignora si el objetivo es un `<input>` o `<textarea>`, si hay pausa o si la partida terminó. `preventDefault()` en `keydown` y `keyup` de las dos flechas. Al pausar, reanudar y reiniciar se sueltan las teclas mantenidas.
- Estado de partida creado en `start()` y `restart()`. El original no usa `Math.random()`, así que el motor tampoco.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`); para los pasos 5 y 6, la de componentes de cliente (`01-app/02-guides/server-and-client-boundary.md`). Para la interfaz se usa siempre la skill `frontend-design`, con el aspecto de ROCAS y TETRIS como referencia.

1. **Catálogo y home.** Aplicar con `apply_migration` el renombrado de `bloque-buster` a `arkanoid` (SQL de «Modelo de datos») y cambiar «Bloque Buster» por «Arkanoid» en `lib/home.ts`. Consultar antes de aplicar el estado de `bloque-buster` y su recuento en `scores`. Verificación: `/juegos/arkanoid` muestra ARKANOID con `plays` 12400 y «SIN PUNTUACIONES TODAVÍA», `/juegos/bloque-buster` muestra «no encontrado», `games` tiene 8 filas con `sort_order` del 1 al 8, y `/juegos/arkanoid/jugar` sigue con la simulación.
2. **Audio.** Copiar `ball-bounce.mp3` y `break-sound.mp3` de `references/started-games/04-arkanoid/assets/sounds/` a `public/games/arkanoid/` (el original queda intacto). Verificación: `/games/arkanoid/ball-bounce.mp3` y `/games/arkanoid/break-sound.mp3` responden 200.
3. **Niveles y entidades.** Crear `lib/arkanoid/levels.ts` con los 5 niveles y `lib/arkanoid/entities.ts` con las constantes, los tipos de pala, pelota y bloque, `collideAABB` y la construcción de los bloques de un nivel, portados sin globales. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
4. **Motor.** Crear `lib/arkanoid/engine.ts` con `ArkanoidEngine`: estado de partida, bucle con tope de `dt`, movimiento de pala, rebotes, colisión con bloques, vidas, avance de nivel y victoria, sonido, dibujo (bloques, pala, pelota, desvanecido, HUD y pantallas de fin), teclado según las convenciones y callbacks. Verificación: `tsc` y `lint` pasan.
5. **Canvas.** Crear `components/arkanoid-canvas.tsx`: lee la paleta de las variables CSS al montar, crea los audios y el motor en un efecto, lo destruye al desmontar y aplica `setPaused`. Verificación: `tsc` y `lint` pasan.
6. **Alta en el Reproductor y ciclo completo.** Añadir la entrada `arkanoid` a `components/game-registry.ts` (`hud: { lives: true, level: true }`). Verificación: `/juegos/arkanoid/jugar` es jugable con el teclado, el HUD coincide con el canvas, ROCAS, TETRIS y la simulación no cambian, y se completa jugar → perder → guardar → ver la marca en el ranking de `/juegos/arkanoid` y en la pestaña ARKANOID del Salón.

## Criterios de aceptación

**Base de datos y catálogo**

- [ ] `public.games` no contiene la fila `bloque-buster` y contiene `arkanoid` con `title` `ARKANOID`, `category` `ARCADE`, `color` `cyan`, `cover` `cover-bricks`, `sort_order` 1, el mismo `short` que tenía `bloque-buster` y el `long` de esta spec.
- [ ] `games.plays` de `arkanoid` es igual al que tenía `bloque-buster` justo antes de la migración (12400 el 2026-11-20, más las puntuaciones guardadas desde entonces).
- [ ] `scores` no contiene filas con `game_id = 'bloque-buster'` ni con `game_id = 'arkanoid'` justo después de la migración.
- [ ] `games` tiene 8 filas y `sort_order` del 1 al 8 sin huecos ni repetidos.
- [ ] Sin puntuaciones, `/juegos/arkanoid` y la pestaña ARKANOID del Salón muestran «SIN PUNTUACIONES TODAVÍA».
- [ ] `/juegos/arkanoid` y `/juegos/arkanoid/jugar` responden 200; `/`, `/juegos` y `/salon` muestran ARKANOID con su portada y no BLOQUE BUSTER.
- [ ] `/juegos/bloque-buster` y `/juegos/bloque-buster/jugar` muestran la pantalla de «no encontrado» y, salvo en la primera petición, responden 404 (comportamiento de la SPEC 05).
- [ ] La actividad reciente de la home muestra «Arkanoid» en lugar de «Bloque Buster».
- [ ] `app/globals.css` no cambia y `.cover-bricks` se conserva.
- [ ] El texto `long` de ARKANOID solo menciona lo que el juego tiene: pala con flechas, 3 vidas, 5 niveles, +10 % de velocidad por nivel y 10 puntos por bloque.

**Rutas y proyecto**

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores, y `npx eslint app components lib` no devuelve errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/arkanoid/jugar`, `/juegos/rocas/jugar` ni `/juegos/tetris/jugar`.
- [ ] `lib/arkanoid/` no contiene `document.`, `getElementById`, `localStorage`, `new Audio` ni colores literales salvo el fondo `#000`.
- [ ] Los archivos de `references/started-games/04-arkanoid/` no tienen cambios en `git status`.
- [ ] `public/games/arkanoid/` contiene `ball-bounce.mp3` y `break-sound.mp3` con los mismos bytes que el original, y no contiene el spritesheet.

**Registro de juegos**

- [ ] `/juegos/rocas/jugar` y `/juegos/tetris/jugar` se comportan como antes: HUD, pausa, FIN, modal y guardado.
- [ ] `/juegos/serpentina/jugar` conserva la simulación: contiene `.game-arena` y su puntuación sube sola.
- [ ] La puntuación de ARKANOID no sube sola: el intervalo de la simulación no se ejecuta para los juegos del registro.
- [ ] En ARKANOID el HUD muestra Vidas con corazones y Nivel con dos dígitos, coincidiendo con el canvas.

**Canvas y partida**

- [ ] El canvas tiene 800×600 píxeles lógicos, ocupa el 100 % de `.crt-screen` y no se deforma.
- [ ] Al empezar: nivel 1 con 60 bloques en parrilla 10×6 desde `(80, 80)`, pala de 81×14 centrada en `y = 560`, pelota de 16×16 sobre la pala moviéndose con `vx` 200 y `vy` -300, y el canvas muestra `SCORE: 0` y `NIVEL: 1` y 3 bolas de vida.
- [ ] `←` y `→` mueven la pala a 400 px/s y no la sacan del canvas (`x` entre 0 y 719).
- [ ] Con `←` y `→` pulsadas a la vez, la pala no se mueve.
- [ ] La pelota rebota en la pared izquierda, la derecha y el techo, invirtiendo la componente correspondiente sin perder velocidad.
- [ ] La pelota que desciende y toca la pala rebota hacia arriba sin cambiar `vx`; con la pelota por debajo de la pala (más de 8 px) no rebota.
- [ ] Romper un bloque suma exactamente 10 puntos, invierte `vy`, lo hace desaparecer con un desvanecido de 150 ms y rompe como máximo un bloque por fotograma.
- [ ] Al romper el último bloque de un nivel se carga el siguiente con su patrón y la pelota vuelve a la pala; la pala no se recentra y la puntuación se conserva.
- [ ] Los niveles 1 a 5 tienen 60, 40, 30, 39 y 39 bloques con los patrones de `levels.js`.
- [ ] La velocidad de la pelota al cargar los niveles 1 a 5 es `(vx, |vy|)` = `(200, 300)`, `(220, 330)`, `(242, 363)`, `(266, 399)` y `(292, 438)`.
- [ ] Si la pelota pasa del borde inferior pierde una vida, vuelve sobre la pala con la velocidad del nivel actual y el HUD baja de vidas.
- [ ] Al perder la tercera vida termina la partida: el canvas muestra `GAME OVER` y `PUNTAJE: n` sin texto de reinicio y el HUD de vidas pasa a 0.
- [ ] Al romper el último bloque del nivel 5 termina la partida: el canvas muestra `¡COMPLETASTE EL JUEGO!` entero dentro de los 800 px y `PUNTAJE: n`, y se abre el modal con la puntuación final.
- [ ] Una partida perfecta suma 2080 puntos.
- [ ] Los bloques usan los colores de las variables CSS (`red` `--magenta`, `yellow` `--yellow`, `cyan` `--cyan`, `magenta` `--purple`, `hotpink` `--orange`, `green` `--green`, `gray` `--silver`), la pala `--silver` y la pelota `--ink`.
- [ ] Pulsar `←` y `→` durante la partida no desplaza la página.

**Sonido**

- [ ] Al rebotar la pelota en una pared o en la pala suena `ball-bounce.mp3`.
- [ ] Al romper un bloque suena `break-sound.mp3` y no suena `ball-bounce.mp3`.
- [ ] Dos sonidos pueden sonar a la vez sin cancelarse.
- [ ] «PAUSA», «FIN», «JUGAR DE NUEVO» y salir del Reproductor detienen los sonidos en curso y no se reproduce ninguno mientras el juego está parado.
- [ ] Si el navegador rechaza `play()`, el juego sigue sin errores en consola.

**HUD y botones de la plataforma**

- [ ] El HUD muestra Jugador («INVITADO»), Puntuación, Vidas y Nivel con dos dígitos, y coinciden con `SCORE`, las bolas y `NIVEL` del canvas.
- [ ] Tras romper 3 bloques, Puntuación pasa a `30`; al cargar el nivel 2, Nivel pasa a `02`; al perder una vida, Vidas pasa de 3 a 2 corazones.
- [ ] «PAUSA» detiene pelota, pala y desvanecidos, muestra la capa «EN PAUSA» y cambia el botón a «REANUDAR»; reanudar continúa sin que la pelota salte.
- [ ] Una flecha pulsada al pausar y soltada durante la pausa no queda «pegada» al reanudar.
- [ ] «FIN» abre el modal «FIN DEL JUEGO» con la puntuación actual, y el canvas muestra `GAME OVER` y `PUNTAJE: n`.
- [ ] Con el modal abierto, escribir en el campo de iniciales (incluidas las flechas y el Espacio) no mueve la pala ni reinicia el juego.
- [ ] «GUARDAR PUNTUACIÓN» añade a `av:v1:scores` una entrada `{ gameId: "arkanoid", name, score, at }`, inserta la fila en `scores` y muestra «PUNTUACIÓN GUARDADA».
- [ ] La puntuación guardada aparece en el ranking de `/juegos/arkanoid` y en la pestaña ARKANOID del Salón, y en «TU MEJOR MARCA»; `games.plays` de `arkanoid` sube en 1.
- [ ] «JUGAR DE NUEVO» cierra el modal y reinicia: nivel 1 con 60 bloques, Puntuación 0, 3 vidas, Nivel 01 y sin estado de guardado.
- [ ] «SALIR» navega a `/juegos/arkanoid` y «VOLVER AL VAULT» (modal) a `/juegos`.
- [ ] Tras salir del Reproductor, pulsar las flechas no produce errores en consola ni cambios en la página (bucle, listeners y sonidos destruidos).
- [ ] Entrar y salir varias veces de `/juegos/arkanoid/jugar` no acumula bucles: la pelota va a la misma velocidad que en la primera visita.

## Decisiones tomadas y descartadas

- **Sí:** reutilizar la entrada BLOQUE BUSTER del catálogo y renombrarla a ARKANOID, igual que ROCAS y TETRIS reutilizaron las suyas. **No:** añadir una fila nueva (dejaría dos juegos de bloques) ni conservar el título BLOQUE BUSTER: el juego se llama Arkanoid.
- **Sí:** `id` `arkanoid`. Una migración que inserta la fila nueva, borra `bloque-buster` y ajusta `sort_order`, en una transacción, conservando `plays`, `created_at`, categoría, color y portada. **No:** `update games set id`, que falla por `scores_game_id_fkey` mientras haya puntuaciones, ni alterar la clave foránea (cambio de esquema fuera de alcance).
- **Sí:** borrar los 5 seeds, aprovechando el `ON DELETE CASCADE` de la clave foránea y sin mover filas. Motivo: la puntuación máxima real es 2080 y los seeds van de 109681 a 228057, así que el Top 5 sería inalcanzable. **No:** reescalarlos (inventaría marcas de jugadores) ni conservarlos.
- **Sí:** conservar `plays` (12400). **No:** reiniciarlo a 0: el contador de la tarjeta mantiene el peso de la home, y el trigger `bump_game_plays` solo suma en `INSERT` de `scores`, así que borrar y copiar no lo altera.
- **Sí:** `short` sin cambios, porque describe el juego («Rebota la pelota y destruye muros de neón.»). **Sí:** reescribir `long`: el actual promete «patrones imposibles» y una «racha» que el juego no tiene. El nuevo solo describe pala, 3 vidas, 5 niveles, +10 % de velocidad y 10 puntos por bloque.
- **Sí:** mantener `sort_order` 1, de modo que ARKANOID sigue entre los 6 primeros de la home. **No:** moverlo.
- **Sí:** mantener la portada `cover-bricks` y `games.cover`. **No:** tocar el CSS: ya es una portada de bloques de colores.
- **Sí:** dibujo vectorial neón con la paleta de las variables CSS, como ROCAS y TETRIS. **No:** el spritesheet de Petraheim: rompe la paleta de la plataforma, obliga a un paso de carga asíncrona y exige atribución de un asset de terceros.
- **Sí:** mapear los colores de bloque por su aspecto en el spritesheet (`magenta` → `--purple`, `hotpink` → `--orange`), con `red` → `--magenta`, el rojo neón de la plataforma, como en TETRIS. **No:** seguir los nombres literales del original, que darían dos bloques rosas y ningún naranja.
- **Sí:** la explosión de 4 fotogramas pasa a un desvanecido de 150 ms (`globalAlpha`), con la misma duración. **No:** animación por sprites.
- **Sí:** solo teclado (`←`, `→`), como ROCAS y TETRIS. **No:** el `mousemove` del original: añade conversión de coordenadas y otro listener, y se decide en otra spec junto con los controles táctiles.
- **Sí:** el teclado usa `e.key` y un mapa de teclas, como el original, con `keyup` siempre activo y `preventDefault` en las dos flechas. Espacio no es tecla del juego, así que el criterio del botón enfocado no aplica.
- **Sí:** sin tecla `P` ni `Esc`, y sin selector de nivel en la pausa (es una herramienta de depuración que además hacía clic en el canvas). La pausa es solo el botón PAUSA de la plataforma. **No:** conservar el salto de nivel: permite puntuaciones sin jugar los niveles anteriores.
- **Sí:** sonido incluido, a petición expresa, con los dos mp3 copiados a `public/games/arkanoid/`. Es el primer audio de la plataforma. **No:** control de volumen ni mute (fuera de alcance, riesgo aceptado), ni música.
- **Sí:** el wrapper crea los `HTMLAudioElement` y los inyecta en el motor, que no contiene `new Audio` ni acceso al DOM. Motivo: mismo patrón que la paleta, y los audios se crean en el efecto, nunca durante el render.
- **Sí:** el motor reproduce copias con `cloneNode()`, como el original, para que los sonidos se solapen, y las detiene en pausa, fin, reinicio y `destroy()`. **No:** dejar que sigan sonando tras salir del Reproductor.
- **Sí:** capturar el rechazo de `play()`. Motivo: la política de reproducción automática del navegador puede rechazarlo y no debe romper la partida.
- **Sí:** conservar el HUD en el canvas (`SCORE`, `NIVEL`, bolas de vida) además del HUD de la plataforma, como ROCAS. **No:** quitarlo: se aleja del original y no aporta área de juego.
- **Sí:** las etiquetas del canvas pasan a `SCORE: n` y `NIVEL: n` en mayúsculas, como ROCAS. El original usa `Score: n` y `Nivel: n`.
- **Sí:** la victoria al romper el último bloque del nivel 5 es un fin de partida: se llama a `onGameOver` con la puntuación final y se abre el modal de guardado. El canvas muestra `¡COMPLETASTE EL JUEGO!` con un tamaño que quepa: a 64 px en monospace el texto original mide unos 845 px y se saldría del canvas de 800. **No:** un estado de victoria aparte en React.
- **Sí:** `PUNTAJE: n` bajo `GAME OVER` y bajo la victoria, y sin texto de reinicio, igual que ROCAS y TETRIS. El original no muestra la puntuación en su pantalla de fin.
- **Sí:** `finish()` (botón FIN) sigue la misma ruta que perder: pantalla `GAME OVER` en el canvas y `onGameOver`. **No:** un fin independiente en React.
- **Sí:** conservar el comportamiento del original aunque sea mejorable: la pelota sale moviéndose sin tecla de lanzamiento, la pala no se recentra al perder una vida ni al cargar nivel, el rebote en pala no depende del punto de impacto y un bloque invierte siempre `vy`, incluso en un golpe lateral. Es un port, no un rediseño.
- **Sí:** nivel 4 con huecos fijos, como en `levels.js`. La spec interna del original dice «al azar», pero el código no usa `Math.random()`: manda el código.
- **Sí:** tope de `dt` de 0,05 s, como ROCAS. El original no lo tiene, y tras una pestaña en segundo plano la pelota (hasta 438 px/s) atravesaría bloques y pala. Con el tope recorre como mucho 22 px por fotograma, menos que la altura de un bloque (24). **No:** `dt` sin tope.
- **Sí:** al reanudar se reinicia `lastTime` para que no haya saltos; en el original `lastTime` seguía avanzando durante la pausa.
- **Sí:** `onStats` solo al cambiar `score`, `lives` o `level`. **No:** en cada fotograma.
- **Sí:** el motor ignora `keydown` en `<input>`/`<textarea>`, en pausa y con la partida terminada. Es el criterio de ROCAS y TETRIS.
- **Sí:** sin reinicio por tecla: el reinicio es solo «JUGAR DE NUEVO» (`restart()`), porque el modal tiene un campo de texto donde se escribe con Espacio.
- **Sí:** aprovechar el registro de la SPEC 06: solo se añade la entrada `arkanoid`. **No:** tocar `components/game-player.tsx`.
- **Sí:** aceptar que las marcas de `localStorage` con `gameId: "bloque-buster"` dejan de aparecer en «TU MEJOR MARCA». **No:** migrarlas.
- **Sí:** no editar las SPEC 01, 02, 04, 05 y 06 aunque citen BLOQUE BUSTER: son registros históricos.
- **Sí:** no modificar `references/started-games/04-arkanoid/`; el audio se copia, no se mueve.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| La migración falla a medias y deja `bloque-buster` y `arkanoid` a la vez | `apply_migration` ejecuta el script como una transacción; se verifica después el recuento de `games` y `scores` antes de seguir. Se consulta el estado de `bloque-buster` justo antes de aplicarla. |
| `getGames()`/`getGame()` están cacheados (`cacheLife("minutes")`) y `/juegos/bloque-buster` o el título antiguo siguen viéndose un rato tras migrar | Documentado en la verificación del paso 1: esperar a que expire la caché o invalidar la etiqueta `games` (por ejemplo guardando una puntuación) antes de comprobar. |
| Borrar `bloque-buster` elimina los seeds por la cascada, sin posibilidad de recuperarlos | Es lo decidido. Antes de aplicar se consulta el recuento (5 filas el 2026-11-20); si ha cambiado, hay puntuaciones reales y se revisa con el usuario antes de continuar. |
| Las marcas de `localStorage` con `gameId: "bloque-buster"` quedan huérfanas | Aceptado: la marca personal es un dato local de bajo valor y se registra como decisión. |
| El navegador bloquea la reproducción de audio o `play()` rechaza la promesa | Se captura el rechazo; el juego sigue sin sonido y sin errores. Criterio de aceptación. |
| Los sonidos siguen sonando tras pausar, terminar o salir del Reproductor | El motor lleva la cuenta de las copias activas y las detiene en `setPaused(true)`, `finish()`, `restart()` y `destroy()`. Criterio de aceptación. |
| No hay control de volumen ni mute y el sonido puede resultar molesto | Riesgo aceptado: el volumen es el del navegador. Un control de audio común a todos los juegos va en otra spec. |
| La pelota atraviesa un bloque o la pala tras un fotograma largo | Tope de `dt` de 0,05 s (22 px por fotograma como máximo) y reinicio de `lastTime` al reanudar. |
| Strict Mode monta el efecto dos veces y quedan dos bucles, dos juegos de listeners o dos audios sonando | `destroy()` cancela `requestAnimationFrame`, quita los listeners y detiene los sonidos; el efecto del wrapper lo llama en su limpieza. Criterio sobre bucles acumulados. |
| Escribir las iniciales del modal mueve la pala | El motor ignora `keydown` cuyo objetivo sea `<input>` o `<textarea>` y también con la partida terminada. |
| Una flecha soltada durante la pausa o el modal queda «pegada» | `keyup` actualiza siempre el mapa de teclas y se sueltan las teclas al pausar, reanudar y reiniciar. |
| El simulador y el motor suman puntos a la vez | El Reproductor no arranca el intervalo de la simulación para los juegos del registro. Criterio: la puntuación de ARKANOID no sube sola. |
| Una variable CSS no existe y el canvas dibuja con color vacío | Criterio de aceptación de los colores de bloque, pala y pelota. Todas las variables usadas existen ya en `app/globals.css`. |
| El texto de victoria se sale del canvas | Tamaño de letra menor que el de `GAME OVER` y criterio que lo comprueba. |
| Demasiados renders por emitir estadísticas en cada fotograma | `onStats` solo se llama al cambiar `score`, `lives` o `level`. |
| El rebote lateral que invierte `vy` produce trayectorias raras | Se conserva a propósito (decisión explícita); si molesta, se cambia en otra spec. |
| La política `scores_insert_public` abierta permite puntuaciones falsas (riesgo aceptado en la SPEC 05) | Antitrampas y Auth van en otra spec. |

## Lo que **no** entra en esta spec

- Control con ratón y controles táctiles o botones en pantalla.
- Control de volumen, mute y música de fondo.
- Tecla `P` o `Esc` y selector de nivel en la pausa.
- Spritesheet, animación de explosión por fotogramas y atribución del asset de Petraheim.
- Cambios de reglas y de balance: ángulos de rebote, power-ups, bloques resistentes, más niveles.
- Los otros juegos sin motor real; siguen con la simulación.
- Rankings sembrados nuevos, Auth, antitrampas o cambios de esquema en Supabase.
- Redirección de `/juegos/bloque-buster`, migración de las marcas locales con `gameId: "bloque-buster"` y cambios en la portada `cover-bricks`.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Corregir los criterios históricos de las SPEC 01, 02, 04, 05 y 06.
- Modificar `references/started-games/04-arkanoid/`.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
