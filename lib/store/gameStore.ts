// lib/store/gameStore.ts
import { zustandStorage } from "@/lib/mmkv-storage";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { supabase } from "@/lib/supabase";
import NetInfo from "@react-native-community/netinfo";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type GameType = "snake" | "flappy";

interface GameState {
  highScores: Record<string, Record<GameType, number>>;
  currentScores: Record<string, Record<GameType, number>>;
  points: Record<string, Record<GameType, number>>;

  getHighScore: (game: GameType) => number;
  getCurrentScore: (game: GameType) => number;
  getPoints: (game: GameType) => number;

  setHighScore: (game: GameType, score: number) => Promise<void>;
  setCurrentScore: (game: GameType, score: number) => void;

  addPoints: (game: GameType, amount: number) => Promise<void>;
  setPoints: (game: GameType, amount: number) => Promise<void>;

  resetCurrentScore: (game: GameType) => void;
  resetHighScore: (game: GameType) => void;
  resetPoints: (game: GameType) => void;

  syncGameDataToSupabase: (childId: string, game: GameType) => Promise<void>;
}

/* -------------------------------------------------------
   Utility
------------------------------------------------------- */
function ensureChildGameMap(
  map: Record<string, Record<GameType, number>>,
  childId: string,
  game: GameType,
  defaultValue: number
) {
  if (!map[childId]) {
    map[childId] = {} as Record<GameType, number>;
  }
  if (map[childId][game] === undefined) {
    map[childId][game] = defaultValue;
  }
}

/* -------------------------------------------------------
   Online check
------------------------------------------------------- */
async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected;
}

/* -------------------------------------------------------
   SUPABASE UPSERT — with completedAt + logging
------------------------------------------------------- */
async function upsertGameToSupabase(params: {
  childId: string;
  game: GameType;
  score: number;
  highscore: number;
  points: number;
}) {
  const { childId, game, score, highscore, points } = params;

  const completedAt = new Date().toISOString();

  console.log(
    "%c🟣 SYNC → Supabase (gamestore)",
    "color:#9b59b6;font-weight:bold;",
    { game, score, highscore, points, completedAt, childId }
  );

  const { error } = await supabase.from("gamestore").upsert(
    {
      gametitle: game,
      score,
      highscore,
      points,
      childid: childId,
      completedat: completedAt,
    },
    { onConflict: "childid,gametitle" }
  );

  if (error) {
    console.log(
      "%c🔴 ERROR syncing gamestore",
      "color:red;font-weight:bold;",
      error
    );
  } else {
    console.log(
      "%c🟢 SYNC SUCCESS — gamestore updated!",
      "color:#27ae60;font-weight:bold;"
    );
  }
}

