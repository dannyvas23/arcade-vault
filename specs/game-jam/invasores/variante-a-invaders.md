# SPEC 09 — Juego INVADERS jugable en el Reproductor

> **Estado:** Borrador
> **Depende de:** SPEC 01 (Reproductor, catálogo y `ScoresProvider`), SPEC 04 (juego ROCAS), SPEC 05 (tabla de juegos y leaderboard en Supabase), SPEC 06 (juego TETRIS y registro de juegos), SPEC 07 (juego ARKANOID y patrón de renombrado), SPEC 08 (juego SNAKE)
> **Fecha:** 2026-11-21
> **Objetivo:** Crear en TypeScript el shooter clásico de filas de invasores (tema de la jam «INVASORES (Space Invaders)»), renombrar el juego INVASORES del catálogo a INVADERS y conectarlo al HUD, los botones, el modal de guardado y el leaderboard de la plataforma mediante el registro de juegos.

---

## Por qué existe esta spec

Esta spec es la **variante A** de la game jam con el tema «INVASORES (Space Invaders)». La variante B (`variante-b-prisma.md`) toma el tema por otro lado: un puzle de emparejar colores contra la formación. Esta variante es la lectura directa del tema: el shooter fijo de oleadas, con la formación que avanza, se acelera y baja, escudos que se desgastan y una nave nodriza. Solo se implementará una variante. La numeración (`09`) es provisional: se fija al promover la spec a `specs/`.

Estado de la plataforma el 2026-11-21 (comprobado en `components/game-registry.ts` y en `public.games`): hay **4 juegos con motor real** (ROCAS, TETRIS, ARKANOID y SNAKE) y 4 que siguen con la simulación del Reproductor (GLOTÓN, INVASORES, RANARIA y DUELO PIXEL). El registro de juegos ya existe, así que esta spec solo añade una entrada. No hay refactor del Reproductor.

No hay código de origen: el motor se diseña desde cero y sus reglas y valores se fijan aquí. Los invasores se dibujan como mapas de bits propios (rectángulos en el canvas), sin sprites de terceros.

En el catálogo ya existe **INVASORES** (`id: "invasores"`, `cover-invaders`, `sort_order` 5, `plays` 18000, categoría SHOOTER, color green, 5 puntuaciones sembradas), el equivalente mock de este juego, igual que SERPENTINA lo era de Snake. No se añade una entrada nueva: pasa a llamarse **INVADERS** (`id: "invaders"`). Como `scores.game_id` referencia `games.id` sin `ON UPDATE CASCADE`, el renombrado no puede ser un `UPDATE` del `id`: se copia la fila y se borra la antigua.

Las 5 puntuaciones sembradas no se conservan. La cota teórica del juego es 6360 puntos (3960 por los invasores y 2400 por las naves nodrizas) y el tope realista ronda los 4500, mientras que los seeds llegan a 207301 (comprobado en la BD): ninguna partida real podría entrar jamás en el Top 5. Borrar la fila antigua las elimina por `ON DELETE CASCADE` y el ranking empieza vacío.

## Alcance

**Dentro:**

- Motor de INVADERS en TypeScript, sin React ni acceso global al DOM, en `lib/invaders/`: cañón, formación de 11×5 invasores con paso discreto y aceleración, disparos, 4 escudos destruibles, nave nodriza, 3 vidas, 4 oleadas, puntuación y fin de partida.
- Componente de cliente `components/invaders-canvas.tsx` con un canvas de 800×600 lógicos escalado al marco CRT, que crea el motor al montar y lo destruye al desmontarse.
- HUD propio en el canvas (`SCORE`, `OLEADA` y un cañón pequeño por vida), cartel de oleada y pantallas de fin (`GAME OVER` y `¡INVASIÓN REPELIDA!`) dibujadas en el canvas.
- El motor notifica puntuación, vidas, oleada (como `level`) y fin de partida al HUD, los botones y el modal de la plataforma.
- Todos los botones y pantallas del Reproductor funcionan con el motor: PAUSA/REANUDAR («EN PAUSA»), FIN, SALIR, modal «FIN DEL JUEGO», «GUARDAR PUNTUACIÓN», «JUGAR DE NUEVO» y «VOLVER AL VAULT».
- Dibujo vectorial neón con colores de las variables CSS de `app/globals.css`; invasores como mapas de bits de 2 fotogramas.
- Entrada `invaders` en `GAME_REGISTRY` con `hud: { lives: true, level: true }`.
- Controles de teclado: `←` y `→` mueven el cañón; `Espacio` dispara (mantenido, dispara en cuanto no hay bala propia en pantalla).
- Migración del catálogo: `invasores` pasa a `invaders` (título `INVADERS`, `long` reescrito) conservando `short`, categoría, color, portada `cover-invaders`, `sort_order` 5, `plays` y `created_at`; sus 5 puntuaciones sembradas se eliminan.
- Actualizar el texto «Invasores» de la actividad reciente de la home (`lib/home.ts`) a «Invaders».
- Que `←`, `→` y `Espacio` no desplacen la página ni activen el botón enfocado.

