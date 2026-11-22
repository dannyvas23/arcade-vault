# SPEC 09 — Juego PRISMA jugable en el Reproductor

> **Estado:** Borrador
> **Depende de:** SPEC 01 (Reproductor, catálogo y `ScoresProvider`), SPEC 04 (juego ROCAS), SPEC 05 (tabla de juegos y leaderboard en Supabase), SPEC 06 (juego TETRIS y registro de juegos), SPEC 08 (juego SNAKE)
> **Fecha:** 2026-11-21
> **Objetivo:** Crear en TypeScript un puzle de emparejar colores contra una formación de invasores que desciende (tema de la jam «INVASORES (Space Invaders)»), darlo de alta en el catálogo como PRISMA y conectarlo al HUD, los botones, el modal de guardado y el leaderboard de la plataforma mediante el registro de juegos.

---

## Por qué existe esta spec

Esta spec es la **variante B** de la game jam con el tema «INVASORES (Space Invaders)». La variante A (`variante-a-invaders.md`) es el shooter clásico de oleadas con escudos y nave nodriza. Esta variante conserva lo que define al tema, la **formación de invasores que baja fila a fila** contra un cañón que se mueve en horizontal, pero cambia la acción: el cañón no destruye al impactar, sino que **pega** un invasor del color del cargador bajo la columna elegida, y los grupos de 3 o más del mismo color desaparecen. Es un puzle de reflejos y planificación, no un shooter. Solo se implementará una variante. La numeración (`09`) es provisional: se fija al promover la spec a `specs/`.

Diferencias con la variante A: otra mecánica central (emparejar colores y gestionar una pila que crece, sin balas enemigas, escudos ni vidas), otra categoría (PUZZLE frente a SHOOTER) y otro color (magenta frente a green).

Estado de la plataforma el 2026-11-21 (comprobado en `components/game-registry.ts` y en `public.games`): hay **4 juegos con motor real** (ROCAS, TETRIS, ARKANOID y SNAKE) y 4 que siguen con la simulación del Reproductor (GLOTÓN, INVASORES, RANARIA y DUELO PIXEL). El registro de juegos ya existe, así que esta spec solo añade una entrada. No hay refactor del Reproductor.

No hay código de origen: el motor se diseña desde cero. PRISMA **no sustituye** al INVASORES simulado, porque es un juego distinto: la migración es un `INSERT` y la fila `invasores` sigue en el catálogo (con su simulación) para que una spec posterior pueda implementarla, por ejemplo con la variante A. El ranking de PRISMA empieza vacío.

## Alcance

**Dentro:**

- Motor de PRISMA en TypeScript, sin React ni acceso global al DOM, en `lib/prisma/`: tablero de 16 columnas, cañón, cargador de colores, tiro, grupos y descenso de filas, racha, 4 niveles, puntuación y fin de partida.
- Componente de cliente `components/prisma-canvas.tsx` con un canvas de 800×600 lógicos escalado al marco CRT, que crea el motor al montar y lo destruye al desmontarse.
- Elementos propios en el canvas (barra de descenso, línea de invasión, guía de tiro, siguiente color y racha), cartel de nivel y pantallas de fin (`GAME OVER` y `¡INVASIÓN CONTENIDA!`).
- El motor notifica puntuación, nivel y fin de partida al HUD, los botones y el modal de la plataforma. PRISMA no tiene vidas: el HUD muestra «—» en Vidas.
- Todos los botones y pantallas del Reproductor funcionan con el motor: PAUSA/REANUDAR («EN PAUSA»), FIN, SALIR, modal «FIN DEL JUEGO», «GUARDAR PUNTUACIÓN», «JUGAR DE NUEVO» y «VOLVER AL VAULT».
- Dibujo vectorial neón con colores de las variables CSS de `app/globals.css`; invasores como mapas de bits de silueta distinta por color.
- Entrada `prisma` en `GAME_REGISTRY` con `hud: { lives: false, level: true }`.
- Controles de teclado: `←` y `→` mueven el cañón; `Espacio` dispara.
- Migración del catálogo: `INSERT` de `prisma` (título `PRISMA`, PUZZLE, magenta, `sort_order` 9, `plays` 0, ranking vacío).
- Portada `.cover-prisma` en `app/globals.css`.
- Que `←`, `→` y `Espacio` no desplacen la página ni activen el botón enfocado.

**Fuera de alcance (para otras specs):**

- Controles táctiles, de ratón o botones en pantalla.
- Sonido y música (no hay assets de audio).
- Tecla de pausa `P` o `Esc`: la pausa es solo el botón de la plataforma.
- Apuntar con ángulo y rebotes en las paredes, caída de los grupos que quedan sin sostén, bombas y otros potenciadores, y más de 4 niveles.
- Implementar el juego INVASORES simulado (la fila `invasores` no se toca).
- Sembrar un ranking.
- Auth, antitrampas, cambios en el esquema de Supabase más allá de la migración de datos descrita.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Tests automatizados (no hay framework instalado).

