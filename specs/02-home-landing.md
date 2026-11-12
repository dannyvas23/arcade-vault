# SPEC 02 — Home (landing) de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-10
> **Objetivo:** Implementar la pantalla Home de `references/templates/home-about/` en `/`, mover la Biblioteca a `/juegos` y añadir «Inicio» y «Acerca de» al Nav, con datos mock y sin Auth ni página «Acerca de».

---

## Por qué existe esta spec

`references/templates/home-about/` trae dos pantallas nuevas (`home.jsx` y `about.jsx`), un `nav.jsx` actualizado con los enlaces «Inicio» y «Acerca de», y un `styles.css` con los estilos de ambas. Esta spec traslada **solo el Home** al proyecto real. «Acerca de» + Contacto irá en su propia spec.

Hoy `/` muestra la Biblioteca (SPEC 01). En la plantilla el Home es la portada y la Biblioteca es otra pantalla, así que esta spec **modifica rutas ya implementadas**: la Biblioteca pasa de `/` a `/juegos`. Donde esta spec contradiga a la SPEC 01 en rutas o en el Nav, manda esta (ver «Cambios sobre la SPEC 01»).

Igual que en la SPEC 01, la plantilla es la fuente de verdad visual: **se replica, no se rediseña**.

## Alcance

**Dentro:**