**Fuera de alcance (para otras specs):**

- Controles táctiles, de ratón o botones en pantalla.
- Sonido y música (no hay assets de audio).
- Tecla de pausa `P` o `Esc`: la pausa es solo el botón de la plataforma.
- Más de 4 oleadas, oleadas infinitas, vidas extra por puntos, power-ups, tipos de invasor adicionales y modo de dos jugadores.
- Los sprites y sonidos del Space Invaders original (Taito): no se usan assets de terceros.
- Los demás juegos sin motor real: siguen con la simulación.
- Sembrar un ranking nuevo ajustado a la escala del juego.
- Sincronizar o migrar las marcas de `localStorage` que usan `gameId: "invasores"`.
- Redirección de `/juegos/invasores` a `/juegos/invaders`.
- Renombrar o rediseñar la portada `cover-invaders`.
- Auth, antitrampas, cambios en el esquema de Supabase más allá de la migración de datos descrita.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Corregir los criterios históricos de las SPEC anteriores que citen INVASORES.
- Tests automatizados (no hay framework instalado).

## Modelo de datos

No hay datos persistentes nuevos: las puntuaciones se guardan con el `SavedScore` y la clave `av:v1:scores` de la SPEC 01 y con `submitScore` de la SPEC 05, con `gameId: "invaders"`. Se añade el contrato del motor. `GameStats`, `GameHandle` y `GameCanvasProps` ya existen en `lib/game-types.ts` (SPEC 06).

```ts
// lib/invaders/engine.ts
export type InvadersPalette = {
  squid: string;       // invasor de la fila 0       → var(--magenta)
  crab: string;        // invasores de las filas 1-2 → var(--yellow)
  octopus: string;     // invasores de las filas 3-4 → var(--green)
  cannon: string;      // cañón y vidas              → var(--cyan)
  playerShot: string;  // bala del jugador           → var(--ink)
  invaderShot: string; // balas de los invasores     → var(--orange)
  ufo: string;         // nave nodriza               → var(--purple)
  shield: string;      // escudos                    → var(--green)
  ground: string;      // línea de suelo             → var(--ink-faint)
  text: string;        // HUD y pantallas            → var(--ink)
};
export type InvadersStats = { score: number; lives: number; level: number };
export type InvadersCallbacks = {
  onStats: (s: InvadersStats) => void;    // solo cuando cambia algún valor
  onGameOver: (s: InvadersStats) => void; // una vez por partida (derrota o victoria)
};
export class InvadersEngine {
  constructor(canvas: HTMLCanvasElement, palette: InvadersPalette, cb: InvadersCallbacks);
  start(): void;   // nueva partida e inicio del bucle requestAnimationFrame
  restart(): void; // nueva partida (3 vidas, oleada 1, puntuación 0)
  setPaused(paused: boolean): void;
  finish(): void;  // termina la partida (botón FIN)
  destroy(): void; // cancela el bucle y quita los listeners de teclado
}
```

```ts
// lib/invaders/entities.ts (resumen del contrato; la implementación decide los detalles internos)
export type InvaderKind = "squid" | "crab" | "octopus";
export const INVADER_BITMAPS: Record<InvaderKind, string[][]>; // 2 fotogramas por tipo; 8×8, 11×8 y 12×8 píxeles
export const UFO_SCORES: number[]; // 15 valores, ver «Convenciones»
```

```sql
-- Migración del catálogo (se aplica en la implementación con apply_migration, en una transacción)
insert into public.games (id, title, short, "long", category, cover, color, plays, sort_order, created_at)
select 'invaders', 'INVADERS', short,
       'Mueve el cañón con las flechas y dispara con Espacio contra una formación de 55 invasores que avanza, se acelera cuando quedan menos y baja cada vez que toca un borde. Tienes 3 vidas, 4 oleadas y 4 escudos que se desgastan, y de vez en cuando cruza una nave nodriza que da hasta 300 puntos. Los invasores valen 10, 20 o 30 puntos según su fila.',
       category, cover, color, plays, 99, created_at
from public.games where id = 'invasores';                      -- sort_order 99 provisional (es unique)
delete from public.games where id = 'invasores';               -- scores_game_id_fkey (ON DELETE CASCADE) borra sus 5 seeds
update public.games set sort_order = 5 where id = 'invaders';
```

Convenciones:

- Archivos del motor: `lib/invaders/entities.ts` (constantes, tipos, mapas de bits, construcción de la formación y de los escudos, `collideAABB` y tabla de la nave nodriza) y `lib/invaders/engine.ts`. Las entidades no leen el DOM ni dibujan con colores propios.
- Canvas de 800×600 píxeles lógicos, con origen arriba a la izquierda, escalado con CSS al 100 % del `.crt-screen` (ya 4:3). Velocidades en píxeles por segundo.
- Valores del juego (diseño propio de esta spec):