## Modelo de datos

No hay datos persistentes nuevos: las puntuaciones se guardan con el `SavedScore` y la clave `av:v1:scores` de la SPEC 01 y con `submitScore` de la SPEC 05, con `gameId: "prisma"`. Se añade el contrato del motor. `GameStats`, `GameHandle` y `GameCanvasProps` ya existen en `lib/game-types.ts` (SPEC 06).

```ts
// lib/prisma/engine.ts
export type InvaderColor = "magenta" | "cyan" | "yellow" | "green" | "orange";
export type PrismaPalette = {
  invaders: Record<InvaderColor, string>; // colores de invasor → variables CSS (ver «Convenciones»)
  cannon: string;  // cañón                            → var(--silver)
  guide: string;   // guía de tiro y línea de invasión → var(--ink-faint)
  bar: string;     // barra de descenso                → var(--blue)
  text: string;    // textos y destello de aviso       → var(--ink)
};
export type PrismaStats = { score: number; level: number }; // sin lives
export type PrismaCallbacks = {
  onStats: (s: PrismaStats) => void;    // solo cuando cambia algún valor
  onGameOver: (s: PrismaStats) => void; // una vez por partida (derrota o victoria)
};
export class PrismaEngine {
  constructor(canvas: HTMLCanvasElement, palette: PrismaPalette, cb: PrismaCallbacks);
  start(): void;   // nueva partida e inicio del bucle requestAnimationFrame
  restart(): void; // nueva partida (nivel 1, puntuación 0, racha 0)
  setPaused(paused: boolean): void;
  finish(): void;  // termina la partida (botón FIN)
  destroy(): void; // cancela el bucle y quita los listeners de teclado
}
```

```ts
// lib/prisma/entities.ts (resumen del contrato; la implementación decide los detalles internos)
export const COLS = 16;
export const CELL = 50;
export const PLAY_ROWS = 10;                  // filas 0 a 9: zona de juego
export type Grid = (InvaderColor | null)[][]; // [fila][columna]; 11 filas (0 a 10): la fila 10 solo se ocupa en el instante de la derrota
export const LEVELS: { colors: InvaderColor[]; rows: number; interval: number }[]; // 4 niveles, ver tabla
export function floodGroup(grid: Grid, row: number, col: number): [number, number][]; // grupo de 4 vecinos del mismo color
export function lowestRow(grid: Grid, col: number): number; // -1 si la columna está vacía
export function makeRow(colors: InvaderColor[], rng: () => number): InvaderColor[]; // el motor pasa Math.random
```

```sql
-- Migración del catálogo (se aplica en la implementación con apply_migration)
insert into public.games (id, title, short, "long", category, cover, color, plays, sort_order)
values (
  'prisma', 'PRISMA',
  'Empareja colores antes de que te invadan.',
  'Mueve el cañón con las flechas y dispara con Espacio un invasor del color del cargador contra la formación que desciende. Si pegas el tiro a un grupo de 3 o más del mismo color, desaparece. Cada pocos segundos baja una fila nueva: encadena aciertos para subir el multiplicador hasta ×4 y supera 4 niveles antes de que la invasión cruce la línea.',
  'PUZZLE', 'cover-prisma', 'magenta', 0, 9
);
```

Convenciones:

- Archivos del motor: `lib/prisma/entities.ts` (constantes, tipos, mapas de bits, tablero y funciones puras de grupo, fila más baja, descenso y generación de fila) y `lib/prisma/engine.ts`. Las entidades no leen el DOM ni dibujan con colores propios. Las funciones que eligen al azar reciben el generador `rng` como parámetro; el motor le pasa `Math.random`.
- Canvas de 800×600 píxeles lógicos, con origen arriba a la izquierda, escalado con CSS al 100 % del `.crt-screen` (ya 4:3). Tablero de `COLS` 16 columnas de `CELL` 50 px; las filas 0 a 9 (de `y` 0 a 500) son la zona de invasores; `y` 500 a 550 es la «línea de invasión»; `y` 550 a 600 es la zona del cañón.
- Valores del juego (diseño propio de esta spec):

