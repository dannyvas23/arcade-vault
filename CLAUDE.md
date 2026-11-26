# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

**Arcade Vault** es una plataforma para jugar online y competir por la mayor cantidad de puntos (ver `README.md`). Catálogo de 8 juegos, Reproductor con marco CRT, Salón de la Fama y rankings por juego guardados en Supabase. Hay **Auth con Supabase** (registro, login con email, Google y GitHub, recuperación de contraseña; SPEC 10), pero las puntuaciones **aún no se vinculan al usuario**: el jugador sigue siendo «INVITADO» y teclea sus iniciales al guardar, con o sin sesión. No hay página «Acerca de».

Estado de los juegos: **5 tienen motor real** (ROCAS, TETRIS, ARKANOID, SNAKE, INVADERS, registrados en `components/game-registry.ts`); los otros 3 del catálogo (GLOTÓN, RANARIA, DUELO PIXEL) siguen con la **simulación** del Reproductor (la puntuación sube sola sobre `.game-arena`).

Conversación y mensajes de commit en español.

## Spec Driven Design

El proyecto sigue **Spec Driven Design** con las skills `/spec` y `/spec-impl` de `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`, fijadas en `skills-lock.json`) más una skill propia, `/spec-juego`.

- Specs numeradas en `specs/NN-slug.md`; cada una tiene cabecera `Estado` (Borrador/Aprobado/Implementado), `Depende de`, `Fecha` y `Objetivo`. Se **commitea primero la spec** y luego la implementación en una rama `spec-NN-slug` (`specs/.spec-config.yml` → `AutoCreateBranch: true`, `/spec-impl` crea la rama sin preguntar). Cada spec entra a `main` mediante un PR.
- Specs existentes: 01 pantallas MVP visual · 02 home landing · 03 integración Supabase · 04 juego ROCAS · 05 tabla de juegos y leaderboard · 06 juego TETRIS · 07 juego ARKANOID · 08 juego SNAKE · 09 juego INVADERS (salió de la game jam «invasores», variante A; la variante B `prisma` quedó «Rechazada» en `specs/game-jam/invasores/`) · 10 auth: registro, login y recuperación con Supabase Auth. La siguiente es la 11 (la lógica natural es vincular `scores` al usuario). Al terminar una spec, pasa su estado a «Implementado».
- Los commits recientes usan el prefijo `feat:` en inglés (p. ej. `feat: add Snake game …`); los anteriores usaban frases en español. Sigue el estilo de los commits más recientes.

## Skills

- **`/frontend-design`** — úsala **siempre** para diseñar o modificar la interfaz de usuario (el estilo es neón/CRT retro; los tokens y clases viven en `app/globals.css`).
- **`/spec`** y **`/spec-impl`** — escribir e implementar specs. Viven en `.agents/skills/` y `.claude/skills/spec*` son symlinks a esa carpeta (si el symlink no se resuelve en Windows, lee `.agents/skills/…`).
- **`/spec-juego <ruta en references/started-games | nombre o idea>`** — genera la spec (`specs/NN-juego-<slug>.md`) para añadir o portar un juego con su leaderboard. Solo escribe la spec (no código ni migraciones); la implementación la hace luego `/spec-impl`. Tiene `disable-model-invocation`, así que solo se ejecuta si el usuario la invoca. Contiene `contrato-integracion.md` (reglas del motor, teclado, callbacks, registro, catálogo y criterios de aceptación), `guia-port.md` y `plantilla-spec-juego.md` en `.claude/skills/spec-juego/`. Léelos antes de tocar un juego.

## Agentes

- **`game-planner`** (`.claude/agents/game-planner.md`) — planifica y decide qué juego encaja a continuación en la plataforma. Cruza `JUEGOS.md`, las specs, `components/game-registry.ts`, el contrato de integración y el catálogo en vivo de Supabase (solo `select`), evalúa candidatos (los 3 juegos del catálogo aún simulados e ideas nuevas) y recomienda uno con su justificación, esfuerzo y riesgos. Úsalo **antes** de `/spec-juego`: él decide *qué* juego, la skill escribe la spec. No escribe specs, código ni migraciones.
  - **Memoria persistente** (`memory: project`): guarda en `.claude/agent-memory/game-planner/` un registro de sugerencias (`historial-sugerencias.md`, con veredicto y estado: Sugerido → Aceptado → Especificado → Implementado, o Rechazado) y las preferencias del usuario en `MEMORY.md`. No repite juegos ya sugeridos y reconcilia el estado real con `specs/`, el registro y la BD. Ese directorio se versiona con el repo; commitéalo con tu trabajo.
  - Invócalo pidiéndolo por su nombre («usa game-planner para decidir el siguiente juego»). Si le rechazas una sugerencia, dile el motivo para que lo registre.
