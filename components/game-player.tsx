"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AsteroidsCanvas, {
  type AsteroidsHandle,
} from "@/components/asteroids-canvas";
import { useScores } from "@/components/scores-provider";
import type { AsteroidsStats } from "@/lib/asteroids/engine";
import type { Game } from "@/lib/games";
import { formatScore } from "@/lib/scores";

const LIVES = 3; // sin juego real no hay mecánica que reduzca las vidas
const POINTS_PER_LEVEL = 2500;

// Reproductor: ROCAS usa el motor real; el resto de juegos sigue con la
// simulación (la puntuación sube sola sobre una arena decorativa).
export default function GamePlayer({ game }: { game: Game }) {
  const { saveScore } = useScores();
  const isRocas = game.id === "rocas";
  const engineRef = useRef<AsteroidsHandle>(null);
  const [score, setScore] = useState(0);
  const [engineLives, setEngineLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saved, setSaved] = useState(false);

  const level = isRocas
    ? engineLevel
    : 1 + Math.floor(score / POINTS_PER_LEVEL);
  const lives = isRocas ? engineLives : LIVES;

  // El motor solo emite cuando cambia algún valor.
  const handleStats = (s: AsteroidsStats) => {
    setScore(s.score);
    setEngineLives(s.lives);
    setEngineLevel(s.level);
  };

  // Math.random solo se llama dentro del callback del intervalo (cliente, tras
  // montar), nunca durante el render.
  useEffect(() => {
    if (isRocas || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isRocas, over, paused]);

  // El motor llama a onGameOver una vez por partida: al perder la última vida
  // y al pulsar FIN (finish()).
  const handleGameOver = (s: AsteroidsStats) => {
    handleStats(s);
    setOver(true);
  };

  // FIN: en ROCAS pasa por el motor, de modo que el canvas muestra GAME OVER y
  // el modal se abre por la misma ruta que al perder la última vida.
  const finish = () => {
    if (isRocas) engineRef.current?.finish();
    else setOver(true);
  };

  const restart = () => {
    if (isRocas) engineRef.current?.restart();
    setScore(0);
    setEngineLives(LIVES);
    setEngineLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  const save = () => {
    saveScore({ gameId: game.id, name, score });
    setSaved(true);
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
            <div className="v">{"♥ ".repeat(lives).trim()}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
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
          {isRocas ? (
            <AsteroidsCanvas
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
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                <button type="button" className="btn yellow" onClick={save}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
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
