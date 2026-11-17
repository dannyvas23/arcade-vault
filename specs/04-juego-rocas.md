# SPEC 04 — Juego ROCAS (Asteroids) jugable en el Reproductor

> **Estado:** Implementado 
> **Depende de:** SPEC 01 (Reproductor, catálogo `lib/games.ts` y `ScoresProvider`)
> **Fecha:** 2026-11-15
> **Objetivo:** Sustituir la simulación del Reproductor en `/juegos/rocas/jugar` por el juego Asteroids de `references/started-games/02-asteroids/` portado a TypeScript, con paleta neón, que conserva su HUD en el canvas y notifica puntuación, vidas, nivel y fin de partida al HUD, los botones y el modal de guardado de la plataforma.

---

## Por qué existe esta spec

Hoy el Reproductor (`components/game-player.tsx`) es una simulación: la puntuación sube sola sobre una arena decorativa y es común a los 8 juegos (SPEC 01). `references/started-games/02-asteroids/` es un juego ya creado y completo (nave, balas, asteroides que se dividen, power-up de disparo triple, vidas y niveles), escrito como un `game.js` global que busca el `<canvas>` con `document.getElementById` y registra sus listeners en `window`.

Esta spec traslada ese juego a la plataforma como **primer juego real**. En el catálogo ya existe como **ROCAS** (`id: "rocas"`), así que no se añade ninguna entrada nueva. Los otros 7 juegos siguen con la simulación.

El juego original se **porta, no se rediseña**: mecánicas, constantes y comportamiento se conservan. Los únicos cambios son los necesarios para integrarlo (separar el motor de React, notificar a la plataforma, paleta neón, sin reinicio con Espacio). Todos están recogidos en «Decisiones».

## Alcance

**Dentro:**

- Motor del juego en TypeScript, sin React ni acceso global al DOM, en `lib/asteroids/`: nave, balas, asteroides (3 tamaños, se dividen), power-up «3x», partículas de explosión, vidas, niveles y colisiones, con los valores numéricos del original.
- Componente de cliente `components/asteroids-canvas.tsx` que crea el motor sobre un `<canvas>` de 800×600 lógicos, lo escala al marco CRT y lo destruye al desmontarse.
- El canvas conserva su propio HUD (`SCORE`, `NIVEL`, iconos de vida, contador «3x») y su pantalla «GAME OVER» con el puntaje.
- El canvas notifica a React puntuación, vidas, nivel y fin de partida, y el HUD de la plataforma (Jugador, Puntuación, Vidas, Nivel) los muestra.
- Todos los botones y pantallas actuales del Reproductor funcionan con el motor: PAUSA/REANUDAR («EN PAUSA»), FIN, SALIR, modal «FIN DEL JUEGO» con iniciales, «GUARDAR PUNTUACIÓN», «JUGAR DE NUEVO» y «VOLVER AL VAULT».
- Paleta neón tomada de las variables CSS de `app/globals.css` (`--cyan`, `--magenta`, `--yellow`, `--green`).
- Controles de teclado: flechas izquierda/derecha para girar, flecha arriba para propulsar y Espacio para disparar.
- Que las flechas y Espacio no desplacen la página mientras se juega.
- Corregir el campo `long` de ROCAS en `lib/games.ts` (menciona OVNIs que el juego no tiene).

**Fuera de alcance (para otras specs):**

- Controles táctiles o botones en pantalla, aunque el catálogo etiquete los juegos como «TECLADO / TÁCTIL».
- Sonido y música (el original no tiene).
- OVNIs, nuevos power-ups, nuevas mecánicas o cambios de balance respecto al original.
- Los otros 7 juegos: siguen con la simulación actual.
- Puntuaciones o rankings reales, Supabase y cualquier backend; se sigue guardando en `localStorage` con `saveScore`.
- Tecla de pausa (`P` o `Esc`): la pausa es solo el botón existente.
- Soporte de pantallas de alta densidad (canvas con buffer escalado por `devicePixelRatio`).
- `prefers-reduced-motion` y ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Modificar `references/started-games/02-asteroids/` (se queda como referencia).
- Cambiar `best` y `plays` de ROCAS en el catálogo.
- Tests automatizados (no hay framework instalado).

## Modelo de datos

