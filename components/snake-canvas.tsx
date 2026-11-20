"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import type { GameCanvasProps } from "@/lib/game-types";
import { SnakeEngine, type SnakePalette } from "@/lib/snake/engine";

const SPRITES_SRC = "/games/snake/fruits.png";

// Lee la paleta de las variables CSS de globals.css (el motor no toca el DOM).
function readPalette(el: HTMLElement): SnakePalette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    body: v("--green"),
    head: v("--cyan"),
    grid: v("--line-2"),
    fruitFallback: v("--magenta"),
    text: v("--ink"),
  };
}

// Canvas de 800×600 lógicos que ocupa el 100 % de `.crt-screen` (ya 4:3).
export default function SnakeCanvas({
  ref,
  paused,
  onStats,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
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

  // La hoja de sprites se carga dentro del efecto (nunca durante el render) y el
  // motor arranca cuando la imagen está lista, o con `null` si no carga: un asset
  // roto no debe bloquear la partida. Si el componente se desmonta antes de que
  // la imagen cargue, no se crea ni arranca nada. El motor se destruye en la
  // limpieza, así Strict Mode no deja bucles ni listeners duplicados.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const palette = readPalette(canvas);

    const launch = (sprites: HTMLImageElement | null) => {
      if (cancelled) return;
      const engine = new SnakeEngine(canvas, palette, sprites, {
        onStats: (s) => callbacksRef.current.onStats(s),
        onGameOver: (s) => callbacksRef.current.onGameOver(s),
      });
      engineRef.current = engine;
      engine.start();
      engine.setPaused(pausedRef.current);
    };

    const image = new Image();
    image.onload = () => launch(image);
    image.onerror = () => launch(null);
    image.src = SPRITES_SRC;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
      engineRef.current?.destroy();
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
      aria-label="Juego SNAKE"
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
