# SPEC 06 — Juego TETRIS jugable en el Reproductor

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (Reproductor, catálogo y `ScoresProvider`), SPEC 04 (juego ROCAS), SPEC 05 (tabla de juegos y leaderboard en Supabase)
> **Fecha:** 2026-11-20
> **Objetivo:** Portar a TypeScript el Tetris de `references/started-games/03-tetris/`, renombrar el juego CAÍDA del catálogo a TETRIS y conectarlo al HUD, los botones, el modal de guardado y el leaderboard de la plataforma mediante un registro de juegos.

---

## Por qué existe esta spec

`references/started-games/03-tetris/` es un Tetris completo (10×20 celdas, 7 piezas estándar más una pieza «tuerca», rotación con _wall kicks_, pieza fantasma, siguiente pieza, niveles y puntuación clásica). Está escrito como un `game.js` con globales, dos canvas (`#board` y `#next-canvas`), HUD y overlays en el DOM, un botón de tema claro/oscuro con `localStorage` y entrada con `document.addEventListener('keydown')`.

La plataforma ya tiene un juego real, ROCAS (SPEC 04), y su Reproductor lo elige con la comparación `game.id === "rocas"`. La SPEC 04 dijo que eso se generalizaría «cuando exista un segundo juego real»: este es ese momento, así que la spec introduce un **registro de juegos** y migra ROCAS a él sin cambiar su comportamiento.

En el catálogo ya existe un juego de bloques, **CAÍDA** (`id: "caida"`, `cover-tetro`, 5 puntuaciones sembradas), que era el equivalente mock de Tetris, igual que ROCAS lo era de Asteroids. No se añade una entrada nueva: CAÍDA pasa a llamarse **TETRIS** (`id: "tetris"`) y conserva su ranking y su contador de partidas. Como `scores.game_id` referencia `games.id` sin `ON UPDATE CASCADE`, el renombrado no puede ser un `UPDATE` del `id` y se hace con una migración que copia la fila, mueve las puntuaciones y borra la antigua.

El juego original se **porta, no se rediseña**: reglas, constantes y puntuación se conservan. Los cambios necesarios para integrarlo están en «Decisiones».

## Alcance

**Dentro:**

- Registro de juegos (`components/game-registry.ts`) y tipos comunes (`lib/game-types.ts`): `GameStats`, `GameHandle`, `GameCanvasProps`. El Reproductor elige el juego por el registro y no por `game.id === "rocas"`.
- ROCAS pasa a usar el registro y los tipos comunes, sin cambios de comportamiento.
- Motor de TETRIS en TypeScript, sin React ni acceso global al DOM, en `lib/tetris/`: tablero 10×20, 8 tipos de pieza, rotación con _wall kicks_, caída por intervalo, soft drop, hard drop, pieza fantasma, siguiente pieza, líneas, niveles, puntuación y fin de partida.
- Componente de cliente `components/tetris-canvas.tsx`: un único canvas de 800×600 lógicos con el tablero (300×600) y un panel con `SCORE`, `LINES`, `LEVEL`, `NEXT` y los controles, escalado al marco CRT y destruido al desmontarse.
- Pantalla `GAME OVER` / `PUNTAJE: n` dibujada en el canvas.
- El motor notifica puntuación, nivel y fin de partida al HUD, los botones y el modal de la plataforma. TETRIS no tiene vidas: el HUD muestra «—» en Vidas.
- Todos los botones y pantallas del Reproductor funcionan con el motor: PAUSA/REANUDAR («EN PAUSA»), FIN, SALIR, modal «FIN DEL JUEGO», «GUARDAR PUNTUACIÓN», «JUGAR DE NUEVO» y «VOLVER AL VAULT».
- Controles de teclado: `←` `→` mover, `↑` o `X` rotar, `↓` bajar, `Espacio` caída instantánea.
- Migración del catálogo: `caida` pasa a `tetris` (título `TETRIS`) conservando `short`, `long`, categoría, color, portada `cover-tetro`, `sort_order` 2, `plays`, `created_at` y las puntuaciones.
- Tres variables de color nuevas en `app/globals.css` (`--purple`, `--blue`, `--orange`), también expuestas en `@theme inline`.
- Actualizar el texto «Caída» de la actividad reciente de la home (`lib/home.ts`) a «Tetris».
- Que las teclas del juego no desplacen la página ni activen el botón enfocado.