No hay datos persistentes nuevos: las puntuaciones se guardan con el `SavedScore` y la clave `av:v1:scores` de la SPEC 01, con `gameId: "rocas"`. Solo se añade el contrato del motor y del componente del canvas.

```ts
// lib/asteroids/engine.ts
export type AsteroidsPalette = {
  ship: string;     // nave            → var(--cyan)
  flame: string;    // llama           → var(--yellow)
  bullet: string;   // balas           → var(--yellow)
  asteroid: string; // asteroides      → var(--magenta)
  powerUp: string;  // power-up 3x     → var(--green)
  text: string;     // HUD del canvas  → var(--cyan)
};

export type AsteroidsStats = { score: number; lives: number; level: number };

export type AsteroidsCallbacks = {
  onStats: (s: AsteroidsStats) => void;    // solo cuando cambia algún valor
  onGameOver: (s: AsteroidsStats) => void; // una vez por partida
};

export class AsteroidsEngine {
  constructor(canvas: HTMLCanvasElement, palette: AsteroidsPalette, cb: AsteroidsCallbacks);
  start(): void;                 // nueva partida e inicio del bucle requestAnimationFrame
  restart(): void;               // nueva partida (3 vidas, nivel 1, puntuación 0)
  setPaused(paused: boolean): void;
  finish(): void;                // termina la partida (botón FIN)
  destroy(): void;               // cancela el bucle y quita los listeners de teclado
}
```

```tsx
// components/asteroids-canvas.tsx  ("use client")
export type AsteroidsHandle = { restart(): void; finish(): void };

export default function AsteroidsCanvas(props: {
  ref: React.Ref<AsteroidsHandle>;
  paused: boolean;
  onStats: (s: AsteroidsStats) => void;
  onGameOver: (s: AsteroidsStats) => void;
}): JSX.Element;
```

Convenciones:

