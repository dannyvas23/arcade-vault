"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { appendScore, readScores, type SavedScore } from "@/lib/storage";

type ScoresContextValue = {
  ready: boolean; // false en servidor y primer render del cliente
  scores: SavedScore[];
  saveScore: (s: Omit<SavedScore, "at">) => void;
  bestScore: (gameId: string) => SavedScore | null;
};

const ScoresContext = createContext<ScoresContextValue | null>(null);

export function ScoresProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ ready: boolean; scores: SavedScore[] }>({
    ready: false,
    scores: [],
  });
  const { ready, scores } = state;

  // localStorage se lee solo tras montar para evitar errores de hidratación:
  // servidor y primer render del cliente coinciden (ready: false, scores: []).
  // Es la sincronización puntual con un sistema externo que el spec pide, y
  // solo hay un setState (un único re-render).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ ready: true, scores: readScores() });
  }, []);

  const saveScore = useCallback((s: Omit<SavedScore, "at">) => {
    const entry: SavedScore = { ...s, at: Date.now() };
    appendScore(entry);
    setState((prev) => ({ ...prev, scores: [...prev.scores, entry] }));
  }, []);

  const bestScore = useCallback(
    (gameId: string): SavedScore | null => {
      let best: SavedScore | null = null;
      for (const s of scores) {
        if (s.gameId === gameId && (best === null || s.score > best.score)) {
          best = s;
        }
      }
      return best;
    },
    [scores],
  );

  const value = useMemo(
    () => ({ ready, scores, saveScore, bestScore }),
    [ready, scores, saveScore, bestScore],
  );

  return <ScoresContext value={value}>{children}</ScoresContext>;
}

export function useScores(): ScoresContextValue {
  const ctx = useContext(ScoresContext);
  if (!ctx) {
    throw new Error("useScores debe usarse dentro de <ScoresProvider>");
  }
  return ctx;
}