**Fuera de alcance (para otras specs):**

- Controles táctiles o botones en pantalla.
- Sonido y música (el original no tiene).
- Tema claro/oscuro del original y su `localStorage` (`tetris-theme`).
- Tecla `P` de pausa: la pausa es solo el botón de la plataforma.
- Cambios de reglas o de balance: sistema de bolsa de piezas, _hold_, rotación antihoraria, otro sistema de _wall kicks_.
- Los demás juegos sin motor real: siguen con la simulación.
- Sincronizar o migrar las marcas de `localStorage` que usan `gameId: "caida"`.
- Redirección de `/juegos/caida` a `/juegos/tetris`.
- Renombrar la portada `cover-tetro`.
- Auth, antitrampas, cambios en el esquema de Supabase más allá de la migración de datos descrita.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Modificar `references/started-games/03-tetris/` (se queda como referencia).
- Corregir los criterios de las SPEC 04 y 05 que citan CAÍDA (son históricos).
- Tests automatizados (no hay framework instalado).

## Modelo de datos

No hay datos persistentes nuevos: las puntuaciones se guardan con el `SavedScore` y la clave `av:v1:scores` de la SPEC 01 y con `submitScore` de la SPEC 05, con `gameId: "tetris"`. Se añaden el contrato común de los juegos y el del motor de TETRIS.

```ts
// lib/game-types.ts (nuevo, solo tipos)
export type GameStats = { score: number; lives?: number; level?: number };
export type GameHandle = { restart(): void; finish(): void };
export type GameCanvasProps = {
  ref: React.Ref<GameHandle>;
  paused: boolean;
  onStats: (s: GameStats) => void;
  onGameOver: (s: GameStats) => void;
};

// components/game-registry.ts
export type GameEntry = {
  Canvas: React.ComponentType<GameCanvasProps>;
  hud: { lives: boolean; level: boolean }; // false → el HUD muestra «—»
};
export const GAME_REGISTRY: Record<string, GameEntry>; // "rocas" y "tetris"
```

```ts
// lib/tetris/engine.ts
export type TetrisPalette = {
  pieces: string[]; // 8 colores: I, O, T, S, Z, J, L, N (índices 1 a 8 del original)
  grid: string;     // cuadrícula        → var(--line-2)
  text: string;     // valores del panel → var(--cyan)
  label: string;    // etiquetas         → var(--ink-dim)
  highlight: string; // brillo de bloque → var(--ink)
};
export type TetrisStats = { score: number; level: number }; // sin lives
export type TetrisCallbacks = {
  onStats: (s: TetrisStats) => void;    // solo cuando cambia algún valor
  onGameOver: (s: TetrisStats) => void; // una vez por partida
};
export class TetrisEngine {
  constructor(canvas: HTMLCanvasElement, palette: TetrisPalette, cb: TetrisCallbacks);
  start(): void;   // nueva partida e inicio del bucle requestAnimationFrame
  restart(): void; // nueva partida (puntuación 0, 0 líneas, nivel 1)
  setPaused(paused: boolean): void;
  finish(): void;  // termina la partida (botón FIN)
  destroy(): void; // cancela el bucle y quita los listeners de teclado
}
```