| Concepto | Valor |
| -------- | ----- |
| Tablero | 16 columnas × 10 filas de celdas de 50×50; invasor dibujado en un mapa de bits de 11×8 píxeles a 3 px (33×24) centrado en su celda |
| Cañón | 50×35, `y` 555, centro `cx` inicial 400, velocidad 500, `cx` entre 25 y 775; columna de tiro = `floor(cx / 50)` |
| Tiro | invasor de 50×50 que sube a 1200 px/s por la columna del cañón; solo uno en vuelo; no dispara si hay un tiro en vuelo |
| Pegado | el tiro se pega en la primera celda libre bajo el invasor más bajo de la columna (fila 0 si está vacía) cuando su borde superior alcanza el borde inferior de ese invasor |
| Grupo | tras pegar, se busca el grupo de 4 vecinos (arriba, abajo, izquierda, derecha) del mismo color que incluye el invasor pegado; si tiene 3 o más, desaparece entero |
| Fallo | pegar sin formar un grupo de 3 o más: el invasor se queda y la racha vuelve a 0 |
| Cargador | color actual (en la punta del cañón) y color siguiente (a la izquierda, con la etiqueta `SIGUIENTE`); se eligen al azar entre los colores de los invasores más bajos de cada columna con invasores (colores «expuestos»); con el tablero vacío, entre los colores del nivel |
| Puntuación de un grupo | `10 × n × multiplicador`, con `n` = invasores del grupo (incluido el tiro) |
| Multiplicador | `min(4, 1 + floor(racha / 2))`, con `racha` = grupos consecutivos formados antes de este: ×1, ×1, ×2, ×2, ×3, ×3, ×4 en adelante; la racha pasa a 0 con un fallo y se conserva entre niveles |
| Descenso | cada `interval` s toda la formación baja 1 fila y entra una fila nueva de 16 invasores al azar con los colores del nivel en la fila 0; los últimos 1,5 s la barra y la línea parpadean |
| Tablero vacío con reserva | si el tablero queda vacío y aún quedan filas por entrar, entra la siguiente fila al instante y el temporizador se reinicia |
| Niveles | 4: nivel 1 con 3 colores (`magenta`, `cyan`, `yellow`), 8 filas y descenso cada 12 s; nivel 2 con 4 colores (+ `green`), 10 filas y 11 s; nivel 3 con los mismos 4, 12 filas y 10 s; nivel 4 con 5 colores (+ `orange`), 14 filas y 9 s |
| Filas por nivel | las 4 primeras están en el tablero al empezar (filas 0 a 3); el resto (4, 6, 8 y 10) es la reserva que entra con los descensos; 704 invasores iniciales en total (128, 160, 192 y 224) |
| Nivel superado | la reserva está vacía y el tablero está vacío: bonus `200 × nivel`, cartel `NIVEL n` de 1,5 s con todo congelado salvo el cañón y sin poder disparar |
| Fin por derrota | tras pegar y resolver el grupo, o tras un descenso, hay un invasor en la fila 10 o más |
| Fin por victoria | superar el nivel 4: `¡INVASIÓN CONTENIDA!` |
| Explosión de grupo | 150 ms de desvanecido |
| Puntuación máxima | cota teórica sin fallos 44 240 (ver cálculo); tope realista ≈ 20 000 |