- Archivos del motor: `lib/asteroids/entities.ts` (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, utilidades `wrap`, `dist`, `rand`, `randInt`) y `lib/asteroids/engine.ts`. Las entidades reciben el contexto 2D y la paleta en `draw`; no leen el DOM.
- El canvas tiene 800×600 píxeles lógicos (`W`, `H` del original). Se escala con CSS al 100 % del `.crt-screen`, que ya es 4:3.
- Se conservan los valores del original: balas (velocidad 520, vida 1,1 s, radio 2), radios `[16, 30, 50]`, velocidades base `[85, 55, 32]` y puntos `[100, 50, 20]` por tamaño 1, 2 y 3, nave (giro 3,5 rad/s, empuje 260, rozamiento 0,987, radio 12, 3 s de invencibilidad al reaparecer, cadencia 0,2 s), power-up (15 % de probabilidad, asegurado al 5.º asteroide destruido, 5 s de efecto, 12 s en pantalla, abanico de 0,18 rad), 4 asteroides iniciales y `3 + nivel` por nivel, distancia segura de 130 px al centro, 2 s de espera tras perder una vida y tope de `dt` de 0,05 s.
- Colores: ningún literal en `lib/asteroids/` salvo el fondo `#000`. Las partículas de una explosión usan el color del objeto que explota (nave: `ship`, asteroide: `asteroid`) con `globalAlpha` para el desvanecido.
- `onStats` se emite al iniciar y solo cuando cambia `score`, `lives` o `level`, nunca en cada fotograma.
- El HUD de la plataforma usa el `level` y las `lives` del motor, no la fórmula `1 + floor(puntuación / 2500)` de la simulación.
- Teclado: el motor registra `keydown`/`keyup` en `window` al iniciar y los quita en `destroy()`. Siempre actualiza el estado de las teclas en `keyup`; ignora `keydown` cuando el objetivo es un `<input>` o `<textarea>`, cuando la partida está en pausa o terminada. Llama a `preventDefault()` en las teclas del juego mientras las usa. Al pausar, reanudar y reiniciar descarta las pulsaciones pendientes (`justPressed`).
- Los textos del HUD del canvas se conservan del original: `SCORE n`, `NIVEL n`, `3x n.ns`. El texto de «GAME OVER» pasa a `GAME OVER` / `PUNTAJE: n`, sin «ESPACIO PARA REINICIAR».

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`); para el paso 5 y 6, la de componentes de cliente (`01-app/02-guides/server-and-client-boundary.md`). Para la interfaz se usa siempre la skill `frontend-design`, con el aspecto actual del Reproductor como referencia.

1. **Catálogo.** En `lib/games.ts`, reescribir solo `long` de ROCAS: «Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños, recoge el disparo triple y sobrevive nivel tras nivel con solo tres vidas.». Verificación: `/juegos/rocas` muestra el texto nuevo, sin «OVNIs», y `best` y `plays` no cambian.
2. **Utilidades y entidades pasivas.** Crear `lib/asteroids/entities.ts` con `wrap`, `dist`, `rand`, `randInt` y las clases `Bullet`, `Asteroid` (con `split()`), `PowerUp` y `Particle`, portadas de `game.js`. `draw(ctx, color)` recibe el color y no lee globales. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
3. **Nave.** Añadir a `entities.ts` la clase `Ship`, que recibe el estado de las teclas como parámetro en `update(dt, keys)` en lugar de leer una variable global, con `tryShoot()` y `draw(ctx, palette)`. Verificación: `tsc` y `lint` pasan.
4. **Motor.** Crear `lib/asteroids/engine.ts` con `AsteroidsEngine`: estado de partida, bucle `requestAnimationFrame`, colisiones, niveles, HUD y «GAME OVER» dibujados en el canvas, teclado según las convenciones y los callbacks `onStats` y `onGameOver`. Verificación: `tsc` y `lint` pasan.
5. **Canvas en el Reproductor.** Crear `components/asteroids-canvas.tsx` (lee la paleta de las variables CSS al montar, crea el motor en un efecto y lo destruye al desmontar, aplica `setPaused`) y modificar `components/game-player.tsx` para que, cuando `game.id === "rocas"`, renderice el canvas en lugar de `.game-arena` y no arranque el intervalo de la simulación. El HUD de la plataforma muestra puntuación, vidas y nivel recibidos por `onStats`; PAUSA/REANUDAR y «EN PAUSA» controlan el motor. Verificación: `/juegos/rocas/jugar` es jugable con el teclado, el HUD de la plataforma coincide con el del canvas y `/juegos/caida/jugar` sigue con la simulación.
6. **Fin de partida y reinicio.** Conectar `onGameOver` para abrir el modal «FIN DEL JUEGO» con la puntuación final, FIN a `finish()` y «JUGAR DE NUEVO» a `restart()` junto con el reinicio del estado de React. Verificación: se completa el ciclo jugar → perder → guardar → ver la marca en la pestaña ROCAS del Salón.

## Criterios de aceptación

**Rutas y proyecto**

- [ ] `/juegos/rocas/jugar` responde 200 y muestra el canvas del juego dentro del marco CRT.
- [ ] `/juegos/caida/jugar` conserva la simulación: contiene `.game-arena` y su puntuación sube sola.
- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores, y `npx eslint app components lib` no devuelve errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/rocas/jugar`.
- [ ] `lib/asteroids/` no contiene `document.`, `getElementById` ni colores literales salvo el fondo `#000`.
- [ ] Los archivos de `references/started-games/02-asteroids/` no tienen cambios en `git status`.
- [ ] El texto `long` de ROCAS no contiene «OVNI» y sus campos `best` (41200) y `plays` ("15.6K") no cambian.

**Canvas y partida**

- [ ] El canvas tiene 800×600 píxeles lógicos, ocupa el 100 % de `.crt-screen` y no se deforma.
- [ ] Al empezar hay 4 asteroides, todos a 130 px o más del centro, la nave está en el centro apuntando hacia arriba y parpadea durante 3 s.
- [ ] El canvas muestra `SCORE 0`, `NIVEL 1` y 3 iconos de nave.
- [ ] Flecha izquierda y derecha giran la nave, flecha arriba la propulsa con llama y los objetos que salen por un borde reaparecen por el opuesto.
- [ ] Espacio dispara una bala por pulsación (con 0,2 s de cadencia); mantenerlo pulsado no dispara en ráfaga.
- [ ] Un asteroide de tamaño 3 destruido suma 20, uno de tamaño 2 suma 50 y uno de tamaño 1 suma 100; los de tamaño 3 y 2 se dividen en dos del tamaño inferior.
- [ ] Al chocar con un asteroide sin invencibilidad se pierde una vida, hay explosión, la nave reaparece a los 2 s y vuelve a ser invencible 3 s.
- [ ] Destruir todos los asteroides sube el nivel en 1 y genera `3 + nivel` asteroides nuevos.
- [ ] Tras destruir 5 asteroides sin que haya salido power-up, aparece uno «3x»; al recogerlo, cada disparo lanza 3 balas durante 5 s y el canvas muestra el contador `3x n.ns`.
- [ ] Nave y llama, balas, asteroides y power-up usan los colores cian, amarillo, magenta y verde de las variables CSS de `globals.css` (no el blanco original).
- [ ] Pulsar flechas y Espacio durante la partida no desplaza la página.