```sql
-- Migración del catálogo (se aplica en la implementación con apply_migration, en una transacción)
insert into public.games (id, title, short, long, category, cover, color, plays, sort_order, created_at)
select 'tetris', 'TETRIS', short, "long", category, cover, color, plays, 99, created_at
from public.games where id = 'caida';                         -- sort_order 99 provisional (es unique)
update public.scores set game_id = 'tetris' where game_id = 'caida';  -- no dispara el trigger de plays (es AFTER INSERT)
delete from public.games where id = 'caida';
update public.games set sort_order = 2 where id = 'tetris';
```

```css
/* app/globals.css, bloque :root */
--purple: #b44dff;
--blue: #3d8bff;
--orange: #ff8a1f;
```

Convenciones:

- Archivos del motor: `lib/tetris/entities.ts` (constantes, `Piece`, `Board`) y `lib/tetris/engine.ts`. Las entidades no leen el DOM ni dibujan con colores propios.
- Canvas de 800×600 píxeles lógicos, escalado con CSS al 100 % del `.crt-screen` (ya 4:3). El tablero (10×20 celdas de 30 px, es decir 300×600) se dibuja con origen en `x = 100`, `y = 0`. El panel empieza en `x = 460`.
- Valores conservados del original: `COLS` 10, `ROWS` 20, `BLOCK` 30, `LINE_SCORES` `[0, 100, 300, 500, 800]` multiplicados por el nivel, soft drop +1 por fila, hard drop +2 por celda recorrida, nivel `floor(líneas / 10) + 1`, `dropInterval` `max(100, 1000 - (nivel - 1) * 90)` ms (1000 ms al empezar), _wall kicks_ `[0, -1, 1, -2, 2]`, pieza fantasma con `globalAlpha` 0,2, brillo del bloque con `globalAlpha` 0,12 y las 8 piezas (I, O, T, S, Z, J, L y la «tuerca» N de 3×3 con hueco central) elegidas al azar con la misma probabilidad (sin bolsa).
- Aparición de una pieza: `x = floor(COLS / 2) - floor(ancho / 2)`, `y = 0`. El fin de partida ocurre si la pieza nueva ya colisiona al aparecer.
- Mapeo de colores (ningún literal en `lib/tetris/` salvo el fondo `#000`): I `--cyan`, O `--yellow`, T `--purple`, S `--green`, Z `--magenta` (el rojo neón de la plataforma), J `--blue`, L `--orange`, N `--silver`.
- Mapeo a la plataforma: `score` = puntuación; `level` = nivel; `lives` ausente (`hud.lives = false`). Las líneas se muestran solo en el panel del canvas.
- Textos del canvas conservados del original: `SCORE`, `LINES`, `LEVEL`, `NEXT`, `CONTROLS` y la lista de controles en español (sin la línea de `P`). El texto de fin pasa a `GAME OVER` / `PUNTAJE: n`, sin botón «Reiniciar».
- Teclado: el motor registra `keydown` y `keyup` en `window` al iniciar y los quita en `destroy()`. `keydown` aplica la acción en el momento (no hay estado de teclas mantenidas) y deja pasar la auto-repetición del navegador, como el original. Ignora `keydown` cuando el objetivo es un `<input>` o `<textarea>`, cuando la partida está en pausa o terminada. Llama a `preventDefault()` en `keydown` y `keyup` de las teclas del juego cuando no se escribe en un campo, para que Espacio no active el botón enfocado y las flechas no desplacen la página.
- `onStats` se emite al iniciar y solo cuando cambia `score` o `level`, nunca en cada fotograma.
- El HUD de la plataforma muestra el `level` del motor y «—» en Vidas, no la fórmula `1 + floor(puntuación / 2500)` de la simulación.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`); para los pasos 2, 5 y 6, la de componentes de cliente (`01-app/02-guides/server-and-client-boundary.md`). Para la interfaz se usa siempre la skill `frontend-design`, con el aspecto actual del Reproductor como referencia.

1. **Catálogo y colores.** Aplicar con `apply_migration` el renombrado de `caida` a `tetris` (SQL de «Modelo de datos»), añadir `--purple`, `--blue` y `--orange` a `:root` y a `@theme inline` en `app/globals.css`, y cambiar «Caída» por «Tetris» en `lib/home.ts`. Verificación: `/juegos/tetris` muestra TETRIS con 5 puntuaciones y el mismo `plays`, `/juegos/caida` muestra «no encontrado», `games` tiene 8 filas con `sort_order` del 1 al 8, y `/juegos/tetris/jugar` sigue con la simulación.
2. **Registro de juegos.** Crear `lib/game-types.ts` y `components/game-registry.ts` con la entrada `rocas` (`hud: { lives: true, level: true }`), adaptar `components/asteroids-canvas.tsx` a `GameCanvasProps` y hacer que `components/game-player.tsx` use el registro (canvas, `finish`, `restart`, vidas y nivel) en lugar de `isRocas`; los juegos no registrados siguen con la simulación. Verificación: `/juegos/rocas/jugar` se comporta igual, `/juegos/serpentina/jugar` conserva la simulación, y `tsc` y `lint` pasan.
3. **Entidades del tablero.** Crear `lib/tetris/entities.ts` con las constantes, `Piece` (matrices de las 8 piezas, `random()`, `rotated()`) y `Board` (`cells`, `collide`, `merge`, `clearLines`), portadas de `game.js` sin globales. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
4. **Motor.** Crear `lib/tetris/engine.ts` con `TetrisEngine`: estado de partida, bucle `requestAnimationFrame` con acumulador, movimiento, rotación, soft y hard drop, fantasma, puntuación y nivel, dibujo del tablero y del panel, pantalla `GAME OVER`, teclado según las convenciones y los callbacks. Verificación: `tsc` y `lint` pasan.
5. **Canvas.** Crear `components/tetris-canvas.tsx`: lee la paleta de las variables CSS al montar, crea el motor en un efecto, lo destruye al desmontar y aplica `setPaused`. Verificación: `tsc` y `lint` pasan.
6. **Alta en el Reproductor y ciclo completo.** Añadir la entrada `tetris` al registro (`hud: { lives: false, level: true }`), mostrar «—» en Vidas cuando el juego no tiene vidas y conectar `onGameOver`, FIN y «JUGAR DE NUEVO». Verificación: `/juegos/tetris/jugar` es jugable con el teclado, el HUD coincide con el canvas y se completa jugar → perder → guardar → ver la marca en el ranking de `/juegos/tetris` y en la pestaña TETRIS del Salón.

## Criterios de aceptación

**Base de datos y catálogo**

- [ ] `public.games` no contiene la fila `caida` y contiene `tetris` con `title` `TETRIS`, `category` `PUZZLE`, `color` `magenta`, `cover` `cover-tetro`, `sort_order` 2 y los mismos `short` y `long` que tenía `caida`.
- [ ] `games.plays` de `tetris` es igual al que tenía `caida` justo antes de la migración (31800 el 2026-11-20 más las puntuaciones guardadas desde entonces).
- [ ] `scores` no contiene filas con `game_id = 'caida'`, y las filas que tenía `caida` (5 el 2026-11-20) existen con `game_id = 'tetris'` y el mismo `player_name`, `score` y `created_at`.
- [ ] `games_catalog.best` de `tetris` es el máximo de sus puntuaciones (216195 el 2026-11-20).
- [ ] `games` tiene 8 filas y `sort_order` del 1 al 8 sin huecos ni repetidos.
- [ ] `/juegos/tetris` y `/juegos/tetris/jugar` responden 200; `/`, `/juegos` y `/salon` muestran TETRIS y no CAÍDA.
- [ ] `/juegos/caida` y `/juegos/caida/jugar` muestran la pantalla de «no encontrado» y, salvo en la primera petición, responden 404 (comportamiento de la SPEC 05).
- [ ] La actividad reciente de la home muestra «Tetris» en lugar de «Caída».
- [ ] `app/globals.css` define `--purple`, `--blue` y `--orange` en `:root` y las expone en `@theme inline`, y `.cover-tetro` no cambia.

**Rutas y proyecto**

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores, y `npx eslint app components lib` no devuelve errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/tetris/jugar` ni en `/juegos/rocas/jugar`.
- [ ] `lib/tetris/` no contiene `document.`, `getElementById`, `localStorage` ni colores literales salvo el fondo `#000`.
- [ ] Los archivos de `references/started-games/03-tetris/` no tienen cambios en `git status`.
- [ ] `components/game-player.tsx` ya no contiene `isRocas` ni `game.id === "rocas"`.

