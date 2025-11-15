import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NetInfo from "@react-native-community/netinfo";
import { zustandStorage } from "@/lib/mmkv-storage";
import { supabase } from "@/lib/supabase";
import { Section } from "@/services/fetchSections";

/** ---------- State Definition ---------- **/
interface SectionState {
  sections: Section[];
  loading: boolean;
  syncing: boolean;
  error: string | null;

  fetchSections: () => Promise<void>;
  refreshSections: () => Promise<void>;
  clearAll: () => void;
}

/** ---------- Helper ---------- **/
async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected;
}

/** ---------- Store ---------- **/
export const useSectionStore = create<SectionState>()(
  persist(
    (set, get) => {
      let sectionChannel: ReturnType<typeof supabase.channel> | null = null;

      /** ---------------------------
       * Internal Sync Logic
       * --------------------------- */
      async function syncSections() {
        const online = await isOnline();
        if (!online) {
          console.log("📴 Offline — using cached sections.");
          return;
        }

        try {
          console.log("🌐 Syncing sections from Supabase...");
          const { data, error } = await supabase
            .from("sections")
            .select("*") // includes lessonid (NEW)
            .order("title", { ascending: true });

          if (error) throw error;

          set({
            sections: data ?? [],
            syncing: false,
            loading: false,
          });
        } catch (err: any) {
          console.warn("❌ Failed to sync sections:", err.message);
          set({
            syncing: false,
            loading: false,
            error: err.message,
          });
        }
      }

      return {
        sections: [],
        loading: false,
        syncing: false,
        error: null,

        /** ---------------------------
         * Local-first fetch
         * --------------------------- */
        fetchSections: async () => {
          const online = await isOnline();
          set({ loading: true, error: null });

          try {
            // If offline: show cached sections
            if (!online) {
              console.log("📴 Offline — serving cached sections.");
              set({ loading: false });
              return;
            }

            // Sync with Supabase
            await syncSections();

            // Setup realtime subscription once per session
            if (sectionChannel) supabase.removeChannel(sectionChannel);

            sectionChannel = supabase
              .channel("sections-store")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "sections" },
                () => {
                  console.log("🔄 Section change detected — syncing...");
                  syncSections();
                }
              )
              .subscribe();

            set({ loading: false });
          } catch (err: any) {
            console.error("❌ Section fetch failed:", err.message);
            set({
              loading: false,
              error: err.message,
            });
          }
        },

        /** ---------------------------
         * Manual Refresh
         * --------------------------- */
        refreshSections: async () => {
          set({ syncing: true });
          await syncSections();
        },

        /** ---------------------------
         * Clear Local Cache + Unsubscribe
         * --------------------------- */
        clearAll: () => {
          if (sectionChannel) {
            supabase.removeChannel(sectionChannel);
            sectionChannel = null;
          }

          set({
            sections: [],
            loading: false,
            syncing: false,
            error: null,
          });

          console.log("🧹 SectionStore cleared and unsubscribed.");
        },
      };
    },
    {
      name: "section-storage",
      storage: createJSONStorage(() => zustandStorage),

      /** ---------------------------
       * Rehydrate Logic
       * --------------------------- */
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        console.log("♻️ SectionStore rehydrated (local-first mode).");

        isOnline().then((online) => {
          if (online) {
            console.log(
              "🌐 Online after rehydrate — fetching updated sections."
            );
            useSectionStore.getState().fetchSections();
          } else {
            console.log("📴 Rehydrated offline — using cached sections.");
          }
        });
      },
    }
  )
);
