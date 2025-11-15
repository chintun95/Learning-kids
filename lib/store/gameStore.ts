import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import { useChildAuthStore } from "@/lib/store/childAuthStore";

interface GameState {
  /** High scores mapped by childId */
  highScores: Record<string, number>;

  /** Current score mapped by childId */
  currentScores: Record<string, number>;

  /** Total points earned mapped by childId */
  points: Record<string, number>;

  /** Getters */
  getHighScore: () => number;
  getCurrentScore: () => number;
  getPoints: () => number;

  /** Score setters */
  setHighScore: (score: number) => void;
  setCurrentScore: (score: number) => void;

  /** Point setters */
  addPoints: (amount: number) => void;
  setPoints: (amount: number) => void;

  /** Resetters */
  resetCurrentScore: () => void;
  resetHighScore: () => void;
  resetPoints: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      highScores: {},
      currentScores: {},
      points: {},

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

      getPoints: () => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return 0;
        return get().points[childId] ?? 0;
      },

      /** ---------- Setters (Scores) ---------- **/
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

      /** ---------- Setters (Points) ---------- **/
      addPoints: (amount) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        const prev = get().points[childId] ?? 0;

        set((state) => ({
          points: {
            ...state.points,
            [childId]: prev + amount,
          },
        }));
      },

      setPoints: (amount) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        set((state) => ({
          points: {
            ...state.points,
            [childId]: amount,
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

      resetPoints: () => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        set((state) => {
          const copy = { ...state.points };
          delete copy[childId];
          return { points: copy };
        });
      },
    }),
    {
      name: "game-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