**Registro de juegos**

- [ ] `/juegos/rocas/jugar` se comporta como antes: HUD con 3 corazones y nivel del motor, pausa, FIN, modal y guardado.
- [ ] `/juegos/serpentina/jugar` conserva la simulación: contiene `.game-arena` y su puntuación sube sola.
- [ ] La puntuación de TETRIS y de ROCAS no sube sola: el intervalo de la simulación no se ejecuta para los juegos del registro.
- [ ] En TETRIS el HUD muestra «—» en Vidas y el Nivel con dos dígitos.

**Canvas y partida**

- [ ] El canvas tiene 800×600 píxeles lógicos, ocupa el 100 % de `.crt-screen` y no se deforma.
- [ ] El tablero mide 300×600 (10×20 celdas de 30 px) y se dibuja en `x = 100`; el panel con `SCORE`, `LINES`, `LEVEL`, `NEXT` y `CONTROLS` está a la derecha.
- [ ] Al empezar el tablero está vacío, el canvas muestra `SCORE 0`, `LINES 0` y `LEVEL 1`, hay una pieza arriba en la columna `floor(10 / 2) - floor(ancho / 2)` y `NEXT` muestra la pieza siguiente.
- [ ] Existen 8 tipos de pieza (I, O, T, S, Z, J, L y la «tuerca» N de 3×3 con hueco central), elegidos al azar con la misma probabilidad.
- [ ] `←` y `→` mueven la pieza una columna por pulsación, la repiten al mantenerlas y no la sacan del tablero ni la solapan con bloques fijados.
- [ ] `↑` y `X` giran la pieza 90° en sentido horario; si choca, prueba los desplazamientos `0, -1, 1, -2, 2` y, si ninguno cabe, no gira.
- [ ] `↓` baja una fila y suma 1 punto; si no puede bajar, fija la pieza sin sumar.
- [ ] `Espacio` lleva la pieza al fondo, suma 2 puntos por fila recorrida y la fija; mantenerlo pulsado repite la caída, como en el original.
- [ ] A nivel 1 la pieza baja una fila cada 1000 ms y, al no poder bajar, se fija.
- [ ] La pieza fantasma se dibuja en la posición de aterrizaje con transparencia 0,2.
- [ ] Completar 1, 2, 3 y 4 líneas a la vez suma 100, 300, 500 y 800 puntos multiplicados por el nivel, y las filas superiores bajan.
- [ ] Al acumular 10 líneas el nivel pasa a 2 y el intervalo a 910 ms; el intervalo nunca baja de 100 ms.
- [ ] Si una pieza nueva colisiona al aparecer termina la partida: el canvas muestra `GAME OVER` y `PUNTAJE: n` sin el texto «Reiniciar».
- [ ] Las piezas usan los colores de las variables CSS: I `--cyan`, O `--yellow`, T `--purple`, S `--green`, Z `--magenta`, J `--blue`, L `--orange` y N `--silver`.
- [ ] Pulsar flechas y Espacio durante la partida no desplaza la página.

