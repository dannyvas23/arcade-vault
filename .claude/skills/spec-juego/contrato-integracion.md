# Contrato de integración de un juego en Arcade Vault

Destilado de `specs/04-juego-rocas.md` y `specs/05-leaderboard-y-tabla-de-juegos.md`. Toda spec de juego hereda estas reglas. Si el código del proyecto ha cambiado desde entonces, **manda el código y la spec más reciente**; verifica antes de citar rutas y números de línea.

Stack: Next.js 16 con Cache Components, React 19, Tailwind 4, Supabase. `AGENTS.md` obliga a leer la guía correspondiente de `node_modules/next/dist/docs/` antes de escribir código Next, y `CLAUDE.md` exige la skill `frontend-design` para la interfaz. La spec debe recordarlo en el plan.

## 1. Piezas de un juego integrado

| Pieza | Ruta | Notas |
| ----- | ---- | ----- |
| Entidades y utilidades | `lib/<id>/entities.ts` | Clases y funciones puras. `draw(ctx, color/palette)` recibe colores; no lee el DOM. |
| Motor | `lib/<id>/engine.ts` | Clase `XEngine`: `constructor(canvas, palette, callbacks)`, `start()`, `restart()`, `setPaused(b)`, `finish()`, `destroy()`. Sin React ni acceso global al DOM. |
| Wrapper de canvas | `components/<id>-canvas.tsx` | `"use client"`. Lee la paleta de las variables CSS al montar, crea el motor en un efecto, lo destruye en el cleanup. Props: `ref`, `paused`, `onStats`, `onGameOver`. |
| Reproductor | `components/game-player.tsx` | Renderiza el canvas del juego y conecta HUD, pausa, FIN, reinicio y modal. |
| Catálogo | tabla `public.games` | `INSERT` con `id`, `title`, `short`, `long`, `category`, `cover`, `color`, `plays`, `sort_order`. |
| Portada | `app/globals.css` | Clase `.cover-<id>` en el bloque «Cover art generators (pure CSS)». El campo `cover` guarda el nombre de la clase. |

Referencia viva de cada pieza: `lib/asteroids/`, `components/asteroids-canvas.tsx`, `.cover-rocas`.

## 2. Reglas del motor

- Sin React, sin `document.`, sin `getElementById`; el canvas llega por constructor.
- Sin colores literales en `lib/<id>/` salvo el fondo `#000`. La paleta llega inyectada con la forma `{ ship, flame, … }` propia del juego, derivada de `--cyan`, `--magenta`, `--yellow`, `--green` (definidas en `app/globals.css`). Efectos de desvanecido con `globalAlpha`, no con `rgba` literal.
- Todo `Math.random()` y la creación del estado de partida ocurren en `start()`/`restart()`, nunca en el render ni en el constructor (evita avisos de hidratación).
- Canvas de tamaño lógico fijo (800×600 en ROCAS); `canvas.width/height` se fijan en el constructor. Se escala con CSS al 100 % de `.crt-screen` (4:3). Sin soporte de alta densidad salvo que la spec lo pida.
- Bucle con `requestAnimationFrame`; se cancela en `destroy()`. Tiempo continuo: `dt` en segundos con tope (0,05 s en ROCAS). Tiempo discreto (acumulador): se conserva y se reinicia `lastTime` al reanudar.
- Se conservan los valores numéricos del original (port, no rediseño). La spec los lista con su valor.

## 3. Teclado

- `keydown`/`keyup` en `window`, registrados en `start()` y retirados en `destroy()`.
- `keyup` siempre actualiza el estado de las teclas (evita teclas pegadas).
- `keydown` se ignora si el objetivo es `<input>`/`<textarea>`, si hay pausa o si la partida terminó.
- `preventDefault()` solo en las teclas del juego, en `keydown` y `keyup` (evita desplazar la página y que Espacio active el botón enfocado).
- Al pausar, reanudar y reiniciar se descartan las pulsaciones pendientes (`justPressed`).
- **Sin tecla de reinicio dentro del juego:** el modal de fin tiene un campo de iniciales donde se teclea con espacios. El reinicio es solo «JUGAR DE NUEVO».
- Teclas de pausa (`P`, `Esc`) del juego original: se descartan por defecto (la pausa es el botón de la plataforma); solo se conservan si el usuario lo decide.
- Controles táctiles o de ratón: fuera de alcance salvo petición expresa (ratón requiere convertir coordenadas CSS→lógicas con `getBoundingClientRect`).

