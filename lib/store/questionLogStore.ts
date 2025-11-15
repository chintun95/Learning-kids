import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { zustandStorage } from "@/lib/mmkv-storage";
import { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import { useNetworkStore } from "@/lib/networkStore";

/** ---------- Types ---------- **/
export type QuestionLog = Tables<"questionlog">; // READ rows
export type QuestionLogInsert = TablesInsert<"questionlog">; // INSERT rows
export type QuestionLogUpdate = TablesUpdate<"questionlog">; // UPDATE rows

interface QuestionLogState {
  logs: QuestionLog[];
  loading: boolean;
  error: string | null;
  lastSynced: string | null;

  fetchQuestionLogs: () => Promise<void>;
  addQuestionLog: (newLog: QuestionLogInsert) => Promise<void>;
  updateQuestionLog: (id: string, updated: QuestionLogUpdate) => Promise<void>;
  removeQuestionLog: (id: string) => Promise<void>;
  clearLogs: () => void;
}

export const useQuestionLogStore = create<QuestionLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      loading: false,
      error: null,
      lastSynced: null,

      /** ------------------------------------------------------------------
       *   FETCH QUESTION LOGS FROM SUPABASE
       * ------------------------------------------------------------------ **/
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

          console.log("✅ Question Logs synced from Supabase.");
        } catch (err: any) {
          set({ error: err.message, loading: false });
          console.warn("⚠️ Failed fetching question logs:", err.message);
        }
      },

      /** ------------------------------------------------------------------
       *   ADD QUESTION LOG (LOCAL FIRST, SYNC IF ONLINE)
       * ------------------------------------------------------------------ **/
      addQuestionLog: async (newLog) => {
        // Local insert first
        const localId = newLog.id ?? crypto.randomUUID();

        const enrichedLog: QuestionLog = {
          id: localId,
          completedat: newLog.completedat ?? new Date().toISOString(),
          iscorrect: newLog.iscorrect ?? false,
          childid: newLog.childid,
          completedquestion: newLog.completedquestion,
          user_id: newLog.user_id ?? null,
        };

        set((state) => ({
          logs: [enrichedLog, ...state.logs],
        }));

        const { isConnected } = useNetworkStore.getState();

        if (!isConnected) {
          console.log("📴 Offline — queued question log locally.");
          return;
        }

        // Push to DB
        const { error } = await supabase.from("questionlog").insert([
          {
            ...newLog,
            id: localId,
          },
        ]);

        if (error) {
          console.warn("⚠️ Failed to sync question log:", error.message);
        } else {
          console.log("✅ Question log synced to Supabase:", enrichedLog.id);
        }
      },

      /** ------------------------------------------------------------------
       *   UPDATE QUESTION LOG
       * ------------------------------------------------------------------ **/
      updateQuestionLog: async (id, updated) => {
        // Local update
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === id ? { ...log, ...updated } : log
          ),
        }));

        const { isConnected } = useNetworkStore.getState();
        if (!isConnected) {
          console.log("📴 Offline — updated locally only.");
          return;
        }

        const { error } = await supabase
          .from("questionlog")
          .update(updated)
          .eq("id", id);

        if (error) {
          console.warn("⚠️ Failed updating question log:", error.message);
        } else {
          console.log("🔄 Synced update to Supabase:", id);
        }
      },

      /** ------------------------------------------------------------------
       *   REMOVE QUESTION LOG
       * ------------------------------------------------------------------ **/
      removeQuestionLog: async (id) => {
        // Local delete
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== id),
        }));

        const { isConnected } = useNetworkStore.getState();
        if (!isConnected) {
          console.log("📴 Offline — deleted locally only.");
          return;
        }

        const { error } = await supabase
          .from("questionlog")
          .delete()
          .eq("id", id);

        if (error) {
          console.warn("⚠️ Failed deleting question log:", error.message);
        } else {
          console.log("🗑️ Deleted question log remotely:", id);
        }
      },

      /** ------------------------------------------------------------------
       *   CLEAR LOCAL LOGS
       * ------------------------------------------------------------------ **/
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: "questionlog-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
