import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NetInfo from "@react-native-community/netinfo";
import { zustandStorage } from "@/lib/mmkv-storage";
import { supabase } from "@/lib/supabase";
import { Lesson } from "@/services/fetchLessons";

/* ---------------------------------------------
 * Types
 * --------------------------------------------- */
interface LessonState {
  lessons: Lesson[];
  loading: boolean;
  syncing: boolean;
  error: string | null;

  fetchLessons: () => Promise<void>; // Local-first fetch
  refreshLessons: () => Promise<void>; // Manual forced sync
  clearAll: () => void; // Clear + unsubscribe
}

/* ---------------------------------------------
 * Helper: Check network state
 * --------------------------------------------- */
async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected;
}

/* ---------------------------------------------
 * Store Implementation
 * --------------------------------------------- */
export const useLessonStore = create<LessonState>()(
  persist(
    (set, get) => {
      let lessonChannel: ReturnType<typeof supabase.channel> | null = null;

      /* ---------------------------------------------
       * Internal Sync Function (online only)
       * --------------------------------------------- */
      async function syncLessons() {
        const online = await isOnline();
        if (!online) {
          console.log("📴 Offline — using cached lessons.");
          return;
        }

        try {
          console.log("🌐 Syncing lessons from Supabase...");

          const { data, error } = await supabase
            .from("lessonbank")
            .select("*")
            .order("title", { ascending: true });

          if (error) throw error;

          set({
            lessons: data ?? [],
            syncing: false,
            loading: false,
            error: null,
          });

          console.log("✅ Lessons synced:", data?.length ?? 0);
        } catch (err: any) {
          console.warn("❌ Lesson sync failed:", err.message);
          set({
            syncing: false,
            loading: false,
            error: err.message,
          });
        }
      }

      return {
        lessons: [],
        loading: false,
        syncing: false,
        error: null,

        /* ---------------------------------------------
         * Local-first fetch
         * --------------------------------------------- */
        fetchLessons: async () => {
          set({ loading: true, error: null });

          const online = await isOnline();

          try {
            if (!online) {
              console.log("📴 Offline — serving cached lessons only.");
              set({ loading: false });
              return;
            }

            await syncLessons();

            // Setup realtime channel
            if (lessonChannel) supabase.removeChannel(lessonChannel);

            console.log("🔔 Subscribing to realtime lesson changes...");

            lessonChannel = supabase
              .channel("lessonbank-store")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "lessonbank" },
                () => {
                  console.log(
                    "🔄 LessonBank change detected — syncing lessons..."
                  );
                  syncLessons();
                }
              )
              .subscribe();

            set({ loading: false });
          } catch (err: any) {
            console.error("❌ Lesson fetch failed:", err.message);
            set({ loading: false, error: err.message });
          }
        },

        /* ---------------------------------------------
         * Manual refresh
         * --------------------------------------------- */
        refreshLessons: async () => {
          set({ syncing: true });
          await syncLessons();
        },

        /* ---------------------------------------------
         * Clear cache + unsubscribe
         * --------------------------------------------- */
        clearAll: () => {
          if (lessonChannel) {
            supabase.removeChannel(lessonChannel);
            lessonChannel = null;
          }

          set({
            lessons: [],
            loading: false,
            syncing: false,
            error: null,
          });

          console.log("🧹 LessonStore cleared and realtime unsubscribed.");
        },
      };
    },

    /* ---------------------------------------------
     * Persistence Configuration
     * --------------------------------------------- */
    {
      name: "lesson-storage",
      storage: createJSONStorage(() => zustandStorage),

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        console.log("♻️ LessonStore rehydrated.");

        isOnline().then((online) => {
          if (online) {
            console.log("🌐 Online after rehydrate — syncing lessons...");
            useLessonStore.getState().fetchLessons();
          } else {
            console.log("📴 Offline after rehydrate — using cached lessons.");
          }
        });
      },
    }
  )
);
