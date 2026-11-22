# Juegos de Arcade Vault

Catálogo de juegos, tomado de la tabla `public.games` de Supabase (consulta del 2026-11-21) y contrastado con `components/game-registry.ts`.

El catálogo tiene **8 juegos**. **4 están implementados** con motor real y son jugables en `/juegos/<id>/jugar`; los otros 4 figuran en el catálogo, pero su Reproductor sigue siendo una simulación (la puntuación sube sola).

## Resumen

| # | Juego | id | Categoría | Color | Estado | Spec | Mejor marca | Partidas |
| - | ----- | -- | --------- | ----- | ------ | ---- | ----------- | -------- |
| 1 | ARKANOID | `arkanoid` | ARCADE | cyan | Implementado | [07](specs/07-juego-arkanoid.md) | — | 12.400 |
| 2 | TETRIS | `tetris` | PUZZLE | magenta | Implementado | [06](specs/06-juego-tetris.md) | 216.195 | 31.802 |
| 3 | SNAKE | `snake` | ARCADE | green | Implementado | [08](specs/08-juego-snake.md) | — | 9.100 |
| 6 | ROCAS | `rocas` | SHOOTER | yellow | Implementado | [04](specs/04-juego-rocas.md) | 250.697 | 15.601 |
| 4 | GLOTÓN | `gloton` | ARCADE | yellow | Solo catálogo (simulación) | — | 284.119 | 27.200 |
| 5 | INVASORES | `invasores` | SHOOTER | green | Solo catálogo (simulación) | — | 207.301 | 18.000 |
| 7 | RANARIA | `ranaria` | ARCADE | green | Solo catálogo (simulación) | — | 257.993 | 6.400 |
| 8 | DUELO PIXEL | `duelo-pixel` | VERSUS | cyan | Solo catálogo (simulación) | — | 261.021 | 4.200 |

La primera columna es el `sort_order` en la base de datos. «Mejor marca» sale de la vista `games_catalog` (`MAX(score)`); «—» significa que todavía no hay puntuaciones guardadas. Las marcas de los juegos «solo catálogo» son datos sembrados, no partidas reales.

## Juegos implementados

### ARKANOID — `arkanoid`

- **Categoría / color / portada:** ARCADE · cyan · `cover-bricks`
- **Resumen:** Rebota la pelota y destruye muros de neón.
- **Descripción:** Mueve la pala con las flechas y rebota la pelota para romper todos los bloques de cada nivel. Tienes 3 vidas y 5 niveles con patrones distintos, y la pelota gana un 10 % de velocidad en cada uno. Cada bloque suma 10 puntos.
- **Motor:** `lib/arkanoid/` · `components/arkanoid-canvas.tsx` · assets en `public/games/arkanoid/`
- **HUD:** vidas y nivel
- **Origen:** portado de `references/started-games/04-arkanoid/` (SPEC 07)

### TETRIS — `tetris`

- **Categoría / color / portada:** PUZZLE · magenta · `cover-tetro`
- **Resumen:** Encaja las piezas antes de que el techo te aplaste.
- **Descripción:** Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.
- **Motor:** `lib/tetris/` · `components/tetris-canvas.tsx`
- **HUD:** nivel (sin vidas)
- **Origen:** portado de `references/started-games/03-tetris/` (SPEC 06)

### SNAKE — `snake`

- **Categoría / color / portada:** ARCADE · green · `cover-snake`
- **Resumen:** Crece sin morder tu propia cola.
- **Descripción:** Guía la serpiente con las flechas o con W A S D y come las frutas que aparecen en el tablero. Cada fruta suma 10 puntos y alarga la serpiente, y cada 5 frutas subes de nivel y ella se acelera. Chocar con el borde o con tu propia cola termina la partida.
- **Motor:** `lib/snake/` · `components/snake-canvas.tsx` · sprites en `public/games/snake/`
- **HUD:** nivel (sin vidas)
- **Origen:** creado desde cero con los sprites de `references/source-assets/` (SPEC 08)

### ROCAS — `rocas`

- **Categoría / color / portada:** SHOOTER · yellow · `cover-rocas`
- **Resumen:** Pulveriza asteroides en gravedad cero.
- **Descripción:** Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños, recoge el disparo triple y sobrevive nivel tras nivel con solo tres vidas.
- **Motor:** `lib/asteroids/` · `components/asteroids-canvas.tsx`
- **HUD:** vidas y nivel
- **Origen:** portado de `references/started-games/02-asteroids/` (SPEC 04)

## Pendientes de implementar (solo catálogo)

Están en la base de datos con su ficha, portada y ranking sembrado, pero no tienen motor ni entrada en `GAME_REGISTRY`; `/juegos/<id>/jugar` muestra la simulación del Reproductor.

| Juego | id | Categoría | Resumen |
| ----- | -- | --------- | ------- |
| GLOTÓN | `gloton` | ARCADE | Devora puntos y escapa de los fantasmas. |
| INVASORES | `invasores` | SHOOTER | Defiende el planeta de filas alienígenas. |
| RANARIA | `ranaria` | ARCADE | Cruza la autopista de pixeles. |
| DUELO PIXEL | `duelo-pixel` | VERSUS | Dos paletas. Una pelota. Reflejos máximos. |

Para implementar cualquiera de ellos: `/spec-juego <nombre o idea>` genera la spec y después `/spec-impl` la implementa.
