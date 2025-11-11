import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import { useChildAuthStore } from "@/lib/store/childAuthStore";

interface GameState {
  /** High scores mapped by childId */
  highScores: Record<string, number>;

  /** Current score mapped by childId */
  currentScores: Record<string, number>;

  /** Get high score for the currently selected child */
  getHighScore: () => number;

  /** Get current score for the currently selected child */
  getCurrentScore: () => number;

  /** Set high score for the currently selected child */
  setHighScore: (score: number) => void;

  /** Set current score for the currently selected child */
  setCurrentScore: (score: number) => void;

  /** Reset current score for the currently selected child */
  resetCurrentScore: () => void;

  /** Reset high score for the currently selected child */
  resetHighScore: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      highScores: {},
      currentScores: {},

      /** ---------- Getters ---------- **/
      getHighScore: () => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return 0;
        return get().highScores[childId] ?? 0;
      },

      getCurrentScore: () => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return 0;
        return get().currentScores[childId] ?? 0;
      },

      /** ---------- Setters ---------- **/
      setHighScore: (score) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;
        const current = get().highScores[childId] ?? 0;
        if (score > current) {
          set((state) => ({
            highScores: {
              ...state.highScores,
              [childId]: score,
            },
          }));
        }
      },

      setCurrentScore: (score) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;
        set((state) => ({
          currentScores: {
            ...state.currentScores,
            [childId]: score,
          },
        }));
      },

      /** ---------- Resetters ---------- **/
      resetCurrentScore: () => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;
        set((state) => {
          const copy = { ...state.currentScores };
          delete copy[childId];
          return { currentScores: copy };
        });
      },

      resetHighScore: () => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;
        set((state) => {
          const copy = { ...state.highScores };
          delete copy[childId];
          return { highScores: copy };
        });
      },
    }),
    {
      name: "game-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
