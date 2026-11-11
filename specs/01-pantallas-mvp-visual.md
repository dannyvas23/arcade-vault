# SPEC 01 — Pantallas visuales del MVP de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** Ninguna (parte de los estilos ya portados en `app/globals.css` y de las fuentes ya cargadas en `app/layout.tsx`)
> **Fecha:** 2026-11-09
> **Objetivo:** Implementar en Next.js 4 de las 5 pantallas visuales de `references/templates/` (Biblioteca, Detalle, Reproductor simulado y Salón de la Fama) con datos mock y puntuaciones guardadas en localStorage, sin Auth y sin implementar ningún juego.

---

## Por qué existe esta spec

`references/templates/` contiene un prototipo hecho con React por CDN + Babel, con datos mock y navegación por estado en el hash de la URL. Esta spec lo traslada al proyecto real (Next.js 16 + App Router + TypeScript) para tener la base visual sobre la que más adelante se construyan los juegos, el backend y las puntuaciones reales.

La plantilla es la fuente de verdad visual: **se replica, no se rediseña**. El único criterio de diseño nuevo es adaptar la estructura a rutas reales y a componentes tipados.

La pantalla de Auth (`auth.jsx`) queda fuera de esta spec y tendrá la suya. Sin ella no hay usuarios ni sesión: todas las puntuaciones se tratan como de un jugador local.

## Alcance

**Dentro:**

- 4 pantallas, cada una en su ruta real del App Router:
  - Biblioteca: `/`
  - Detalle del juego: `/juegos/[id]`
  - Reproductor (simulado): `/juegos/[id]/jugar`
  - Salón de la Fama: `/salon`
- Componentes compartidos: `Nav` (con menú móvil), footer y portadas CSS de cada juego.
- Datos mock: 8 juegos, 4 categorías y rankings deterministas generados con semilla.
- Puntuaciones guardadas desde el Reproductor en `localStorage`, expuestas por un Context (`ScoresProvider`) y reflejadas en la fila «TU MEJOR MARCA» del Salón de la Fama.
- Página 404 para ids de juego inexistentes y metadata real del sitio (título y descripción).
- Responsive: los mismos breakpoints de `globals.css` (840 px para el Nav, 900 px para el Detalle, 720 px para el Salón).

**Fuera de alcance (para otras specs):**

- **La pantalla de Auth (`/auth`)** y todo lo que depende de ella: iniciar sesión, crear cuenta, «jugar como invitado», botones de Google/GitHub, sesión de usuario y su persistencia.
- El botón «Iniciar Sesión» del Nav, el enlace «Iniciar Sesión»/«Cuenta» del menú móvil y el botón con el nombre del usuario. Se añaden junto con la spec de Auth.
- Cualquier juego real (lógica, canvas, controles, colisiones). El Reproductor solo simula puntuación sobre una arena decorativa.
- Backend, base de datos, API routes o Server Actions.
- Rankings reales o compartidos entre usuarios. Los rankings son mock.
- Páginas de perfil/cuenta, términos y condiciones, ajustes.
- Mecánica de «créditos» (el contador del Nav es estático).
- Tests automatizados (no hay framework instalado).
- Rediseño o cambios de estilo respecto a las plantillas.
- Eliminar los SVG por defecto de `public/`.

## Modelo de datos

Todo vive en `lib/` (el alias `@/*` apunta a la raíz del repo; no hay carpeta `src/`).

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;        // slug de la ruta, p. ej. "bloque-buster"
  title: string;     // "BLOQUE BUSTER"
  short: string;     // descripción de la tarjeta
  long: string;      // descripción de la pantalla de detalle
  cat: GameCategory;
  cover: string;     // clase CSS de globals.css, p. ej. "cover-bricks"
  color: GameColor;  // define el color del botón JUGAR en la tarjeta
  best: number;      // "mejor puntuación" mock
  plays: string;     // "12.4K"
};

export const GAMES: Game[];                       // los 8 juegos de references/templates/data.jsx
export const CATS: ("TODOS" | GameCategory)[];    // ["TODOS","ARCADE","PUZZLE","SHOOTER","VERSUS"]
export function getGame(id: string): Game | undefined;
```

```ts
// lib/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: "DD/MM/2026"

export function seededScores(gameId: string, count: number): ScoreRow[];
export function formatScore(n: number): string;   // n.toLocaleString("es-ES")
```

```ts
// lib/storage.ts
export type SavedScore = { gameId: string; name: string; score: number; at: number }; // at = Date.now()

export const SCORES_KEY = "av:v1:scores";

