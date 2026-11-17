"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { submitScore } from "@/lib/actions/scores";
import { appendScore, readScores, type SavedScore } from "@/lib/storage";

type ScoresContextValue = {
  ready: boolean; // false en servidor y primer render del cliente
  scores: SavedScore[];
  // "remote": guardada en Supabase y en localStorage.
  // "local": la acción falló; solo quedó en localStorage.
  saveScore: (s: Omit<SavedScore, "at">) => Promise<"remote" | "local">;
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

  const saveScore = useCallback(
    async (s: Omit<SavedScore, "at">): Promise<"remote" | "local"> => {
      // localStorage se escribe siempre y primero: es el respaldo si falla
      // Supabase y la fuente de «TU MEJOR MARCA».
      const entry: SavedScore = { ...s, at: Date.now() };
      appendScore(entry);
      setState((prev) => ({ ...prev, scores: [...prev.scores, entry] }));

      try {
        const result = await submitScore({
          gameId: s.gameId,
          name: s.name,
          score: s.score,
        });
        return result.ok ? "remote" : "local";
      } catch {
        // Sin red o error del servidor: la marca queda solo en este dispositivo.
        return "local";
      }
    },
    [],
  );

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
