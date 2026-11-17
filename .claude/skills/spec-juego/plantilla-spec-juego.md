# Plantilla de spec de juego para Arcade Vault

Esqueleto que sigue `/spec-juego`. **No se copia literal**: se adapta al juego concreto, se eliminan las notas entre `<…>` y no queda ningún placeholder sin resolver. La estructura, la cabecera y los nombres de estado los fija `.claude/skills/spec/template.md` (skill `/spec`), que se lee siempre antes de escribir: si algo de esta plantilla choca con él, prevalece `template.md`. El idioma es el de las specs existentes (español en Arcade Vault). El nombre de archivo es `specs/NN-juego-<slug>.md`.

Ejemplos de referencia: `specs/04-juego-rocas.md` (juego) y `specs/05-leaderboard-y-tabla-de-juegos.md` (catálogo y ranking).

---

````markdown
# SPEC NN — Juego {{TÍTULO}} ({{nombre original}}) jugable en el Reproductor

> **Estado:** Borrador
> **Depende de:** SPEC 01 (Reproductor, catálogo, `ScoresProvider`), SPEC 04 (juego ROCAS), SPEC 05 (tabla de juegos y leaderboard){{, SPEC XX si aplica}}
> **Fecha:** {{AAAA-MM-DD, de la fecha de sesión}}
> **Objetivo:** <Una frase: portar/crear {{TÍTULO}}, darlo de alta en el catálogo y conectarlo al HUD, los botones, el modal de guardado y el leaderboard de la plataforma.>

---

## Por qué existe esta spec

<Origen del juego (`references/started-games/<carpeta>/` o idea nueva), cómo está escrito hoy (globales, DOM, HUD, entrada) y por qué hay que adaptarlo. Qué hace la plataforma con él: segundo juego real tras ROCAS (o enésimo), el resto sigue con la simulación. Si el Reproductor aún usa `game.id === "rocas"`, explica que esta spec introduce el registro de juegos.>

## Alcance

**Dentro:**

- Motor del juego en TypeScript, sin React ni acceso global al DOM, en `lib/{{id}}/`: <entidades y reglas con sus valores del original>.
- Componente de cliente `components/{{id}}-canvas.tsx` con canvas de {{W}}×{{H}} lógicos escalado al marco CRT y destruido al desmontarse.
- <HUD propio del canvas y pantalla de fin, o HUD en la plataforma.>
- El juego notifica puntuación{{, vidas, nivel}} y fin de partida al HUD, los botones y el modal de la plataforma.
- <Si aplica: refactor de `components/game-player.tsx` a un registro de juegos (`GameStats`, `GameHandle`, `GameCanvasProps`), sin cambiar ROCAS ni la simulación.>
- Alta en `public.games` (`id: "{{id}}"`, `sort_order {{n}}`, `plays {{n}}`) y portada `.cover-{{id}}` en `app/globals.css`.
- Paleta neón desde las variables CSS de `app/globals.css`.
- Controles: <teclas>.
- Que las teclas del juego no desplacen la página.

**Fuera de alcance (para otras specs):**

- Controles táctiles o botones en pantalla.
- Sonido y música <salvo decisión contraria>.
- Cambios de mecánicas o de balance respecto al original.
- <Extras del original descartados: tema, salto de nivel, tecla de pausa…>
- Los demás juegos: siguen como están.
- Auth, antitrampas, sincronización de puntuaciones locales y cambios en el esquema de Supabase.
- Modificar `references/started-games/<carpeta>/`.
- Cambios de diseño del marco CRT, del HUD de la plataforma o del modal.
- Tests automatizados (no hay framework instalado).

## Modelo de datos

<Sin datos persistentes nuevos más allá de la fila de `games` y de las `scores` de la SPEC 05; `localStorage` sigue con `av:v1:scores`.>