| Concepto | Valor |
| -------- | ----- |
| Cañón | 40×20, `y` 540, `x` inicial 380, velocidad 300, `x` entre 16 y 744 |
| Bala del jugador | 4×14, velocidad 600 hacia arriba, una a la vez; nace en el centro del cañón; mantener Espacio dispara en cuanto no hay bala propia |
| Formación | 11 columnas × 5 filas = 55 invasores; celda de 48×40; origen `x` 136; `y` inicial `80 + 24 × (oleada - 1)` |
| Hitbox de invasor | 3 px por píxel de mapa de bits, alto 24 y `y` = celda + 8: `squid` 24×24, `crab` 33×24, `octopus` 36×24, centrados en su celda |
| Paso horizontal | 12 px; si el siguiente paso sacaría la formación de `x` 16–784, baja 24 px e invierte el sentido en lugar de avanzar |
| Intervalo de paso | `max(40, 20 + 9 × vivos - 30 × (oleada - 1))` ms: 515 ms con 55 vivos en la oleada 1 |
| Puntos por invasor | fila 0 (`squid`) 30; filas 1 y 2 (`crab`) 20; filas 3 y 4 (`octopus`) 10; 990 por oleada |
| Disparo de invasores | máximo 3 balas de 6×16; intervalo `max(0,45; 1,10 - 0,15 × (oleada - 1))` s; velocidad `240 + 30 × (oleada - 1)`; dispara el invasor más bajo de una columna viva elegida al azar |
| Escudos | 4, cada uno de 8×5 celdas de 8 px (64×40) con 2 celdas faltantes abajo (38 celdas); `y` 440; `x` 68, 268, 468 y 668; se restauran en cada oleada |
| Daño a escudos | una bala (de cualquier bando) destruye la celda que toca y desaparece; un invasor destruye las celdas que solapa al moverse |
| Nave nodriza | 48×20, `y` 56, velocidad 120; 2 por oleada, a un instante al azar de 10 a 20 s y de 30 a 40 s desde el inicio de la oleada; alterna el sentido |
| Puntos de la nave nodriza | `UFO_SCORES[(disparos - 1) % 15]`, con `[100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100]` y `disparos` = disparos del jugador en la partida, contando el que acierta |
| Vidas | 3 |
| Impacto en el cañón | se pierde 1 vida, se borran todas las balas, la formación se congela 1 s con el cañón en explosión y reaparece centrado en `x` 380 |
| Bala contra bala | una bala del jugador y una de un invasor que se tocan desaparecen las dos, sin puntos |
| Oleadas | 4; cartel `OLEADA n` de 1,5 s al inicio de cada una, con todo congelado salvo el cañón y sin poder disparar |
| Fin por derrota | quedarse sin vidas, o que un invasor vivo llegue con su borde inferior a `y` ≥ 540 (fin inmediato con 0 vidas) |
| Fin por victoria | limpiar la oleada 4: `¡INVASIÓN REPELIDA!` |
| Explosión de invasor | 150 ms de desvanecido |
| Puntuación máxima | cota teórica 6360 (4 × 990 de invasores + 8 naves × 300); tope realista ≈ 4500 |

