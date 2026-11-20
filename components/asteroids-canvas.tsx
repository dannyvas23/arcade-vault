"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import {
  AsteroidsEngine,
  type AsteroidsPalette,
} from "@/lib/asteroids/engine";
import type { GameCanvasProps } from "@/lib/game-types";

// Lee la paleta neón de las variables CSS de globals.css (el motor no toca el DOM).
function readPalette(el: HTMLElement): AsteroidsPalette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    ship: v("--cyan"),
    flame: v("--yellow"),
    bullet: v("--yellow"),
    asteroid: v("--magenta"),
    powerUp: v("--green"),
    text: v("--cyan"),
  };
}

// Canvas de 800×600 lógicos que ocupa el 100 % de `.crt-screen` (ya 4:3).
export default function AsteroidsCanvas({
  ref,
  paused,
  onStats,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
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
    const engine = new AsteroidsEngine(canvas, readPalette(canvas), {
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
      aria-label="Juego ROCAS"
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
