"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GAME_REGISTRY, type GameEntry } from "@/components/game-registry";
import { useScores } from "@/components/scores-provider";
import type { GameHandle, GameStats } from "@/lib/game-types";
import type { Game } from "@/lib/games";
import { formatScore } from "@/lib/scores";

const LIVES = 3; // sin juego real no hay mecánica que reduzca las vidas
const POINTS_PER_LEVEL = 2500;

// Reproductor: los juegos del registro usan su motor real; el resto sigue con
// la simulación (la puntuación sube sola sobre una arena decorativa).
export default function GamePlayer({ game }: { game: Game }) {
  const { saveScore } = useScores();
  const entry: GameEntry | undefined = GAME_REGISTRY[game.id];
  const GameCanvas = entry?.Canvas;
  const engineRef = useRef<GameHandle>(null);
  const [score, setScore] = useState(0);
  const [engineLives, setEngineLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  // idle: sin guardar · saving: acción en curso · remote: en Supabase y en este
  // dispositivo · local: solo en este dispositivo (falló el guardado remoto).
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "remote" | "local"
  >("idle");
  // Se incrementa al reiniciar: un guardado que termina después de «JUGAR DE
  // NUEVO» no debe pintar su resultado en la partida nueva.
  const saveRun = useRef(0);

  // Simulación: nivel por puntos y 3 vidas fijas. Juego del registro: valores
  // del motor, o «—» si el juego no tiene ese dato (hud.lives / hud.level).
  const level = entry ? engineLevel : 1 + Math.floor(score / POINTS_PER_LEVEL);
  const lives = entry ? engineLives : LIVES;
  const levelLabel =
    entry && !entry.hud.level ? "—" : String(level).padStart(2, "0");
  const livesLabel =
    entry && !entry.hud.lives ? "—" : "♥ ".repeat(lives).trim();

  // El motor solo emite cuando cambia algún valor; lives y level son opcionales.
  const handleStats = (s: GameStats) => {
    setScore(s.score);
    if (s.lives !== undefined) setEngineLives(s.lives);
    if (s.level !== undefined) setEngineLevel(s.level);
  };

  // Math.random solo se llama dentro del callback del intervalo (cliente, tras
  // montar), nunca durante el render.
  useEffect(() => {
    if (entry || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [entry, over, paused]);

  // El motor llama a onGameOver una vez por partida: al terminar la partida
  // y al pulsar FIN (finish()).
  const handleGameOver = (s: GameStats) => {
    handleStats(s);
    setOver(true);
  };

  // FIN: en los juegos del registro pasa por el motor, de modo que el canvas
  // muestra su pantalla de fin y el modal se abre por la misma ruta que al
  // terminar la partida.
  const finish = () => {
    if (entry) engineRef.current?.finish();
    else setOver(true);
  };

  const restart = () => {
    if (entry) engineRef.current?.restart();
    setScore(0);
    setEngineLives(LIVES);
    setEngineLevel(1);
    setPaused(false);
    setOver(false);
    saveRun.current += 1;
    setSaveState("idle");
  };

  const save = async () => {
    const run = saveRun.current;
    setSaveState("saving");
    const result = await saveScore({ gameId: game.id, name, score });
    if (saveRun.current === run) setSaveState(result);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{formatScore(score)}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{livesLabel}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{levelLabel}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            type="button"
            className="btn magenta"
            onClick={finish}
          >
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {GameCanvas ? (
            <GameCanvas
              ref={engineRef}
              paused={paused}
              onStats={handleStats}
              onGameOver={handleGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gameover-title"
          >
            <h2 id="gameover-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{formatScore(score)}</div>
            {saveState === "idle" || saveState === "saving" ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                  disabled={saveState === "saving"}
                />
                <button
                  type="button"
                  className="btn yellow"
                  onClick={save}
                  disabled={saveState === "saving"}
                >
                  {saveState === "saving" ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved" role="status">
                {saveState === "remote"
                  ? "▸ PUNTUACIÓN GUARDADA_"
                  : "▸ GUARDADA SOLO EN ESTE DISPOSITIVO_"}
              </div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
