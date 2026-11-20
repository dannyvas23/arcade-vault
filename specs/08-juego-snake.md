# SPEC 08 — Juego SNAKE jugable en el Reproductor

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (Reproductor, catálogo y `ScoresProvider`), SPEC 04 (juego ROCAS), SPEC 05 (tabla de juegos y leaderboard en Supabase), SPEC 06 (juego TETRIS y registro de juegos), SPEC 07 (juego ARKANOID)
> **Fecha:** 2026-11-20
> **Objetivo:** Crear en TypeScript el juego Snake con los sprites de frutas de `references/source-assets/`, renombrar el juego SERPENTINA del catálogo a SNAKE y conectarlo al HUD, los botones, el modal de guardado y el leaderboard de la plataforma mediante el registro de juegos.

---

## Por qué existe esta spec

Snake es el cuarto juego con motor real, tras ROCAS (SPEC 04), TETRIS (SPEC 06) y ARKANOID (SPEC 07). A diferencia de ellos, no hay código de origen: `references/source-assets/` solo contiene `fruits.png` (una hoja de 3790×442 px con tres filas de frutas: dibujo plano, pixel-art y fotografía) y `sprites.js` (un atlas de recortes de la fila pixel-art para `window.SPRITE_ATLAS`). El motor se diseña desde cero y sus reglas y valores se fijan aquí.

El atlas de `sprites.js` tiene las coordenadas correctas, pero los **nombres están desfasados** respecto al dibujo: `banana` (`x: 34`) es una manzana, `orange` (`x: 186`) es un plátano, `grape` (`x: 378`) es una piña, y así hasta `melon` (`x: 3637`), que es un bol de fruta. Por eso la spec fija una tabla de recortes con los nombres corregidos y no reutiliza `sprites.js`.

La hoja procede de The Spriters Resource (sprites del Snake de Google), según el comentario de `sprites.js`: es un asset de terceros. Se usa por petición expresa del usuario y su procedencia se anota en el código (ver «Decisiones»).

El registro de juegos (`components/game-registry.ts`) ya existe, así que esta spec solo añade una entrada. No hay refactor del Reproductor.

En el catálogo ya existe **SERPENTINA** (`id: "serpentina"`, `cover-snake`, `sort_order` 3, `plays` 9100, 5 puntuaciones sembradas), el equivalente mock de este juego, igual que CAÍDA lo era de Tetris y BLOQUE BUSTER de Arkanoid. No se añade una entrada nueva: pasa a llamarse **SNAKE** (`id: "snake"`). Como `scores.game_id` referencia `games.id` sin `ON UPDATE CASCADE`, el renombrado no puede ser un `UPDATE` del `id`: se copia la fila y se borra la antigua.

Las 5 puntuaciones sembradas no se conservan. El máximo real del juego es 7650 puntos (765 frutas en un tablero de 768 celdas con la serpiente inicial de 3), mientras que los seeds van de 178833 a 286766: ninguna partida real podría entrar jamás en el Top 5. Borrar la fila antigua las elimina por `ON DELETE CASCADE` y el ranking empieza vacío.

## Alcance

**Dentro:**

- Motor de SNAKE en TypeScript, sin React ni acceso global al DOM, en `lib/snake/`: tablero de 32×24 celdas, serpiente, fruta, niveles con aceleración, puntuación y fin de partida.
- Componente de cliente `components/snake-canvas.tsx` con un canvas de 800×600 lógicos escalado al marco CRT, que carga la hoja de sprites al montar, arranca el motor cuando la imagen está lista y lo destruye al desmontarse.
- Hoja `fruits.png` copiada a `public/games/snake/` y tabla corregida de los 22 recortes de la fila pixel-art en `lib/snake/sprites.ts`.
- Pantalla de espera (`PULSA UNA FLECHA PARA EMPEZAR`) y pantallas de fin (`GAME OVER` y `¡TABLERO COMPLETO!`) dibujadas en el canvas.
- El motor notifica puntuación, nivel y fin de partida al HUD, los botones y el modal de la plataforma. SNAKE no tiene vidas: el HUD muestra «—» en Vidas.
- Todos los botones y pantallas del Reproductor funcionan con el motor: PAUSA/REANUDAR («EN PAUSA»), FIN, SALIR, modal «FIN DEL JUEGO», «GUARDAR PUNTUACIÓN», «JUGAR DE NUEVO» y «VOLVER AL VAULT».
- Controles de teclado: `←` `↑` `→` `↓` y `A` `W` `D` `S` como equivalentes.
- Entrada `snake` en `GAME_REGISTRY` con `hud: { lives: false, level: true }`.
- Migración del catálogo: `serpentina` pasa a `snake` (título `SNAKE`, `long` reescrito) conservando `short`, categoría, color, portada `cover-snake`, `sort_order` 3, `plays` y `created_at`; sus 5 puntuaciones sembradas se eliminan.
- Actualizar el texto «Serpentina» de la actividad reciente de la home (`lib/home.ts`) a «Snake».
- Paleta neón desde las variables CSS de `app/globals.css` para serpiente, cuadrícula y textos; las frutas conservan los colores de sus sprites.
- Que las teclas del juego no desplacen la página.