- Mapeo a la plataforma: `score` = puntuación; `lives` = vidas restantes (0 a 3); `level` = oleada (1 a 4).
- Colores (ningún literal en `lib/invaders/` salvo el fondo `#000`): invasores `--magenta`, `--yellow` y `--green` según su fila; cañón y vidas `--cyan`; bala del jugador `--ink`; balas de invasores `--orange`; nave nodriza `--purple`; escudos `--green`; suelo `--ink-faint`; textos `--ink`. El desvanecido y el oscurecido de las pantallas de fin usan `globalAlpha` y `#000`. El detalle visual (los mapas de bits concretos, el brillo) lo afina la implementación con `frontend-design` sin cambiar medidas ni colisiones.
- Tiempo: bucle con `requestAnimationFrame` y `dt` en segundos con tope de 0,05 s. El paso de la formación usa un acumulador (como TETRIS): como máximo un paso por fotograma, con descarte del exceso del acumulador. Al pausar y reanudar se reinicia `lastTime` y el acumulador.
- Aleatoriedad: `Math.random()` solo en `start()`, `restart()`, al empezar cada oleada (instantes de la nave nodriza) y dentro del bucle (columna que dispara), nunca en el constructor ni en el render.
- HUD del canvas, solo durante la partida: `SCORE: n` a la izquierda (`x` 16, línea base `y` 28), `OLEADA: n` centrado y un cañón de 20×10 por vida a la derecha. La zona de juego queda por debajo de `y` 40.
- Textos del canvas: cartel `OLEADA n`; derrota `GAME OVER`; victoria `¡INVASIÓN REPELIDA!` con letra de 40 px (cabe en 800 px); ambas con `PUNTAJE: n` debajo, sobre el campo oscurecido y sin ningún texto de reinicio.
- `onStats` se emite al iniciar y solo cuando cambia `score`, `lives` o `level`, nunca en cada fotograma.
- Teclado: el motor registra `keydown` y `keyup` en `window` al iniciar y los quita en `destroy()`. Usa `e.code` (`ArrowLeft`, `ArrowRight`, `Space`) y un mapa de teclas mantenidas. `keyup` siempre lo actualiza. `keydown` se ignora si el objetivo es un `<input>` o `<textarea>`, si hay pausa o si la partida terminó. `preventDefault()` en `keydown` y `keyup` de las tres teclas, fuera de campos de texto. Con `←` y `→` pulsadas a la vez, el cañón no se mueve. Al pausar, reanudar y reiniciar se sueltan las teclas mantenidas.
- Estado de partida creado en `start()` y `restart()`.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`); para los pasos 5 y 6, la de componentes de cliente (`01-app/02-guides/server-and-client-boundary.md`). Para la interfaz se usa siempre la skill `frontend-design`, con el aspecto de ROCAS, ARKANOID y SNAKE como referencia.

1. **Catálogo y home.** Consultar antes el estado de `invasores` y su recuento en `scores`. Aplicar con `apply_migration` el renombrado de `invasores` a `invaders` (SQL de «Modelo de datos») y cambiar «Invasores» por «Invaders» en `lib/home.ts`. La portada `cover-invaders` ya existe en `app/globals.css` y no se toca. Verificación: `/juegos/invaders` muestra INVADERS con `plays` 18000, su portada y «SIN PUNTUACIONES TODAVÍA», `/juegos/invasores` muestra «no encontrado», `games` tiene 8 filas con `sort_order` del 1 al 8, y `/juegos/invaders/jugar` sigue con la simulación.
2. **Entidades.** Crear `lib/invaders/entities.ts` con las constantes de la tabla, los tipos, los mapas de bits de los tres invasores (2 fotogramas), la construcción de la formación de una oleada y de los 4 escudos, `collideAABB` y `UFO_SCORES`. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
3. **Motor: reglas.** Crear `lib/invaders/engine.ts` con `InvadersEngine`: estado de partida, bucle con tope de `dt` y acumulador de paso, cañón, balas, formación (paso, borde, descenso, aceleración), disparo de invasores, escudos, nave nodriza, vidas, oleadas, victoria y derrota. Verificación: `tsc` y `lint` pasan.
4. **Motor: dibujo, teclado y callbacks.** Completar el motor con el dibujo (invasores, cañón, balas, escudos, nave nodriza, suelo, HUD, cartel y pantallas de fin), el teclado según las convenciones y las llamadas a `onStats` y `onGameOver`. Verificación: `tsc` y `lint` pasan.
5. **Canvas.** Crear `components/invaders-canvas.tsx`: lee la paleta de las variables CSS al montar, crea el motor en un efecto, lo destruye al desmontar y aplica `setPaused`. Verificación: `tsc` y `lint` pasan.
6. **Alta en el Reproductor y ciclo completo.** Añadir la entrada `invaders` a `components/game-registry.ts` (`hud: { lives: true, level: true }`). Verificación: `/juegos/invaders/jugar` es jugable con el teclado, el HUD coincide con el canvas, ROCAS, TETRIS, ARKANOID, SNAKE y la simulación no cambian, y se completa jugar → perder → guardar → ver la marca en el ranking de `/juegos/invaders` y en la pestaña INVADERS del Salón.

## Criterios de aceptación

**Base de datos y catálogo**

- [ ] `public.games` no contiene la fila `invasores` y contiene `invaders` con `title` `INVADERS`, `category` `SHOOTER`, `color` `green`, `cover` `cover-invaders`, `sort_order` 5, el mismo `short` que tenía `invasores` («Defiende el planeta de filas alienígenas.») y el `long` de esta spec.
- [ ] `games.plays` de `invaders` es igual al que tenía `invasores` justo antes de la migración (18000 el 2026-11-21, más las puntuaciones guardadas desde entonces).
- [ ] `scores` no contiene filas con `game_id = 'invasores'` ni con `game_id = 'invaders'` justo después de la migración.
- [ ] `games` tiene 8 filas y `sort_order` del 1 al 8 sin huecos ni repetidos.
- [ ] Sin puntuaciones, `/juegos/invaders` y la pestaña INVADERS del Salón muestran «SIN PUNTUACIONES TODAVÍA».
- [ ] `/juegos/invaders` y `/juegos/invaders/jugar` responden 200; `/`, `/juegos` y `/salon` muestran INVADERS con su portada y no INVASORES.
- [ ] `/juegos/invasores` y `/juegos/invasores/jugar` muestran la pantalla de «no encontrado» y, salvo en la primera petición, responden 404 (comportamiento de la SPEC 05).
- [ ] La actividad reciente de la home muestra «Invaders» en lugar de «Invasores».
- [ ] `app/globals.css` no cambia y `.cover-invaders` se conserva.
- [ ] El texto `long` de INVADERS solo menciona lo que el juego tiene: cañón con flechas y Espacio, formación de 55 invasores que se acelera y baja, 3 vidas, 4 oleadas, 4 escudos, nave nodriza de hasta 300 puntos e invasores de 10, 20 o 30 puntos.

**Rutas y proyecto**

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores, y `npx eslint app components lib` no devuelve errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/invaders/jugar`, `/juegos/rocas/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` ni `/juegos/snake/jugar`.
- [ ] `lib/invaders/` no contiene `document.`, `getElementById`, `localStorage`, `new Image`, `new Audio` ni colores literales salvo el fondo `#000`.
- [ ] `public/games/invaders/` no existe: el juego no usa assets.

