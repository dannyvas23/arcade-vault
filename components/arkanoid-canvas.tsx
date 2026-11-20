"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import type { GameCanvasProps } from "@/lib/game-types";
import {
  ArkanoidEngine,
  type ArkanoidPalette,
  type ArkanoidSounds,
} from "@/lib/arkanoid/engine";

const BOUNCE_SRC = "/games/arkanoid/ball-bounce.mp3";
const BREAK_SRC = "/games/arkanoid/break-sound.mp3";

// Lee la paleta de las variables CSS de globals.css (el motor no toca el DOM).
// Los colores de bloque siguen el aspecto del spritesheet original, no su
// nombre: `magenta` es morado y `hotpink` es naranja; `red` usa el rojo neón.
function readPalette(el: HTMLElement): ArkanoidPalette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    blocks: {
      red: v("--magenta"),
      yellow: v("--yellow"),
      cyan: v("--cyan"),
      magenta: v("--purple"),
      hotpink: v("--orange"),
      green: v("--green"),
      gray: v("--silver"),
    },
    paddle: v("--silver"),
    ball: v("--ink"),
    text: v("--ink"),
  };
}

// Los audios los crea el componente (el motor no contiene `new Audio`), siempre
// dentro del efecto de montaje y nunca durante el render.
function createSounds(): ArkanoidSounds {
  const bounce = new Audio(BOUNCE_SRC);
  const breakSound = new Audio(BREAK_SRC);
  bounce.preload = "auto";
  breakSound.preload = "auto";
  return { bounce, break: breakSound };
}

// Canvas de 800×600 lógicos que ocupa el 100 % de `.crt-screen` (ya 4:3).
export default function ArkanoidCanvas({
  ref,
  paused,
  onStats,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArkanoidEngine | null>(null);
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

  // El motor se crea al montar y se destruye al desmontar: así Strict Mode no
  // deja bucles, listeners ni sonidos duplicados. El motor y la UI hablan el
  // mismo contrato (score, lives, level), que ya es un GameStats.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new ArkanoidEngine(canvas, readPalette(canvas), createSounds(), {
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
      aria-label="Juego ARKANOID"
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