- Pantalla Home en `/` con las 6 secciones de `home.jsx`: Hero, «¿POR QUÉ ARCADE VAULT?», «JUEGOS DISPONIBLES AHORA», franja de estadísticas, «ACTIVIDAD EN VIVO», «PRECIOS» y CTA final.
- Mover la Biblioteca a `/juegos` y actualizar todos los enlaces internos que hoy apuntan a ella con `href="/"`.
- Nav: enlaces «Inicio» (`/`), «Biblioteca» (`/juegos`), «Salón de la Fama» (`/salon`) y «Acerca de» (`/acerca`), en escritorio y en el panel móvil. El logo lleva a `/`.
- Portar a `app/globals.css` los estilos del Home que faltan (`.home*`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.ticker`, `.top-*`, `.pricing-*`, `.faq-*`, `.home-final`, `.reveal` y los `@keyframes` que usan).
- Datos mock tipados en `lib/home.ts`: características, estadísticas, últimas puntuaciones, top de jugadores, ventajas del plan y FAQ.
- Animación de aparición al hacer scroll (`.reveal` → `.in`) con `IntersectionObserver`.
- Responsive con los breakpoints de la plantilla (980/520 px características, 1100/600 px mini-tarjetas, 900 px actividad y precios, 720 px estadísticas, 520 px ticker).

**Fuera de alcance (para otras specs):**

- La pantalla «Acerca de» + Contacto (`/acerca`), su formulario y sus estilos (`.about*`, `.contact*`, `.highlight*`, `.terminal-success`, `@keyframes shake` y `pxblink`). El enlace del Nav existe, pero `/acerca` responde 404 hasta esa spec.
- La pantalla de Auth (`/auth`) y la sesión de usuario. Los CTA del Home que apuntan a `/auth` responden 404 hasta esa spec.
- El botón «Iniciar Sesión» del Nav y el enlace «Iniciar Sesión»/«Cuenta» del panel móvil (siguen fuera, como en la SPEC 01).
- Actividad, top o estadísticas reales: todo es mock estático. No se lee `localStorage` en el Home.
- Corregir incoherencias de los datos mock («12+ JUEGOS» cuando hay 8, nombres de jugador que no aparecen en los rankings sembrados).
- Respeto de `prefers-reduced-motion` y cualquier otro ajuste de accesibilidad o rendimiento no presente en la plantilla.
- Metadata propia de `/` y de `/juegos` (se mantiene la del layout).
- Tests automatizados (no hay framework instalado).

## Cambios sobre la SPEC 01

La SPEC 01 queda como `Implementado`; no se edita. Esta spec sustituye lo siguiente:

| SPEC 01 decía | Ahora |
| ------------- | ----- |
| Biblioteca en `/` | Biblioteca en `/juegos`; `/` es el Home |
| Nav con «Biblioteca» y «Salón de la Fama» | Nav con «Inicio», «Biblioteca», «Salón de la Fama» y «Acerca de» |
| «Biblioteca» activo en `/`, `/juegos/[id]` y `/juegos/[id]/jugar` | «Inicio» activo solo en `/`; «Biblioteca» activo en `/juegos` y bajo `/juegos/...` |
| «VOLVER AL VAULT» y «VOLVER A LA BIBLIOTECA» navegan a `/` | Navegan a `/juegos` |

Todo lo demás de la SPEC 01 se mantiene, incluido que `/auth` responde 404.

## Modelo de datos

Solo datos de presentación del Home, en `lib/home.ts`. No se tocan `lib/games.ts`, `lib/scores.ts` ni `lib/storage.ts`.

```ts
// lib/home.ts
import type { GameColor } from "@/lib/games";

export type FeatureIcon = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export type Feature = {
  icon: FeatureIcon;
  title: string;    // "JUEGOS CLÁSICOS"
  desc: string;
  color: GameColor; // clase de color de la tarjeta: cyan | magenta | yellow | green
};

export type HomeStat = { n: string; u: string; s: string }; // "12+" / "JUEGOS" / "Y CONTANDO"

export type RecentScore = {
  player: string;   // "NEONFOX"
  game: string;     // texto de visualización, p. ej. "Bloque Buster" (no es un id)
  score: number;
  ago: string;      // "hace 2 min"
  color: GameColor; // color neón del nombre del jugador
};

export type TopPlayer = { rank: number; player: string; score: number };

export type Faq = { q: string; a: string };

export const FEATURES: Feature[];            // 4
export const HOME_STATS: HomeStat[];         // 3
export const RECENT_SCORES: RecentScore[];   // 7
export const TOP_PLAYERS: TopPlayer[];       // 5
export const PRICE_PERKS: string[];          // 6, sin el prefijo «✔ »
export const FAQS: Faq[];                    // 3
```

Convenciones:

- El contenido sale tal cual de `references/templates/home-about/home.jsx` (textos, orden, colores, nombres de jugador y puntuaciones).
- Las puntuaciones se muestran con `formatScore` de `lib/scores.ts` (`toLocaleString("es-ES")`), con prefijo `+` en el ticker.
- Las mini-tarjetas salen de `GAMES.slice(0, 6)` (`lib/games.ts`), sin datos nuevos.
- El ancho de la barra del Top es `100 - índice * 16` (%), como en la plantilla; las filas 1, 2 y 3 llevan las clases `top1`, `top2` y `top3`.
- Los iconos de característica (`FeatureIcon`) y las 8 siluetas del hero son SVG de `<rect>` copiados de la plantilla.

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`). Para la interfaz se usa siempre la skill `frontend-design`, con `references/templates/home-about/` como referencia visual obligatoria.