## 4. Callbacks y estadísticas

- Tipo común propuesto (a introducir en el refactor al registro): `GameStats = { score: number; lives?: number; level?: number }`. `AsteroidsStats` pasa a ser un alias.
- `onStats(s)` se emite al iniciar y **solo cuando cambia** un valor, nunca en cada fotograma (evita ~60 renders/s).
- `onGameOver(s)` una sola vez por partida.
- `finish()` (botón FIN) sigue la misma ruta interna que perder: el canvas muestra su pantalla de fin y se llama a `onGameOver`.
- El HUD de la plataforma muestra los valores del motor, no fórmulas propias de la simulación (`1 + floor(puntos/2500)`, 3 vidas fijas). Un juego sin vidas o nivel muestra «—».
- El HUD propio del canvas es decisión del juego (ROCAS lo conserva); si el original tiene HUD en el DOM, se traslada al HUD de la plataforma y se quita del canvas.
- El texto de fin del canvas nunca ofrece reiniciar con una tecla.

## 5. Reproductor y registro de juegos

Estado esperado antes del primer juego nuevo: `game-player.tsx` decide con `const isRocas = game.id === "rocas"` y bifurca en: cálculo de `level`/`lives`, efecto del intervalo de simulación, `finish()`, `restart()` y el render (canvas vs. `.game-arena`). `AsteroidsStats` y `AsteroidsHandle` son específicos de ROCAS.

**Refactor al registro** (paso del plan si aún no existe):

```ts
export type GameStats = { score: number; lives?: number; level?: number };
export type GameHandle = { restart(): void; finish(): void };
export type GameCanvasProps = {
  ref: React.Ref<GameHandle>;
  paused: boolean;
  onStats: (s: GameStats) => void;
  onGameOver: (s: GameStats) => void;
};
// registro: id → componente de canvas y qué muestra el HUD
export const GAME_REGISTRY: Record<string, { Canvas: React.ComponentType<GameCanvasProps>; hud: { lives: boolean; level: boolean } }>;
```

- Juego en el registro → se renderiza su `Canvas`, no corre el intervalo de simulación y `finish`/`restart` van al motor; si no está → simulación actual (`.game-arena`).
- El refactor no cambia el comportamiento de ROCAS ni de los juegos simulados; los criterios de la spec lo comprueban.
- Se mantiene lo que ya es genérico: HUD (Jugador «INVITADO», Puntuación, Vidas ♥, Nivel a dos dígitos), PAUSA/REANUDAR y capa «EN PAUSA», FIN, SALIR (`/juegos/<id>`), modal «FIN DEL JUEGO», `saveRun` (evita pintar un guardado tardío en la partida nueva) y estados de guardado `idle | saving | remote | local`.
- Los componentes que dependen de `"use client"` siguen la guía `01-app/02-guides/server-and-client-boundary.md`.

## 6. Catálogo y leaderboard (Supabase)

Lo que **ya es genérico** y no se toca: `submitScore` (`lib/actions/scores.ts`), `ScoresProvider.saveScore`, `getTopScores`, `getGames`/`getGame` (`lib/data/*`), vista `games_catalog` (`best` = `MAX(score)`), trigger `bump_game_plays()` (suma 1 a `plays` por cada fila de `scores`), RLS (lectura pública, insert público en `scores`), rutas dinámicas (`generateStaticParams` desde la BD), Salón de la Fama y detalle.

Lo que **sí hay que hacer** por juego:

1. **Migración** (aplicada en la implementación con `apply_migration`; no hay carpeta `supabase/`):

   ```sql
   insert into public.games (id, title, short, long, category, cover, color, plays, sort_order)
   values ('<id>', '<TÍTULO>', '<short>', '<long>', '<ARCADE|PUZZLE|SHOOTER|VERSUS>',
           'cover-<id>', '<cyan|magenta|yellow|green>', 0, <sort_order libre>);
   ```

   `sort_order` es `smallint unique`; `category` y `color` tienen CHECK; `plays >= 0`. Opcional: sembrar filas en `scores` (`player_name` 1–10 caracteres, `score >= 0`, fechas no futuras) — el trigger ya existe, así que sembrar **sube `plays`**; la spec decide si compensarlo. Sin seed, el ranking muestra «SIN PUNTUACIONES TODAVÍA».
