---
name: spec-juego
description: Genera la spec para crear o portar un juego en Arcade Vault con su leaderboard y su integración en la plataforma (motor TS, canvas, Reproductor, catálogo en Supabase, ranking). El juego puede venir de references/started-games o ser una idea nueva. Úsalo antes de implementar un juego; no escribe código.
disable-model-invocation: true
argument-hint: '<ruta en references/started-games | nombre o idea del juego>'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(git status:*), Bash(git log:*), mcp__supabase__list_tables, mcp__supabase__execute_sql
---

# /spec-juego — Spec de un juego con leaderboard para Arcade Vault

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Juegos de referencia disponibles:
!`ls references/started-games 2>/dev/null || echo "No existe references/started-games"`

Configuración de specs:
!`cat specs/.spec-config.yml 2>/dev/null || echo "Sin .spec-config.yml"`

Estado del árbol de trabajo:
!`git status --short 2>/dev/null | head -20`

---

Este skill produce **una spec** (`specs/NN-juego-<slug>.md`) que describe cómo llevar un juego a Arcade Vault: motor TypeScript, canvas, integración con el Reproductor, alta en el catálogo (`games`) y leaderboard en Supabase. **No escribes código de la app ni aplicas migraciones.** La implementación la hace después `/spec-impl`.

El patrón sale de dos specs ya implementadas, que son la referencia: `specs/04-juego-rocas.md` (primer juego real: motor, canvas, Reproductor) y `specs/05-leaderboard-y-tabla-de-juegos.md` (tablas `games` y `scores`, ranking, guardado). Su contenido está destilado en los archivos de este skill.

## Referencia obligatoria: la skill `/spec`

Este skill **no define por sí solo el formato de la spec**: lo toma de la skill `spec` del proyecto. Antes de escribir el archivo de especificación **debes haber leído, en esta ejecución**:

- `.claude/skills/spec/SKILL.md` — flujo, reglas de redacción, numeración, estado por defecto, comprobación de dependencias, `.spec-config.yml` y reglas duras (es un symlink a `.agents/skills/spec/SKILL.md`; si el symlink no se resuelve, lee `.agents/skills/spec/SKILL.md`).
- `.claude/skills/spec/template.md` — estructura y secciones de la spec, estados válidos y reglas globales del documento.

Si alguno no existe o no se puede leer, **detente y avisa al usuario**; no escribas la spec con un formato supuesto.

Reparto de responsabilidades: `/spec` manda en la **forma** (cabecera, orden de secciones, estados, estilo, guardado); este skill aporta el **contenido** específico de un juego (contrato de integración, análisis del juego de origen, preguntas, criterios y plan). Si hay conflicto, prevalece `/spec`.

Archivos de apoyo de este skill (en el mismo directorio que este `SKILL.md`; léelos con Read cuando toque):

- `contrato-integracion.md` — reglas y pasos que toda spec de juego hereda.
- `guia-port.md` — checklist para analizar el juego de origen y tabla de los 3 juegos de referencia.
- `plantilla-spec-juego.md` — esqueleto de contenido de la spec, que se ajusta al formato de `/spec`.

Responde en el idioma del prompt del usuario (por defecto, español, como las specs del repo).

## Fases

Sigue las fases en orden.

### Fase 0 — Reconocimiento (sin preguntar nada)

1. **Lee la skill `/spec`**: `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` (ver «Referencia obligatoria»). Extrae de ahí el formato de cabecera, el orden de secciones, los estados válidos, las reglas de redacción y los pasos de guardado.
2. Lee `contrato-integracion.md` y `plantilla-spec-juego.md`.
3. Lee `CLAUDE.md` y `AGENTS.md` del proyecto, y `specs/04-*` y `specs/05-*` si existen (si faltan, avisa: el proyecto no es Arcade Vault o está en otro estado, y pregunta cómo seguir).
4. Lee las dos specs más recientes de `specs/` para igualar idioma, nombres de estado (`Borrador`, `Implementado`…) y encabezados, tal como pide `/spec` en su Fase 1.
5. Número de spec: el mayor de `specs/` + 1, con dos dígitos.
6. Estado del Reproductor: busca en `components/game-player.tsx` (y alrededores) si el juego se elige con `game.id === "rocas"` (hay que refactorizar a un registro) o si ya existe un registro de juegos (basta añadir una entrada). Esto decide si la spec incluye el paso de refactor.
7. Catálogo: con `mcp__supabase__execute_sql` (solo `select`) obtén `id`, `title`, `sort_order`, `cover` de `public.games`, para no repetir `id` ni `sort_order`. Si no hay acceso al MCP, déjalo como pregunta al usuario.
8. Portadas: lista las clases `.cover-*` de `app/globals.css`.

### Fase 1 — Origen del juego

- Si `$ARGUMENTS` es una carpeta (por ejemplo `references/started-games/03-tetris` o solo `03-tetris`), **lee todos sus archivos fuente** (`index.html`, `game.js`, `levels.js`, CSS, README, specs internas…) y rellena la checklist de `guia-port.md`. Cita datos concretos del código (constantes, controles, condiciones de fin); no inventes comportamiento.
- Si `$ARGUMENTS` es una idea o un nombre sin carpeta, trátalo como juego nuevo: el motor se diseña desde cero y las mecánicas y valores numéricos se fijan con el usuario en la Fase 2.
- Si viene vacío, pide una descripción de una frase y muestra los juegos disponibles en `references/started-games/`.
- **Nunca modifiques `references/`.**

### Fase 2 — Preguntas