/* -------------------------------------------------------
   ZUSTAND STORE
------------------------------------------------------- */
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      highScores: {},
      currentScores: {},
      points: {},

      /* -------------------------------
         GETTERS
      ------------------------------- */
      getHighScore: (game) => {
        const childId = useChildAuthStore.getState().currentChildId;
        return childId ? get().highScores[childId]?.[game] ?? 0 : 0;
      },

      getCurrentScore: (game) => {
        const childId = useChildAuthStore.getState().currentChildId;
        return childId ? get().currentScores[childId]?.[game] ?? 0 : 0;
      },

      getPoints: (game) => {
        const childId = useChildAuthStore.getState().currentChildId;
        return childId ? get().points[childId]?.[game] ?? 0 : 0;
      },

      /* -------------------------------
         SET HIGH SCORE
      ------------------------------- */
      setHighScore: async (game, score) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        const state = get();
        ensureChildGameMap(state.highScores, childId, game, 0);

        const prevHigh = state.highScores[childId][game];

        if (score > prevHigh) {
          console.log(
            "%c🔵 LOCAL: Updating high score",
            "color:#3498db;font-weight:bold;",
            { game, score }
          );

          set((s) => ({
            highScores: {
              ...s.highScores,
              [childId]: { ...s.highScores[childId], [game]: score },
            },
          }));
        }

        if (await isOnline()) {
          await upsertGameToSupabase({
            childId,
            game,
            score: state.currentScores[childId]?.[game] ?? 0,
            highscore: score,
            points: state.points[childId]?.[game] ?? 0,
          });
        }
      },

      /* -------------------------------
         SET CURRENT SCORE
      ------------------------------- */
      setCurrentScore: (game, score) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        console.log(
          "%c🔵 LOCAL: Setting current score",
          "color:#3498db;font-weight:bold;",
          { game, score }
        );

        set((s) => ({
          currentScores: {
            ...s.currentScores,
            [childId]: { ...(s.currentScores[childId] ?? {}), [game]: score },
          },
        }));
      },

      /* -------------------------------
         ADD POINTS
      ------------------------------- */
      addPoints: async (game, amount) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        const previous = get().points[childId]?.[game] ?? 0;
        const newVal = previous + amount;

        console.log(
          "%c🔵 LOCAL: Adding points",
          "color:#3498db;font-weight:bold;",
          { game, amount, newTotal: newVal }
        );

        set((s) => ({
          points: {
            ...s.points,
            [childId]: { ...(s.points[childId] ?? {}), [game]: newVal },
          },
        }));

        if (await isOnline()) {
          await upsertGameToSupabase({
            childId,
            game,
            score: get().currentScores[childId]?.[game] ?? 0,
            highscore: get().highScores[childId]?.[game] ?? 0,
            points: newVal,
          });
        }
      },

      /* -------------------------------
         SET POINTS ABSOLUTE
      ------------------------------- */
      setPoints: async (game, amount) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        console.log(
          "%c🔵 LOCAL: Setting points",
          "color:#3498db;font-weight:bold;",
          { game, amount }
        );

        set((s) => ({
          points: {
            ...s.points,
            [childId]: { ...(s.points[childId] ?? {}), [game]: amount },
          },
        }));

        if (await isOnline()) {
          await upsertGameToSupabase({
            childId,
            game,
            score: get().currentScores[childId]?.[game] ?? 0,
            highscore: get().highScores[childId]?.[game] ?? 0,
            points: amount,
          });
        }
      },

      /* -------------------------------
         RESETTERS
      ------------------------------- */
      resetCurrentScore: (game) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        console.log(
          "%c🔵 LOCAL: Reset current score",
          "color:#3498db;font-weight:bold;",
          { game }
        );

        set((s) => {
          const copy = { ...(s.currentScores[childId] ?? {}) };
          delete copy[game];
          return { currentScores: { ...s.currentScores, [childId]: copy } };
        });
      },

      resetHighScore: (game) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        console.log(
          "%c🔵 LOCAL: Reset high score",
          "color:#3498db;font-weight:bold;",
          { game }
        );

        set((s) => {
          const copy = { ...(s.highScores[childId] ?? {}) };
          delete copy[game];
          return { highScores: { ...s.highScores, [childId]: copy } };
        });
      },

      resetPoints: (game) => {
        const childId = useChildAuthStore.getState().currentChildId;
        if (!childId) return;

        console.log(
          "%c🔵 LOCAL: Reset points",
          "color:#3498db;font-weight:bold;",
          { game }
        );

        set((s) => {
          const copy = { ...(s.points[childId] ?? {}) };
          delete copy[game];
          return { points: { ...s.points, [childId]: copy } };
        });
      },

      /* -------------------------------
         MANUAL SYNC
      ------------------------------- */
      syncGameDataToSupabase: async (childId, game) => {
        console.log(
          "%c🟣 SYNC: Manual syncGameDataToSupabase() called",
          "color:#9b59b6;font-weight:bold;",
          { childId, game }
        );

        if (!(await isOnline())) {
          console.log(
            "%c⚠ Offline — skipping sync",
            "color:orange;font-weight:bold;"
          );
          return;
        }

        const state = get();

        await upsertGameToSupabase({
          childId,
          game,
          score: state.currentScores[childId]?.[game] ?? 0,
          highscore: state.highScores[childId]?.[game] ?? 0,
          points: state.points[childId]?.[game] ?? 0,
        });
      },
    }),
    {
      name: "game-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
