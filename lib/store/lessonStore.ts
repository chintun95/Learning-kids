import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NetInfo from "@react-native-community/netinfo";
import { zustandStorage } from "@/lib/mmkv-storage";
import { supabase } from "@/lib/supabase";
import { Lesson } from "@/services/fetchLessons";

/** ---------- State Definition ---------- **/
interface LessonState {
  lessons: Lesson[];
  loading: boolean;
  syncing: boolean;
  error: string | null;

  /** Fetch lessons (local-first, realtime updates if online) */
  fetchLessons: () => Promise<void>;

  /** Manual refresh (forces a new sync) */
  refreshLessons: () => Promise<void>;

  /** Clear local data and unsubscribe */
  clearAll: () => void;
}

/** ---------- Helper ---------- **/
async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected;
}

/** ---------- Store ---------- **/
export const useLessonStore = create<LessonState>()(
  persist(
    (set, get) => {
      let lessonChannel: ReturnType<typeof supabase.channel> | null = null;

      /** Internal sync helper */
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
          });
        } catch (err: any) {
          console.warn("❌ Failed to sync lessons:", err.message);
          set({ syncing: false, loading: false, error: err.message });
        }
      }

      return {
        lessons: [],
        loading: false,
        syncing: false,
        error: null,

        /** Local-first fetch */
        fetchLessons: async () => {
          const online = await isOnline();
          set({ loading: true, error: null });

          try {
            if (!online) {
              console.log("📴 Offline — serving cached lessons.");
              set({ loading: false });
              return;
            }

            await syncLessons();

            // Setup realtime updates
            if (lessonChannel) supabase.removeChannel(lessonChannel);
            lessonChannel = supabase
              .channel("lessonbank-store")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "lessonbank" },
                () => {
                  console.log("🔄 Lessonbank change detected — syncing...");
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

        /** Manual refresh */
        refreshLessons: async () => {
          set({ syncing: true });
          await syncLessons();
        },

        /** Clear all cached data and unsubscribe */
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
          console.log("🧹 LessonStore cleared and unsubscribed.");
        },
      };
    },
    {
      name: "lesson-storage",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        console.log("♻️ LessonStore rehydrated (local-first mode).");
        isOnline().then((online) => {
          if (online) {
            useLessonStore.getState().fetchLessons();
          } else {
            console.log("📴 Rehydrated offline — showing cached lessons.");
          }
        });
      },
    }
  )
);
