# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

**Arcade Vault** es una plataforma para jugar online y competir por la mayor cantidad de puntos (ver `README.md`). Catálogo de 8 juegos, Reproductor con marco CRT, Salón de la Fama y rankings por juego guardados en Supabase. No hay Auth todavía (el jugador es «INVITADO» y teclea sus iniciales al guardar) ni página «Acerca de».

Estado de los juegos: **4 tienen motor real** (ROCAS, TETRIS, ARKANOID, SNAKE, registrados en `components/game-registry.ts`); los otros 4 del catálogo siguen con la **simulación** del Reproductor (la puntuación sube sola sobre `.game-arena`).

Conversación y mensajes de commit en español.

## Spec Driven Design

El proyecto sigue **Spec Driven Design** con las skills `/spec` y `/spec-impl` de `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`, fijadas en `skills-lock.json`) más una skill propia, `/spec-juego`.

- Specs numeradas en `specs/NN-slug.md`; cada una tiene cabecera `Estado` (Borrador/Aprobado/Implementado), `Depende de`, `Fecha` y `Objetivo`. Se **commitea primero la spec** y luego la implementación en una rama `spec-NN-slug` (`specs/.spec-config.yml` → `AutoCreateBranch: true`, `/spec-impl` crea la rama sin preguntar). Cada spec entra a `main` mediante un PR.
- Specs existentes: 01 pantallas MVP visual · 02 home landing · 03 integración Supabase · 04 juego ROCAS · 05 tabla de juegos y leaderboard · 06 juego TETRIS · 07 juego ARKANOID · 08 juego SNAKE. La siguiente es la 09. Al terminar una spec, pasa su estado a «Implementado».
- Los commits recientes usan el prefijo `feat:` en inglés (p. ej. `feat: add Snake game …`); los anteriores usaban frases en español. Sigue el estilo de los commits más recientes.

## Skills

- **`/frontend-design`** — úsala **siempre** para diseñar o modificar la interfaz de usuario (el estilo es neón/CRT retro; los tokens y clases viven en `app/globals.css`).
- **`/spec`** y **`/spec-impl`** — escribir e implementar specs. Viven en `.agents/skills/` y `.claude/skills/spec*` son symlinks a esa carpeta (si el symlink no se resuelve en Windows, lee `.agents/skills/…`).
- **`/spec-juego <ruta en references/started-games | nombre o idea>`** — genera la spec (`specs/NN-juego-<slug>.md`) para añadir o portar un juego con su leaderboard. Solo escribe la spec (no código ni migraciones); la implementación la hace luego `/spec-impl`. Tiene `disable-model-invocation`, así que solo se ejecuta si el usuario la invoca. Contiene `contrato-integracion.md` (reglas del motor, teclado, callbacks, registro, catálogo y criterios de aceptación), `guia-port.md` y `plantilla-spec-juego.md` en `.claude/skills/spec-juego/`. Léelos antes de tocar un juego.

## Agentes

- **`game-planner`** (`.claude/agents/game-planner.md`) — planifica y decide qué juego encaja a continuación en la plataforma. Cruza `JUEGOS.md`, las specs, `components/game-registry.ts`, el contrato de integración y el catálogo en vivo de Supabase (solo `select`), evalúa candidatos (los 4 juegos del catálogo aún simulados e ideas nuevas) y recomienda uno con su justificación, esfuerzo y riesgos. Úsalo **antes** de `/spec-juego`: él decide *qué* juego, la skill escribe la spec. No escribe specs, código ni migraciones.
  - **Memoria persistente** (`memory: project`): guarda en `.claude/agent-memory/game-planner/` un registro de sugerencias (`historial-sugerencias.md`, con veredicto y estado: Sugerido → Aceptado → Especificado → Implementado, o Rechazado) y las preferencias del usuario en `MEMORY.md`. No repite juegos ya sugeridos y reconcilia el estado real con `specs/`, el registro y la BD. Ese directorio se versiona con el repo; commitéalo con tu trabajo.
  - Invócalo pidiéndolo por su nombre («usa game-planner para decidir el siguiente juego»). Si le rechazas una sugerencia, dile el motivo para que lo registre.