```ts
// lib/{{id}}/engine.ts
export type {{X}}Palette = { /* colores por rol → variable CSS */ };
export type {{X}}Callbacks = {
  onStats: (s: GameStats) => void;    // solo cuando cambia algún valor
  onGameOver: (s: GameStats) => void; // una vez por partida
};
export class {{X}}Engine {
  constructor(canvas: HTMLCanvasElement, palette: {{X}}Palette, cb: {{X}}Callbacks);
  start(): void;
  restart(): void;
  setPaused(paused: boolean): void;
  finish(): void;
  destroy(): void;
}
```

```sql
-- migración del catálogo (se aplica en la implementación con apply_migration)
insert into public.games (id, title, short, long, category, cover, color, plays, sort_order)
values ('{{id}}', '{{TÍTULO}}', '{{short}}', '{{long}}', '{{CATEGORÍA}}', 'cover-{{id}}', '{{color}}', {{plays}}, {{sort_order}});
```

Convenciones:

- <Tamaño lógico del canvas, archivos del motor, coordenadas, unidades de tiempo.>
- Valores conservados del original: <lista con valores: velocidades, puntos, tiempos, niveles…>.
- Mapeo a la plataforma: `score` = <…>; `lives` = <… o ausente>; `level` = <… o ausente>.
- Colores: ningún literal en `lib/{{id}}/` salvo el fondo `#000`.
- `onStats` al iniciar y solo cuando cambia un valor.
- Teclado: registro en `window` al iniciar, retirada en `destroy()`, filtro de `<input>`/`<textarea>`, pausa y fin, `preventDefault` de las teclas del juego, descarte de pulsaciones pendientes al pausar/reanudar/reiniciar.
- <Texto de fin del canvas; sin reinicio por tecla.>

## Plan de implementación

Cada paso deja el proyecto compilando y es commiteable por sí solo. Antes de cada paso, leer la guía correspondiente en `node_modules/next/dist/docs/` (regla de `AGENTS.md`). Para la interfaz se usa siempre la skill `frontend-design`.

1. **Catálogo y portada.** Migración `INSERT` en `games` y clase `.cover-{{id}}`. Verificación: <…>.
2. **Utilidades y entidades pasivas.** `lib/{{id}}/entities.ts`: <…>. Verificación: `npx tsc --noEmit` y `npm run lint`.
3. **Entidad principal.** <…>.
4. **Motor.** `lib/{{id}}/engine.ts`: <…>. Verificación: `tsc` y `lint`.
5. **Canvas.** `components/{{id}}-canvas.tsx`: <…>.
6. **Registro en el Reproductor.** <Refactor al registro si aplica + alta del juego. Verificación: el juego es jugable, ROCAS y la simulación no cambian.>
7. **Fin de partida y reinicio.** <…> Verificación: jugar → perder → guardar → ver la marca en el ranking de `/juegos/{{id}}`.

<Añade pasos propios: copiar assets a `public/games/{{id}}/`, canvas secundario, ratón…>

## Criterios de aceptación

<Copia y adapta los criterios de la sección 8 de `contrato-integracion.md` (Rutas y proyecto; Canvas y partida; HUD y botones de la plataforma; Catálogo) y añade los específicos del juego, uno por regla del original con su valor: estado inicial, cada control, cada evento de puntuación, condiciones de nivel y de fin. Todos booleanos y verificables.>

## Decisiones tomadas y descartadas

- **Sí:** <…>. **No:** <…> (motivo).
<Incluye al menos las de la sección 9 de `contrato-integracion.md` que apliquen, más las derivadas de la checklist de `guia-port.md`.>

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
<Los de la sección 10 del contrato que apliquen y los propios del juego.>

## Lo que **no** entra en esta spec

- <Repetición de «Fuera de alcance».>

Cada uno de estos puntos, si llega, va en su propia spec.
````

---

## Reglas de redacción

- Una idea por frase; nombres concretos de archivos, funciones y claves exactas.
- Sin TODOs: una decisión sin tomar se pregunta en la Fase 2 o se anota como decisión pendiente con motivo.
- Sin funciones largas de código: solo contratos, tipos y el SQL del `INSERT`.
- Los criterios son booleanos y verificables; nada de «que funcione bien».
- Markdown estándar que se vea bien en GitHub.
- No marcar la spec como `Aprobado`.