**Fuera de alcance (para otras specs):**

- Controles táctiles, de ratón o botones en pantalla.
- Sonido y música (no hay assets de audio).
- Tecla de pausa `P` o `Esc`: la pausa es solo el botón de la plataforma.
- Cambios de reglas o de balance: bordes que se atraviesan, obstáculos, frutas especiales, puntos distintos por fruta, vidas, modos de juego.
- HUD dibujado dentro del canvas: la puntuación y el nivel se ven solo en el HUD de la plataforma.
- Las filas de dibujo plano y de fotografía de `fruits.png` y el recorte de la hoja a un PNG más ligero.
- Página de créditos o licencias del asset de terceros.
- Versionar `references/source-assets/` (hoy está sin seguimiento en git).
- Los demás juegos sin motor real: siguen con la simulación.
- Sembrar un ranking nuevo ajustado a la escala del juego.
- Sincronizar o migrar las marcas de `localStorage` que usan `gameId: "serpentina"`.
- Redirección de `/juegos/serpentina` a `/juegos/snake`.
- Renombrar o rediseñar la portada `cover-snake`.
- Auth, antitrampas, cambios en el esquema de Supabase más allá de la migración de datos descrita.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Modificar `references/source-assets/`.
- Corregir los criterios históricos de las SPEC 01, 02, 03, 05, 06 y 07 que citan SERPENTINA.
- Tests automatizados (no hay framework instalado).

## Modelo de datos

No hay datos persistentes nuevos: las puntuaciones se guardan con el `SavedScore` y la clave `av:v1:scores` de la SPEC 01 y con `submitScore` de la SPEC 05, con `gameId: "snake"`. Se añaden el contrato del motor y la tabla de sprites. `GameStats`, `GameHandle` y `GameCanvasProps` ya existen en `lib/game-types.ts` (SPEC 06).

```ts
// lib/snake/sprites.ts
export type FruitSprite = { name: string; x: number; w: number }; // y = 136 y h = 160 en todos
export const SPRITE_Y = 136;
export const SPRITE_H = 160;
export const FRUIT_SPRITES: FruitSprite[]; // 22 recortes de fruits.png (fila pixel-art), ver tabla
```

```ts
// lib/snake/engine.ts
export type SnakePalette = {
  body: string;          // cuerpo de la serpiente      → var(--green)
  head: string;          // cabeza                      → var(--cyan)
  grid: string;          // cuadrícula                  → var(--line-2)
  fruitFallback: string; // fruta si no hay sprites     → var(--magenta)
  text: string;          // textos del canvas           → var(--ink)
};
export type SnakeStats = { score: number; level: number }; // sin lives
export type SnakeCallbacks = {
  onStats: (s: SnakeStats) => void;    // solo cuando cambia algún valor
  onGameOver: (s: SnakeStats) => void; // una vez por partida (derrota o tablero completo)
};
export class SnakeEngine {
  constructor(canvas: HTMLCanvasElement, palette: SnakePalette, sprites: HTMLImageElement | null, cb: SnakeCallbacks);
  start(): void;   // nueva partida e inicio del bucle requestAnimationFrame
  restart(): void; // nueva partida (3 celdas, 0 puntos, nivel 1, a la espera de tecla)
  setPaused(paused: boolean): void;
  finish(): void;  // termina la partida (botón FIN)
  destroy(): void; // cancela el bucle y quita los listeners de teclado
}
```

```sql
-- Migración del catálogo (se aplica en la implementación con apply_migration, en una transacción)
insert into public.games (id, title, short, "long", category, cover, color, plays, sort_order, created_at)
select 'snake', 'SNAKE', short,
       'Guía la serpiente con las flechas o con W A S D y come las frutas que aparecen en el tablero. Cada fruta suma 10 puntos y alarga la serpiente, y cada 5 frutas subes de nivel y ella se acelera. Chocar con el borde o con tu propia cola termina la partida.',
       category, cover, color, plays, 99, created_at
from public.games where id = 'serpentina';                     -- sort_order 99 provisional (es unique)
delete from public.games where id = 'serpentina';              -- scores_game_id_fkey (ON DELETE CASCADE) borra sus 5 seeds
update public.games set sort_order = 3 where id = 'snake';
```

Convenciones:

- Archivos del motor: `lib/snake/sprites.ts` (tabla de recortes), `lib/snake/entities.ts` (constantes, tipos `Cell` y `Direction`, y funciones puras de la serpiente y de la elección de celda libre) y `lib/snake/engine.ts`. Las entidades no leen el DOM ni dibujan con colores propios.
- Canvas de 800×600 píxeles lógicos, con origen arriba a la izquierda, escalado con CSS al 100 % del `.crt-screen` (ya 4:3). Tablero de `COLS` 32 × `ROWS` 24 celdas de `CELL` 25 px, que llena el canvas entero.
- Valores del juego (diseño propio de esta spec):

