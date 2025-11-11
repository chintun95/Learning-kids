import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { zustandStorage } from "@/lib/mmkv-storage";
import { Tables } from "@/types/database.types";
import { useNetworkStore } from "@/lib/networkStore";

export type QuestionLog = Tables<"questionlog">;

interface QuestionLogState {
  logs: QuestionLog[];
  loading: boolean;
  error: string | null;
  lastSynced: string | null;

  fetchQuestionLogs: () => Promise<void>;
  addQuestionLog: (newLog: QuestionLog) => void;
  updateQuestionLog: (id: string, updated: Partial<QuestionLog>) => void;
  removeQuestionLog: (id: string) => void;
  clearLogs: () => void;
}

export const useQuestionLogStore = create<QuestionLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      loading: false,
      error: null,
      lastSynced: null,

      /** ---------- FETCH ---------- **/
      fetchQuestionLogs: async () => {
        const { isConnected } = useNetworkStore.getState();
        if (!isConnected) {
          console.log("📴 Offline — using cached Question Logs");
          return;
        }

        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("questionlog")
            .select("*")
            .order("completedat", { ascending: false });

          if (error) throw new Error(error.message);

          set({
            logs: data ?? [],
            lastSynced: new Date().toISOString(),
            loading: false,
          });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      /** ---------- ADD ---------- **/
      addQuestionLog: (newLog) => {
        set((state) => ({ logs: [newLog, ...state.logs] }));

        const { isConnected } = useNetworkStore.getState();
        if (isConnected) {
          supabase
            .from("questionlog")
            .insert([newLog])
            .then(({ error }) => {
              if (error) {
                console.warn(
                  "⚠️ Failed to sync new question log:",
                  error.message
                );
              } else {
                console.log("✅ Synced question log to Supabase.");
              }
            });
        } else {
          console.log("📴 Offline — question log saved locally.");
        }
      },

      /** ---------- UPDATE ---------- **/
      updateQuestionLog: (id, updated) => {
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === id ? { ...log, ...updated } : log
          ),
        }));

        const { isConnected } = useNetworkStore.getState();
        if (isConnected) {
          supabase.from("questionlog").update(updated).eq("id", id);
        }
      },

      /** ---------- REMOVE ---------- **/
      removeQuestionLog: (id) => {
        set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));

        const { isConnected } = useNetworkStore.getState();
        if (isConnected) {
          supabase.from("questionlog").delete().eq("id", id);
        }
      },

      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: "questionlog-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