**Registro de juegos**

- [ ] `/juegos/rocas/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` se comportan como antes: HUD, pausa, FIN, modal y guardado.
- [ ] `/juegos/gloton/jugar` conserva la simulación: contiene `.game-arena` y su puntuación sube sola.
- [ ] La puntuación de INVADERS no sube sola: el intervalo de la simulación no se ejecuta para los juegos del registro.
- [ ] En INVADERS el HUD muestra Vidas con corazones y Nivel con dos dígitos, coincidiendo con el canvas.

**Canvas y partida**

- [ ] El canvas tiene 800×600 píxeles lógicos, ocupa el 100 % de `.crt-screen` y no se deforma.
- [ ] Al empezar el canvas muestra el cartel `OLEADA 1` durante 1,5 s, `SCORE: 0`, `OLEADA: 1`, 3 cañones de vida, 55 invasores en 11 columnas × 5 filas con origen `x` 136, `y` 80 y 4 escudos de 38 celdas; durante el cartel nada se mueve salvo el cañón y `Espacio` no dispara.
- [ ] El cañón mide 40×20, empieza en `x` 380, `y` 540, y `←` y `→` lo mueven a 300 px/s sin sacarlo de `x` entre 16 y 744.
- [ ] Con `←` y `→` pulsadas a la vez, el cañón no se mueve.
- [ ] `Espacio` dispara una bala de 4×14 desde el centro del cañón a 600 px/s; mientras haya una bala propia en pantalla no sale otra, y mantener `Espacio` dispara de nuevo en cuanto la bala desaparece.
- [ ] En la oleada 1 con 55 vivos la formación avanza 12 px cada 515 ms; con 54 vivos, cada 506 ms.
- [ ] El intervalo de paso con 1 invasor vivo en la oleada 1 es 40 ms y no baja de ahí.
- [ ] Con la formación completa en la oleada 1, avanza 10 pasos a la derecha hasta tocar `x` 784; el siguiente paso baja la formación 24 px e invierte el sentido.
- [ ] Los invasores alternan de fotograma de mapa de bits en cada paso.
- [ ] Destruir un invasor de la fila 0 suma 30; de las filas 1 o 2, 20; de las filas 3 o 4, 10. Limpiar una oleada completa suma 990.
- [ ] El invasor destruido se desvanece en 150 ms y la bala del jugador desaparece al impactar; una bala solo destruye un invasor.
- [ ] Las balas de los invasores miden 6×16, caen a 240 px/s en la oleada 1 y nunca hay más de 3 a la vez.
- [ ] Una bala de invasor sale del invasor más bajo de una columna que tiene invasores vivos.
- [ ] Una bala (del jugador o de un invasor) que toca un escudo destruye la celda de 8×8 que toca y desaparece.
- [ ] Un invasor que se superpone con un escudo al moverse destruye las celdas que solapa.
- [ ] Una bala del jugador y una de un invasor que se tocan desaparecen las dos y no suman puntos.
- [ ] La nave nodriza de 48×20 cruza a `y` 56 a 120 px/s, aparece 2 veces por oleada (entre 10 y 20 s, y entre 30 y 40 s desde el inicio de la oleada) y alterna el sentido; si la oleada acaba antes de que aparezca, no aparece.
- [ ] Destruir la nave nodriza suma `UFO_SCORES[(disparos - 1) % 15]`: con el 9.º disparo de la partida, 300 puntos.
- [ ] Un impacto en el cañón resta 1 vida, borra todas las balas, congela la formación 1 s con el cañón en explosión y lo recoloca en `x` 380; la bala del jugador desaparece.
- [ ] Si un invasor vivo llega con su borde inferior a `y` ≥ 540, la partida termina con 0 vidas, aunque queden vidas.
- [ ] Al perder la tercera vida termina la partida: el canvas muestra `GAME OVER` y `PUNTAJE: n` sin texto de reinicio, y el teclado deja de mover el cañón.
- [ ] Al limpiar una oleada (1 a 3) aparece el cartel de la siguiente, los escudos se restauran a 38 celdas cada uno, la formación nace en `y` `80 + 24 × (oleada - 1)` y la puntuación y las vidas se conservan.
- [ ] En las oleadas 2, 3 y 4 las balas de invasores caen a 270, 300 y 330 px/s, y su intervalo de disparo es 0,95, 0,80 y 0,65 s.
- [ ] Al limpiar la oleada 4 termina la partida: el canvas muestra `¡INVASIÓN REPELIDA!` entero dentro de los 800 px y `PUNTAJE: n`, y se abre el modal con la puntuación final.
- [ ] Una oleada limpia sin ninguna nave nodriza destruida suma exactamente 990.
- [ ] Los invasores usan `--magenta` (fila 0), `--yellow` (filas 1 y 2) y `--green` (filas 3 y 4); el cañón `--cyan`; la bala del jugador `--ink`; las balas de invasores `--orange`; la nave nodriza `--purple`; los escudos `--green`.
- [ ] Pulsar `←`, `→` y `Espacio` durante la partida no desplaza la página.

