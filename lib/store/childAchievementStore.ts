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
import {
  fetchAllAchievements,
  AchievementRow,
} from "@/services/fetchAllAchievements";

/* ===========================================================
   Utility
=========================================================== */

function isValidUUID(value?: string | null): boolean {
  return (
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

/* ===========================================================
   State
=========================================================== */

interface ChildAchievementState {
  /** Global achievements (from Achievements table) */
  allAchievements: AchievementRow[];

  /** Child earned achievements */
  achievementsByChild: Record<string, ChildAchievementWithInfo[]>;

  loading: boolean;
  syncing: boolean;
  error: string | null;

  /* Actions */
  loadGlobalAchievementsOnce: () => Promise<void>;
  fetchChildAchievements: (childId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  clearAll: () => void;
  resetStore: () => void;
}

/* ===========================================================
   Store
=========================================================== */

export const useChildAchievementStore = create<ChildAchievementState>()(
  persist(
    (set, get) => {
      let achievementRealtimeChannel: ReturnType<
        typeof supabase.channel
      > | null = null;
      const childChannels: Record<
        string,
        ReturnType<typeof supabase.channel>
      > = {};

      /* ----------------------------
         GLOBAL: Load Achievements Once
      ---------------------------- */
      async function loadGlobalAchievementsOnce() {
        const { allAchievements } = get();

        // Already have global achievements → do NOT re-fetch
        if (allAchievements.length > 0) return;

        const net = await NetInfo.fetch();
        if (!net.isConnected) {
          console.log("📴 Offline — cannot fetch global achievements.");
          return;
        }

        try {
          console.log("🌐 Fetching global achievements (first time)...");
          const all = await fetchAllAchievements();
          set({ allAchievements: all });

          // Subscribe to global achievement changes
          if (achievementRealtimeChannel) {
            supabase.removeChannel(achievementRealtimeChannel);
          }

          achievementRealtimeChannel = supabase
            .channel("achievements-global-realtime")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "Achievements",
              },
              async () => {
                console.log("🔄 Global achievements changed — refreshing...");
                const updated = await fetchAllAchievements();
                set({ allAchievements: updated });
              }
            )
            .subscribe();
        } catch (err: any) {
          console.error("❌ Failed to fetch global achievements:", err);
          set({ error: err.message });
        }
      }

      /* ----------------------------
         CHILD-SPECIFIC ACHIEVEMENTS
      ---------------------------- */
      async function fetchChildAchievements(childId: string) {
        if (!isValidUUID(childId)) {
          console.warn("⚠️ Invalid childId — skipping fetch.");
          return;
        }

        // Always ensure global achievements are available
        await get().loadGlobalAchievementsOnce();

        set({ loading: true, error: null });

        try {
          const earned = await fetchAchievementsByChildId(childId);

          set((state) => ({
            achievementsByChild: {
              ...state.achievementsByChild,
              [childId]: earned,
            },
            loading: false,
          }));

          const net = await NetInfo.fetch();
          if (net.isConnected) {
            // Subscribe to child's updates
            if (childChannels[childId]) {
              supabase.removeChannel(childChannels[childId]);
            }

            const channel = supabase
              .channel(`child-achievements-${childId}`)
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
                    "🔁 ChildAchievement updated — refreshing child list..."
                  );
                  const updatedEarned = await fetchAchievementsByChildId(
                    childId
                  );
                  set((state) => ({
                    achievementsByChild: {
                      ...state.achievementsByChild,
                      [childId]: updatedEarned,
                    },
                  }));
                }
              )
              .subscribe();

            childChannels[childId] = channel;
          }
        } catch (error: any) {
          console.error("❌ Failed to fetch child achievements:", error);
          set({ error: error.message, loading: false });
        }
      }

      /* ----------------------------
         REFRESH ALL CHILDREN THAT ARE LOADED
      ---------------------------- */
      async function refreshAll() {
        const { achievementsByChild } = get();
        const childIds = Object.keys(achievementsByChild).filter(isValidUUID);

        if (childIds.length === 0) return;

        set({ syncing: true });

        for (const childId of childIds) {
          await fetchChildAchievements(childId);
        }

        set({ syncing: false });
      }

      /* ----------------------------
         CLEAR CACHE
      ---------------------------- */
      function clearAll() {
        Object.values(childChannels).forEach((ch) =>
          supabase.removeChannel(ch)
        );
        if (achievementRealtimeChannel)
          supabase.removeChannel(achievementRealtimeChannel);

        set({
          allAchievements: [],
          achievementsByChild: {},
          error: null,
          loading: false,
          syncing: false,
        });
      }

      /* ----------------------------
         HARD RESET STORE
      ---------------------------- */
      function resetStore() {
        clearAll();
        zustandStorage.removeItem("child-achievement-storage");
      }

      /* ----------------------------
         Exposed Store
      ---------------------------- */
      return {
        allAchievements: [],
        achievementsByChild: {},
        loading: false,
        syncing: false,
        error: null,

        loadGlobalAchievementsOnce,
        fetchChildAchievements,
        refreshAll,
        clearAll,
        resetStore,
      };
    },
    {
      name: "child-achievement-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);