export function readScores(): SavedScore[];
export function appendScore(s: SavedScore): void;
// Ambas envuelven localStorage en try/catch y degradan a "sin datos" si falla.
```

```ts
// components/scores-provider.tsx  ("use client")
type ScoresContextValue = {
  ready: boolean;                       // false en servidor y primer render del cliente
  scores: SavedScore[];
  saveScore: (s: Omit<SavedScore, "at">) => void;
  bestScore: (gameId: string) => SavedScore | null;
};
export function useScores(): ScoresContextValue;
```

Convenciones:

- `seededScores` conserva el algoritmo de la plantilla (generador congruencial, nombres únicos, orden descendente), pero recibe el `gameId` y deriva la semilla con un hash estable del id, no con `id.length`. Así dos juegos nunca comparten ranking.
- El Detalle pide `seededScores(id, 10)` y el Salón `seededScores(id, 12)`.
- `bestScore(gameId)` devuelve la entrada con mayor `score` para ese `gameId`, sea cual sea el `name`, o `null` si no hay ninguna.
- La clave de `localStorage` lleva versión (`av:v1:`) para poder migrar el formato más adelante.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`). Para la interfaz se usa siempre la skill `frontend-design`, con las plantillas como referencia visual obligatoria.

1. **Datos y utilidades.** Crear `lib/games.ts`, `lib/scores.ts` y `lib/storage.ts` según el modelo de datos, portando `GAMES`, `CATS` y `seededScores` desde `references/templates/data.jsx`. Verificación: `npx tsc --noEmit` pasa.
2. **ScoresProvider.** Crear `components/scores-provider.tsx` con el contexto de puntuaciones. Lee `localStorage` solo tras montar (en un efecto) para no provocar errores de hidratación; `ready` pasa a `true` al terminar. Verificación: `tsc` y `lint` pasan.
3. **Shell global.** Actualizar `app/layout.tsx` (metadata «Arcade Vault · Portal Retro», `ScoresProvider` envolviendo el contenido, `<Nav />`, `<main className="av-main">` y footer dentro de `#root`). Crear `components/nav.tsx` (logo, enlaces «Biblioteca» y «Salón de la Fama», estado activo con `usePathname`, contador de créditos estático y menú móvil con backdrop; **sin** botón de sesión) y `components/footer.tsx`. Verificación: `npm run dev`, la página de inicio sigue siendo el scaffold pero ya muestra el Nav y el footer, y el menú móvil abre y cierra.
4. **Biblioteca (`/`).** Reemplazar `app/page.tsx`. Crear `components/game-card.tsx` (inclinación 3D con el ratón, navega al detalle), `components/game-cover.tsx` (div `cover-bg` + clase del juego) y `components/library.tsx` (hero, búsqueda, chips de categoría, grilla y estado vacío «NO HAY RESULTADOS»). Verificación: `/` muestra las 8 tarjetas y los filtros funcionan.
5. **Detalle (`/juegos/[id]`) y 404.** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams` (los 8 ids) y `notFound()` para ids desconocidos, más `components/leaderboard.tsx` y `app/not-found.tsx`. Verificación: desde una tarjeta se llega al detalle de ese juego; `/juegos/xxx` muestra el 404.
6. **Reproductor (`/juegos/[id]/jugar`).** Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (HUD, marco CRT con arena decorativa, pausa, FIN, modal de fin de juego con guardado, jugar de nuevo, salir). Guardar usa `saveScore` del contexto. Verificación: se puede jugar la simulación completa y, tras guardar, aparece una entrada en `localStorage` (`av:v1:scores`).
7. **Salón de la Fama (`/salon`).** Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (pestañas por juego, podio, tabla de 12 filas con animación escalonada, fila «TU MEJOR MARCA» alimentada por `bestScore`). Verificación: se completa el ciclo jugar → guardar → ver la marca en el Salón.

## Criterios de aceptación

**Rutas y proyecto**

- [ ] `/`, `/juegos/serpentina`, `/juegos/serpentina/jugar` y `/salon` responden 200 y renderizan su pantalla.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran la página 404.
- [ ] `/auth` responde 404 (la ruta no existe en esta spec).
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en ninguna de las 4 pantallas.
- [ ] No hay referencias a React por CDN, Babel ni `<link>` a Google Fonts: las fuentes siguen cargándose con `next/font`.
- [ ] En un viewport de 375 px de ancho ninguna de las 4 pantallas tiene scroll horizontal.

**Nav y footer**

- [ ] «Biblioteca» aparece activo en `/`, `/juegos/[id]` y `/juegos/[id]/jugar`; «Salón de la Fama» aparece activo en `/salon`.
- [ ] El Nav y el menú móvil no contienen ningún botón ni enlace de «Iniciar Sesión», «Cuenta» ni nombre de usuario.
- [ ] Por debajo de 840 px se ocultan los enlaces y el contador, y el botón `≡` abre el panel lateral.
- [ ] Pulsar un enlace del panel o el backdrop cierra el panel; el enlace además navega a su ruta.
- [ ] El footer muestra «© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0» en todas las pantallas.

**Biblioteca**

- [ ] Se muestran 8 tarjetas con portada, categoría, título, descripción y «MEJOR PUNTUACIÓN».
- [ ] El chip «ARCADE» muestra 4 tarjetas, «PUZZLE» 1, «SHOOTER» 2, «VERSUS» 1 y «TODOS» 8.
- [ ] Buscar «serp» (sin distinguir mayúsculas) deja solo SERPENTINA; buscar «zzz» muestra «NO HAY RESULTADOS».
- [ ] Búsqueda y categoría se combinan (p. ej. «ARCADE» + «gl» deja solo GLOTÓN).
- [ ] Pulsar la tarjeta o su botón JUGAR navega a `/juegos/[id]` una sola vez.
- [ ] La tarjeta es alcanzable con la tecla Tab y se activa con Enter.

**Detalle**

- [ ] Muestra portada, 4 etiquetas (categoría, «1 JUGADOR», «TECLADO / TÁCTIL», «RETRO 1985»), título, descripción larga y la franja «Partidas / Mejor global / Dificultad».
- [ ] La tabla «MEJORES PUNTUACIONES» tiene 10 filas ordenadas de mayor a menor, con las 3 primeras en dorado, plata y bronce.
- [ ] Recargar la página no cambia ningún valor del ranking.
- [ ] CAÍDA y ROCAS muestran rankings distintos.
- [ ] «JUGAR AHORA» navega a `/juegos/[id]/jugar` y «VOLVER AL VAULT» a `/`.

**Reproductor**

- [ ] El HUD muestra Jugador (inicialmente «INVITADO»), Puntuación, Vidas (♥ ♥ ♥) y Nivel con dos dígitos.
- [ ] La puntuación sube sola mientras el juego no está en pausa ni terminado.
- [ ] «PAUSA» detiene la puntuación, muestra la capa «EN PAUSA» y cambia el botón a «REANUDAR»; reanudar la hace subir de nuevo.
- [ ] El Nivel es `1 + floor(puntuación / 2500)`.
- [ ] «FIN» abre el modal «FIN DEL JUEGO» con la puntuación final y detiene el contador.
- [ ] El campo de iniciales parte con «INVITADO», convierte a mayúsculas y limita a 10 caracteres.
- [ ] «GUARDAR PUNTUACIÓN» añade a `av:v1:scores` una entrada `{ gameId, name, score, at }` y muestra «PUNTUACIÓN GUARDADA».
- [ ] «JUGAR DE NUEVO» cierra el modal y reinicia puntuación y nivel a 0 y 1.
- [ ] «SALIR» navega a `/juegos/[id]` y «VOLVER AL VAULT» (en el modal) a `/`.

**Salón de la Fama**

- [ ] Hay 8 pestañas, una por juego, con el primer juego seleccionado al entrar.
- [ ] Cambiar de pestaña cambia el podio y la tabla.
- [ ] El podio muestra los puestos 1, 2 y 3 (el 1 marcado como «CAMPEÓN») y la tabla muestra 12 filas.
- [ ] La fila «TU MEJOR MARCA» aparece siempre, sin necesidad de sesión.
- [ ] Sin puntuaciones guardadas para ese juego, la fila «TU MEJOR MARCA» muestra «—» en rango, nombre, puntuación y fecha.
- [ ] Tras guardar en SERPENTINA una puntuación de 999999, la fila de ese juego en el Salón muestra `#01`, el nombre con el que se guardó, `999.999` y la fecha del guardado.
- [ ] Una puntuación guardada en otro juego no aparece en la fila «TU MEJOR MARCA» de SERPENTINA.
- [ ] Si hay varias puntuaciones guardadas para un juego, la fila muestra la mayor.
- [ ] «VOLVER A LA BIBLIOTECA» navega a `/`.

