"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import type { GameCanvasProps } from "@/lib/game-types";
import { TetrisEngine, type TetrisPalette } from "@/lib/tetris/engine";

// Lee la paleta de las variables CSS de globals.css (el motor no toca el DOM).
// Piezas: I, O, T, S, Z, J, L y N (tuerca), en el orden de los índices 1 a 8.
function readPalette(el: HTMLElement): TetrisPalette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    pieces: [
      v("--cyan"), // I
      v("--yellow"), // O
      v("--purple"), // T
      v("--green"), // S
      v("--magenta"), // Z
      v("--blue"), // J
      v("--orange"), // L
      v("--silver"), // N (tuerca)
    ],
    grid: v("--line-2"),
    text: v("--cyan"),
    label: v("--ink-dim"),
    highlight: v("--ink"),
  };
}

// Canvas de 800×600 lógicos que ocupa el 100 % de `.crt-screen` (ya 4:3).
export default function TetrisCanvas({
  ref,
  paused,
  onStats,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);
  const pausedRef = useRef(paused);
  const callbacksRef = useRef({ onStats, onGameOver });

  // Los callbacks pueden cambiar de identidad sin recrear el motor.
  useEffect(() => {
    callbacksRef.current = { onStats, onGameOver };
  });

  useImperativeHandle(
    ref,
    () => ({
      restart: () => engineRef.current?.restart(),
      finish: () => engineRef.current?.finish(),
    }),
    [],
  );

  // El motor se crea al montar (nunca durante el render) y se destruye al
  // desmontar: así Strict Mode no deja bucles ni listeners duplicados.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new TetrisEngine(canvas, readPalette(canvas), {
      onStats: (s) => callbacksRef.current.onStats(s),
      onGameOver: (s) => callbacksRef.current.onGameOver(s),
    });
    engineRef.current = engine;
    engine.start();
    engine.setPaused(pausedRef.current);
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    engineRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      role="img"
      aria-label="Juego TETRIS"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
