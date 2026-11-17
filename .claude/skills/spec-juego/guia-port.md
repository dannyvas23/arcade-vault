# Guía de port: de un juego JS suelto a un motor TypeScript integrado

Úsala en la Fase 1 de `/spec-juego` cuando el juego viene de `references/started-games/`. Lee todos los archivos del juego y responde la checklist citando el código (constantes, nombres, líneas). Lo que no esté en el código se pregunta al usuario; no se inventa.

## 1. Checklist sobre el juego de origen

**Estructura**
- ¿Cuántos archivos y cómo se cargan (`<script>` encadenados con globales compartidos, módulos)?
- ¿Cuántos canvas hay y de qué tamaño lógico? ¿Hay canvas secundarios (p. ej. «siguiente pieza»)?
- ¿Cómo localiza el canvas (`document.getElementById`)? → pasa a recibirlo por constructor.
- ¿Qué estado vive en globales? → pasa a campos de la clase del motor.

**Entrada**
- ¿Dónde registra los listeners (`window`, `document`, canvas) y con qué propiedad (`e.code` o `e.key`)?
- ¿Usa `keyup` y un mapa de teclas, o eventos discretos por pulsación? ¿Gestiona `e.repeat`?
- ¿Usa ratón o táctil? ¿Cómo convierte coordenadas?
- ¿Qué teclas llaman a `preventDefault`?

**Bucle y tiempo**
- ¿`dt` continuo (con o sin tope) o acumulador de intervalo? ¿Cómo se pausa y se reanuda (reinicio de `lastTime`)?
- ¿El `requestAnimationFrame` se cancela alguna vez? (en el motor debe cancelarse en `destroy()`).

**Estado de partida**
- Puntuación: ¿cómo y cuánto suma cada evento?
- ¿Tiene vidas? ¿Niveles (y cómo suben)? ¿Otra métrica (líneas, bloques)?
- Condición de fin (vidas a 0, pieza que no cabe, bola perdida…), ¿hay estado de victoria?
- ¿Cómo se reinicia y se puede reiniciar? (si no hay reinicio, el motor necesita `restart()`).
- ¿Tiene pausa? ¿Por tecla, botón o menú?

**HUD y presentación**
- ¿El HUD se dibuja en el canvas o está en el DOM (`#score`…)? ¿Overlays de pausa/fin en el DOM?
- ¿Colores: literales, variables CSS (`getComputedStyle`), sprites?
- ¿Tema claro/oscuro, `localStorage`, otras dependencias del navegador?

**Recursos**
- ¿Sprites, imágenes, audio? ¿Rutas relativas y carga asíncrona antes de arrancar?

**Aleatoriedad**
- ¿Dónde se llama a `Math.random()`? (debe ocurrir en `start()`/`restart()`, no en el constructor ni al importar).

## 2. Los tres juegos de referencia

| Aspecto | 02-asteroids | 03-tetris | 04-arkanoid |
| ------- | ------------ | --------- | ----------- |
| Archivos | `game.js`, `index.html`, `favicon.svg` | `game.js`, `index.html`, `style.css`, `README.md` | `game.js`, `levels.js`, `index.html`, `assets/` (sprites y sonidos), specs propias |
| Canvas | 1 de 800×600 | `#board` 300×600 (10×20 celdas de 30 px) y `#next-canvas` 120×120 | 1 de 800×600 |
| HUD | En el canvas | En el DOM (`#score`, `#lines`, `#level`) | En el canvas (puntos, nivel, bolas de vida con sprite) |
| Entrada | `window` keydown/keyup con `e.code`; `justPressed` para el disparo | `document` keydown, eventos discretos, sin `keyup` | `document` teclado con `e.key` + `mousemove` en el canvas con escala |
| Tiempo | `dt` continuo, tope 0,05 s | Acumulador `dropAccum`; intervalo `max(100, 1000 - (nivel-1)*90)` ms | `dt` continuo sin tope |
| Vidas | 3 | No | 3 |
| Nivel | Sube al destruir todos los asteroides | Cada 10 líneas | 5 niveles en `levels.js` |
| Fin | `gameover` al quedar sin vidas | Pieza nueva que colisiona al aparecer | Sin vidas (`gameover`) o nivel 5 completado (`win`) |
| Reinicio original | Espacio | Botón del DOM | **Ninguno** |
| Pausa original | No | `P` | `P` o `Esc` (con salto de nivel de depuración) |
| Extras | Power-up 3x, partículas | Tema claro/oscuro, pieza «tuerca», ghost, siguiente pieza | Sprites, audio, explosiones de bloques |
| Estado del port | **Hecho** (SPEC 04) | Pendiente | Pendiente |