| Concepto | Valor |
| -------- | ----- |
| Serpiente inicial | 3 celdas: cabeza en columna 16, fila 12, cuerpo en (15, 12) y (14, 12); dirección derecha |
| Estado inicial | a la espera: no avanza hasta la primera tecla de dirección válida |
| Puntuación | 10 puntos por fruta |
| Crecimiento | 1 celda por fruta (la cola no se retira en el paso en que come) |
| Nivel | `1 + floor(frutas / 5)` |
| Intervalo de paso | `max(60, 150 - (nivel - 1) * 10)` ms: 150 ms en el nivel 1 y 60 ms desde el nivel 10 |
| Puntuación máxima | 7650 (765 frutas; el tablero tiene 768 celdas) |
| Bordes | el muro mata: salir del tablero termina la partida |
| Cola | morderse el cuerpo termina la partida; entrar en la celda que la cola deja libre en ese paso no mata (salvo que coma) |
| Cola de entradas | hasta 2 cambios de dirección pendientes; se ignora la inversión de 180° respecto a la última dirección encolada y repetir la misma |
| Fruta | una a la vez, en una celda libre al azar y con uno de los 22 sprites al azar; todas valen lo mismo |
| Fin por tablero completo | si no queda celda libre para la fruta, la partida termina con `¡TABLERO COMPLETO!` |

- Mapeo a la plataforma: `score` = puntuación; `level` = nivel; `lives` ausente (`hud.lives = false`). El número de frutas no se muestra.
- Sprites: la hoja se dibuja con `drawImage` recortando `(x, 136, w, 160)` y escalando sin deformar para que quepa en la celda de 25×25 (escala `min(25 / w, 25 / 160)`), centrada en la celda y con `imageSmoothingEnabled` activado (los sprites se reducen unas seis veces). Si `sprites` es `null` (la imagen no cargó), la fruta es un círculo `fruitFallback` y el juego sigue.
- Recortes de `fruits.png` (fila pixel-art, todos con `y = 136` y `h = 160`) con los nombres corregidos:

| # | Sprite | x | w | # | Sprite | x | w |
| - | ------ | - | - | - | ------ | - | - |
| 1 | `apple` | 34 | 110 | 12 | `broccoli` | 1906 | 150 |
| 2 | `banana` | 186 | 150 | 13 | `watermelon` | 2068 | 170 |
| 3 | `pineapple` | 378 | 110 | 14 | `pepper` | 2250 | 140 |
| 4 | `grapes` | 540 | 130 | 15 | `kiwi` | 2432 | 130 |
| 5 | `pumpkin` | 712 | 130 | 16 | `lemon` | 2604 | 130 |
| 6 | `turnip` | 894 | 110 | 17 | `orange` | 2786 | 110 |
| 7 | `eggplant` | 1066 | 110 | 18 | `peach` | 2948 | 130 |
| 8 | `strawberry` | 1228 | 130 | 19 | `peanut` | 3110 | 150 |
| 9 | `cherry` | 1400 | 130 | 20 | `raspberry` | 3302 | 110 |
| 10 | `carrot` | 1582 | 110 | 21 | `tomato` | 3454 | 150 |
| 11 | `mushroom` | 1734 | 150 | 22 | `fruitbowl` | 3637 | 130 |

- Colores (ningún literal en `lib/snake/` salvo el fondo `#000`): cuerpo `--green`, cabeza `--cyan`, cuadrícula `--line-2`, textos `--ink`, fruta de respaldo `--magenta`. Los ojos de la cabeza y el oscurecido de la pantalla de fin usan `#000` (con `globalAlpha` en el segundo). El detalle visual (casillas del tablero, esquinas redondeadas, ojos) lo afina la implementación con `frontend-design` sin cambiar las medidas del tablero ni las colisiones.
- Tiempo: bucle con `requestAnimationFrame` y acumulador del intervalo de paso, como TETRIS. El motor avanza como máximo un paso por fotograma y descarta el exceso del acumulador tras un fotograma largo. Al pausar y reanudar se reinicia `lastTime` y el acumulador.
- Aleatoriedad: la fruta y su sprite se eligen con `Math.random()` solo en `start()`, `restart()` y al comer, dentro del bucle, nunca en el constructor ni en el render.
- Textos del canvas: espera `PULSA UNA FLECHA PARA EMPEZAR`; derrota `GAME OVER`; tablero completo `¡TABLERO COMPLETO!`; ambas pantallas de fin con `PUNTAJE: n` debajo, sobre el tablero oscurecido y sin ningún texto de reinicio. Los textos caben en 800 px.
- Teclado: el motor registra `keydown` y `keyup` en `window` al iniciar y los quita en `destroy()`. Usa `e.code` (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`). `keydown` aplica el cambio de dirección en el momento (cola de 2) y se ignora si el objetivo es un `<input>` o `<textarea>`, si hay pausa o si la partida terminó. `preventDefault()` en `keydown` y `keyup` de las ocho teclas, fuera de campos de texto. Al pausar, reanudar y reiniciar se vacía la cola de direcciones. En la espera, `←`/`A` se ignoran porque son la inversión de la dirección inicial.
- `onStats` se emite al iniciar y solo cuando cambia `score` o `level`, nunca en cada fotograma.
- El HUD de la plataforma muestra el `level` del motor y «—» en Vidas, no la fórmula `1 + floor(puntuación / 2500)` de la simulación.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`); para los pasos 5 y 6, la de componentes de cliente (`01-app/02-guides/server-and-client-boundary.md`). Para la interfaz se usa siempre la skill `frontend-design`, con el aspecto de ROCAS, TETRIS y ARKANOID como referencia.