**HUD y botones de la plataforma**

- [ ] El HUD muestra Jugador («INVITADO»), Puntuación, Vidas y Nivel con dos dígitos, y coinciden con `SCORE`, los cañones y `OLEADA` del canvas.
- [ ] Tras destruir 3 invasores de la fila 4, Puntuación pasa a `30`; al empezar la oleada 2, Nivel pasa a `02`; al perder una vida, Vidas pasa de 3 a 2 corazones.
- [ ] «PAUSA» detiene formación, balas, nave nodriza y desvanecidos, muestra la capa «EN PAUSA» y cambia el botón a «REANUDAR»; reanudar continúa sin saltos ni pasos de formación acumulados.
- [ ] Una tecla pulsada al pausar y soltada durante la pausa no queda «pegada» al reanudar.
- [ ] Con «PAUSA»/«REANUDAR» recién pulsado, `Espacio` no activa el botón: dispara.
- [ ] «FIN» abre el modal «FIN DEL JUEGO» con la puntuación actual, y el canvas muestra `GAME OVER` y `PUNTAJE: n`.
- [ ] Con el modal abierto, escribir en el campo de iniciales (incluidas las flechas y el Espacio) no mueve el cañón, no dispara ni reinicia el juego.
- [ ] «GUARDAR PUNTUACIÓN» añade a `av:v1:scores` una entrada `{ gameId: "invaders", name, score, at }`, inserta la fila en `scores` y muestra «PUNTUACIÓN GUARDADA».
- [ ] La puntuación guardada aparece en el ranking de `/juegos/invaders` y en la pestaña INVADERS del Salón, y en «TU MEJOR MARCA»; `games.plays` de `invaders` sube en 1.
- [ ] «JUGAR DE NUEVO» cierra el modal y reinicia: oleada 1 con 55 invasores y 4 escudos completos, Puntuación 0, 3 vidas, Nivel 01 y sin estado de guardado.
- [ ] «SALIR» navega a `/juegos/invaders` y «VOLVER AL VAULT» (modal) a `/juegos`.
- [ ] Tras salir del Reproductor, pulsar las teclas del juego no produce errores en consola ni cambios en la página (bucle y listeners destruidos).
- [ ] Entrar y salir varias veces de `/juegos/invaders/jugar` no acumula bucles: la formación da un paso cada 515 ms en la oleada 1, como en la primera visita.

## Decisiones tomadas y descartadas