- Cálculo de la cota: sin fallos, cada grupo contiene el tiro y al menos 2 invasores del tablero, así que con 704 invasores iniciales hay como máximo 352 grupos y se retiran 704 + 352 = 1056 invasores; con multiplicador ×4 sostenido, 1056 × 10 × 4 = 42 240; más los bonus de nivel 200 + 400 + 600 + 800 = 2000, total 44 240. Un fallo añade un invasor al tablero pero devuelve el multiplicador a ×1, así que no mejora la cota. El multiplicador ×4 exige 6 grupos seguidos sin fallo, y los colores aleatorios hacen realista un tope de unos 20 000.
- Mapeo a la plataforma: `score` = puntuación; `level` = nivel (1 a 4); `lives` ausente (`hud.lives = false`).
- Colores (ningún literal en `lib/prisma/` salvo el fondo `#000`): invasores `magenta` → `--magenta`, `cyan` → `--cyan`, `yellow` → `--yellow`, `green` → `--green`, `orange` → `--orange`; cañón `--silver`; guía y línea de invasión `--ink-faint`; barra de descenso `--blue`; textos y destello `--ink`. Cada color tiene además una **silueta distinta** de mapa de bits (para no depender solo del color). El desvanecido y el oscurecido de las pantallas de fin usan `globalAlpha` y `#000`. El detalle visual lo afina la implementación con `frontend-design` sin cambiar medidas ni reglas.
- Elementos del canvas, durante la partida: barra de descenso de 4 px de alto en `y` 0 que se llena de izquierda a derecha con `interval`; línea de invasión discontinua en `y` 500; guía vertical desde el cañón hasta la celda de pegado, con el contorno de esa celda al 40 % de opacidad (`globalAlpha`) en el color del cargador; `SIGUIENTE` y un invasor pequeño en `x` 16, `y` 560; `RACHA ×m` a la derecha en `y` 575, solo con `m` ≥ 2.
- Textos del canvas: cartel `NIVEL n`; derrota `GAME OVER`; victoria `¡INVASIÓN CONTENIDA!` con letra de 40 px (cabe en 800 px); ambas con `PUNTAJE: n` debajo, sobre el tablero oscurecido y sin ningún texto de reinicio.
- Tiempo: bucle con `requestAnimationFrame` y `dt` en segundos con tope de 0,05 s (el tiro recorre 60 px por fotograma como máximo y el pegado se comprueba por celdas, no por solape). El temporizador de descenso se acumula con `dt`. Al pausar y reanudar se reinicia `lastTime`.
- Aleatoriedad: `Math.random()` solo en `start()`, `restart()`, al empezar cada nivel y dentro del bucle (filas nuevas y cargador), nunca en el constructor ni en el render.
- `onStats` se emite al iniciar y solo cuando cambia `score` o `level`, nunca en cada fotograma.
- Teclado: el motor registra `keydown` y `keyup` en `window` al iniciar y los quita en `destroy()`. Usa `e.code` (`ArrowLeft`, `ArrowRight`, `Space`) y un mapa de teclas mantenidas. `keyup` siempre lo actualiza. `keydown` se ignora si el objetivo es un `<input>` o `<textarea>`, si hay pausa o si la partida terminó. `preventDefault()` en `keydown` y `keyup` de las tres teclas, fuera de campos de texto. Con `←` y `→` pulsadas a la vez, el cañón no se mueve. Al pausar, reanudar y reiniciar se sueltan las teclas mantenidas.
- Estado de partida creado en `start()` y `restart()`.
- El HUD de la plataforma muestra el `level` del motor y «—» en Vidas.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`); para los pasos 5 y 6, la de componentes de cliente (`01-app/02-guides/server-and-client-boundary.md`). Para la interfaz se usa siempre la skill `frontend-design`, con el aspecto de TETRIS y SNAKE como referencia.

1. **Catálogo y portada.** Aplicar con `apply_migration` el `INSERT` de «Modelo de datos» y añadir `.cover-prisma` en el bloque «Cover art generators (pure CSS)» de `app/globals.css`: fondo `linear-gradient(180deg, #1a0030, #0a0a18)`, un racimo de cuadrados de 14 px en `--magenta`, `--cyan`, `--yellow` y `--green` con `drop-shadow` neón (`::after`), y un cañón `▲` en `--silver` con una línea punteada vertical sobre él (`::before`). Verificación: `/juegos/prisma` muestra PRISMA con `plays` 0, su portada y «SIN PUNTUACIONES TODAVÍA» (con la salvedad de la caché), `games` tiene 9 filas con `sort_order` del 1 al 9, `/juegos` y `/salon` lo muestran, y `/juegos/prisma/jugar` muestra la simulación.
2. **Entidades.** Crear `lib/prisma/entities.ts` con las constantes, `LEVELS`, los mapas de bits (una silueta por color), el tablero, `floodGroup`, `lowestRow`, el descenso de la formación y `makeRow`. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
3. **Motor: reglas.** Crear `lib/prisma/engine.ts` con `PrismaEngine`: estado de partida, bucle con tope de `dt`, cañón, cargador, tiro y pegado, grupos y puntuación, racha, descenso temporizado, reserva de filas, niveles, victoria y derrota. Verificación: `tsc` y `lint` pasan.
4. **Motor: dibujo, teclado y callbacks.** Completar el motor con el dibujo (invasores, cañón, tiro, guía, barra, línea de invasión, cargador, racha, cartel y pantallas de fin), el teclado según las convenciones y las llamadas a `onStats` y `onGameOver`. Verificación: `tsc` y `lint` pasan.
5. **Canvas.** Crear `components/prisma-canvas.tsx`: lee la paleta de las variables CSS al montar, crea el motor en un efecto, lo destruye al desmontar y aplica `setPaused`. Verificación: `tsc` y `lint` pasan.
6. **Alta en el Reproductor y ciclo completo.** Añadir la entrada `prisma` a `components/game-registry.ts` (`hud: { lives: false, level: true }`). Verificación: `/juegos/prisma/jugar` es jugable con el teclado, el HUD coincide con el juego, ROCAS, TETRIS, ARKANOID, SNAKE y la simulación no cambian, y se completa jugar → perder → guardar → ver la marca en el ranking de `/juegos/prisma` y en la pestaña PRISMA del Salón.

## Criterios de aceptación

**Base de datos y catálogo**

- [ ] `public.games` contiene `prisma` con `title` `PRISMA`, `category` `PUZZLE`, `color` `magenta`, `cover` `cover-prisma`, `sort_order` 9, `plays` 0, el `short` y el `long` de esta spec.
- [ ] `games` tiene 9 filas y `sort_order` del 1 al 9 sin huecos ni repetidos, y la fila `invasores` sigue intacta (con `plays` 18000 y sus 5 puntuaciones sembradas).
- [ ] Sin puntuaciones, `/juegos/prisma` y la pestaña PRISMA del Salón muestran «SIN PUNTUACIONES TODAVÍA».
- [ ] `/juegos/prisma` y `/juegos/prisma/jugar` responden 200 (con la salvedad de la caché: ver riesgos); `/juegos` y `/salon` muestran PRISMA con su portada.
- [ ] `/` no muestra PRISMA (`sort_order` 9 queda fuera de `games.slice(0, 6)`).
- [ ] `app/globals.css` contiene `.cover-prisma` y no cambia ninguna otra clase `.cover-*`.
- [ ] El texto `long` de PRISMA solo menciona lo que el juego tiene: flechas y Espacio, cargador de color, grupos de 3 o más, filas que descienden, multiplicador hasta ×4 y 4 niveles.

**Rutas y proyecto**

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores, y `npx eslint app components lib` no devuelve errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/prisma/jugar`, `/juegos/rocas/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` ni `/juegos/snake/jugar`.
- [ ] `lib/prisma/` no contiene `document.`, `getElementById`, `localStorage`, `new Image`, `new Audio` ni colores literales salvo el fondo `#000`.
- [ ] `lib/prisma/` no llama a `Math.random()` fuera de `start()`, `restart()`, el inicio de nivel y el bucle.
- [ ] `public/games/prisma/` no existe: el juego no usa assets.

**Registro de juegos**

- [ ] `/juegos/rocas/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` se comportan como antes: HUD, pausa, FIN, modal y guardado.
- [ ] `/juegos/invasores/jugar` conserva la simulación: contiene `.game-arena` y su puntuación sube sola.
- [ ] La puntuación de PRISMA no sube sola: el intervalo de la simulación no se ejecuta para los juegos del registro.
- [ ] En PRISMA el HUD muestra «—» en Vidas y el Nivel con dos dígitos.

**Canvas y partida**

- [ ] El canvas tiene 800×600 píxeles lógicos, ocupa el 100 % de `.crt-screen` y no se deforma.
- [ ] Al empezar: nivel 1 con el cartel `NIVEL 1` durante 1,5 s, 64 invasores (4 filas × 16 columnas, filas 0 a 3) de 3 colores, cañón de 50×35 con `cx` 400 (columna 8), cargador con color actual y siguiente, barra de descenso vacía, línea de invasión en `y` 500; el HUD muestra Puntuación `0` y Nivel `01`.
- [ ] Durante el cartel de nivel nada se mueve salvo el cañón, el temporizador de descenso no avanza y `Espacio` no dispara.
- [ ] `←` y `→` mueven el cañón a 500 px/s sin sacar su centro de `cx` entre 25 y 775.
- [ ] Con `←` y `→` pulsadas a la vez, el cañón no se mueve.
- [ ] `Espacio` dispara el invasor del cargador por la columna `floor(cx / 50)`; mientras haya un tiro en vuelo no sale otro; tras pegarse, el siguiente color pasa a actual y se genera uno nuevo.
- [ ] El color del cargador y del siguiente es siempre el de algún invasor más bajo de una columna con invasores (o de los colores del nivel si el tablero está vacío).
- [ ] La guía muestra la celda donde se pegará el tiro, y el tiro se pega en esa celda: la primera libre bajo el invasor más bajo de la columna, o la fila 0 si la columna está vacía.
- [ ] Un tiro que forma un grupo de 3 invasores del mismo color (4 vecinos) los retira, los desvanece en 150 ms y suma `10 × 3 × multiplicador`.
- [ ] Un grupo de 5 con racha 0 suma 50; con racha 2 (×2) suma 100; con racha 6 o más (×4) suma 200.
- [ ] El multiplicador sigue ×1, ×1, ×2, ×2, ×3, ×3, ×4 en grupos consecutivos y no pasa de ×4.
- [ ] Un tiro que no forma un grupo de 3 o más se queda en el tablero y devuelve la racha a 0; el canvas muestra `RACHA ×m` solo con `m` ≥ 2.
- [ ] Los invasores en diagonal no cuentan como vecinos del grupo.
- [ ] Con el tablero vacío y aún filas en reserva, la siguiente fila entra al instante y la barra de descenso vuelve a 0.
- [ ] En el nivel 1 cada 12 s toda la formación baja 1 fila y entra una fila nueva de 16 invasores en la fila 0 con los 3 colores del nivel; los últimos 1,5 s la barra y la línea de invasión parpadean.
- [ ] Los niveles 1 a 4 tienen 3, 4, 4 y 5 colores, 8, 10, 12 y 14 filas en total, y descenso cada 12, 11, 10 y 9 s; el nivel 4 incluye `orange`.
- [ ] Cada nivel empieza con 4 filas en el tablero y las demás entran como reserva: se entran exactamente `filas - 4` filas con los descensos.
- [ ] Si hay un invasor en la fila 10 o más tras un descenso o tras resolver un tiro, la partida termina; un tiro que se pega en la fila 10 pero completa un grupo de 3 o más y lo retira no termina la partida.
- [ ] Al superar un nivel (reserva y tablero vacíos) se suman `200 × nivel` puntos, aparece el cartel `NIVEL n+1`, el Nivel del HUD sube y la racha se conserva.
- [ ] Al terminar la partida por invasión el canvas muestra el tablero oscurecido, `GAME OVER` y `PUNTAJE: n` sin texto de reinicio, y el teclado deja de mover el cañón.
- [ ] Al superar el nivel 4 termina la partida: el canvas muestra `¡INVASIÓN CONTENIDA!` entero dentro de los 800 px y `PUNTAJE: n`, y se abre el modal con la puntuación final.
- [ ] Los invasores usan `--magenta`, `--cyan`, `--yellow`, `--green` y `--orange`, cada color con una silueta distinta; el cañón usa `--silver`, la barra `--blue` y la guía `--ink-faint`.
- [ ] Pulsar `←`, `→` y `Espacio` durante la partida no desplaza la página.

**HUD y botones de la plataforma**

- [ ] El HUD muestra Jugador («INVITADO»), Puntuación, Vidas («—») y Nivel con dos dígitos, y Puntuación y Nivel coinciden con los valores del juego.
- [ ] Tras formar un grupo de 3 con racha 0, Puntuación pasa a `30`; al superar el nivel 1, Nivel pasa a `02`.
- [ ] «PAUSA» detiene el tiro, el temporizador de descenso, la barra y los desvanecidos, muestra la capa «EN PAUSA» y cambia el botón a «REANUDAR»; reanudar continúa sin que baje una fila de golpe.
- [ ] Una tecla pulsada al pausar y soltada durante la pausa no queda «pegada» al reanudar.
- [ ] Con «PAUSA»/«REANUDAR» recién pulsado, `Espacio` no activa el botón: dispara.
- [ ] «FIN» abre el modal «FIN DEL JUEGO» con la puntuación actual, y el canvas muestra `GAME OVER` y `PUNTAJE: n`.
- [ ] Al terminar la partida por invasión se abre el modal automáticamente con la puntuación final.
- [ ] Con el modal abierto, escribir en el campo de iniciales (incluidas las flechas y el Espacio) no mueve el cañón, no dispara ni reinicia el juego.
- [ ] «GUARDAR PUNTUACIÓN» añade a `av:v1:scores` una entrada `{ gameId: "prisma", name, score, at }`, inserta la fila en `scores` y muestra «PUNTUACIÓN GUARDADA».
- [ ] La puntuación guardada aparece en el ranking de `/juegos/prisma` y en la pestaña PRISMA del Salón, y en «TU MEJOR MARCA»; `games.plays` de `prisma` pasa de 0 a 1.
- [ ] «JUGAR DE NUEVO» cierra el modal y reinicia: nivel 1 con 64 invasores, Puntuación 0, racha 0, Nivel 01 y sin estado de guardado.
- [ ] «SALIR» navega a `/juegos/prisma` y «VOLVER AL VAULT» (modal) a `/juegos`.
- [ ] Tras salir del Reproductor, pulsar las teclas del juego no produce errores en consola ni cambios en la página (bucle y listeners destruidos).
- [ ] Entrar y salir varias veces de `/juegos/prisma/jugar` no acumula bucles: el nivel 1 baja una fila cada 12 s, como en la primera visita.

## Decisiones tomadas y descartadas

- **Sí:** interpretar el tema como «invasión por filas» convertida en puzle: la formación desciende fila a fila contra un cañón horizontal, pero el cañón empareja colores. **No:** otro shooter (es la variante A) ni un clon de Puzzle Bobble con otra piel: aquí no hay ángulo ni rebotes, el cañón dispara siempre en vertical como en el género de los invasores.
- **Sí:** `id` `prisma`, título `PRISMA`, categoría PUZZLE y color magenta. Motivo: el catálogo solo tiene un PUZZLE (TETRIS) y un único juego magenta, y la variante A es SHOOTER green. **No:** SHOOTER ni green (se solaparían con INVASORES y SNAKE).
- **Sí:** migración `INSERT` y no renombrado. Motivo: PRISMA es un juego distinto de INVASORES, así que no se reutiliza su fila. **No:** el patrón de renombrado de las SPEC 07 y 08 ni borrar los 5 seeds de `invasores`: la fila simulada se queda y se puede implementar después con la variante A.
- **Sí:** `sort_order` 9, el siguiente libre (el catálogo tiene del 1 al 8), y `plays` 0 con el ranking vacío. **No:** insertarlo entre los 6 primeros: obligaría a reordenar juegos existentes y PRISMA aún no tiene tracción. Consecuencia aceptada: no aparece en la home, solo en `/juegos` y `/salon`.
- **Sí:** sin sembrar `scores`. Motivo: así `plays` y la tabla empiezan reales y no hay que compensar el trigger `bump_game_plays`.
- **Sí:** portada `.cover-prisma` en CSS puro, distinta de `.cover-invaders` (cuadrados agrupados por color y un cañón con guía, no círculos en rejilla). **No:** reutilizar `cover-invaders` (dos tarjetas casi iguales).
- **Sí:** tablero de 16×10 celdas de 50 px, que llena el ancho del canvas, con el cañón a `y` 555 y una línea de invasión en `y` 500. Margen de 10 filas útiles. **No:** 20×14 de 40 px (invasores demasiado pequeños para distinguir siluetas).
- **Sí:** tiro vertical que se pega bajo el invasor más bajo de la columna y se resuelve por celdas. **No:** ángulos, rebotes en paredes y rejilla hexagonal (más código y más riesgo de colisiones; otra spec).
- **Sí:** grupos de 3 o más con 4 vecinos, y sin caída de los invasores que quedan sin sostén. Motivo: mantiene la lógica en una búsqueda de grupo y un descenso por filas. **No:** conectividad al techo ni cascadas.
- **Sí:** el color del cargador se elige entre los colores «expuestos» (los del invasor más bajo de cada columna). Motivo: una partida nunca se queda sin ningún tiro posible de ese color. **No:** color totalmente aleatorio (generaría tiros sin ninguna opción).
- **Sí:** multiplicador `min(4, 1 + floor(racha / 2))` que premia los aciertos seguidos y se reinicia con un fallo. **No:** puntos que crecen con el nivel (el tope se dispara) ni multiplicador sin techo.
- **Sí:** partida finita de 4 niveles con 704 invasores iniciales y bonus `200 × nivel`; cota teórica 44 240 y tope realista ≈ 20 000. Motivo: duración de 1 a 5 minutos y fin claro. **No:** niveles infinitos.
- **Sí:** descenso por temporizador, cada 12, 11, 10 y 9 s según el nivel, con aviso de 1,5 s (barra y línea parpadean). **No:** descenso por número de tiros (premia no disparar) ni sin aviso.
- **Sí:** que el tablero vacío con reserva haga entrar la siguiente fila al instante, para que despejar rápido no obligue a esperar. **No:** esperar al temporizador.
- **Sí:** un tiro que se pega en la fila 10 pero forma un grupo y se retira no pierde la partida: primero se resuelve el grupo y luego se comprueba la invasión. **No:** perder por el solo hecho de pegar en la fila 10.
- **Sí:** siluetas distintas por color además del color. Motivo: no depender solo del color para jugar. **No:** invasores idénticos tintados.
- **Sí:** sin vidas: `GameStats.lives` ausente y `hud.lives = false`, con «—» en el HUD, como TETRIS y SNAKE. **No:** ocultar el bloque Vidas (cambio de diseño del HUD, fuera de alcance).
- **Sí:** los elementos propios del canvas (barra, línea, guía, siguiente color y racha) están dentro del canvas porque son parte del juego y la plataforma no los muestra. Puntuación y nivel se ven solo en el HUD de la plataforma. **No:** duplicarlos en el canvas.
- **Sí:** teclado con `e.code`: `←`, `→` y `Espacio`, con un mapa de teclas y `keyup` siempre activo. Espacio es tecla del juego, así que `preventDefault` evita que active el botón PAUSA enfocado. **No:** ratón (fuera de alcance).
- **Sí:** sin tecla `P` ni `Esc`, sin tecla de reinicio dentro del juego: el reinicio es solo «JUGAR DE NUEVO», porque el modal tiene un campo de texto donde se escribe con Espacio.
- **Sí:** cartel `NIVEL n` de 1,5 s con el juego congelado salvo el cañón. **No:** espera de pulsación (Espacio es tecla de disparo).
- **Sí:** `finish()` (botón FIN) sigue la misma ruta que perder: `GAME OVER` en el canvas y `onGameOver`. **No:** un fin independiente en React.
- **Sí:** la victoria al superar el nivel 4 es un fin de partida: `onGameOver` con la puntuación final y modal de guardado. **No:** un estado de victoria aparte en React.
- **Sí:** las funciones de `entities.ts` reciben `rng` como parámetro y el motor pasa `Math.random`, solo en `start()`, `restart()`, al empezar nivel y en el bucle. **No:** llamar a `Math.random()` en módulos ni en el constructor.
- **Sí:** tope de `dt` de 0,05 s. **No:** `dt` sin tope: tras una pestaña en segundo plano bajarían varias filas de golpe.
- **Sí:** `onStats` solo al cambiar `score` o `level`. **No:** en cada fotograma.
- **Sí:** el motor ignora `keydown` en `<input>`/`<textarea>`, en pausa y con la partida terminada.
- **Sí:** sin sonido: no hay assets de audio y la plataforma no tiene control de volumen.
- **Sí:** aprovechar el registro de la SPEC 06: solo se añade la entrada `prisma`. **No:** tocar `components/game-player.tsx`.
- **Sí:** el juego simulado de referencia para los criterios es `invasores`, que sigue simulado. **Sí:** la variante A es compatible con esta: ids y `sort_order` distintos.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| `getGames()`/`getGame()` están cacheados (`cacheLife("minutes")`) y `/juegos/prisma` da «no encontrado» un rato tras insertar | Documentado en la verificación del paso 1: esperar a que expire la caché o invalidar la etiqueta `games` (por ejemplo guardando una puntuación) antes de comprobar. |
| `sort_order` 9 deja a PRISMA fuera de la home (`games.slice(0, 6)`) | Aceptado y registrado como decisión; entra por `/juegos` y `/salon`. Reordenar el catálogo va en otra spec. |
| El tablero se llena y el jugador no tiene salida por mala suerte de colores | El cargador solo elige entre colores expuestos, los grupos se retiran al instante y un tiro en la fila 10 que forma grupo no pierde. Los valores de `LEVELS` están en una constante para reajustar. |
| Un nivel resulta demasiado fácil o difícil (intervalos de 12 a 9 s) | Todos los valores están en la tabla y en `LEVELS`; reajustarlos va en otra spec. |
| El grupo de 4 vecinos se calcula mal y borra invasores en diagonal o del color equivocado | Criterio de aceptación de vecinos en diagonal; `floodGroup` es una función pura en `entities.ts`. |
| El tiro se pega en una celda errónea si baja una fila mientras vuela | El pegado se recalcula cada fotograma con el tablero actual (celda libre bajo el invasor más bajo de la columna) y se resuelve por celdas, no por solape de rectángulos. |
| Tras un fotograma largo baja más de una fila de golpe | Tope de `dt` de 0,05 s, un solo descenso por fotograma y reinicio de `lastTime` al reanudar. |
| Los colores solos no bastan para distinguir invasores | Siluetas distintas por color; criterio de aceptación. |
| Tras pulsar PAUSA el botón conserva el foco y `Espacio` lo activa | `preventDefault` de `keydown` y `keyup` en las tres teclas del juego fuera de campos de texto. Criterio de aceptación. |
| Strict Mode monta el efecto dos veces y quedan dos bucles o dos juegos de listeners | `destroy()` cancela `requestAnimationFrame` y quita los listeners; el efecto del wrapper lo llama en su limpieza. Criterio sobre bucles acumulados. |
| Escribir las iniciales del modal mueve el cañón o dispara | El motor ignora `keydown` cuyo objetivo sea `<input>` o `<textarea>` y también con la partida terminada. |
| Una tecla soltada durante la pausa o el modal queda «pegada» | `keyup` actualiza siempre el mapa de teclas y se sueltan las teclas al pausar, reanudar y reiniciar. |
| El simulador y el motor suman puntos a la vez | El Reproductor no arranca el intervalo de la simulación para los juegos del registro. Criterio: la puntuación de PRISMA no sube sola. |
| Una variable CSS no existe y el canvas dibuja con color vacío | Criterio de aceptación de los colores. Todas las variables usadas (`--magenta`, `--cyan`, `--yellow`, `--green`, `--orange`, `--silver`, `--blue`, `--ink`, `--ink-faint`) existen ya en `app/globals.css`. |
| `Math.random()` se ejecuta durante el prerender y causa un aviso de hidratación | Solo se llama en `start()`, `restart()`, al empezar un nivel y dentro del bucle, nunca en el constructor ni en el render. |
| Demasiados renders por emitir estadísticas en cada fotograma | `onStats` solo se llama al cambiar `score` o `level`. |
| La política `scores_insert_public` abierta permite puntuaciones falsas (riesgo aceptado en la SPEC 05) | Antitrampas y Auth van en otra spec. |

## Lo que **no** entra en esta spec

- Controles táctiles, de ratón o botones en pantalla.
- Sonido y música.
- Tecla `P` o `Esc` de pausa.
- Apuntar con ángulo, rebotes, caída de grupos sin sostén, potenciadores y más de 4 niveles.
- Implementar el juego INVASORES simulado: la fila `invasores` no se toca.
- Rankings sembrados, Auth, antitrampas o cambios de esquema en Supabase.
- Alta densidad de píxeles, `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
