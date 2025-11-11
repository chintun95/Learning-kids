import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { zustandStorage } from "@/lib/mmkv-storage";
import { Tables } from "@/types/database.types";
import { useNetworkStore } from "@/lib/networkStore";

export type LessonLog = Tables<"lessonlog">;

interface LessonLogState {
  logs: LessonLog[];
  loading: boolean;
  error: string | null;
  lastSynced: string | null;

  fetchLessonLogs: () => Promise<void>;
  addLessonLog: (newLog: LessonLog) => void;
  updateLessonLog: (id: string, updated: Partial<LessonLog>) => void;
  removeLessonLog: (id: string) => void;
  clearLogs: () => void;
}

export const useLessonLogStore = create<LessonLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      loading: false,
      error: null,
      lastSynced: null,

      /** ---------- FETCH ---------- **/
      fetchLessonLogs: async () => {
        const { isConnected } = useNetworkStore.getState();
        if (!isConnected) {
          console.log("📴 Offline — using cached Lesson Logs");
          return;
        }

        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("lessonlog")
            .select("*")
            .order("completedat", { ascending: false });

          if (error) throw new Error(error.message);

          // remove duplicates if any
          const uniqueLogs = Array.from(
            new Map(data?.map((log) => [log.id, log])).values()
          );

          set({
            logs: uniqueLogs,
            lastSynced: new Date().toISOString(),
            loading: false,
          });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      /** ---------- ADD ---------- **/
      addLessonLog: (newLog) => {
        const existing = get().logs.find(
          (l) =>
            l.completedlesson === newLog.completedlesson &&
            l.childid === newLog.childid
        );
        if (existing) {
          console.log(
            "⚠️ Lesson log already exists locally — skipping duplicate insert"
          );
          return;
        }

        set((state) => ({ logs: [newLog, ...state.logs] }));

        const { isConnected } = useNetworkStore.getState();
        if (isConnected) {
          supabase
            .from("lessonlog")
            .insert([newLog])
            .then(({ error }) => {
              if (error)
                console.warn(
                  "⚠️ Failed to sync new lesson log:",
                  error.message
                );
              else console.log("✅ Synced lesson log to Supabase");
            });
        } else {
          console.log("📴 Offline — stored lesson log locally for sync later.");
        }
      },

      /** ---------- UPDATE ---------- **/
      updateLessonLog: (id, updated) => {
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === id ? { ...log, ...updated } : log
          ),
        }));

        const { isConnected } = useNetworkStore.getState();
        if (isConnected) {
          supabase.from("lessonlog").update(updated).eq("id", id);
        }
      },

      /** ---------- REMOVE ---------- **/
      removeLessonLog: (id) => {
        set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));

        const { isConnected } = useNetworkStore.getState();
        if (isConnected) {
          supabase.from("lessonlog").delete().eq("id", id);
        }
      },

      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: "lessonlog-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