## Commands

- `npm run dev` / `npm run build` / `npm run start` / `npm run lint` (eslint 9, `eslint-config-next`).
- Verificación de tipos: `npx tsc --noEmit` (necesita que exista `.next/types`; ejecuta `next dev` o `next build` antes si falta `LayoutProps`). Los criterios de aceptación de las specs piden `npx tsc --noEmit`, `npm run build` y `npx eslint app components lib` sin errores.
- No hay framework de tests: se verifica con lo anterior y manualmente en el navegador.

## Stack and non-obvious configuration

- **Next.js 16.4.6 + React 19.3 + Tailwind CSS 4.3**, App Router en `app/`, TypeScript `strict`, alias `@/*` → raíz del repo.
- **This is not the Next.js from your training data.** Antes de escribir código Next, lee la guía correspondiente en `node_modules/next/dist/docs/` (`01-getting-started`, `02-guides`, `03-api-reference`). `AGENTS.md` lo gestiona `next dev` (incluye el bloque de «Report Next.js feedback»); déjalo en su sitio y commitéalo con tu trabajo.
- `next.config.ts` activa `cacheComponents`, `partialPrefetching` y `experimental.agentFeedback`. Con `cacheComponents` el acceso a datos dinámicos y el cacheo son opt-in: las lecturas usan `"use cache"` + `cacheLife("minutes")` + `cacheTag(...)`.
- Tailwind se conecta mediante una **regla de Turbopack** (loader `@tailwindcss/turbopack` sobre `*.css`), no hay `postcss.config`. Los tokens están en `app/globals.css` (`@theme inline`, colores `--cyan`, `--magenta`, `--yellow`, `--green`). Fuentes en `app/layout.tsx`: Press Start 2P, JetBrains Mono y Courier Prime.
- `app/layout.tsx` usa el tipo global `LayoutProps<"/">` generado por el typegen de Next.
- `.gitignore` excluye `.env*`, `next-env.d.ts` y el contenido de `.playwright-mcp/` y `.playwright-screenshots/` (solo se versionan sus `.gitkeep`).

## Architecture

### Rutas (`app/`)

| Ruta | Contenido |
| ---- | --------- |
| `/` | Home (landing): `components/home.tsx`, datos mock en `lib/home.ts`. Muestra `games.slice(0, 6)`: un juego con `sort_order` ≥ 7 no aparece en la home. |
| `/juegos` | Biblioteca con filtro por categoría (`components/library.tsx`). |
| `/juegos/[id]` | Detalle del juego + ranking. `generateStaticParams` sale de la BD. |
| `/juegos/[id]/jugar` | Reproductor (`components/game-player.tsx`). |
| `/salon` | Salón de la Fama. |

### Supabase