1. **Biblioteca a `/juegos`.** Crear `app/juegos/page.tsx` que renderice `<Library />`. Cambiar a `/juegos` los enlaces que significan «volver a la biblioteca»: `components/game-player.tsx` («VOLVER AL VAULT» del modal), `components/hall-of-fame.tsx` («VOLVER A LA BIBLIOTECA»), `app/juegos/[id]/page.tsx` («VOLVER AL VAULT») y `app/not-found.tsx` («VOLVER AL VAULT»). `app/page.tsx` sigue mostrando la Biblioteca de forma temporal. Verificación: `/juegos` muestra las 8 tarjetas y los 4 botones de vuelta navegan a `/juegos`.
2. **Nav.** En `components/nav.tsx` añadir «Inicio» (`/`) y «Acerca de» (`/acerca`) a la lista de enlaces (escritorio y panel móvil), con orden Inicio, Biblioteca, Salón de la Fama, Acerca de. «Biblioteca» apunta a `/juegos`. Estado activo: «Inicio» solo si el pathname es `/`; «Biblioteca» si empieza por `/juegos`; «Salón de la Fama» si empieza por `/salon`; «Acerca de» si empieza por `/acerca`. El logo sigue yendo a `/`. Verificación: los 4 enlaces aparecen, el activo cambia según la ruta y `/acerca` muestra el 404 existente.
3. **Estilos del Home.** Portar a `app/globals.css`, desde `references/templates/home-about/styles.css`, solo las reglas del Home y sus `@keyframes` (`float`, `bounce`, `pulse-led`, `tickin`). No portar nada de «Acerca de». Añadir a `.mini-card` lo necesario para que funcione como enlace (`display: block`, `color: inherit`, `text-decoration: none`). Verificación: `npm run lint` y `npm run build` pasan y las pantallas existentes no cambian de aspecto.
4. **Datos.** Crear `lib/home.ts` con los tipos y las 6 constantes del modelo de datos. Verificación: `npx tsc --noEmit` pasa.
5. **Piezas compartidas.** Crear `components/reveal.tsx` (`"use client"`: envuelve una sección con la clase `reveal`, observa su visibilidad con `IntersectionObserver` con `threshold: 0.12`, añade `in` y deja de observar), `components/home-silhouettes.tsx` (las 8 siluetas) y `components/feature-icon.tsx` (los 4 iconos). Verificación: `tsc` y `lint` pasan.
6. **Home: Hero, «¿Por qué?» y «Juegos disponibles».** Crear `components/home.tsx` y sustituir `app/page.tsx` para que renderice `<Home />` (la Biblioteca ya vive en `/juegos`). Incluye el hero con sus CTA, la rejilla de 4 características con retardo escalonado de 80 ms, y la fila de 6 mini-tarjetas (`Link` a `/juegos/[id]`) con el botón «VER TODOS LOS JUEGOS →». Verificación: `/` muestra esas 3 secciones y las mini-tarjetas llevan al detalle.
7. **Home: estadísticas y «Actividad en vivo».** Añadir a `components/home.tsx` la franja de 3 estadísticas (retardo de 90 ms) y la sección con el ticker de 7 filas (retardo de animación de 60 ms por fila) y el Top de 5 con el enlace «VER SALÓN →». Verificación: ambas secciones se ven completas y «VER SALÓN →» navega a `/salon`.
8. **Home: precios y CTA final.** Añadir la tarjeta «JUGADOR VAULT» (6 ventajas, sello «FREE PLAY»), las 3 FAQ y la sección «¿LISTO PARA JUGAR?». Verificación: `/` muestra el Home completo, sin referencias al scaffold ni a la Biblioteca.

## Criterios de aceptación

**Rutas y proyecto**

- [x] `/`, `/juegos`, `/juegos/serpentina`, `/juegos/serpentina/jugar` y `/salon` responden 200 y renderizan su pantalla.
- [x] `/acerca` y `/auth` responden 404.
- [x] `/juegos` muestra la Biblioteca con 8 tarjetas y sus filtros funcionan igual que antes (ARCADE 4, PUZZLE 1, SHOOTER 2, VERSUS 1, TODOS 8).
- [x] `/` ya no muestra la Biblioteca (no hay buscador ni chips de categoría).
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [x] La consola del navegador no muestra errores ni avisos de hidratación en `/`.
- [x] En un viewport de 375 px de ancho `/` no tiene scroll horizontal.
- [x] No hay referencias a React por CDN, Babel ni `<link>` a Google Fonts.

**Nav y enlaces**

- [x] El Nav muestra, en este orden, «Inicio», «Biblioteca», «Salón de la Fama» y «Acerca de»; el panel móvil muestra los mismos 4 enlaces.
- [x] «Inicio» está activo en `/` y no lo está en ninguna otra ruta.
- [x] «Biblioteca» está activo en `/juegos`, `/juegos/serpentina` y `/juegos/serpentina/jugar`, y no en `/`.
- [x] «Salón de la Fama» está activo en `/salon`.
- [x] El logo del Nav navega a `/`.
- [x] Pulsar «Acerca de» lleva a `/acerca` (404).
- [x] El Nav y el panel móvil no contienen «Iniciar Sesión», «Cuenta» ni nombre de usuario.
- [x] «VOLVER AL VAULT» (Detalle, modal del Reproductor y página 404) y «VOLVER A LA BIBLIOTECA» (Salón) navegan a `/juegos`.

