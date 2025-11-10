// lib/store/childAchievementStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NetInfo from "@react-native-community/netinfo";
import { zustandStorage } from "@/lib/mmkv-storage";
import { supabase } from "@/lib/supabase";
import {
  fetchAchievementsByChildId,
  ChildAchievementWithInfo,
} from "@/services/fetchAchievements";

interface ChildAchievementState {
  achievementsByChild: Record<string, ChildAchievementWithInfo[]>;
  loading: boolean;
  syncing: boolean;
  error: string | null;

  fetchChildAchievements: (childId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  clearAll: () => void;
}

/** Simple UUID format check */
function isValidUUID(value?: string | null): boolean {
  return (
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

/**
 * Local-first store: reads from cache first, syncs when online.
 * Offline-safe: never clears cached data when disconnected.
 */
export const useChildAchievementStore = create<ChildAchievementState>()(
  persist(
    (set, get) => {
      const activeChannels: Record<
        string,
        ReturnType<typeof supabase.channel>
      > = {};

      /** Internal helper: safely sync with Supabase when online */
      async function syncChildAchievements(childId: string) {
        if (!isValidUUID(childId)) {
          console.warn(`⚠️ Skipping sync — invalid childId:`, childId);
          return;
        }

        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          console.log(`📴 Offline — using cached achievements for ${childId}`);
          return;
        }

        try {
          console.log(`🌐 Syncing achievements for child ${childId}...`);
          const latest = await fetchAchievementsByChildId(childId);
          set((state) => ({
            achievementsByChild: {
              ...state.achievementsByChild,
              [childId]: latest,
            },
            syncing: false,
          }));
        } catch (err: any) {
          console.warn(
            `❌ Failed to sync achievements for ${childId}:`,
            err.message
          );
          set({ syncing: false });
        }
      }

      return {
        achievementsByChild: {},
        loading: false,
        syncing: false,
        error: null,

        /** Local-first fetch (uses cache immediately, syncs in background) */
        fetchChildAchievements: async (childId: string) => {
          if (!isValidUUID(childId)) {
            console.warn("⚠️ Invalid or missing childId — skipping fetch.");
            return;
          }

          set({ loading: true, error: null });
          try {
            // Load cache instantly
            const cached = get().achievementsByChild[childId];
            if (cached?.length) {
              console.log(`💾 Loaded cached achievements for ${childId}`);
              set({ loading: false });
            }

            // Sync in background if online
            syncChildAchievements(childId);

            // Manage realtime subscription if online
            const netState = await NetInfo.fetch();
            if (netState.isConnected) {
              if (activeChannels[childId]) {
                supabase.removeChannel(activeChannels[childId]);
              }

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
                  () => syncChildAchievements(childId)
                )
                .subscribe();

              activeChannels[childId] = channel;
            }

            set({ loading: false });
          } catch (err: any) {
            console.error("❌ Local-first fetch failed:", err.message);
            set({
              error: err.message ?? "Failed to fetch achievements",
              loading: false,
            });
          }
        },

        /** Refresh all currently loaded child achievements */
        refreshAll: async () => {
          const { achievementsByChild } = get();
          const childIds = Object.keys(achievementsByChild).filter(isValidUUID);
          if (childIds.length === 0) return;

          set({ syncing: true });
          for (const id of childIds) {
            await syncChildAchievements(id);
          }
          set({ syncing: false });
        },

        /** Clear all cached data + subscriptions */
        clearAll: () => {
          Object.values(activeChannels).forEach((channel) =>
            supabase.removeChannel(channel)
          );
          set({
            achievementsByChild: {},
            error: null,
            loading: false,
            syncing: false,
          });
        },
      };
    },
    {
      name: "child-achievement-storage",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Clean up invalid keys and re-subscribe safely
        const { achievementsByChild, fetchChildAchievements } =
          useChildAchievementStore.getState();

        Object.keys(achievementsByChild || {}).forEach((childId) => {
          if (isValidUUID(childId)) {
            fetchChildAchievements(childId);
          } else {
            console.log(`🧹 Removing invalid key from cache: ${childId}`);
            delete achievementsByChild[childId];
          }
        });

        console.log("♻️ ChildAchievementStore rehydrated (local-first mode).");
      },
    }
  )
);