**HUD y botones de la plataforma**

- [ ] El HUD muestra Jugador («INVITADO»), Puntuación, Vidas («—») y Nivel con dos dígitos, y Puntuación y Nivel coinciden con `SCORE` y `LEVEL` del canvas.
- [ ] Tras un hard drop de 10 filas, Puntuación pasa a `20`; al llegar a 10 líneas, Nivel pasa a `02`.
- [ ] «PAUSA» detiene la caída y bloquea el teclado, muestra la capa «EN PAUSA» y cambia el botón a «REANUDAR»; reanudar continúa sin que la pieza salte varias filas.
- [ ] Con «PAUSA» o «REANUDAR» recién pulsado, Espacio no activa el botón y sí hace caer la pieza cuando la partida está en marcha.
- [ ] «FIN» abre el modal «FIN DEL JUEGO» con la puntuación actual, y el canvas muestra `GAME OVER` y `PUNTAJE: n`.
- [ ] Al terminar la partida por una pieza que no cabe se abre el modal automáticamente con la puntuación final.
- [ ] Con el modal abierto, escribir espacios en el campo de iniciales no reinicia la partida ni mueve ninguna pieza.
- [ ] «GUARDAR PUNTUACIÓN» añade a `av:v1:scores` una entrada `{ gameId: "tetris", name, score, at }`, inserta la fila en `scores` y muestra «PUNTUACIÓN GUARDADA».
- [ ] La puntuación guardada aparece en el ranking de `/juegos/tetris` y en la pestaña TETRIS del Salón, y en «TU MEJOR MARCA»; `games.plays` de `tetris` sube en 1.
- [ ] «JUGAR DE NUEVO» cierra el modal y reinicia: tablero vacío, Puntuación 0, Nivel 01, 0 líneas y sin estado de guardado.
- [ ] «SALIR» navega a `/juegos/tetris` y «VOLVER AL VAULT» (modal) a `/juegos`.
- [ ] Tras salir del Reproductor, pulsar Espacio y las flechas no produce errores en consola ni cambios en la página (el bucle y los listeners se han destruido).
- [ ] Volver a entrar en `/juegos/tetris/jugar` y salir varias veces no acumula bucles: la pieza baja a la misma velocidad que en la primera visita.