1. **Catálogo y home.** Consultar antes el estado de `serpentina` y su recuento en `scores`. Aplicar con `apply_migration` el renombrado de `serpentina` a `snake` (SQL de «Modelo de datos») y cambiar «Serpentina» por «Snake» en `lib/home.ts`. Verificación: `/juegos/snake` muestra SNAKE con `plays` 9100 y «SIN PUNTUACIONES TODAVÍA», `/juegos/serpentina` muestra «no encontrado», `games` tiene 8 filas con `sort_order` del 1 al 8, y `/juegos/snake/jugar` sigue con la simulación.
2. **Sprites.** Copiar `references/source-assets/fruits.png` a `public/games/snake/fruits.png` (el original queda intacto). Verificación: `/games/snake/fruits.png` responde 200 y tiene los mismos bytes que el original.
3. **Tabla de sprites y entidades.** Crear `lib/snake/sprites.ts` con los 22 recortes de la tabla (con un comentario de cabecera que cite la procedencia de la hoja) y `lib/snake/entities.ts` con las constantes, los tipos `Cell` y `Direction`, el avance de la serpiente, la detección de colisión y la elección de una celda libre. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
4. **Motor.** Crear `lib/snake/engine.ts` con `SnakeEngine`: estado de partida y espera, bucle con acumulador, cola de direcciones, avance, comer, crecer, niveles, muerte y tablero completo, dibujo (cuadrícula, serpiente, fruta con sprite o respaldo, textos y pantallas de fin), teclado según las convenciones y callbacks. Verificación: `tsc` y `lint` pasan.
5. **Canvas.** Crear `components/snake-canvas.tsx`: lee la paleta de las variables CSS al montar, carga `/games/snake/fruits.png` en el efecto (nunca durante el render), crea el motor y llama a `start()` cuando la imagen carga (o con `null` si falla), lo destruye al desmontar y aplica `setPaused`; si el componente se desmonta antes de que cargue la imagen, no arranca nada. Verificación: `tsc` y `lint` pasan.
6. **Alta en el Reproductor y ciclo completo.** Añadir la entrada `snake` a `components/game-registry.ts` (`hud: { lives: false, level: true }`). Verificación: `/juegos/snake/jugar` es jugable con el teclado, el HUD coincide con el juego, ROCAS, TETRIS, ARKANOID y la simulación no cambian, y se completa jugar → perder → guardar → ver la marca en el ranking de `/juegos/snake` y en la pestaña SNAKE del Salón.

## Criterios de aceptación

**Base de datos y catálogo**

- [ ] `public.games` no contiene la fila `serpentina` y contiene `snake` con `title` `SNAKE`, `category` `ARCADE`, `color` `green`, `cover` `cover-snake`, `sort_order` 3, el mismo `short` que tenía `serpentina` y el `long` de esta spec.
- [ ] `games.plays` de `snake` es igual al que tenía `serpentina` justo antes de la migración (9100 el 2026-11-20, más las puntuaciones guardadas desde entonces).
- [ ] `scores` no contiene filas con `game_id = 'serpentina'` ni con `game_id = 'snake'` justo después de la migración.
- [ ] `games` tiene 8 filas y `sort_order` del 1 al 8 sin huecos ni repetidos.
- [ ] Sin puntuaciones, `/juegos/snake` y la pestaña SNAKE del Salón muestran «SIN PUNTUACIONES TODAVÍA».
- [ ] `/juegos/snake` y `/juegos/snake/jugar` responden 200; `/`, `/juegos` y `/salon` muestran SNAKE con su portada y no SERPENTINA.
- [ ] `/juegos/serpentina` y `/juegos/serpentina/jugar` muestran la pantalla de «no encontrado» y, salvo en la primera petición, responden 404 (comportamiento de la SPEC 05).
- [ ] La actividad reciente de la home muestra «Snake» en lugar de «Serpentina».
- [ ] `app/globals.css` no cambia y `.cover-snake` se conserva.
- [ ] El texto `long` de SNAKE solo menciona lo que el juego tiene: flechas o `W` `A` `S` `D`, frutas de 10 puntos que alargan la serpiente, nivel cada 5 frutas con aceleración, y fin al chocar con el borde o con la cola.

