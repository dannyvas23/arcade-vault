# SPEC 05 — Tabla de juegos y leaderboard en Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (catálogo, Salón, `ScoresProvider`, Reproductor), SPEC 03 (clientes de Supabase)
> **Fecha:** 2026-11-16
> **Objetivo:** Crear en Supabase las tablas `games` y `scores`, sembradas con el catálogo y los rankings mock actuales, y conectar el catálogo, los rankings y el guardado de puntuaciones a ellas, con `localStorage` como respaldo del guardado.

---

## Por qué existe esta spec

Hoy el catálogo vive en `lib/games.ts` (8 juegos, `best` y `plays` inventados) y los rankings son deterministas y falsos (`seededScores` en `lib/scores.ts`). Las marcas del jugador solo existen en su navegador (`localStorage`, SPEC 01). La SPEC 03 dejó Supabase conectado pero con 0 tablas.

Esta spec es la primera que **usa** Supabase: la base de datos pasa a ser la fuente de verdad del catálogo y de los rankings, y «GUARDAR PUNTUACIÓN» escribe en ella. Es un híbrido a propósito: sin Auth no hay identidad de jugador, así que `localStorage` se mantiene para «TU MEJOR MARCA» y como respaldo si falla el guardado remoto. Cuando exista Auth (otra spec), esa marca personal pasará también a Supabase.

El alcance es amplio pero cohesivo (esquema → lectura → escritura). El plan lo divide en pasos commiteables por separado; el paso 4 (catálogo) puede separarse en una spec propia si se prefiere.

## Alcance

**Dentro:**

- Tabla `games` con el catálogo (id/slug, título, textos, categoría, `cover`, `color`, orden y contador `plays`), sembrada con los 8 juegos de `lib/games.ts`.
- Tabla `scores` con las puntuaciones (juego, nombre, puntuación, fecha), sembrada con 5 filas por juego a partir del mock actual.
- **RLS activo** en `games` y `scores` con políticas mínimas: lectura pública de ambas e inserción pública en `scores`; sin políticas de `update` ni `delete`.
- Vista `games_catalog` que añade `best` (`MAX(score)` por juego) a las columnas de `games`.
- Trigger `security definer` que suma 1 a `games.plays` por cada fila insertada en `scores` (necesario porque `anon` no tiene política de `update` sobre `games`).
- Migraciones aplicadas con el MCP de Supabase (`apply_migration`) y tipos generados en `lib/supabase/database.types.ts`.
- Cliente de Supabase sin cookies, `lib/supabase/public.ts`, para lecturas cacheadas de datos públicos.
- Capa de lectura en `lib/data/games.ts` y `lib/data/scores.ts`, cacheada con Cache Components y etiquetas.
- Catálogo desde la BD en `/`, `/juegos`, `/juegos/[id]`, `/juegos/[id]/jugar` y `/salon`; `generateStaticParams` lee los slugs de la BD.
- Rankings reales (Top 10 en el detalle del juego, Top 12 en el Salón de la Fama) con estado vacío y estado de error.
- Server Action `submitScore` (`lib/actions/scores.ts`) que valida e inserta con el cliente de servidor e invalida las etiquetas de caché.
- `ScoresProvider.saveScore` asíncrono: llama a la Server Action y escribe siempre en `localStorage` (respaldo y fuente de «TU MEJOR MARCA»); el modal del Reproductor muestra el resultado.
- Eliminar `GAMES`, `getGame` y `seededScores` del código.

**Fuera de alcance (para otras specs):**