## Decisiones tomadas y descartadas

- **Sí:** dejar fuera `/auth` y toda la sesión de usuario; irá en su propia spec. **No:** incluir un Auth «a medias» (pantalla sin efecto) ni mantener un botón «Iniciar Sesión» que apunte a una ruta que no existe.
- **Sí:** sin sesión, las puntuaciones son de un jugador local: «TU MEJOR MARCA» muestra la mejor puntuación guardada en este navegador para ese juego, sea cual sea el nombre. Mantiene el ciclo jugar → guardar → ver. **No:** el valor inventado de la plantilla, ni ocultar la fila.
- **Sí:** el Reproductor parte con el nombre «INVITADO», editable en el modal con las iniciales. El HUD refleja el nombre mientras se edita, como en la plantilla.
- **Sí:** el rango en «TU MEJOR MARCA» es la posición dentro del Top 12 si la marca entra; si no entra, se muestra «—».
- **Sí:** rutas reales del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`). Dan URLs compartibles, botón atrás nativo y prerender por página. **No:** replicar el hash-routing de la plantilla en una sola página; va contra el modelo de Next y no tiene URLs reales.
- **Sí:** reutilizar las clases ya portadas en `app/globals.css` (`.av-nav`, `.card`, `.btn`, `.crt`…). El estilo ya está validado contra la plantilla. **No:** reescribir todo con utilidades de Tailwind; sería un rediseño sin valor y con riesgo de divergir de las plantillas.
- **Sí:** puntuaciones en `localStorage` con un Context (`ScoresProvider`). **No:** sin persistencia (rompería el ciclo guardar → ver en el Salón).
- **Sí:** clave con versión (`av:v1:scores`) en lugar de la de la plantilla (`av_scores`), para poder migrar el formato cuando exista un backend.
- **Sí:** el Reproductor mantiene la simulación de la plantilla (puntuación aleatoria con `setInterval` sobre una arena decorativa). Permite validar HUD, pausa, fin de juego y guardado sin implementar ningún juego. **No:** pantalla estática con «PRÓXIMAMENTE».
- **Sí:** el nivel se deriva de la puntuación (`1 + floor(puntuación / 2500)`). **No:** copiar la lógica de la plantilla (`score % 2500 < 100` dentro de un efecto), que puede subir de nivel varias veces seguidas o ninguna.
- **Sí:** las vidas se muestran fijas en 3, porque sin juego no hay mecánica que las reduzca.
- **Sí:** la semilla de `seededScores` se deriva de un hash del id del juego. **No:** `id.length` como en la plantilla, porque CAÍDA y ROCAS (ambos de 5 letras) tendrían el mismo ranking.
- **Sí:** la pestaña activa del Salón vive en estado local de React. **No:** parámetro `?juego=` en la URL, porque `useSearchParams` obligaría a envolver con `Suspense` bajo `cacheComponents` sin aportar valor en un MVP.
- **Sí:** `formatScore` usa `toLocaleString("es-ES")` como la plantilla. Ese formato no agrupa números de 4 cifras (`7820`, pero `28.450`); es un comportamiento aceptado.
- **Sí:** los datos mock no se corrigen para que cuadren entre sí: `Game.best` ("mejor global") no coincide con el puesto #1 del ranking sembrado. Así viene en la plantilla y se resuelve con datos reales en una spec futura.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| Errores de hidratación por leer `localStorage` en el primer render | `ScoresProvider` empieza con `ready: false` y `scores: []`, y lee el almacenamiento solo en un efecto tras montar. La fila «TU MEJOR MARCA» del Salón trata `ready: false` como «sin puntuaciones» sin cambiar el layout. |
| `cacheComponents` marca como «blocking route» el acceso a `params` en las rutas dinámicas | `generateStaticParams` devuelve los 8 ids de `GAMES`, así `params` es conocido en build. Si el overlay de desarrollo sigue avisando, envolver el contenido que lee `params` en `<Suspense>` según `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`. |
| La API de Next 16 difiere de lo conocido (`params` es una `Promise`, helper global `PageProps<...>`) | Leer la guía correspondiente antes de cada paso y usar `PageProps<'/juegos/[id]'>`; ejecutar `next dev` o `next typegen` antes de `tsc` para generar los tipos. |
| `Math.random()` en el Reproductor es no determinista | Solo se usa dentro del callback del `setInterval` (en el cliente, tras montar), nunca durante el render, así que no afecta al prerender. |
| `localStorage` no disponible (modo privado, cuota llena) | Todas las funciones de `lib/storage.ts` usan `try/catch`. La app sigue funcionando sin persistir, igual que la plantilla. |
| Los efectos visuales (inclinación 3D, parpadeo, animaciones) pueden degradar el rendimiento en móviles | Se reutilizan los CSS de la plantilla tal cual; solo se acepta como bug que algo se vea claramente roto, no ajustar rendimiento en esta spec. |

## Lo que **no** entra en esta spec

- La pantalla de Auth (`/auth`) ni ninguna forma de sesión de usuario.
- Ningún juego real: ni Bloque Buster, ni Caída, ni los demás.
- Backend, base de datos o rankings compartidos.
- Perfil de usuario, créditos funcionales, términos y condiciones.
- Tests automatizados.
- Cambios de diseño respecto a `references/templates/`.

Cada uno de estos puntos, si llega, va en su propia spec.