## Decisiones tomadas y descartadas

- **Sí:** reutilizar la entrada CAÍDA del catálogo y renombrarla a TETRIS, igual que ROCAS reutilizó la suya. **No:** añadir una fila nueva: dejaría dos juegos de bloques en el catálogo y un mock sin función.
- **Sí:** el nombre del juego y todas sus referencias pasan a «tetris» (`id`, título, actividad reciente). **No:** conservar `caida` como id: contradice el nombre del juego.
- **Sí:** migración que inserta `tetris`, mueve las puntuaciones y borra `caida`, en una transacción, conservando `plays`, `created_at` y el ranking. Motivo: `scores_game_id_fkey` solo tiene `ON DELETE CASCADE`, así que `update games set id` falla mientras haya puntuaciones. **No:** alterar la clave foránea a `ON UPDATE CASCADE` (cambio de esquema fuera de alcance) ni empezar de cero (se perderían los datos sembrados).
- **Sí:** mover las filas con `update scores`: el trigger `bump_game_plays` es `AFTER INSERT`, así que `plays` no cambia. **No:** reinsertar las puntuaciones, que sumaría 5 a `plays`.
- **Sí:** `sort_order` provisional 99 y ajuste final a 2, porque la columna es `unique`.
- **Sí:** aceptar que las marcas guardadas en `localStorage` con `gameId: "caida"` dejan de aparecer en «TU MEJOR MARCA». **No:** migrarlas o duplicarlas con otro id en esta spec.
- **Sí:** mantener la portada `cover-tetro` y `games.cover`. **No:** renombrarla a `cover-tetris`: no contiene la palabra «caida» y no aporta nada.
- **Sí:** `short` y `long` sin cambios: ya describen lo que el juego tiene (rotar, encajar, limpiar líneas y acelerar cada 10 líneas).
- **Sí:** introducir el registro de juegos ahora. Hay dos juegos reales y la comparación `game.id === "rocas"` no escala. **No:** un campo nuevo en el tipo `Game` o en la base de datos: el motor es código del cliente, no un dato del catálogo.
- **Sí:** `GameStats` con `lives` y `level` opcionales y `hud: { lives, level }` en el registro. El HUD muestra «—» en lo que el juego no tiene. **No:** ocultar el bloque Vidas, que es un cambio de diseño del HUD de la plataforma (fuera de alcance).
- **Sí:** el registro migra ROCAS sin cambiar su comportamiento y sus criterios se vuelven a comprobar. **No:** tocar el motor de ROCAS.
- **Sí:** un único canvas de 800×600 con el tablero y un panel dibujado dentro, como ROCAS. Encaja en el marco CRT 4:3 y evita un segundo canvas que el motor tendría que buscar. **No:** el canvas 300×600 del original (dejaría bandas vacías en el CRT) ni descartar la pieza siguiente y las líneas.
- **Sí:** el panel del canvas conserva las etiquetas del original (`SCORE`, `LINES`, `LEVEL`, `NEXT`, `CONTROLS`) y las líneas viven solo allí. **No:** añadir una métrica de líneas al HUD de la plataforma.
- **Sí:** el texto de fin `GAME OVER` / `PUNTAJE: n`, igual que ROCAS. El original dice `Puntuación: n`; se unifica con el otro juego real. **No:** el botón «Reiniciar» del overlay: el reinicio es solo «JUGAR DE NUEVO», porque el modal tiene un campo de texto donde se escribe con la barra espaciadora.
- **Sí:** paleta neón con las variables CSS de la plataforma más tres nuevas (`--purple`, `--blue`, `--orange`), con Z en `--magenta` y N en `--silver`. **No:** los 8 colores literales del original ni un `--red` aparte, demasiado parecido a `--magenta`.
- **Sí:** las variables nuevas también se exponen en `@theme inline`, como las existentes. **No:** colores solo locales al motor.
- **Sí:** el brillo del bloque con `globalAlpha` 0,12 sobre `--ink`, y la pieza fantasma con `globalAlpha` 0,2. **No:** `rgba(255,255,255,…)` literal como el original.
- **Sí:** la cuadrícula con `--line-2`, que sustituye a `--grid-line` del CSS del original.
- **Sí:** tablero en `x = 100` y panel en `x = 460`. Son medidas de partida que la implementación puede afinar con `frontend-design` sin cambiar el tamaño del canvas ni del tablero.
- **Sí:** solo teclado, como el original. Los controles táctiles son UI y lógica nuevas y van en otra spec.
- **Sí:** conservar `X` como segunda tecla de rotación y la pieza fantasma, que forman parte del juego original.
- **Sí:** el teclado se procesa en `keydown`, como el original (no hay estado de teclas), con la auto-repetición del navegador, y Espacio también repite, como el original. **No:** ignorar `e.repeat` en Espacio: se conserva el comportamiento del original, aunque suelte varias piezas seguidas al mantenerlo pulsado.
- **Sí:** el motor ignora `keydown` en `<input>`/`<textarea>`, en pausa y con la partida terminada, y llama a `preventDefault()` en `keydown` y `keyup` de las teclas del juego (Espacio activa un botón al soltarse). Es el criterio de ROCAS.
- **Sí:** sin tecla `P`, sin tema claro/oscuro y sin `localStorage` en el motor: la plataforma tiene su botón PAUSA, su tema y su guardado.
- **Sí:** conservar el acumulador de intervalo del original en lugar de pasar a `dt` continuo; al reanudar se reinicia la marca de tiempo para que no haya saltos. **No:** un tope de `dt` distinto del original.
- **Sí:** `Math.random()` solo dentro de `start()` y `restart()`, nunca durante el render, para evitar avisos de hidratación.
- **Sí:** «FIN» llama a `finish()` del motor, de modo que canvas y modal siguen la misma ruta que el fin por pieza que no cabe. **No:** un estado de fin independiente en React.
- **Sí:** no editar las SPEC 04 y 05, aunque citen `/juegos/caida/jugar` y los 31800 de CAÍDA: son registros históricos de lo que se implementó entonces. Esta spec fija los criterios vigentes con `serpentina` como juego simulado.
- **Sí:** sonido fuera de alcance, como en el original.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| La migración falla a medias y deja `caida` y `tetris` a la vez, o puntuaciones huérfanas | `apply_migration` ejecuta el script como una transacción; se verifica después el recuento de `scores` y `games` antes de seguir. Se consulta el estado de `caida` justo antes de aplicarla. |
| `getGames()`/`getGame()` están cacheados (`cacheLife("minutes")`) y `/juegos/caida` o el título antiguo siguen viéndose un rato tras migrar | Documentado en la verificación del paso 1: esperar a que expire la caché o invalidar la etiqueta `games` (por ejemplo guardando una puntuación) antes de comprobar. |
| Las marcas de `localStorage` con `gameId: "caida"` quedan huérfanas | Aceptado: la marca personal es un dato local de bajo valor y se registra como decisión. |
| Strict Mode monta el efecto dos veces y quedan dos bucles o dos juegos de listeners | `destroy()` cancela `requestAnimationFrame` y quita los listeners; el efecto del componente lo llama en su limpieza. Criterio sobre bucles acumulados. |
| Tras pulsar PAUSA o REANUDAR el botón conserva el foco y Espacio lo activaría al soltarse | El motor hace `preventDefault()` de `keydown` y `keyup` en las teclas del juego fuera de campos de texto. Criterio de aceptación. |
| Escribir las iniciales del modal mueve o suelta piezas | El motor ignora `keydown` cuyo objetivo sea `<input>` o `<textarea>` y también con la partida terminada. |
| Mantener Espacio pulsado suelta varias piezas y puede terminar la partida sin querer | Se conserva a propósito el comportamiento del original (decisión explícita); si molesta, se cambia en otra spec. |
| El simulador y el motor suman puntos a la vez | El Reproductor no arranca el intervalo de la simulación para los juegos del registro. Criterio: la puntuación de TETRIS no sube sola. |
| El refactor del registro rompe ROCAS | El paso 2 no añade juego nuevo y exige comprobar ROCAS y la simulación antes de seguir; criterios sobre ambos. |
| Una variable CSS no existe y el canvas dibuja con color vacío | Criterio de aceptación de los 8 colores de pieza y de las tres variables nuevas en `:root`. |
| Demasiados renders por emitir estadísticas en cada fotograma | `onStats` solo se llama al cambiar `score` o `level`. |
| `Math.random()` se ejecuta durante el prerender y causa un aviso de hidratación | La primera pieza y la siguiente se crean en `start()`, dentro del efecto del componente. |
| Al reanudar tras una pausa larga la pieza baja varias filas de golpe | Al reanudar se reinicia la marca de tiempo y el acumulador baja como máximo una fila por intervalo, como en el original. |

## Lo que **no** entra en esta spec

- Controles táctiles o botones en pantalla.
- Sonido, música, _hold_, bolsa de piezas, rotación antihoraria o cambios de reglas y de balance.
- Tema claro/oscuro y tecla `P` del original.
- Los otros juegos sin motor real; siguen con la simulación.
- Redirección de `/juegos/caida`, migración de las marcas locales con `gameId: "caida"` y renombrado de la portada `cover-tetro`.
- Rankings reales nuevos, Auth, antitrampas o cambios de esquema en Supabase.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Corregir los criterios históricos de las SPEC 04 y 05.
- Modificar `references/started-games/03-tetris/`.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