- Políticas de RLS más allá de las mínimas descritas arriba: políticas por usuario, restricciones por rol o por propietario de la fila (ver «Decisiones» y «Riesgos»).
- Autenticación, perfiles, `proxy.ts`, y asociar puntuaciones o marcas personales a un usuario.
- Antitrampas: verificar que la partida es legítima, límites de frecuencia, moderación de nombres.
- Reintentar o sincronizar con Supabase las puntuaciones que quedaron solo en `localStorage`.
- Migrar a Supabase las marcas que ya existen en `localStorage`; siguen leyéndose de ahí.
- Paginación, «ver más», filtros por periodo (diario/semanal) o ranking global entre juegos.
- Realtime, Storage y Edge Functions.
- Administración del catálogo (alta, edición o baja de juegos desde la app).
- Pantalla de error personalizada (`error.tsx`) para fallos de lectura del catálogo.
- Cambios de diseño de la tarjeta, el Salón, el detalle o el modal.
- Carpeta `supabase/` y entorno local con la CLI (se mantiene el criterio de la SPEC 03).
- Tests automatizados (no hay framework instalado).

## Modelo de datos

### Base de datos (esquema `public`, con RLS y políticas mínimas)

El proyecto de Supabase tiene un event trigger, `ensure_rls`, que activa RLS en toda tabla nueva de `public`. Por eso las tablas nacen con RLS activo y, sin políticas, la clave publicable no podría leerlas ni escribirlas. Se mantiene RLS activo y se añaden las políticas mínimas de abajo.

```sql
create table public.games (
  id         text primary key,                      -- slug de la ruta: 'rocas'
  title      text not null,
  short      text not null,
  long       text not null,
  category   text not null check (category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                         -- clase CSS: 'cover-rocas'
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  plays      integer not null default 0 check (plays >= 0),
  sort_order smallint not null unique,              -- orden del catálogo (1..8)
  created_at timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 10),
  score       integer not null check (score >= 0),
  created_at  timestamptz not null default now()
);

create index scores_game_ranking_idx on public.scores (game_id, score desc, created_at asc);
```

Políticas de RLS (RLS queda activo en ambas tablas):

```sql
alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
create policy "scores_insert_public" on public.scores for insert to anon, authenticated with check (true);
-- Sin políticas de update ni delete: nadie con la clave publicable puede modificar ni borrar filas.
```

Además, en la migración de `scores`:

- Función de trigger `public.bump_game_plays()` con `security definer` y `set search_path = ''`, y trigger `AFTER INSERT` sobre `scores` que la ejecuta: `update public.games set plays = plays + 1 where id = new.game_id`. Debe ser `security definer` porque quien inserta es `anon`, que no tiene política de `update` sobre `games` y su `update` no afectaría a ninguna fila. Se revoca `execute` de la función a `public`, `anon` y `authenticated` para que no sea invocable como RPC.
- Vista `public.games_catalog` con `security_invoker = true`: todas las columnas de `games` más `best` = `coalesce(max(scores.score), 0)`, ordenada por `sort_order`. Funciona porque `games` y `scores` tienen lectura pública.

Datos sembrados:

| Tabla | Filas | Origen |
| ----- | ----- | ------ |
| `games` | 8 | `GAMES` de `lib/games.ts`; `plays` = valor mock convertido a entero (`"12.4K"` → `12400`); `sort_order` = posición actual (1 a 8) |
| `scores` | 40 | `seededScores(gameId, 5)` de cada juego; `created_at` = día y mes del mock con año 2026 (o 2025 si la fecha cae después del 2026-11-16, para no sembrar fechas futuras) |

### TypeScript

```ts
// lib/games.ts (se conservan tipos y constantes; se eliminan GAMES y getGame)
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;   // columna `category`
  cover: string;
  color: GameColor;
  best: number;        // columna `best` de games_catalog
  plays: number;       // antes string ("12.4K"); ahora entero
};
export const CATS: ("TODOS" | GameCategory)[]; // sin cambios

// lib/scores.ts (se elimina seededScores; se conservan ScoreRow y formatScore)
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/AAAA"
export function formatPlays(n: number): string; // 12400 → "12.4K"; < 1000 → "842"
```