**HUD y botones de la plataforma**

- [ ] El HUD muestra Jugador («INVITADO»), Puntuación, Vidas (♥) y Nivel con dos dígitos, y sus valores coinciden con `SCORE`, las naves y `NIVEL` del canvas.
- [ ] Tras destruir un asteroide grande, Puntuación pasa a `20`; tras perder una vida, Vidas pasa de 3 a 2 corazones; tras limpiar el nivel, Nivel pasa a `02`.
- [ ] «PAUSA» detiene nave, asteroides y balas, muestra la capa «EN PAUSA» y cambia el botón a «REANUDAR»; reanudar continúa sin saltos.
- [ ] Una tecla pulsada al pausar y soltada durante la pausa no queda «pegada» al reanudar.
- [ ] Con «PAUSA» o «REANUDAR» recién pulsado, Espacio no activa el botón y sí dispara cuando la partida está en marcha.
- [ ] «FIN» abre el modal «FIN DEL JUEGO» con la puntuación actual, y el canvas muestra `GAME OVER` y `PUNTAJE: n`.
- [ ] Al perder la última vida se abre el modal automáticamente con la puntuación final, y el canvas muestra `GAME OVER` sin el texto «ESPACIO PARA REINICIAR».
- [ ] Con el modal abierto, escribir espacios en el campo de iniciales no reinicia la partida ni dispara.
- [ ] «GUARDAR PUNTUACIÓN» añade a `av:v1:scores` una entrada `{ gameId: "rocas", name, score, at }` y muestra «PUNTUACIÓN GUARDADA».
- [ ] La puntuación guardada aparece en la fila «TU MEJOR MARCA» de la pestaña ROCAS del Salón.
- [ ] «JUGAR DE NUEVO» cierra el modal y reinicia: canvas con partida nueva, Puntuación 0, 3 vidas, Nivel 01 y sin estado de guardado.
- [ ] «SALIR» navega a `/juegos/rocas` y «VOLVER AL VAULT» (modal) a `/juegos`.
- [ ] Tras salir del Reproductor, pulsar Espacio y las flechas no produce errores en consola ni cambios en la página (el bucle y los listeners se han destruido).
- [ ] Volver a entrar en `/juegos/rocas/jugar` y salir varias veces no acumula bucles: la nave se mueve a la misma velocidad que en la primera visita.

## Decisiones tomadas y descartadas