**Hero**

- [ ] Se ve la línea «▸ INSERTAR UNA MONEDA_», el título en 3 líneas («EL ARCADE», «CLÁSICO ESTÁ», «DE VUELTA») y el subtítulo de 2 líneas.
- [x] Hay 8 siluetas decorativas, ocultas a lectores de pantalla (`aria-hidden`).
- [x] «▶ EXPLORAR JUEGOS» navega a `/juegos`.
- [x] «✦ CREAR CUENTA» apunta a `/auth`.
- [x] El indicador «DESLIZA ▼» es visible.

**Secciones**

- [x] «// 01 ¿POR QUÉ ARCADE VAULT?» muestra 4 tarjetas: JUEGOS CLÁSICOS, 100% GRATIS, LADDER BOARDS y SIEMPRE CRECIENDO, cada una con su icono y color.
- [x] «// 02 JUEGOS DISPONIBLES AHORA» muestra 6 mini-tarjetas, que son los 6 primeros juegos de `GAMES`, con portada, título y categoría.
- [x] Pulsar una mini-tarjeta navega a `/juegos/[id]` de ese juego, y se alcanza con Tab y se activa con Enter.
- [x] «VER TODOS LOS JUEGOS →» navega a `/juegos`.
- [ ] La franja de estadísticas muestra «12+ JUEGOS», «MILES DE PARTIDAS» y «GLOBAL RANKING» con sus subtítulos.
- [ ] «// 03 ACTIVIDAD EN VIVO» muestra 7 filas de «ÚLTIMAS PUNTUACIONES» con jugador, juego, `+puntuación` formateada (p. ej. `+184.220`) y tiempo.
- [ ] «TOP JUGADORES · HOY» muestra 5 filas con rango `#01`…`#05`; las 3 primeras llevan las clases `top1`, `top2` y `top3`.
- [ ] «VER SALÓN →» navega a `/salon`.
- [ ] «// 04 PRECIOS» muestra «JUGADOR VAULT», `$0 / SIEMPRE`, 6 ventajas con prefijo «✔», el sello «FREE PLAY» y las 3 FAQ.
- [ ] «EMPEZAR GRATIS →» apunta a `/auth`.
- [ ] La sección final muestra «¿LISTO PARA JUGAR?» y «INSERTAR MONEDA →» navega a `/juegos`.

**Animación y responsive**

- [x] Las secciones con `.reveal` que están fuera del viewport al cargar no tienen la clase `in` y la reciben al entrar en pantalla.
- [x] Una sección ya visible al cargar recibe `in` sin necesidad de hacer scroll.
- [x] Por debajo de 980 px las características pasan a 2 columnas y por debajo de 520 px a 1.
- [x] Por debajo de 1100 px las mini-tarjetas pasan a 3 columnas y por debajo de 600 px a 2.
- [ ] Por debajo de 900 px «Actividad» y «Precios» pasan a 1 columna; por debajo de 720 px las estadísticas pasan a 1 columna.

## Decisiones tomadas y descartadas