2. **Portada:** clase `.cover-<id>` en `app/globals.css`. Sin ella la tarjeta se ve vacía y no hay error.
3. **Home:** `components/home.tsx` usa `games.slice(0, 6)`; un `sort_order` ≥ 7 no aparece en la home.
4. **Tipos:** regenerar `lib/supabase/database.types.ts` solo si cambia el esquema (un `INSERT` no lo cambia).
5. **Caché:** `getGames`/`getGame` usan `use cache` + `cacheLife("minutes")` + `cacheTag("games")`. Un juego recién insertado puede dar «no encontrado» hasta que la caché expire o se invalide `games` (p. ej. guardando una puntuación, que llama a `updateTag("games")`). La verificación manual debe tenerlo en cuenta.
6. `plays` cuenta puntuaciones guardadas, no partidas iniciadas; `best` lo calcula la vista.

Guardado: «GUARDAR PUNTUACIÓN» escribe siempre en `localStorage` (`av:v1:scores`, fuente de «TU MEJOR MARCA») y en Supabase mediante `submitScore`; si falla la acción, el modal muestra «GUARDADA SOLO EN ESTE DISPOSITIVO». No hay sincronización posterior (otra spec).

## 7. Pasos base del plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía de `node_modules/next/dist/docs/` que corresponda; para UI, la skill `frontend-design`.

1. **Catálogo y portada:** migración `INSERT` en `games` + clase `.cover-<id>`. Verificación: `/juegos/<id>` muestra el juego (con la salvedad de la caché), la tarjeta tiene portada y los otros juegos no cambian.
2. **Utilidades y entidades pasivas** en `lib/<id>/entities.ts`. Verificación: `npx tsc --noEmit` y `npm run lint`.
3. **Entidad principal** (nave, pieza, paleta…), recibiendo el estado de las teclas como parámetro.
4. **Motor** `lib/<id>/engine.ts`: estado, bucle, colisiones/reglas, HUD de canvas si procede, teclado según las convenciones, callbacks.
5. **Wrapper de canvas** `components/<id>-canvas.tsx` (paleta desde CSS, efecto con `destroy()` en el cleanup, `setPaused`).
6. **Registro en el Reproductor:** refactor al registro si aún no existe (con comprobación de que ROCAS y la simulación no cambian) y alta del juego. HUD, PAUSA y «EN PAUSA» controlan el motor.
7. **Fin de partida y reinicio:** `onGameOver` abre el modal, FIN → `finish()`, «JUGAR DE NUEVO» → `restart()` + reinicio del estado React. Verificación: jugar → perder → guardar → ver la marca en el ranking del juego.

El último paso del plan no es «probar todo»: eso son los criterios de aceptación.

## 8. Criterios de aceptación reutilizables

Adáptalos con los nombres y números del juego (`<id>`, `<Título>`).

**Rutas y proyecto**
- [ ] `/juegos/<id>/jugar` responde 200 y muestra el canvas del juego dentro del marco CRT.
- [ ] Los demás juegos conservan su comportamiento (los simulados mantienen `.game-arena` y su puntuación sube sola; ROCAS sigue jugable).
- [ ] `npx tsc --noEmit`, `npm run build` y `npx eslint app components lib` terminan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos/<id>/jugar`.
- [ ] `lib/<id>/` no contiene `document.`, `getElementById` ni colores literales salvo el fondo `#000`.
- [ ] `references/started-games/<carpeta>/` no tiene cambios en `git status`.

**Canvas y partida**
- [ ] El canvas tiene el tamaño lógico definido, ocupa el 100 % de `.crt-screen` y no se deforma.
- [ ] Estado inicial, controles, puntuación y condiciones de fin del juego, uno por criterio, con los valores del original.
- [ ] Usa los colores de las variables CSS de `globals.css`.
- [ ] Pulsar las teclas del juego no desplaza la página.