- **Sí:** portar el juego a TypeScript con el motor separado de React en `lib/asteroids/`. Permite conectar el HUD, la pausa y el guardado de la plataforma y destruir limpiamente el bucle. **No:** incrustar `index.html` en un iframe: no hay forma de leer la puntuación ni de usar el HUD o el guardado.
- **Sí:** el canvas conserva su HUD y la plataforma mantiene todo el suyo; el canvas notifica a React. **No:** quitar el HUD del canvas, ni que React lea el estado del juego en cada fotograma.
- **Sí:** `onStats` solo se emite cuando cambia un valor. Evita unos 60 renders por segundo del Reproductor.
- **Sí:** el HUD de la plataforma usa el nivel y las vidas del motor. **No:** la fórmula `1 + floor(puntuación / 2500)` y las 3 vidas fijas de la simulación, que no corresponden a un juego real.
- **Sí:** «GAME OVER» en el canvas y modal de la plataforma a la vez; el reinicio es solo con «JUGAR DE NUEVO». **No:** conservar «ESPACIO PARA REINICIAR»: el modal tiene un campo de texto donde se escribe con la barra espaciadora y reiniciaría la partida por error.
- **Sí:** «FIN» llama a `finish()` del motor, de modo que el canvas y el modal siguen la misma ruta que perder la última vida. **No:** un estado de fin independiente en React.
- **Sí:** paleta neón con los colores de las variables CSS (nave cian, llama y balas amarillas, asteroides magenta, power-up verde, HUD cian). **No:** el blanco monocromo original, ni colores literales en el motor.
- **Sí:** las partículas llevan el color del objeto que explota y se desvanecen con `globalAlpha`. **No:** `rgba(255,255,255,…)` como el original.
- **Sí:** solo teclado, como el original. Los controles táctiles son UI y lógica de entrada nuevas y van en otra spec.
- **Sí:** el motor ignora `keydown` en `<input>`/`<textarea>` y llama a `preventDefault()` en las teclas del juego. Evita desplazamientos de página y que Espacio active el botón que tenga el foco.
- **Sí:** descartar las pulsaciones pendientes (`justPressed`) al pausar, reanudar y reiniciar. Es un ajuste sobre el original, donde una pulsación hecha mientras la nave estaba destruida disparaba al reaparecer. **No:** otros cambios de comportamiento ni de balance.
- **Sí:** conservar todos los valores numéricos del original. Es un port, no un rediseño del juego.
- **Sí:** canvas de 800×600 lógicos escalado con CSS al 100 % del `.crt-screen` (ya 4:3). **No:** redimensionar el buffer ni soportar alta densidad en esta spec; el juego se ve algo suavizado en pantallas grandes, igual que el original.
- **Sí:** la paleta se lee de las variables CSS al montar el componente y se pasa al motor. **No:** que el motor consulte el DOM.
- **Sí:** el Reproductor elige el motor comparando `game.id === "rocas"`. **No:** añadir un campo al tipo `Game` o un registro: se generalizará cuando exista un segundo juego real.
- **Sí:** corregir solo `long` de ROCAS, para que describa lo que el juego tiene. **No:** tocar `best` ni `plays`, que siguen siendo mock.
- **Sí:** pausa solo con el botón existente. **No:** teclas `P` o `Esc`, que el original no tiene.
- **Sí:** sin sonido, como el original.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| El motor se crea dos veces en desarrollo (React Strict Mode monta, desmonta y vuelve a montar) y quedan dos bucles o dos juegos de listeners | `destroy()` cancela el `requestAnimationFrame` y quita los listeners; el efecto del componente lo llama en su limpieza. Criterio de aceptación sobre bucles acumulados. |
| Tras pulsar PAUSA o REANUDAR el botón conserva el foco y Espacio lo activaría | El motor hace `preventDefault()` de `keydown` y `keyup` en las teclas del juego cuando no se escribe en un campo. Criterio de aceptación. |
| Teclas «pegadas» si se suelta una tecla durante la pausa o con el modal abierto | `keyup` actualiza siempre el estado de las teclas; solo `keydown` se filtra. Las pulsaciones pendientes se descartan al pausar, reanudar y reiniciar. |
| Escribir las iniciales en el modal dispara o reinicia el juego | El motor ignora `keydown` cuyo objetivo sea `<input>` o `<textarea>` y también cuando la partida está terminada. |
| El simulador de la plataforma y el motor suman puntuación a la vez en ROCAS | El efecto del intervalo en `game-player.tsx` no se ejecuta cuando `game.id === "rocas"`. Criterio: la puntuación de ROCAS no sube sola. |
| Una variable CSS de color no existe y el canvas dibuja con color vacío, es decir, ignorado | El criterio de aceptación comprueba que nave, rocas, balas y power-up se ven con los colores esperados. |
| Demasiados renders por emitir estadísticas en cada fotograma | `onStats` solo se llama al cambiar `score`, `lives` o `level`. |
| `Math.random()` se ejecuta durante el prerender y causa un aviso de hidratación | Los asteroides y el resto del juego se crean en `start()`, dentro del efecto del componente, nunca durante el render. |
| El bucle consume CPU en segundo plano | `requestAnimationFrame` se detiene en pestañas ocultas y el `dt` está limitado a 0,05 s. |

## Lo que **no** entra en esta spec

- Controles táctiles o botones en pantalla.
- Sonido, música, OVNIs, nuevos power-ups o cambios de balance.
- Los otros 7 juegos; siguen con la simulación.
- Rankings o puntuaciones reales, Supabase ni backend.
- Teclas de pausa, `prefers-reduced-motion`, alta densidad de píxeles ni ajustes de rendimiento.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Modificar el juego original en `references/started-games/02-asteroids/`.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.