- **Sí:** esta es la lectura directa del tema (shooter fijo de oleadas). **No:** mezclarla con el puzle de colores, que es la variante B.
- **Sí:** reutilizar la entrada INVASORES del catálogo y renombrarla a INVADERS, igual que TETRIS, ARKANOID y SNAKE reutilizaron las suyas. **No:** añadir una fila nueva (dejaría dos shooters de invasores, uno de ellos simulado).
- **Sí:** `id` `invaders` (y título `INVADERS`, el nombre inglés del género, como SNAKE y ARKANOID). Una migración que inserta la fila nueva, borra `invasores` y ajusta `sort_order`, en una transacción, conservando `plays`, `created_at`, categoría, color y portada. **No:** `update games set id`, que falla por `scores_game_id_fkey` mientras haya puntuaciones, ni alterar la clave foránea (cambio de esquema fuera de alcance).
- **Sí:** borrar los 5 seeds con el `ON DELETE CASCADE`. Motivo: la cota teórica es 6360 y los seeds llegan a 207301, así que el Top 5 sería inalcanzable. **No:** conservarlos ni reescalarlos (inventaría marcas de jugadores).
- **Sí:** conservar `plays` (18000). **No:** reiniciarlo a 0: el trigger `bump_game_plays` solo suma en `INSERT` de `scores`, así que borrar y copiar no lo altera.
- **Sí:** `short` sin cambios, porque describe el juego. **Sí:** reescribir `long`: el actual no menciona escudos, nave nodriza, vidas ni oleadas, que el juego sí tiene.
- **Sí:** mantener `sort_order` 5, de modo que INVADERS sigue entre los 6 primeros de la home.
- **Sí:** mantener la portada `cover-invaders` y `games.cover` (la clase ya existe, por eso no hay paso de CSS). **No:** tocar el CSS: ya es una formación de invasores sobre un cañón cian.
- **Sí:** diseño propio y finito: 4 oleadas, con victoria al limpiar la cuarta. Motivo: partidas de 1 a 5 minutos (una oleada dura entre 45 y 75 s para un jugador hábil), puntuación acotada y fin de partida claro. **No:** oleadas infinitas (sin tope de puntuación ni de duración).
- **Sí:** formación de 11×5 con celdas de 48×40: 10 pasos hasta cada borde con la formación completa y espacio para 4 escudos y el cañón. **No:** parrilla mayor (tapa el escudo y alarga las oleadas).
- **Sí:** paso discreto con acumulador, que se acelera con los invasores vivos (`max(40, 20 + 9 × vivos - 30 × (oleada - 1))` ms) y por oleada. **No:** movimiento continuo: el «tic» discreto es el ritmo reconocible del género.
- **Sí:** una sola bala del jugador a la vez y mantener Espacio para repetir. Motivo: premia la puntería y evita depender de la rapidez de pulsación. **No:** ráfaga libre (trivializa la formación).
- **Sí:** la formación baja 24 px al tocar el borde y cada oleada nace 24 px más abajo (hasta 72 px en la 4). **No:** misma altura inicial siempre (sin presión creciente).
- **Sí:** 4 escudos destruibles por celdas de 8 px, restaurados en cada oleada; los destruyen balas de ambos bandos y el cuerpo de los invasores. **No:** escudos fijos o indestructibles.
- **Sí:** nave nodriza 2 veces por oleada con la tabla de 15 valores indexada por el nº de disparos (la mecánica clásica que premia contar disparos). **No:** valor aleatorio (quita habilidad) ni aparición ilimitada (no hay tope claro).
- **Sí:** 3 vidas, y un invasor que toca la línea `y` 540 termina la partida aunque queden vidas, como en el original. **No:** vidas extra por puntos (regla nueva no pedida).
- **Sí:** bala contra bala se anulan sin puntos. **No:** dar puntos (invita a abusar).
- **Sí:** puntos por fila (30, 20, 10): 990 por oleada y cota teórica 6360. **No:** puntos que crecen con la oleada (el tope sube sin necesidad).
- **Sí:** mapas de bits propios dibujados con rectángulos y colores de la paleta. **No:** los sprites del original (Taito) ni de terceros: rompen la paleta y obligan a un asset con licencia.
- **Sí:** HUD en el canvas (`SCORE`, `OLEADA`, cañones de vida), como ROCAS y ARKANOID, además del HUD de la plataforma. **No:** quitarlo: la zona `y` < 40 no se usa para jugar.
- **Sí:** teclado con `e.code`: `←`, `→` y `Espacio`, con un mapa de teclas y `keyup` siempre activo. Espacio es tecla del juego, así que `preventDefault` evita que active el botón PAUSA enfocado. **No:** `A`/`D` ni ratón (fuera de alcance).
- **Sí:** sin tecla `P` ni `Esc`, sin tecla de reinicio dentro del juego: el reinicio es solo «JUGAR DE NUEVO», porque el modal tiene un campo de texto donde se escribe con Espacio.
- **Sí:** cartel `OLEADA n` de 1,5 s con el juego congelado. Motivo: el jugador coloca las manos antes de que bajen balas. **No:** espera de pulsación (Espacio es tecla de disparo).
- **Sí:** `finish()` (botón FIN) sigue la misma ruta que perder: `GAME OVER` en el canvas y `onGameOver`. **No:** un fin independiente en React.
- **Sí:** la victoria al limpiar la oleada 4 es un fin de partida: `onGameOver` con la puntuación final y modal de guardado. **No:** un estado de victoria aparte en React.
- **Sí:** tope de `dt` de 0,05 s: la bala del jugador recorre 30 px por fotograma como máximo, frente a los 38 px de la suma de alturas de bala (14) e invasor (24). **No:** `dt` sin tope.
- **Sí:** un paso de formación como máximo por fotograma y descarte del exceso. **No:** pasos en cadena tras una pestaña en segundo plano.
- **Sí:** `onStats` solo al cambiar `score`, `lives` o `level`. **No:** en cada fotograma.
- **Sí:** el motor ignora `keydown` en `<input>`/`<textarea>`, en pausa y con la partida terminada.
- **Sí:** sin sonido: no hay assets de audio y la plataforma no tiene control de volumen. **No:** efectos sintetizados.
- **Sí:** aprovechar el registro de la SPEC 06: solo se añade la entrada `invaders`. **No:** tocar `components/game-player.tsx`.
- **Sí:** el juego simulado de referencia para los criterios es `gloton`, que sigue simulado. **Sí:** no editar las SPEC anteriores aunque citen INVASORES: son registros históricos.
- **Sí:** aceptar que las marcas de `localStorage` con `gameId: "invasores"` dejan de aparecer en «TU MEJOR MARCA». **No:** migrarlas.
- **Sí:** la variante B (`prisma`) es compatible con esta: ids y `sort_order` distintos, y B no toca la fila `invasores`.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| La migración falla a medias y deja `invasores` e `invaders` a la vez | `apply_migration` ejecuta el script como una transacción; se verifica después el recuento de `games` y `scores` antes de seguir. Se consulta el estado de `invasores` justo antes de aplicarla. |
| `getGames()`/`getGame()` están cacheados (`cacheLife("minutes")`) y `/juegos/invasores` o el título antiguo siguen viéndose un rato tras migrar | Documentado en la verificación del paso 1: esperar a que expire la caché o invalidar la etiqueta `games` (por ejemplo guardando una puntuación) antes de comprobar. |
| Borrar `invasores` elimina los seeds por la cascada, sin posibilidad de recuperarlos | Es lo decidido. Antes de aplicar se consulta el recuento (5 filas el 2026-11-21); si ha cambiado, hay puntuaciones reales y se revisa con el usuario antes de continuar. |
| Las marcas de `localStorage` con `gameId: "invasores"` quedan huérfanas | Aceptado: la marca personal es un dato local de bajo valor y se registra como decisión. |
| Los 55 invasores con 2 fotogramas, balas y escudos por celdas son muchos `fillRect` por fotograma | Del orden de 3000 rectángulos por fotograma en el peor caso: asumible en un canvas 2D. Se agrupan los píxeles contiguos de cada fila de un mapa de bits en un solo rectángulo, y los escudos se guardan como matriz de celdas booleanas sin redibujar las destruidas. |
| La bala atraviesa un invasor o una celda de escudo tras un fotograma largo | Tope de `dt` de 0,05 s (30 px por fotograma como máximo para la bala del jugador) y reinicio de `lastTime` al reanudar. |
| Una oleada resulta demasiado fácil o difícil | Todos los valores están en la tabla y en constantes de `entities.ts`; reajustarlos va en otra spec. |
| Tras pulsar PAUSA el botón conserva el foco y `Espacio` lo activa | `preventDefault` de `keydown` y `keyup` en las tres teclas del juego fuera de campos de texto. Criterio de aceptación. |
| Strict Mode monta el efecto dos veces y quedan dos bucles o dos juegos de listeners | `destroy()` cancela `requestAnimationFrame` y quita los listeners; el efecto del wrapper lo llama en su limpieza. Criterio sobre bucles acumulados. |
| Escribir las iniciales del modal mueve el cañón o dispara | El motor ignora `keydown` cuyo objetivo sea `<input>` o `<textarea>` y también con la partida terminada. |
| Una tecla soltada durante la pausa o el modal queda «pegada» | `keyup` actualiza siempre el mapa de teclas y se sueltan las teclas al pausar, reanudar y reiniciar. |
| El simulador y el motor suman puntos a la vez | El Reproductor no arranca el intervalo de la simulación para los juegos del registro. Criterio: la puntuación de INVADERS no sube sola. |
| Una variable CSS no existe y el canvas dibuja con color vacío | Criterio de aceptación de los colores. Todas las variables usadas (`--magenta`, `--yellow`, `--green`, `--cyan`, `--ink`, `--orange`, `--purple`, `--ink-faint`) existen ya en `app/globals.css`. |
| `Math.random()` se ejecuta durante el prerender y causa un aviso de hidratación | Solo se llama en `start()`, `restart()`, al empezar una oleada y dentro del bucle, nunca en el constructor ni en el render. |
| Demasiados renders por emitir estadísticas en cada fotograma | `onStats` solo se llama al cambiar `score`, `lives` o `level`. |
| La política `scores_insert_public` abierta permite puntuaciones falsas (riesgo aceptado en la SPEC 05) | Antitrampas y Auth van en otra spec. |

## Lo que **no** entra en esta spec

- Controles táctiles, de ratón o botones en pantalla.
- Sonido y música.
- Tecla `P` o `Esc` de pausa.
- Más de 4 oleadas, vidas extra, power-ups, tipos de invasor nuevos y dos jugadores.
- Sprites y sonidos del Space Invaders original o de terceros.
- Los otros juegos sin motor real; siguen con la simulación.
- Rankings sembrados nuevos, Auth, antitrampas o cambios de esquema en Supabase.
- Redirección de `/juegos/invasores`, migración de las marcas locales con `gameId: "invasores"` y cambios en la portada `cover-invaders`.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Corregir los criterios históricos de las SPEC anteriores.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