**HUD y botones de la plataforma**
- [ ] El HUD muestra Jugador («INVITADO»), Puntuación y, si el juego los tiene, Vidas y Nivel, coincidiendo con el juego; los que no tiene muestran «—».
- [ ] «PAUSA» detiene el juego, muestra «EN PAUSA» y cambia a «REANUDAR»; reanudar continúa sin saltos.
- [ ] Una tecla pulsada al pausar y soltada durante la pausa no queda «pegada».
- [ ] Con «PAUSA»/«REANUDAR» recién pulsado, Espacio no activa el botón (si Espacio es tecla del juego).
- [ ] «FIN» abre el modal «FIN DEL JUEGO» con la puntuación actual; al terminar la partida se abre solo, con la puntuación final.
- [ ] Con el modal abierto, escribir en el campo de iniciales (incluido Espacio) no reinicia ni mueve el juego.
- [ ] «GUARDAR PUNTUACIÓN» añade a `av:v1:scores` una entrada `{ gameId: "<id>", name, score, at }`, inserta la fila en `scores` y muestra «PUNTUACIÓN GUARDADA».
- [ ] La puntuación aparece en el ranking de `/juegos/<id>` y en la pestaña del Salón sin recargar a mano (si falla la caché, ver §6.5) y en «TU MEJOR MARCA».
- [ ] `games.plays` del juego sube en 1 tras guardar.
- [ ] «JUGAR DE NUEVO» cierra el modal y reinicia: partida nueva, estadísticas a su valor inicial y sin estado de guardado.
- [ ] «SALIR» navega a `/juegos/<id>` y «VOLVER AL VAULT» a `/juegos`.
- [ ] Tras salir del Reproductor, pulsar las teclas del juego no produce errores ni cambios (bucle y listeners destruidos).
- [ ] Entrar y salir varias veces no acumula bucles: la velocidad del juego es la de la primera visita.

**Catálogo**
- [ ] `games` contiene la fila del juego con `sort_order` único, `cover = 'cover-<id>'` y su `plays` inicial; `/juegos`, `/salon` y (si `sort_order` ≤ 6) `/` lo muestran con portada.
- [ ] El texto `long` describe solo lo que el juego tiene.
- [ ] Sin puntuaciones, el ranking muestra «SIN PUNTUACIONES TODAVÍA».

## 9. Decisiones típicas que la spec debe registrar

Elegido/descartado con motivo, como en las specs 04 y 05: portar a TS con motor separado (no iframe); HUD en canvas vs. plataforma; `onStats` solo al cambiar; sin reinicio por tecla; solo teclado; sin sonido (salvo petición); pausa solo con el botón; paleta desde variables CSS leída al montar; registro de juegos (si se introduce); `sort_order` elegido; seed de ranking o vacío; `plays` inicial.

## 10. Riesgos típicos

| Riesgo | Mitigación |
| ------ | ---------- |
| Strict Mode monta dos veces y quedan dos bucles o dos juegos de listeners | `destroy()` cancela `requestAnimationFrame` y quita listeners; el efecto lo llama en el cleanup; criterio de bucles acumulados. |
| Tras pulsar PAUSA el botón conserva el foco y Espacio lo activa | `preventDefault` de `keydown` y `keyup` en las teclas del juego fuera de campos de texto. |
| Teclas «pegadas» al soltar durante pausa o modal | `keyup` actualiza siempre; se descartan pulsaciones al pausar/reanudar/reiniciar. |
| Escribir iniciales dispara o reinicia el juego | Se ignora `keydown` en `<input>`/`<textarea>` y con la partida terminada. |
| El simulador y el motor suman puntos a la vez | El Reproductor no arranca el intervalo si el juego está en el registro. |
| Variable CSS inexistente → color vacío (ignorado) | Criterio de aceptación de colores esperados. |
| Demasiados renders por emitir stats cada fotograma | `onStats` solo al cambiar. |
| `Math.random()` en el prerender → aviso de hidratación | El estado de partida se crea en `start()`, dentro del efecto. |
| Juego recién insertado da «no encontrado» por la caché | Esperar `cacheLife` o invalidar la etiqueta `games`; documentarlo en la verificación. |
| Sembrar `scores` sube `plays` (trigger) | El trigger ya existe, así que cada fila sembrada suma 1: fijar `plays` con un `update` en la misma migración, tras el seed. |
| Fallo del guardado remoto | Aviso «GUARDADA SOLO EN ESTE DISPOSITIVO»; sincronizar queda fuera. |
| Política `scores_insert_public` abierta (riesgo aceptado en SPEC 05) | Antitrampas y Auth en otra spec. |
