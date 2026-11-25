"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import type { GameCanvasProps } from "@/lib/game-types";
import { InvadersEngine, type InvadersPalette } from "@/lib/invaders/engine";

// Lee la paleta de las variables CSS de globals.css (el motor no toca el DOM).
function readPalette(el: HTMLElement): InvadersPalette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    squid: v("--magenta"),
    crab: v("--yellow"),
    octopus: v("--green"),
    cannon: v("--cyan"),
    playerShot: v("--ink"),
    invaderShot: v("--orange"),
    ufo: v("--purple"),
    shield: v("--green"),
    ground: v("--ink-faint"),
    text: v("--ink"),
  };
}

// Canvas de 800×600 lógicos que ocupa el 100 % de `.crt-screen` (ya 4:3).
export default function InvadersCanvas({
  ref,
  paused,
  onStats,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<InvadersEngine | null>(null);
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

  // El motor se crea y arranca en el efecto (nunca durante el render, que también
  // corre en el servidor) y se destruye en la limpieza, así Strict Mode no deja
  // bucles ni listeners duplicados.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new InvadersEngine(canvas, readPalette(canvas), {
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
      aria-label="Juego INVADERS"
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
