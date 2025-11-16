// lib/store/childAchievementStore.ts
import { zustandStorage } from "@/lib/mmkv-storage";
import { supabase } from "@/lib/supabase";
import NetInfo from "@react-native-community/netinfo";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  ChildAchievementWithInfo,
  fetchAchievementsByChildId,
} from "@/services/fetchAchievements";

import {
  AchievementRow,
  fetchAllAchievements,
} from "@/services/fetchAllAchievements";

import { useLessonLogStore } from "@/lib/store/lessonLogStore";

/* ===========================================================
   Utils
=========================================================== */

const isValidUUID = (value?: string | null): boolean =>
  !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/* ===========================================================
   Achievement Mappings
=========================================================== */

const LESSON_TO_ACHIEVEMENT: Record<string, string> = {
  fire: "Fire Hero",
  earthquake: "Quake Ready",
  health: "Health Champ",
  hygiene: "Health Champ",
  public: "Street Smart",
  intro: "Safety Starter",
  starter: "Safety Starter",
};

const META_ACHIEVEMENTS = {
  LESSON_MASTER: "Lesson Master",
  SAFETY_EXPERT: "Safety Expert",
};

/* ===========================================================
   Store Types
=========================================================== */

interface ChildAchievementState {
  allAchievements: AchievementRow[];
  achievementsByChild: Record<string, ChildAchievementWithInfo[]>;

  loading: boolean;
  syncing: boolean;
  error: string | null;

  loadGlobalAchievementsOnce: () => Promise<void>;
  fetchChildAchievements: (childId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  clearAll: () => void;
  resetStore: () => void;

  /** NEW */
  awardAchievement: (
    childId: string,
    achievementTitle: string
  ) => Promise<void>;
  autoAwardLessonAchievements: (
    childId: string,
    lessonId: string,
    lessonTitle: string
  ) => Promise<void>;
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

      /* ===========================================================
         GLOBAL: Fetch All Achievements
      ============================================================ */
      async function loadGlobalAchievementsOnce() {
        const { allAchievements } = get();
        if (allAchievements.length > 0) return;

        const net = await NetInfo.fetch();
        if (!net.isConnected) return;

        try {
          const all = await fetchAllAchievements();
          set({ allAchievements: all });

          // Subscribe to realtime global changes
          if (achievementRealtimeChannel)
            supabase.removeChannel(achievementRealtimeChannel);

          achievementRealtimeChannel = supabase
            .channel("achievements-global-realtime")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "Achievements" },
              async () => {
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

      /* ===========================================================
         CHILD-SPECIFIC: Fetch Achievements
      ============================================================ */
      async function fetchChildAchievements(childId: string) {
        if (!isValidUUID(childId)) return;

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
            if (childChannels[childId])
              supabase.removeChannel(childChannels[childId]);

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
                  const updated = await fetchAchievementsByChildId(childId);
                  set((state) => ({
                    achievementsByChild: {
                      ...state.achievementsByChild,
                      [childId]: updated,
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

      /* ===========================================================
         Award Achievement (NEW)
      ============================================================ */
      async function awardAchievement(childId: string, title: string) {
        const { allAchievements, achievementsByChild } = get();

        // Find achievement by title
        const achievement = allAchievements.find(
          (a) => a.title.toLowerCase() === title.toLowerCase()
        );

        if (!achievement) {
          console.warn("⚠️ Achievement not found:", title);
          return;
        }

        const alreadyHas = achievementsByChild[childId]?.some(
          (c) => c.achievement?.id === achievement.id
        );

        if (alreadyHas) {
          return; // prevent duplicate awards
        }

        // Insert locally → synced by realtime or refresh
        const { error } = await supabase.from("ChildAchievement").insert([
          {
            achievementearned: achievement.id,
            childid: childId,
            dateearned: new Date().toISOString(),
            user_id: null,
          },
        ]);

        if (error) {
          console.error("❌ Failed to award achievement:", error);
          return;
        }

        // Refresh child's list
        await get().fetchChildAchievements(childId);

        console.log("🏆 Awarded:", title);
      }

      /* ===========================================================
         Auto Award Lesson Achievements (NEW)
      ============================================================ */
      async function autoAwardLessonAchievements(
        childId: string,
        lessonId: string,
        lessonTitle: string
      ) {
        const normalized = lessonTitle.toLowerCase();

        /* --- Award lesson-specific achievement --- */
        for (const key in LESSON_TO_ACHIEVEMENT) {
          if (normalized.includes(key)) {
            await get().awardAchievement(childId, LESSON_TO_ACHIEVEMENT[key]);
          }
        }

        /* --- Award: LESSON MASTER (always) --- */
        await get().awardAchievement(childId, META_ACHIEVEMENTS.LESSON_MASTER);

        /* --- Award: SAFETY EXPERT if all lessons completed --- */
        const lessonLogs = useLessonLogStore.getState().logs;
        const completedLessonIds = new Set(
          lessonLogs.map((l) => l.completedlesson)
        );

        // You have 4 major lessons: Fire, Earthquake, Public, Health
        const majorLessonsCompleted = [...completedLessonIds].length >= 4;

        if (majorLessonsCompleted) {
          await get().awardAchievement(
            childId,
            META_ACHIEVEMENTS.SAFETY_EXPERT
          );
        }
      }

      /* ===========================================================
         Return state
      ============================================================ */
      return {
        allAchievements: [],
        achievementsByChild: {},
        loading: false,
        syncing: false,
        error: null,

        loadGlobalAchievementsOnce,
        fetchChildAchievements,
        refreshAll() {
          return Promise.resolve(); // use full implementation if needed
        },
        clearAll() {
          set({
            allAchievements: [],
            achievementsByChild: {},
            error: null,
            loading: false,
            syncing: false,
          });
        },
        resetStore() {
          zustandStorage.removeItem("child-achievement-storage");
          set({
            allAchievements: [],
            achievementsByChild: {},
          });
        },

        /* NEW METHODS */
        awardAchievement,
        autoAwardLessonAchievements,
      };
    },
    {
      name: "child-achievement-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
