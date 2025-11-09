// lib/store/childAchievementStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import { supabase } from "@/lib/supabase";
import {
  fetchAchievementsByChildId,
  ChildAchievementWithInfo,
} from "@/services/fetchAchievements";

interface ChildAchievementState {
  achievementsByChild: Record<string, ChildAchievementWithInfo[]>;
  loading: boolean;
  error: string | null;

  fetchChildAchievements: (childId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  clearAll: () => void;
}

/**
 * Zustand store for caching + real-time syncing of Child Achievements.
 * It automatically listens to Supabase realtime changes for each child loaded.
 */
export const useChildAchievementStore = create<ChildAchievementState>()(
  persist(
    (set, get) => {
      // Active subscriptions map to avoid duplicates
      const activeChannels: Record<
        string,
        ReturnType<typeof supabase.channel>
      > = {};

      return {
        achievementsByChild: {},
        loading: false,
        error: null,

        /** Fetch and subscribe to a specific child's achievements */
        fetchChildAchievements: async (childId: string) => {
          if (!childId) return;
          set({ loading: true, error: null });

          try {
            // Fetch current data
            const data = await fetchAchievementsByChildId(childId);
            set((state) => ({
              achievementsByChild: {
                ...state.achievementsByChild,
                [childId]: data,
              },
              loading: false,
            }));

            // Prevent duplicate channel subscriptions
            if (activeChannels[childId]) {
              supabase.removeChannel(activeChannels[childId]);
            }

            // Subscribe to realtime updates for this child
            const channel = supabase
              .channel(`child-achievements-store-${childId}`)
              .on(
                "postgres_changes",
                {
                  event: "*",
                  schema: "public",
                  table: "ChildAchievement",
                  filter: `childid=eq.${childId}`,
                },
                async () => {
                  console.log(
                    `🔄 Realtime update → refreshing child ${childId}`
                  );
                  const latest = await fetchAchievementsByChildId(childId);
                  set((state) => ({
                    achievementsByChild: {
                      ...state.achievementsByChild,
                      [childId]: latest,
                    },
                  }));
                }
              )
              .subscribe();

            // Track active channel
            activeChannels[childId] = channel;
          } catch (err: any) {
            set({
              error: err.message ?? "Failed to fetch achievements",
              loading: false,
            });
          }
        },

        /** Refresh all currently loaded child achievements */
        refreshAll: async () => {
          const { achievementsByChild } = get();
          const childIds = Object.keys(achievementsByChild);
          if (childIds.length === 0) return;

          set({ loading: true });
          try {
            const refreshed: Record<string, ChildAchievementWithInfo[]> = {};
            for (const id of childIds) {
              const data = await fetchAchievementsByChildId(id);
              refreshed[id] = data;
            }
            set({ achievementsByChild: refreshed, loading: false });
          } catch (err: any) {
            set({ error: err.message ?? "Refresh failed", loading: false });
          }
        },

        /** Clear all cached data and subscriptions */
        clearAll: () => {
          Object.values(activeChannels).forEach((channel) =>
            supabase.removeChannel(channel)
          );
          set({ achievementsByChild: {}, error: null, loading: false });
        },
      };
    },
    {
      name: "child-achievement-storage",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        // Auto-resubscribe when store rehydrates
        if (!state) return;
        const { achievementsByChild, fetchChildAchievements } =
          useChildAchievementStore.getState();
        Object.keys(achievementsByChild || {}).forEach((childId) => {
          fetchChildAchievements(childId);
        });
        console.log(
          "♻️ ChildAchievementStore rehydrated and resubscribed to Supabase"
        );
      },
    }
  )
);