**Rutas y proyecto**

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores, y `npx eslint app components lib` no devuelve errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/snake/jugar`, `/juegos/rocas/jugar`, `/juegos/tetris/jugar` ni `/juegos/arkanoid/jugar`.
- [ ] `lib/snake/` no contiene `document.`, `getElementById`, `localStorage`, `new Image`, `new Audio` ni colores literales salvo `#000`.
- [ ] Los archivos `references/source-assets/fruits.png` y `references/source-assets/sprites.js` no cambian de contenido.
- [ ] `public/games/snake/` contiene `fruits.png` con los mismos bytes que el original y no contiene `sprites.js`.

**Registro de juegos**

- [ ] `/juegos/rocas/jugar`, `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` se comportan como antes: HUD, pausa, FIN, modal y guardado.
- [ ] `/juegos/gloton/jugar` conserva la simulación: contiene `.game-arena` y su puntuación sube sola.
- [ ] La puntuación de SNAKE no sube sola: el intervalo de la simulación no se ejecuta para los juegos del registro.
- [ ] En SNAKE el HUD muestra «—» en Vidas y el Nivel con dos dígitos.

**Sprites**

- [ ] `public/games/snake/fruits.png` se sirve y el canvas dibuja la fruta con su sprite, no con el círculo de respaldo.
- [ ] `FRUIT_SPRITES` tiene 22 entradas con los `x` y `w` de la tabla y `y` 136, `h` 160 para todas.
- [ ] Cada recorte muestra el dibujo que indica su nombre (`apple` es la manzana roja, `banana` el plátano, `fruitbowl` el bol de fruta, y así los 22).
- [ ] La fruta se dibuja con su proporción original, centrada y sin salirse de su celda de 25×25.
- [ ] Si la imagen no carga, el juego arranca igualmente y la fruta es un círculo `--magenta`, sin errores no controlados en consola.

**Canvas y partida**

- [ ] El canvas tiene 800×600 píxeles lógicos, ocupa el 100 % de `.crt-screen` y no se deforma.
- [ ] Al empezar el tablero es de 32×24 celdas de 25 px y la serpiente mide 3 celdas con la cabeza en (16, 12) y el cuerpo en (15, 12) y (14, 12).
- [ ] Al empezar hay exactamente una fruta, en una celda que no es de la serpiente; el HUD muestra Puntuación `0` y Nivel `01`; el canvas muestra `PULSA UNA FLECHA PARA EMPEZAR`.
- [ ] La serpiente no se mueve hasta pulsar `↑`, `↓` o `→` (o `W`, `S`, `D`); `←` o `A` no la inician.
- [ ] Tras la primera tecla válida la serpiente avanza una celda cada 150 ms en la dirección de esa tecla y el texto de espera desaparece.
- [ ] `↑` `↓` `←` `→` y `W` `S` `A` `D` giran la serpiente a arriba, abajo, izquierda y derecha, y cada pareja de teclas hace lo mismo.
- [ ] Una tecla de dirección opuesta a la actual (inversión de 180°) no tiene efecto.
- [ ] Dos giros pulsados dentro del mismo intervalo de paso (por ejemplo `↑` y `←` yendo a la derecha) se ejecutan en dos pasos consecutivos, y la serpiente no se inclina contra sí misma.
- [ ] Comer una fruta suma exactamente 10 puntos, alarga la serpiente una celda y genera otra fruta con un sprite al azar en una celda libre.
- [ ] La fruta nueva nunca aparece sobre una celda de la serpiente.
- [ ] Al comer la 5.ª fruta el Nivel pasa a `02` y el intervalo de paso a 140 ms; al comer la 10.ª, a `03` y 130 ms.
- [ ] A partir del nivel 10 el intervalo es de 60 ms y no baja de ahí.
- [ ] Salir de cualquiera de los cuatro bordes del tablero termina la partida.
- [ ] Que la cabeza entre en una celda del propio cuerpo termina la partida.
- [ ] Que la cabeza entre en la celda que la cola deja libre en ese mismo paso no termina la partida.
- [ ] Al terminar la partida el canvas muestra el tablero oscurecido, `GAME OVER` y `PUNTAJE: n` sin texto de reinicio, y el teclado deja de mover la serpiente.
- [ ] Si la serpiente ocupa las 768 celdas la partida termina con `¡TABLERO COMPLETO!` y `PUNTAJE: 7650` (se comprueba reduciendo temporalmente `COLS` y `ROWS`).
- [ ] La serpiente usa `--green`, la cabeza `--cyan`, la cuadrícula `--line-2` y los textos `--ink`.
- [ ] Pulsar las flechas y `W` `A` `S` `D` durante la partida no desplaza la página.

**HUD y botones de la plataforma**