## 3. Recomendación por cada diferencia

| Situación en el original | Decisión recomendada para el port |
| ------------------------ | --------------------------------- |
| Globales y carga con `<script>` | Clase del motor + módulos TS en `lib/<id>/`. |
| `document.getElementById` | Canvas por constructor; el wrapper lo crea. |
| Listeners en `document` | Registrar en `window` en `start()` y quitar en `destroy()`. |
| Reinicio por Espacio | Eliminarlo; reinicio solo con «JUGAR DE NUEVO» (`restart()`). |
| Sin función de reinicio | Añadir `restart()` que reconstruya el estado. |
| Pausa por `P`/`Esc` o menú | Sustituir por el botón de la plataforma (`setPaused`); el salto de nivel de depuración queda fuera. |
| HUD en el DOM | Trasladar puntuación, nivel (y vidas) al HUD de la plataforma vía `onStats`; quitar los `getElementById` del motor. Métricas sin hueco (líneas) se muestran en el canvas o se descartan: preguntar. |
| Overlay de fin en el DOM | Pantalla de fin dibujada en el canvas + modal de la plataforma. |
| Segundo canvas («siguiente») | Dibujarlo dentro del canvas principal (ampliando el tamaño lógico) o descartarlo; el motor no debe buscar canvas por su cuenta. Decidir con el usuario. |
| Juego sin vidas o sin nivel | `lives`/`level` opcionales en `GameStats`; el HUD muestra «—». |
| Estado de victoria (`win`) | Tratarlo como fin de partida (`onGameOver`) con la puntuación final; el canvas muestra su texto de victoria. |
| Acumulador de intervalos | Conservarlo; al pausar/reanudar reiniciar `lastTime` y `dropAccum` según el original. |
| Ratón | Conversión CSS→lógico con `getBoundingClientRect` y el factor `canvas.width / rect.width`; listeners del canvas retirados en `destroy()`. Pedir confirmación: lo táctil sigue fuera de alcance. |
| Sprites e imágenes | Copiar a `public/games/<id>/` (el original queda intacto) y cargar antes del primer fotograma; `start()` espera la carga o muestra el canvas vacío hasta entonces. Registrar como paso del plan. |
| Audio | Fuera de alcance por defecto (decisión explícita en la spec). Si entra: mp3 en `public/games/<id>/`, reproducir tras interacción del usuario y silenciar en pausa. |
| Tema claro/oscuro y `localStorage` propio | Fuera del motor y descartado (la plataforma tiene su tema y su guardado). |
| Colores literales o `getComputedStyle` en el motor | Paleta inyectada desde el wrapper con las variables CSS de la plataforma. |
| `Math.random()` a nivel de módulo | Mover a `start()`/`restart()`. |
| Valores numéricos | Se conservan tal cual; la spec los lista. |

## 4. Qué debe quedar en la spec tras analizar el origen

- Tabla de **constantes y reglas del original** que se conservan (con su valor).
- Lista de **cambios necesarios para integrar** (los de la tabla anterior que apliquen), cada uno como decisión con motivo.
- Lista de **extras descartados** (a «Fuera de alcance»).
- Mapeo explícito de **estadísticas** del juego a `score`/`lives`/`level` del HUD.
- Pasos extra del plan por recursos (copiar assets, canvas secundario, ratón).
