- [Historial de sugerencias](historial-sugerencias.md) — registro de juegos sugeridos, veredicto y estado (primera ejecución 2026-11-21; actualizado 2026-11-24)

## Criterios y preferencias del usuario

- Rechazos registrados: ninguno todavía.
- Elección en la game jam «invasores» (2026-11-24): el usuario aprobó la **lectura directa del tema** (shooter clásico, variante A) y rechazó la variante B, un puzle de colores. Un único dato: no lo trates aún como preferencia firme por los clones fieles del arcade clásico.
- Patrón del proyecto: los juegos mock del catálogo se implementan sin duplicar fila; si sus puntuaciones sembradas son inalcanzables a escala real, la spec las borra por la cascada de `scores_game_id_fkey` (precedentes: SPEC 08 SNAKE y SPEC 09 INVADERS).
- Estado del catálogo a 2026-11-24: 5 juegos con motor real (ROCAS, TETRIS, ARKANOID, SNAKE, INVADERS); quedan simulados GLOTÓN, RANARIA y DUELO PIXEL. Las sugerencias pendientes (RANARIA, GLOTÓN, DUELO PIXEL) siguen en «Sugerido» y las razones de su veredicto no han cambiado.
- Los juegos pueden llegar por dos vías: `/spec-juego` tras tu recomendación, o el agente `game-jam`, que escribe 2 variantes en `specs/game-jam/<tema>/`. Al reconciliar el estado, mira también esa carpeta.
- `references/game-suggestions-todo.md` existe pero está vacío (2026-11-21).