- [ ] El HUD muestra Jugador («INVITADO»), Puntuación, Vidas («—») y Nivel con dos dígitos, y Puntuación y Nivel coinciden con los valores del juego.
- [ ] Tras comer 3 frutas, Puntuación pasa a `30`; al comer la 5.ª, Nivel pasa a `02`.
- [ ] «PAUSA» detiene la serpiente, muestra la capa «EN PAUSA» y cambia el botón a «REANUDAR»; reanudar continúa sin que la serpiente salte varias celdas.
- [ ] Una tecla de dirección pulsada durante la pausa no cambia la dirección al reanudar.
- [ ] «FIN» abre el modal «FIN DEL JUEGO» con la puntuación actual, y el canvas muestra `GAME OVER` y `PUNTAJE: n`.
- [ ] Al terminar la partida por choque se abre el modal automáticamente con la puntuación final.
- [ ] Con el modal abierto, escribir en el campo de iniciales (incluidas las flechas, `W` `A` `S` `D` y el Espacio) no mueve la serpiente ni reinicia el juego.
- [ ] «GUARDAR PUNTUACIÓN» añade a `av:v1:scores` una entrada `{ gameId: "snake", name, score, at }`, inserta la fila en `scores` y muestra «PUNTUACIÓN GUARDADA».
- [ ] La puntuación guardada aparece en el ranking de `/juegos/snake` y en la pestaña SNAKE del Salón, y en «TU MEJOR MARCA»; `games.plays` de `snake` sube en 1.
- [ ] «JUGAR DE NUEVO» cierra el modal y reinicia: serpiente de 3 celdas en la posición inicial, a la espera de tecla, Puntuación 0, Nivel 01 y sin estado de guardado.
- [ ] «SALIR» navega a `/juegos/snake` y «VOLVER AL VAULT» (modal) a `/juegos`.
- [ ] Tras salir del Reproductor, pulsar las flechas y `W` `A` `S` `D` no produce errores en consola ni cambios en la página (bucle y listeners destruidos).
- [ ] Entrar y salir varias veces de `/juegos/snake/jugar` no acumula bucles: la serpiente avanza a la misma velocidad (una celda cada 150 ms en el nivel 1) que en la primera visita.

## Decisiones tomadas y descartadas