```ts
// lib/data/games.ts   ("use cache" + cacheTag("games"))
export async function getGames(): Promise<Game[]>;              // ordenado por sort_order
export async function getGame(id: string): Promise<Game | null>;

// lib/data/scores.ts  ("use cache" + cacheTag(`scores:${gameId}`))
export async function getTopScores(gameId: string, limit: number): Promise<ScoreRow[] | null>; // null = error de lectura

// lib/actions/scores.ts  ("use server")
export type SubmitScoreResult = { ok: true } | { ok: false; error: string };
export async function submitScore(input: { gameId: string; name: string; score: number }): Promise<SubmitScoreResult>;

// components/scores-provider.tsx
saveScore: (s: Omit<SavedScore, "at">) => Promise<"remote" | "local">;
// "remote": guardado en Supabase y en localStorage. "local": la acción falló; solo en localStorage.
```

Convenciones:

- Los nombres de columna van en inglés y `snake_case`; la capa de lectura los traduce a los campos de `Game` y `ScoreRow` (`category` → `cat`, `player_name` → `name`).
- Orden del ranking: `score` descendente y, a igualdad, `created_at` ascendente. `rank` es la posición en la lista (sin empates compartidos).
- `date` se formatea en la capa de lectura con `toLocaleDateString("es-ES", …)` y `timeZone: "UTC"`, para que servidor y cliente coincidan.
- Las funciones cacheadas usan `lib/supabase/public.ts` (sin `cookies()`), porque `use cache` no admite acceso a cookies. Ese módulo obtiene URL y clave de `getSupabaseEnv()`.
- Las tres `createClient` de la SPEC 03 y `SupabaseProvider` pasan a llevar el genérico `Database` de los tipos generados.
- `submitScore` valida en servidor: `gameId` no vacío, `name` con `trim()` de 1 a 10 caracteres y en mayúsculas (como ya hace el modal), `score` entero ≥ 0. La existencia del juego la garantiza la clave foránea.
- Etiquetas de caché: `games` (catálogo, `best`, `plays`) y `scores:<gameId>`. Tras un insert correcto, `submitScore` invalida ambas.
- `localStorage` conserva clave y formato de la SPEC 01 (`av:v1:scores`, `SavedScore`).

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`): `01-app/03-api-reference/01-directives/use-cache.md`, `04-functions/cacheTag.md`, `04-functions/cacheLife.md` y `04-functions/updateTag.md` para los pasos 3 a 6, y `01-directives/use-server.md` para el paso 6. Para la interfaz se usa siempre la skill `frontend-design`, con el aspecto actual como referencia. Antes de escribir SQL, consultar `search_docs` del MCP de Supabase.

1. **Tabla `games`.** Aplicar con `apply_migration` la creación de `games`, sembrar los 8 juegos, y en una segunda migración la política `games_select_public`. Verificación: `list_tables` muestra `games` con 8 filas y RLS activo; con `set local role anon` se leen las 8 filas y un `update` no afecta a ninguna; la app no cambia.
2. **Tabla `scores`, políticas, trigger, vista y seed.** Generar el SQL de los 40 registros con un script temporal en el scratchpad que reproduzca `seededScores` (no se commitea) y aplicar con `apply_migration` la tabla, el índice, las políticas de `scores`, el seed, y **después** el trigger (`security definer`) y la vista (así el seed no altera `plays`). Verificación: `scores` tiene 40 filas (5 por juego); `games_catalog.best` coincide con `MAX(score)` de cada juego; un `begin; set local role anon; insert …; select plays …; rollback;` en una sola llamada de `execute_sql` muestra `plays + 1` dentro de la transacción y el valor original después; como `anon`, un `update` o `delete` sobre `scores` o `games` no afecta a ninguna fila.
3. **Tipos y capa de lectura.** Generar `lib/supabase/database.types.ts` con `generate_typescript_types`, añadir el genérico `Database` a las `createClient` y a `SupabaseProvider`, crear `lib/supabase/public.ts`, `lib/data/games.ts` y `lib/data/scores.ts`, y añadir `formatPlays` y el nuevo tipo `Game`. Todavía nada las consume. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
4. **Catálogo desde la BD.** Hacer que `/`, `/juegos`, `/juegos/[id]`, `/juegos/[id]/jugar` y `/salon` lean el catálogo con `getGames`/`getGame` en el Server Component y lo pasen por props a `Home`, `Library`, `HallOfFame` y `GamePlayer`; `generateStaticParams` usa los slugs de la BD; mostrar `plays` con `formatPlays`; eliminar `GAMES` y `getGame` de `lib/games.ts`. Los rankings siguen con `seededScores`. Verificación: las 5 rutas responden 200 con el mismo aspecto y 8 juegos; `/juegos/no-existe` muestra «no encontrado» y devuelve 404 desde la segunda petición (ver criterio de aceptación).
5. **Rankings reales.** Sustituir `seededScores` por `getTopScores` en el detalle (10 filas) y en el Salón (12 filas por juego, cargadas en la página y pasadas por props a `HallOfFame`); añadir los estados vacío y de error; eliminar `seededScores`. Verificación: el Top 10 de `/juegos/rocas` y la pestaña ROCAS del Salón coinciden con `select … from scores where game_id = 'rocas' order by score desc, created_at`.
6. **Guardado.** Crear `lib/actions/scores.ts` con `submitScore`, hacer asíncrono `saveScore` en `ScoresProvider` y mostrar en el modal del Reproductor los estados «GUARDANDO…», «PUNTUACIÓN GUARDADA» y «GUARDADA SOLO EN ESTE DISPOSITIVO». Verificación: se completa jugar → guardar → ver la marca en el ranking real, y `plays` del juego sube en 1 sin recargar la caché a mano.

## Criterios de aceptación

**Base de datos**

- [ ] `public.games` tiene 8 filas con los mismos `id`, `title`, `short`, `long`, `category`, `cover` y `color` que tenía `lib/games.ts`, y `sort_order` del 1 al 8.
- [ ] `public.scores` tiene 40 filas, 5 por juego, con `player_name` de 1 a 10 caracteres y `score` ≥ 0.
- [ ] Ninguna fila de `scores` tiene `created_at` posterior a 2026-11-16.
- [ ] Insertar una fila en `scores` suma exactamente 1 a `games.plays` de ese juego.
- [ ] Insertar con `game_id` inexistente, `player_name` vacío o de 11 caracteres, o `score` negativo, falla por restricción.
- [ ] `games_catalog.best` es igual a `MAX(scores.score)` de cada juego.
- [ ] `plays` sembrado de ROCAS es 15600 y el de CAÍDA 31800.
- [ ] RLS está activo en `games` y `scores`. Existen exactamente tres políticas: `select` público en ambas e `insert` público en `scores`.
- [ ] Como `anon`, `update` y `delete` sobre `games` y `scores` no afectan a ninguna fila.
- [ ] Como `anon`, insertar en `scores` incrementa `games.plays` (el trigger `security definer` funciona bajo RLS).
- [ ] `get_advisors` no reporta `rls_disabled_in_public`. Se acepta el aviso `rls_policy_always_true` de la política de `insert` en `scores` (riesgo aceptado, ver «Riesgos»).
- [ ] `lib/supabase/database.types.ts` existe y refleja las dos tablas y la vista.

**Catálogo**

- [ ] `/`, `/juegos`, `/juegos/serpentina`, `/juegos/serpentina/jugar` y `/salon` responden 200 y muestran los 8 juegos en el mismo orden que antes.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la pantalla de «no encontrado» (con `noindex`) y, salvo en la primera petición a un id concreto, responden 404. La primera petición responde 200 porque `params` se lee dentro de `<Suspense>` y el estado HTTP ya se envió cuando se ejecuta `notFound()`; es el diseño de las páginas desde la SPEC 01 y se acepta (ver «Decisiones»).
- [ ] `lib/games.ts` ya no exporta `GAMES` ni `getGame`, y `lib/scores.ts` ya no exporta `seededScores`.
- [ ] Las tarjetas y el detalle muestran `best` de `games_catalog` (con `formatScore`) y `plays` con `formatPlays` (p. ej. «15.6K» para ROCAS al inicio).
- [ ] El filtro por categoría y la búsqueda de `/juegos` funcionan igual que antes.
- [ ] `npm run build` termina sin errores y `generateStaticParams` genera 8 rutas por tipo de página a partir de la BD.

**Leaderboard**

- [ ] El detalle de un juego muestra las 10 mejores puntuaciones de la BD, ordenadas por `score` descendente y `created_at` ascendente, con el nombre y la fecha `DD/MM/AAAA`.
- [ ] Cada pestaña del Salón muestra el Top 12 de ese juego, con podio (1.º, 2.º y 3.º) y tabla.
- [ ] Un juego sin filas en `scores` muestra «SIN PUNTUACIONES TODAVÍA» en lugar del podio y la tabla.
- [ ] Un juego con 1 o 2 filas muestra «—» en los puestos del podio que faltan.
- [ ] Si la lectura de un ranking falla, esa vista muestra «NO SE PUDO CARGAR EL RANKING» y el resto de la página sigue funcionando.
- [ ] «TU MEJOR MARCA» sigue leyéndose de `localStorage` y calcula su posición dentro del Top 12 como antes.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/rocas` ni en `/salon`.