- **`game-jam`** (`.claude/agents/game-jam.md`) — agente de game jam: le das un **tema** y, **sin hacer preguntas**, genera **2 specs completas** de 2 juegos distintos que lo interpretan, en `specs/game-jam/<tema-slug>/variante-a-<id>.md` y `variante-b-<id>.md`, con el formato y nivel de detalle de las SPEC 07 y 08. Las deja en `Borrador` para que las revises: eliges una variante, la mueves a `specs/NN-juego-<slug>.md` con su número definitivo, la pasas a `Aprobado` y lanzas `/spec-impl`. Solo escribe dentro de `specs/game-jam/` (Supabase solo `select`); no escribe código, CSS ni migraciones. Invócalo por su nombre («usa game-jam con el tema "espacio"»).

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
| `/` | Home (landing): `components/home.tsx`, datos mock en `lib/home.ts`. Muestra `games.slice(0, 6)`: un juego con `sort_order` ≥ 7 no aparece en la home. `RECENT_SCORES` (actividad reciente) existe en `lib/home.ts` pero ningún componente lo muestra. |
| `/juegos` | Biblioteca con filtro por categoría (`components/library.tsx`). |
| `/juegos/[id]` | Detalle del juego + ranking. `generateStaticParams` sale de la BD. |
| `/juegos/[id]/jugar` | Reproductor (`components/game-player.tsx`). |
| `/salon` | Salón de la Fama. |
| `/registro`, `/login`, `/recuperar` | Pantallas de acceso (formularios en `components/{register,login,recover}-form.tsx`). Con sesión, `proxy.ts` las redirige a `/`. |
| `/restablecer` | Fijar la contraseña nueva. Solo con la sesión de recuperación; sin sesión `proxy.ts` redirige a `/recuperar`. |
| `/auth/confirm`, `/auth/recovery`, `/auth/callback` | Route handlers `GET` que intercambian el `code` por sesión (alta por email, recuperación y OAuth) y redirigen; los fallos van a `/login?error=<codigo>`. |

### Supabase

- Proyecto conectado por MCP (`.mcp.json`, servidor `supabase`, habilitado en `.claude/settings.local.json`). Variables en `.env` (plantilla en `.env.template`): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `lib/supabase/env.ts` las lee con acceso literal (necesario para que Next las sustituya en build).
- Clientes: `lib/supabase/client.ts` (navegador, expuesto vía `SupabaseProvider`/`useSupabase`), `server.ts` (con cookies, para acciones) y `public.ts` (sin cookies, obligatorio dentro de `"use cache"`). Tipos generados en `lib/supabase/database.types.ts`; regénéralos solo si cambia el esquema.
- Tablas: `games` (catálogo; `sort_order` único, CHECK en `category` y `color`), `scores` (`player_name` 1–10 caracteres, `score >= 0`) y la vista `games_catalog` (`games` + `best = MAX(score)`). El trigger `bump_game_plays()` suma 1 a `plays` por cada fila insertada en `scores`. RLS: lectura pública e inserción pública en `scores`. No hay carpeta `supabase/`: los cambios de esquema/datos se aplican con `apply_migration` del MCP.
- Capa de lectura: `lib/data/games.ts` (`getGames`, `getGame`, etiqueta `games`) y `lib/data/scores.ts` (`getTopScores`, etiqueta `scores:<gameId>`; devuelve `null` si falla para mostrar estado de error). Escritura: `lib/actions/scores.ts` (`submitScore`, server action que invalida las etiquetas con `updateTag`). Un juego recién insertado puede dar «no encontrado» hasta que expire la caché o se invalide `games`.
- Guardado de puntuaciones: `ScoresProvider` (`components/scores-provider.tsx`) escribe siempre en `localStorage` (`av:v1:scores`, `lib/storage.ts`, fuente de «TU MEJOR MARCA») y además en Supabase; si falla la acción, el modal indica «GUARDADA SOLO EN ESTE DISPOSITIVO». No hay sincronización posterior. Ni este flujo ni `submitScore` conocen al usuario con sesión.
- **Auth (SPEC 10):** Supabase Auth con email y contraseña, Google y GitHub; «Confirm email» activado y plantillas de correo **por defecto** (editarlas exige SMTP propio), por eso los enlaces usan el flujo **PKCE** (`code` + `exchangeCodeForSession`) y solo valen en el navegador donde se pidieron. No hay tablas nuevas: el nombre del jugador vive en `user_metadata.player_name`.
  - `proxy.ts` (raíz; en Next 16 `middleware` se llama `proxy`) + `lib/supabase/proxy.ts`: refresca la sesión con `getClaims()` (nunca `getSession()` para decidir acceso) y solo redirige las pantallas de acceso; la plataforma sigue abierta a invitados.
  - Las acciones de `lib/actions/auth.ts` (`signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`, `signInWithProvider`) corren en el servidor: las cookies de sesión y el verificador PKCE se escriben ahí. La validación del servidor (`lib/auth/validation.ts`) es la que manda. Los errores de enlace viajan como códigos cerrados (`?error=`, `lib/auth/messages.ts`); nunca se pinta texto recibido por URL.
  - `components/auth-provider.tsx` (`useAuth()`, `useAuthSync()`) solo pinta la interfaz (nav: `ACCEDER` o nombre + `SALIR`): ninguna decisión de acceso se toma con él. Como las acciones de servidor redirigen sin recargar, el provider relee la sesión al cambiar la ruta y al terminar `SALIR`. `app/layout.tsx` no lee `cookies()`, para que el resto de rutas siga prerenderizándose.
  - `getPlayerName(user)` (`lib/auth/player-name.ts`) devuelve el nombre a mostrar: `player_name`, o el del proveedor OAuth, o la parte local del email, saneado a `[A-Z0-9 _-]` y 10 caracteres. `user_metadata` lo puede editar el propio usuario: no usarlo en reglas de acceso ni RLS.
  - Configuración manual (el MCP no puede hacerla): Site URL, Redirect URLs (`/auth/confirm`, `/auth/recovery`, `/auth/callback`), «Confirm email» y los proveedores OAuth, en el panel de Supabase (ver `README.md`). El SMTP por defecto de Supabase solo entrega a direcciones del equipo y con pocos envíos por hora: para abrir la plataforma hace falta SMTP propio. No hay variables de entorno nuevas.