- **Sí:** reutilizar la entrada SERPENTINA del catálogo y renombrarla a SNAKE, igual que TETRIS y ARKANOID. **No:** conservar el título SERPENTINA (el juego se llama Snake) ni añadir una fila nueva (dejaría dos juegos de serpiente).
- **Sí:** `id` `snake`. Una migración que inserta la fila nueva, borra `serpentina` y ajusta `sort_order`, en una transacción, conservando `plays`, `created_at`, categoría, color y portada. **No:** `update games set id`, que falla por `scores_game_id_fkey` mientras haya puntuaciones, ni alterar la clave foránea (cambio de esquema fuera de alcance).
- **Sí:** borrar los 5 seeds con el `ON DELETE CASCADE`. Motivo: la puntuación máxima real es 7650 y los seeds van de 178833 a 286766, así que el Top 5 sería inalcanzable. **No:** conservarlos ni reescalarlos (inventaría marcas de jugadores).
- **Sí:** conservar `plays` (9100). **No:** reiniciarlo a 0: el trigger `bump_game_plays` solo suma en `INSERT` de `scores`, así que borrar y copiar no lo altera.
- **Sí:** `short` sin cambios, porque describe el juego («Crece sin morder tu propia cola.»). **Sí:** reescribir `long`: el actual habla de «núcleos magenta», de una serpiente que «se devora a sí misma» y de que cada bocado la hace más veloz, y el juego tiene frutas y acelera por nivel, no por bocado.
- **Sí:** mantener `sort_order` 3, de modo que SNAKE sigue entre los 6 primeros de la home.
- **Sí:** mantener la portada `cover-snake` y `games.cover`. **No:** tocar el CSS: ya es una serpiente verde con un punto de comida.
- **Sí:** tablero de 32×24 celdas de 25 px, a petición del usuario: llena el canvas, da partidas largas y el máximo sube a 7650. **No:** 20×15 de 40 px (frutas más grandes, pero menos recorrido) ni 16×12 de 50 px.
- **Sí:** niveles con aceleración: 10 puntos por fruta, nivel cada 5 frutas e intervalo `max(60, 150 - (nivel - 1) * 10)` ms. **No:** velocidad fija (menos tensión) ni puntos multiplicados por el nivel (el usuario eligió la opción simple).
- **Sí:** sin vidas: `GameStats.lives` ausente y `hud.lives = false`, con «—» en el HUD, como TETRIS. **No:** vidas ni ocultar el bloque Vidas (cambio de diseño del HUD, fuera de alcance).
- **Sí:** el muro mata, como el Snake de Google del que salen los sprites. **No:** atravesar los bordes (partidas más largas y fáciles).
- **Sí:** permitir entrar en la celda que la cola deja libre en el mismo paso. **No:** matar en ese caso: sería una colisión con una celda que ya no está ocupada. Si la serpiente come en ese paso, la cola no se mueve y la celda sí está ocupada.
- **Sí:** a la espera de la primera tecla. Motivo: sin ella la serpiente echaría a andar sola al abrir el Reproductor, antes de que el jugador tenga las manos en el teclado. **No:** un botón o tecla de «lanzar» (Espacio ya lo usa el campo de iniciales del modal).
- **Sí:** cola de 2 entradas de dirección y se ignora la inversión de 180°. Motivo: sin cola, dos giros rápidos dentro del mismo paso hacen perder el primero o provocan una inversión mortal. **No:** reaccionar a la tecla en el mismo instante (obligaría a mover fuera del paso).
- **Sí:** `e.code` para el teclado, de modo que `W` `A` `S` `D` son posiciones físicas y funcionan con cualquier distribución. Flechas y `W` `A` `S` `D` a petición del usuario. **No:** otras teclas ni ratón (fuera de alcance, como en el resto de juegos).
- **Sí:** acumulador de intervalo de paso, como TETRIS, y como máximo un paso por fotograma. **No:** movimiento continuo ni interpolación entre celdas: el paso discreto es el estilo del juego.
- **Sí:** al pausar y reanudar se reinicia `lastTime` y el acumulador para que no haya saltos.
- **Sí:** usar los sprites de `fruits.png` (fila pixel-art) como fruta, a petición del usuario. **No:** dibujar la fruta como vector: el usuario aportó los sprites precisamente para eso. **Sí:** la serpiente sí se dibuja vectorial con la paleta de la plataforma, para que case con ROCAS, TETRIS y ARKANOID.
- **Sí:** los 22 sprites, uno al azar por fruta, todos al mismo valor (10 puntos). Incluye verduras, el champiñón, el cacahuete y el bol de fruta: el usuario eligió aprovechar la hoja entera. **No:** filtrar solo frutas ni asignar un sprite fijo por nivel (regla nueva no pedida).
- **Sí:** tabla de recortes propia con los nombres corregidos, en `lib/snake/sprites.ts`. **No:** reutilizar `sprites.js`: su atlas usa `window.SPRITE_ATLAS` y la ruta `snake-assets/fruits.png`, y sus nombres no coinciden con el dibujo. Las coordenadas sí se conservan tal cual.
- **Sí:** copiar la hoja completa `fruits.png` (585 KB) a `public/games/snake/` para mantener las coordenadas del atlas. **No:** recortarla ni reexportarla a un PNG más ligero (otra spec si el peso importa).
- **Sí:** reducción con `imageSmoothingEnabled` activado: los sprites de 160 px bajan a 25 px y sin suavizado saldrían con dientes de sierra. **No:** `imageSmoothingEnabled = false`.
- **Sí:** el wrapper crea la `Image` dentro del efecto y arranca el motor al cargar, con el mismo patrón que la paleta y los audios de ARKANOID; el motor no contiene `new Image`. **Sí:** si la carga falla, el juego arranca igual con un círculo `--magenta` como fruta, para no bloquear la partida por un asset.
- **Sí:** el asset es de terceros (Spriters Resource, sprites del Snake de Google) y se usa porque el usuario lo aportó. Su procedencia queda en el comentario de cabecera de `lib/snake/sprites.ts`. **No:** página de créditos ni comprobar licencias en esta spec (fuera de alcance); queda registrado como riesgo.
- **Sí:** sin HUD dentro del canvas. Motivo: el tablero de 32×24 ocupa los 800×600 y cualquier texto taparía casillas; la puntuación y el nivel están en el HUD de la plataforma. **No:** texto superpuesto como ROCAS.
- **Sí:** fin por tablero completo como fin de partida, con `¡TABLERO COMPLETO!` y la misma ruta (`onGameOver`, modal). **No:** un estado de victoria aparte en React ni dejar que el juego falle al no encontrar celda libre.
- **Sí:** `PUNTAJE: n` bajo `GAME OVER`, sin texto de reinicio, igual que ROCAS, TETRIS y ARKANOID. El reinicio es solo «JUGAR DE NUEVO» (`restart()`), porque el modal tiene un campo de texto donde se escribe con Espacio.
- **Sí:** `finish()` (botón FIN) sigue la misma ruta que perder: pantalla `GAME OVER` en el canvas y `onGameOver`. **No:** un fin independiente en React.
- **Sí:** el motor ignora `keydown` en `<input>`/`<textarea>`, en pausa y con la partida terminada. Es el criterio de los otros juegos.
- **Sí:** `onStats` solo al cambiar `score` o `level`. **No:** en cada fotograma.
- **Sí:** sin sonido. No hay assets de audio y la plataforma no tiene control de volumen. **No:** reutilizar los mp3 de ARKANOID: no encajan con Snake.
- **Sí:** aprovechar el registro de la SPEC 06: solo se añade la entrada `snake`. **No:** tocar `components/game-player.tsx`.
- **Sí:** el juego simulado de referencia para los criterios pasa a ser `gloton`, porque `serpentina` desaparece del catálogo. **Sí:** no editar las SPEC 01, 02, 03, 05, 06 y 07 aunque citen SERPENTINA: son registros históricos.
- **Sí:** aceptar que las marcas de `localStorage` con `gameId: "serpentina"` dejan de aparecer en «TU MEJOR MARCA». **No:** migrarlas.
- **Sí:** no modificar `references/source-assets/`; la hoja se copia, no se mueve.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| La migración falla a medias y deja `serpentina` y `snake` a la vez | `apply_migration` ejecuta el script como una transacción; se verifica después el recuento de `games` y `scores` antes de seguir. Se consulta el estado de `serpentina` justo antes de aplicarla. |
| `getGames()`/`getGame()` están cacheados (`cacheLife("minutes")`) y `/juegos/serpentina` o el título antiguo siguen viéndose un rato tras migrar | Documentado en la verificación del paso 1: esperar a que expire la caché o invalidar la etiqueta `games` (por ejemplo guardando una puntuación) antes de comprobar. |
| Borrar `serpentina` elimina los seeds por la cascada, sin posibilidad de recuperarlos | Es lo decidido. Antes de aplicar se consulta el recuento (5 filas el 2026-11-20); si ha cambiado, hay puntuaciones reales y se revisa con el usuario antes de continuar. |
| Las marcas de `localStorage` con `gameId: "serpentina"` quedan huérfanas | Aceptado: la marca personal es un dato local de bajo valor y se registra como decisión. |
| Los sprites son de terceros (Spriters Resource / Snake de Google) y pueden tener derechos de uso | Se usan por petición expresa del usuario, con la procedencia anotada en `lib/snake/sprites.ts`. Antes de publicar el proyecto fuera del uso educativo, revisar la licencia (otra spec). |
| Los nombres de `sprites.js` no coinciden con los dibujos y se copian por error | La spec fija una tabla corregida y un criterio que comprueba visualmente cada recorte. |
| A 25 px los sprites se ven pequeños y borrosos | Reducción con suavizado y escala `min(25 / w, 25 / 160)`. Si resulta ilegible, subir `CELL` y bajar `COLS`/`ROWS` se decide en otra spec; el tablero es lo único que cambia. |
| El PNG pesa 585 KB y retrasa el primer fotograma en conexiones lentas | El canvas arranca al cargar la imagen o con el círculo de respaldo si falla. Recortar la hoja va en otra spec. |
| La imagen carga después de que el usuario haya salido del Reproductor | El efecto del wrapper comprueba que sigue montado antes de crear y arrancar el motor, y su limpieza lo destruye. |
| Strict Mode monta el efecto dos veces y quedan dos bucles o dos juegos de listeners | `destroy()` cancela `requestAnimationFrame` y quita los listeners; el efecto del wrapper lo llama en su limpieza. Criterio sobre bucles acumulados. |
| Escribir las iniciales del modal (con `W` `A` `S` `D`, flechas o Espacio) mueve la serpiente | El motor ignora `keydown` cuyo objetivo sea `<input>` o `<textarea>` y también con la partida terminada. |
| Una tecla pulsada durante la pausa cambia la dirección al reanudar | `keydown` se ignora en pausa y al pausar/reanudar/reiniciar se vacía la cola de direcciones. |
| El simulador y el motor suman puntos a la vez | El Reproductor no arranca el intervalo de la simulación para los juegos del registro. Criterio: la puntuación de SNAKE no sube sola. |
| Una variable CSS no existe y el canvas dibuja con color vacío | Criterio de aceptación de los colores de serpiente, cabeza, cuadrícula y textos. Todas las variables usadas existen ya en `app/globals.css`. |
| Un fotograma largo (pestaña en segundo plano) hace avanzar la serpiente varias celdas de golpe | Como máximo un paso por fotograma y descarte del exceso del acumulador. |
| La fruta no encuentra celda libre al llenarse el tablero | Fin de partida con `¡TABLERO COMPLETO!`; criterio que lo comprueba con un tablero reducido temporalmente. |
| Demasiados renders por emitir estadísticas en cada fotograma | `onStats` solo se llama al cambiar `score` o `level`. |
| `Math.random()` se ejecuta durante el prerender y causa un aviso de hidratación | Solo se llama en `start()`, `restart()` y al comer, dentro del efecto y del bucle, nunca en el constructor ni en el render. |
| La política `scores_insert_public` abierta permite puntuaciones falsas (riesgo aceptado en la SPEC 05) | Antitrampas y Auth van en otra spec. |

## Lo que **no** entra en esta spec

- Controles táctiles, de ratón o botones en pantalla.
- Sonido y música.
- Tecla `P` o `Esc` de pausa.
- Cambios de reglas y de balance: bordes que se atraviesan, obstáculos, frutas especiales, puntos distintos por fruta, vidas, modos de juego.
- HUD dentro del canvas.
- Las filas de dibujo plano y de fotografía de `fruits.png`, recortar la hoja y la página de créditos o licencias.
- Versionar `references/source-assets/`.
- Los otros juegos sin motor real; siguen con la simulación.
- Rankings sembrados nuevos, Auth, antitrampas o cambios de esquema en Supabase.
- Redirección de `/juegos/serpentina`, migración de las marcas locales con `gameId: "serpentina"` y cambios en la portada `cover-snake`.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Corregir los criterios históricos de las SPEC 01, 02, 03, 05, 06 y 07.
- Modificar `references/source-assets/`.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
