import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NetInfo from "@react-native-community/netinfo";
import { zustandStorage } from "@/lib/mmkv-storage";
import { supabase } from "@/lib/supabase";
import { Question } from "@/services/fetchQuestions";

interface QuestionState {
  questions: Question[];
  loading: boolean;
  syncing: boolean;
  error: string | null;

  fetchQuestions: () => Promise<void>;
  refreshQuestions: () => Promise<void>;
  clearAll: () => void;
}

async function getOnlineStatus(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected;
}

export const useQuestionStore = create<QuestionState>()(
  persist(
    (set, get) => {
      let questionChannel: ReturnType<typeof supabase.channel> | null = null;

      /** Safely sync with Supabase when online */
      async function syncQuestions() {
        const online = await getOnlineStatus();
        if (!online) {
          console.log("📴 Offline — using cached questions.");
          return;
        }

        try {
          console.log("🌐 Syncing questions from Supabase...");
          const { data, error } = await supabase
            .from("questionbank")
            .select("*")
            .order("question", { ascending: true }); // ✅ correct column

          if (error) throw error;

          console.log("✅ Synced", data?.length ?? 0, "questions.");
          set({
            questions: data ?? [],
            syncing: false,
            loading: false,
          });
        } catch (err: any) {
          console.warn("❌ Failed to sync questions:", err.message);
          set({ syncing: false, loading: false, error: err.message });
        }
      }

      return {
        questions: [],
        loading: false,
        syncing: false,
        error: null,

        /** Local-first fetch with realtime subscription if online */
        fetchQuestions: async () => {
          const online = await getOnlineStatus();
          set({ loading: true, error: null });

          try {
            if (!online) {
              console.log("📴 Offline — serving cached questions.");
              set({ loading: false });
              return;
            }

            await syncQuestions();

            // Realtime subscription
            if (questionChannel) supabase.removeChannel(questionChannel);
            questionChannel = supabase
              .channel("questionbank-store")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "questionbank" },
                () => {
                  console.log(
                    "🔄 Detected questionbank change — re-syncing..."
                  );
                  syncQuestions();
                }
              )
              .subscribe();

            set({ loading: false });
          } catch (err: any) {
            console.error("❌ Question fetch failed:", err.message);
            set({ loading: false, error: err.message });
          }
        },

        /** Manual refresh */
        refreshQuestions: async () => {
          set({ syncing: true });
          await syncQuestions();
        },

        /** Clear all cached data + unsubscribe */
        clearAll: () => {
          if (questionChannel) {
            supabase.removeChannel(questionChannel);
            questionChannel = null;
          }
          set({
            questions: [],
            loading: false,
            syncing: false,
            error: null,
          });
          console.log("🧹 QuestionStore cleared and unsubscribed.");
        },
      };
    },
    {
      name: "question-storage",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        console.log("♻️ QuestionStore rehydrated (local-first mode).");
        getOnlineStatus().then((online) => {
          if (online) {
            console.log("🌐 Online — auto-refreshing questions...");
            useQuestionStore.getState().fetchQuestions();
          } else {
            console.log("📴 Rehydrated offline — showing cached questions.");
          }
        });
      },
    }
  )
);