- Proyecto conectado por MCP (`.mcp.json`, servidor `supabase`, habilitado en `.claude/settings.local.json`). Variables en `.env` (plantilla en `.env.template`): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `lib/supabase/env.ts` las lee con acceso literal (necesario para que Next las sustituya en build).
- Clientes: `lib/supabase/client.ts` (navegador, expuesto vía `SupabaseProvider`/`useSupabase`), `server.ts` (con cookies, para acciones) y `public.ts` (sin cookies, obligatorio dentro de `"use cache"`). Tipos generados en `lib/supabase/database.types.ts`; regénéralos solo si cambia el esquema.
- Tablas: `games` (catálogo; `sort_order` único, CHECK en `category` y `color`), `scores` (`player_name` 1–10 caracteres, `score >= 0`) y la vista `games_catalog` (`games` + `best = MAX(score)`). El trigger `bump_game_plays()` suma 1 a `plays` por cada fila insertada en `scores`. RLS: lectura pública e inserción pública en `scores`. No hay carpeta `supabase/`: los cambios de esquema/datos se aplican con `apply_migration` del MCP.
- Capa de lectura: `lib/data/games.ts` (`getGames`, `getGame`, etiqueta `games`) y `lib/data/scores.ts` (`getTopScores`, etiqueta `scores:<gameId>`; devuelve `null` si falla para mostrar estado de error). Escritura: `lib/actions/scores.ts` (`submitScore`, server action que invalida las etiquetas con `updateTag`). Un juego recién insertado puede dar «no encontrado» hasta que expire la caché o se invalide `games`.
- Guardado de puntuaciones: `ScoresProvider` (`components/scores-provider.tsx`) escribe siempre en `localStorage` (`av:v1:scores`, `lib/storage.ts`, fuente de «TU MEJOR MARCA») y además en Supabase; si falla la acción, el modal indica «GUARDADA SOLO EN ESTE DISPOSITIVO». No hay sincronización posterior.

### Juegos y registro

Un juego con motor real consta de: `lib/<id>/entities.ts` + `lib/<id>/engine.ts` (clase `XEngine`, sin React ni acceso global al DOM, paleta inyectada), `components/<id>-canvas.tsx` (wrapper `"use client"`), una entrada en `GAME_REGISTRY` (`components/game-registry.ts`, indica qué muestra el HUD: `{ lives, level }`), una fila en `public.games` y la clase `.cover-<id>` en `app/globals.css`. El contrato común está en `lib/game-types.ts` (`GameStats`, `GameHandle`, `GameCanvasProps`).

| Juego | id | Motor | Origen |
| ----- | -- | ----- | ------ |
| ROCAS (Asteroids) | `rocas` | `lib/asteroids/` | portado de `references/started-games/02-asteroids/` |
| TETRIS | `tetris` | `lib/tetris/` | portado de `03-tetris/` (sin vidas) |
| ARKANOID | `arkanoid` | `lib/arkanoid/` | portado de `04-arkanoid/` (5 niveles, sonidos y sprites en `public/games/arkanoid/`) |
| SNAKE | `snake` | `lib/snake/` | creado desde cero con sprites de frutas (`references/source-assets/`, `public/games/snake/`; sin vidas) |

Reglas que no se deben romper (detalle en `.claude/skills/spec-juego/contrato-integracion.md`): sin `document.`/`getElementById` ni colores literales (salvo fondo `#000`) en `lib/<id>/`; `Math.random()` y el estado de partida se crean en `start()`/`restart()`, nunca en el constructor; teclado en `window` con `preventDefault` solo en las teclas del juego y sin tecla de reinicio dentro del juego; `onStats` solo cuando cambia un valor y `onGameOver` una vez por partida; el motor se destruye en el cleanup del efecto. Un juego sin vidas/nivel muestra «—» en el HUD.

Renombrado de juegos mock: al implementar un juego real se renombra su equivalente mock (CAÍDA→TETRIS, BLOQUE BUSTER→ARKANOID, SERPENTINA→SNAKE). Como `scores.game_id` referencia `games.id` sin `ON UPDATE CASCADE`, **no se hace `UPDATE` del `id`**: se inserta la fila nueva, se borra la antigua y se reajusta `sort_order` en una transacción conservando `plays`.

### Otras carpetas

- `references/` — material de origen: `templates/` (prototipo visual en React por CDN), `started-games/` (juegos originales en JS global) y `source-assets/`. Solo lectura; no forma parte de la app.
- `public/games/<id>/` — assets estáticos de cada juego.

## Repository layout note

Este directorio es una subcarpeta de un repo git mayor (`cursostomados`, colección de materiales educativos). El `CLAUDE.md` un nivel arriba (`../../CLAUDE.md`) describe ese repo; trata este archivo como la guía solo de `arcade-vault/`.