- **Sí:** Home en `/` y Biblioteca en `/juegos`. Da una portada real al sitio y agrupa la Biblioteca con `/juegos/[id]`. **No:** Biblioteca en `/biblioteca` (más fiel al nombre de la plantilla, pero el usuario eligió `/juegos`) ni Home en `/inicio` (la portada seguiría siendo la Biblioteca).
- **Sí:** «Acerca de» en otra spec, pero con el enlace ya en el Nav apuntando a `/acerca`, que responde 404 de momento. **No:** crear una página «Acerca de» a medias ni omitir el enlace. Se acepta el 404 temporal para que el Nav quede ya como en la plantilla.
- **Sí:** los CTA «CREAR CUENTA» y «EMPEZAR GRATIS →» apuntan a `/auth`, que responde 404 hasta la spec de Auth. **No:** quitarlos ni redirigirlos a `/juegos`. Se acepta que lleven a un 404 por ahora; cuando exista Auth no habrá que tocar el Home. Es un criterio distinto al de la SPEC 01 con el botón «Iniciar Sesión» del Nav, que se mantiene fuera.
- **Sí:** datos de «Actividad en vivo», estadísticas, precios y FAQ como constantes mock en `lib/home.ts`, con los textos de la plantilla. Mismo criterio que la SPEC 01 con los rankings. **No:** derivarlos de `seededScores` o `localStorage`: mezclaría jugadores inventados con marcas locales, sin valor en un MVP.
- **Sí:** mini-tarjetas del Home como `<Link>` a `/juegos/[id]`. Se pueden alcanzar con teclado y navegan con el router de Next. **No:** `div` con `onClick` como en la plantilla.
- **Sí:** CTA como `<Link className="btn ...">` en lugar de `<button onClick={navigate}>`. **No:** navegación por estado como en la plantilla.
- **Sí:** el Home es un componente de servidor; la única isla de cliente es `components/reveal.tsx`. **No:** marcar todo el Home como `"use client"` solo por el `IntersectionObserver`.
- **Sí:** un `Reveal` por sección con un `ref` propio. **No:** `document.querySelectorAll(".reveal")` en un efecto global como en la plantilla.
- **Sí:** portar solo los estilos del Home a `app/globals.css`. **No:** copiar entero `styles.css` de la plantilla, que arrastraría el CSS de «Acerca de» sin usarlo.
- **Sí:** mantener los datos incoherentes de la plantilla («12+ JUEGOS» con 8 juegos reales; jugadores del Top que no salen en los rankings). Se resolverán con datos reales en una spec futura.
- **Sí:** la SPEC 01 no se edita; esta spec documenta qué sustituye. **No:** reescribir una spec ya implementada.
- **Sí:** no añadir metadata propia a `/` ni a `/juegos`. **No:** ampliar el alcance a SEO por página.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| `.reveal` empieza con `opacity: 0`: sin JavaScript, o hasta que hidrata, las secciones no se ven | Se acepta como en la plantilla. `Reveal` añade `in` en cuanto monta si la sección ya está visible. |
| Mover la Biblioteca deja enlaces `href="/"` que ahora llevan al Home en vez de a la biblioteca | El paso 1 los cambia uno a uno (reproductor, salón, detalle, 404). Verificar con `grep -rn 'href="/"' app components`: solo debe quedar el logo del Nav. |
| El Nav enlaza a `/acerca` y `/auth` (404) y Next precarga los enlaces visibles | Es una decisión aceptada. Si el 404 en consola molesta, no se resuelve aquí; se resuelve creando esas rutas en sus specs. |
| Las siluetas posicionadas con `position: absolute` pueden causar scroll horizontal en móvil | `.home-hero` ya trae `overflow: hidden`. Verificarlo a 375 px (criterio de aceptación). |
| `formatScore` con `es-ES` puede dar distinto formato en servidor y cliente si falta ICU, lo que provoca aviso de hidratación | El criterio de aceptación exige consola limpia. Si aparece, formatear con una función propia determinista en `lib/scores.ts`. |
| Colisión de nombres de `@keyframes` o clases al portar CSS | Los nuevos (`float`, `bounce`, `pulse-led`, `tickin`) no existen en `globals.css`. Comprobar con `grep` antes de portar. |
| `cacheComponents` y rutas con datos dinámicos | El Home solo usa constantes y `GAMES`, sin acceso a datos dinámicos, así que se prerenderiza como contenido estático. No hace falta `<Suspense>`. |

## Lo que **no** entra en esta spec

- La pantalla «Acerca de» + Contacto ni su formulario.
- La pantalla de Auth ni ninguna forma de sesión; los CTA que apuntan a `/auth` seguirán dando 404.
- Botón «Iniciar Sesión», nombre de usuario o menú de cuenta en el Nav.
- Actividad, ranking o estadísticas reales; backend o base de datos.
- Cambios de diseño respecto a `references/templates/home-about/`.
- Metadata por página, `prefers-reduced-motion` y ajustes de rendimiento.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