### Juegos y registro

Un juego con motor real consta de: `lib/<id>/entities.ts` + `lib/<id>/engine.ts` (clase `XEngine`, sin React ni acceso global al DOM, paleta inyectada), `components/<id>-canvas.tsx` (wrapper `"use client"`), una entrada en `GAME_REGISTRY` (`components/game-registry.ts`, indica qué muestra el HUD: `{ lives, level }`), una fila en `public.games` y la clase `.cover-<id>` en `app/globals.css`. El contrato común está en `lib/game-types.ts` (`GameStats`, `GameHandle`, `GameCanvasProps`).

| Juego | id | Motor | Origen |
| ----- | -- | ----- | ------ |
| ROCAS (Asteroids) | `rocas` | `lib/asteroids/` | portado de `references/started-games/02-asteroids/` |
| TETRIS | `tetris` | `lib/tetris/` | portado de `03-tetris/` (sin vidas) |
| ARKANOID | `arkanoid` | `lib/arkanoid/` | portado de `04-arkanoid/` (5 niveles, sonidos y sprites en `public/games/arkanoid/`) |
| SNAKE | `snake` | `lib/snake/` | creado desde cero con sprites de frutas (`references/source-assets/`, `public/games/snake/`; sin vidas) |
| INVADERS | `invaders` | `lib/invaders/` | creado desde cero (sin código de origen): mapas de bits propios dibujados con rectángulos, 4 oleadas, escudos destruibles y nave nodriza; sin assets (`public/games/invaders/` no existe) |

Reglas que no se deben romper (detalle en `.claude/skills/spec-juego/contrato-integracion.md`): sin `document.`/`getElementById` ni colores literales (salvo fondo `#000`) en `lib/<id>/`; `Math.random()` y el estado de partida se crean en `start()`/`restart()`, nunca en el constructor; teclado en `window` con `preventDefault` solo en las teclas del juego y sin tecla de reinicio dentro del juego; `onStats` solo cuando cambia un valor y `onGameOver` una vez por partida; el motor se destruye en el cleanup del efecto. Un juego sin vidas/nivel muestra «—» en el HUD.

Renombrado de juegos mock: al implementar un juego real se renombra su equivalente mock (CAÍDA→TETRIS, BLOQUE BUSTER→ARKANOID, SERPENTINA→SNAKE, INVASORES→INVADERS; en este último, y en SNAKE, se borraron también los seeds de la fila antigua por la cascada porque sus marcas eran inalcanzables a escala real). Como `scores.game_id` referencia `games.id` sin `ON UPDATE CASCADE`, **no se hace `UPDATE` del `id`**: se inserta la fila nueva, se borra la antigua y se reajusta `sort_order` en una transacción conservando `plays`.

### Otras carpetas

- `references/` — material de origen: `templates/` (prototipo visual en React por CDN), `started-games/` (juegos originales en JS global) y `source-assets/`. Solo lectura; no forma parte de la app.
- `public/games/<id>/` — assets estáticos de cada juego.

## Repository layout note

Este directorio es una subcarpeta de un repo git mayor (`cursostomados`, colección de materiales educativos). El `CLAUDE.md` un nivel arriba (`../../CLAUDE.md`) describe ese repo; trata este archivo como la guía solo de `arcade-vault/`.