**Guardado**

- [ ] «GUARDAR PUNTUACIÓN» con iniciales válidas inserta en `scores` una fila con el `game_id`, el nombre en mayúsculas y la puntuación de la partida, y muestra «PUNTUACIÓN GUARDADA».
- [ ] Mientras la acción está en curso el botón está deshabilitado y muestra «GUARDANDO…».
- [ ] Tras guardar, `games.plays` del juego sube en 1.
- [ ] Tras guardar, el ranking del juego en el Salón y en su detalle incluye la nueva marca si entra en el Top, sin recargar a mano ni esperar a que expire la caché.
- [ ] Tras guardar, `localStorage` (`av:v1:scores`) contiene la entrada `{ gameId, name, score, at }`.
- [ ] Con la acción fallando (p. ej. clave alterada en `.env` o sin red), el modal muestra «GUARDADA SOLO EN ESTE DISPOSITIVO», `localStorage` contiene la entrada y `scores` no cambia.
- [ ] `submitScore` con nombre vacío (tras `trim`), de más de 10 caracteres o con puntuación negativa o no entera devuelve `{ ok: false }` sin insertar.
- [ ] `grep -rn "service_role\|SERVICE_ROLE" app components lib` no devuelve resultados.

**Proyecto**

- [ ] `npx tsc --noEmit`, `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] `lib/supabase/env.ts` sigue siendo el único módulo que lee `process.env.NEXT_PUBLIC_SUPABASE_*`.
- [ ] Tras las comprobaciones no queda en el repo el script temporal del seed ni ningún archivo de prueba (`git status` solo muestra los archivos del plan).

## Decisiones tomadas y descartadas

- **Sí:** la BD es la fuente de verdad del catálogo (`games`) y de los rankings (`scores`). **No:** tabla espejo solo para la clave foránea: dejaría dos catálogos que mantener sincronizados.
- **Sí:** híbrido con `localStorage` siempre escrito al guardar: sirve de respaldo si falla Supabase y alimenta «TU MEJOR MARCA», que sin Auth no puede consultarse en la BD. **No:** respaldo que solo actúa cuando falla la red, porque «TU MEJOR MARCA» perdería su origen; ni capa intercambiable con datos aún locales, que contradice la fuente de verdad en BD.
- **Sí:** el respaldo cubre solo la **escritura** de puntuaciones. **No:** respaldo de lectura del catálogo o de los rankings: no hay copia local del ranking global y duplicar el catálogo en el código reabre la fuente de verdad.
- **Sí:** mantener **RLS activo** con políticas mínimas (lectura pública de `games` y `scores`, inserción pública en `scores`, sin `update` ni `delete`). Motivo: el proyecto tiene el event trigger `ensure_rls`, que activa RLS en toda tabla nueva, y sin políticas la app no podría leer ni escribir. Esto sustituye el criterio inicial de la spec («sin RLS, por indicación expresa»), que no contemplaba ese trigger; el usuario eligió esta opción al descubrirlo durante el paso 1. **No:** desactivar RLS con `disable row level security`, que anularía la salvaguarda del proyecto y dejaría modificar y borrar filas desde cualquier navegador.
- **Sí:** el trigger de `plays` como función `security definer` con `search_path` vacío y sin `execute` para `public`, `anon` ni `authenticated`. **No:** trigger con permisos del invocador: bajo RLS el `update` de `anon` sobre `games` no afecta a ninguna fila y `plays` nunca subiría. **No:** política de `update` sobre `games`, que permitiría falsear contadores.
- **Sí:** insertar mediante Server Action con el cliente de servidor, que valida y deja el camino listo para cuando haya Auth y se endurezca la política de `insert`. La política `with check (true)` no es una barrera real contra el abuso, y se registra como riesgo. **No:** insert directo desde el navegador ni Edge Function, que abre infraestructura que la SPEC 03 dejó fuera.
- **Sí:** `best` calculado en la vista `games_catalog` (`MAX(score)`) y `plays` como columna entera sembrada con el valor mock, sumada por trigger en cada fila de `scores`. **No:** `best` como columna (puede desincronizarse), ni `plays = COUNT(*)` (pasaría de 12.4K a 12).
- **Sí:** el trigger de `plays` en la BD, atómico con el insert. **No:** un segundo `update` desde la Server Action, que puede fallar a medias.
- **Sí:** `plays` cuenta puntuaciones guardadas, no partidas iniciadas. Es lo único que el sistema sabe sin Auth ni telemetría, y la etiqueta de interfaz no cambia.
- **Sí:** `best` de cada juego pasa a ser el máximo de su ranking real, así que cambia respecto al mock (ROCAS deja de mostrar 41200). Esto reemplaza el criterio «`best` y `plays` no cambian» de la SPEC 04, que acotaba esa spec. **No:** conservar el `best` mock, que contradiría el ranking visible.
- **Sí:** sembrar los rankings mock (12 por juego) para que el ranking no nazca vacío; desde ese momento todo dato nuevo es real. **No:** conservar `seededScores` en el código una vez sembrado.
- **Sí:** fechas del seed con año 2026, o 2025 si caerían después de 2026-11-16. **No:** fechas futuras.
- **Sí:** lecturas en Server Components con `use cache`, etiquetas (`games`, `scores:<id>`) e invalidación desde la Server Action. **No:** fetch en el cliente con skeleton, que parpadea en cada vista y pierde el prerender.
- **Sí:** cliente `public.ts` sin cookies para las funciones cacheadas, porque `use cache` no permite `cookies()`. El cliente de servidor con cookies se usa solo en la Server Action.
- **Sí:** generar `Database` ahora y aplicarlo a las tres `createClient` y al provider: la SPEC 03 lo dejó pendiente «hasta la primera migración».
- **Sí:** columna `sort_order` en `games` para conservar el orden del catálogo (la home usa los 6 primeros). **No:** ordenar por título ni por `created_at`, que alteraría la home.
- **Sí:** columna `category` en la BD y campo `cat` en `Game`. Se mantiene `cat` en TypeScript para no tocar componentes que ya lo usan.
- **Sí:** migraciones aplicadas con `apply_migration` y registradas en el historial de Supabase. **No:** carpeta `supabase/` ni CLI local (criterio de la SPEC 03).
- **Sí:** Top 10 en el detalle y Top 12 en el Salón, igual que el mock. **No:** paginación.
- **Sí:** orden de empate por antigüedad (`created_at` ascendente): quien alcanzó antes la marca queda por encima.
- **Sí:** mantener la lectura de `params` dentro de `<Suspense>` en `/juegos/[id]` y `/juegos/[id]/jugar`, como desde la SPEC 01. Consecuencia asumida: la primera petición a un id inexistente responde 200 (con la pantalla de «no encontrado» y `noindex`) y las siguientes 404. Se descubrió en el paso 4. **No:** leer `params` fuera del `<Suspense>` para obtener 404 desde la primera petición: cambia la estructura de prerender de dos páginas y queda fuera del alcance. Si importa para SEO, va en su propia spec.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| La política `scores_insert_public` (`with check (true)`) permite que cualquiera con la clave publicable (visible en el bundle) inserte puntuaciones falsas, y cada inserción suma 1 a `plays` por el trigger. | Riesgo aceptado. Las restricciones `check` y la clave foránea limitan los datos inválidos pero no el abuso. Sí quedan cerradas la modificación y el borrado de `games` y `scores`. Una spec posterior de Auth, antitrampas y límites de frecuencia endurece la política; la Server Action ya valida para que ese cambio no obligue a rehacerla. El criterio sobre `get_advisors` documenta el aviso `rls_policy_always_true`. |
| El event trigger `ensure_rls` activa RLS en las tablas nuevas; sin políticas, las lecturas devuelven vacío y los inserts fallan sin un error claro. | Las políticas se crean en las mismas migraciones que las tablas, y cada paso verifica el acceso con `set local role anon`. |
| El trigger de `plays` no sube el contador bajo RLS porque `anon` no puede actualizar `games`. | La función es `security definer`; criterio de aceptación explícito que lo comprueba como `anon`. |
| `generateStaticParams` y las lecturas cacheadas consultan la BD durante `next build`: sin red o sin variables de entorno el build falla. | `getSupabaseEnv()` ya falla con un mensaje claro; en despliegue hay que definir las variables antes del build. Documentado en el criterio de build. |
| `use cache` no admite `cookies()`, así que usar el cliente de servidor en las lecturas rompe el prerender o la caché. | Las lecturas usan `lib/supabase/public.ts`; el cliente con cookies queda solo en la Server Action. |
| El ranking no se actualiza tras guardar porque falta invalidar la etiqueta. | `submitScore` invalida `games` y `scores:<gameId>` (API vigente según la guía `updateTag`); criterio de aceptación explícito. |
| Fallo del guardado remoto y puntuación solo local, que nunca llega al ranking global. | Se avisa al jugador con «GUARDADA SOLO EN ESTE DISPOSITIVO». La sincronización posterior queda fuera de alcance. |
| Fallo de lectura del catálogo: sin `error.tsx` propio, el usuario ve la pantalla de error por defecto de Next. | Aceptado en esta spec; los rankings sí degradan con mensaje propio. Una pantalla de error personalizada va en otra spec. |
| Cambiar `plays` de `string` a `number` rompe los componentes que lo pintan directamente. | `tsc` marca cada uso; todos pasan por `formatPlays`. Criterio sobre las cifras mostradas. |
| Servidor y cliente formatean la fecha de forma distinta y causan un aviso de hidratación. | Formato en la capa de lectura con `timeZone: "UTC"`, sin recalcularlo en el cliente. |
| El trigger de `plays` se dispara también en el seed y sube los contadores por encima de los valores mock. | La migración crea el trigger **después** de insertar el seed, así que el seed no toca `plays`; criterio con los valores 15600 y 31800. |
| La vista `games_catalog` sin `security_invoker` ignora los permisos del llamante (aviso de Supabase). | Se crea con `security_invoker = true`. |

## Lo que **no** entra en esta spec

- Políticas de RLS por usuario o por rol (solo entran las tres políticas mínimas).
- Autenticación, perfiles ni marcas personales ligadas a un usuario.
- Antitrampas, límites de frecuencia o moderación de nombres.
- Sincronizar con Supabase las puntuaciones guardadas solo en `localStorage`, ni migrar las marcas locales existentes.
- Paginación, rankings por periodo o ranking global entre juegos.
- Realtime, Storage, Edge Functions, carpeta `supabase/` y CLI local.
- Alta, edición o baja de juegos desde la app.
- Pantalla de error personalizada para fallos del catálogo.
- Cambios de diseño de tarjeta, Salón, detalle o modal.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