Usa `AskUserQuestion` en bloques de 3 a 4. Pon tu recomendación primero. Cubre, saltando lo que ya sepas por el código leído:

1. **Identidad:** `id` (slug de la ruta), título corto en mayúsculas, categoría (`ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`), color (`cyan`, `magenta`, `yellow`, `green`).
2. **Portada:** concepto visual de la clase `cover-<id>` en CSS puro (la tarjeta queda vacía sin ella).
3. **Stats y HUD:** qué reporta el juego a la plataforma (`score` siempre; `lives` y `level` si existen). Si no tiene vidas o nivel, el HUD muestra «—». ¿Hay una métrica extra (líneas, bloques)?
4. **Extras del original:** sonido, tecla de pausa, tema claro/oscuro, salto de nivel de depuración, pantalla de victoria, reinicio por tecla. Recomendación por defecto: se descartan o se mueven a la plataforma, según `contrato-integracion.md`.
5. **Controles:** solo teclado (por defecto) o también ratón/táctil. Lo táctil va en otra spec salvo petición expresa.
6. **Catálogo:** `sort_order` (¿entra entre los 6 primeros de la home?), `plays` inicial, textos `short` y `long` (el `long` debe describir solo lo que el juego tiene), y si se siembran puntuaciones o el ranking empieza vacío.
7. **Mecánicas y balance:** si es un juego nuevo, valores numéricos clave; si es un port, confirma que se conservan los del original.

Si algo abre una caja de Pandora (multijugador, backend propio, antitrampas, auth), dilo y propón dejarlo en su propia spec.

Para de preguntar cuando puedas responder sin suponer: qué archivos aparecen o cambian, cuál es el primer y el último paso ejecutable, y cómo se verifica que está terminado.

### Fase 3 — Redacción

**Antes de redactar, confirma que leíste `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` en esta ejecución** (Fase 0). Si no es así, léelos ahora.

Con la información completa, escribe la spec entera de una vez (sin confirmar sección por sección, igual que `/spec` en su Fase 3). Solo si falta información, desarrolla por secciones mostrando cada una y esperando confirmación.

La estructura sigue `template.md` de `/spec` (cabecera en blockquote, Alcance con «Dentro» y «Fuera», Modelo de datos, Plan de implementación, Criterios de aceptación, Decisiones, Riesgos, «Lo que no entra») y el contenido sigue `plantilla-spec-juego.md`. Respeta las «Global rules about the whole document» de `template.md`: una idea por frase, nombres concretos, sin TODOs, sin código largo, markdown estándar. Adapta el plan y los criterios al juego concreto; nada de placeholders sin resolver ni TODOs. Reglas de contenido:

- El **objetivo** cabe en una frase.
- Hereda del contrato todos los criterios de motor, teclado, ciclo de vida, HUD, guardado y proyecto; añade los específicos del juego (mecánicas, puntuación, condiciones de fin) con números del código de origen.
- Si el Reproductor aún usa `game.id === "rocas"`, el plan incluye el paso de refactor al registro (con los tipos comunes `GameStats`, `GameHandle`, `GameCanvasProps`) **antes** de integrar el juego nuevo, y los criterios comprueban que ROCAS sigue igual.
- La migración del catálogo se describe como `INSERT` en `public.games` (SQL completo en la spec, ilustrativo) y se aplica en la implementación con `apply_migration`, no aquí.
- «Decisiones» recoge lo elegido y lo descartado con motivo; «Riesgos» incluye los del contrato que apliquen y los propios del juego; cierra con «Lo que no entra».
- Cada paso del plan debe dejar el proyecto compilando y ser commiteable; verifica que cada dependencia (`Depende de:`) existe en `specs/`.

### Fase 4 — Guardar

Aplica los pasos de la Fase 4 de `/spec` (`.claude/skills/spec/SKILL.md`), que ya habrás leído:

1. Numeración: la calculada en la Fase 0 (mayor número de `specs/` + 1, dos dígitos). Nombre de archivo `specs/NN-juego-<slug>.md`, con el slug en kebab-case.
2. Fecha: la del contexto de la sesión, nunca una inventada.
3. Escribe el archivo directamente, sin pedir permiso (pregunta solo si ya existe).
4. Estado `Borrador` (o el equivalente que usen las specs del repo). Nunca `Aprobado`.
5. Comprueba que cada spec citada en `Depende de:` existe en `specs/`; si una no existe, dilo en lugar de dejar una referencia colgante.
6. Si `specs/.spec-config.yml` no existe, créalo con el contenido por defecto que indica `/spec`; si existe, no lo toques.
7. Confirma al usuario: ruta del archivo, que está en `Borrador` y que debe pasarlo a `Aprobado` tras revisarla, y el siguiente paso: `/spec-impl NN-juego-<slug>`.
8. **Detente.** No propongas implementar ni escribas código.

## Reglas duras

- **No escribas el archivo de la spec sin haber leído antes `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` en esta ejecución.** Si no puedes leerlos, detente y avisa.
- No escribas código de la aplicación, ni SQL aplicado, ni archivos fuera de `specs/`.
- En Supabase solo `select` (lectura). Nada de `apply_migration`, inserts ni DDL.
- No modifiques nada dentro de `references/`.
- No inventes el comportamiento del juego de origen: cítalo del código que leíste. Si algo no está claro, pregunta.
- Port, no rediseño: conserva mecánicas y valores del original salvo los cambios que figuren en «Decisiones».
- No marques la spec como `Aprobado` ni propongas implementarla.
- Si la petición es demasiado grande (varios juegos a la vez), propón una spec por juego.
