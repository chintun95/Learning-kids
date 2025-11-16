import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { zustandStorage } from "@/lib/mmkv-storage";
import { Tables } from "@/types/database.types";
import { useNetworkStore } from "@/lib/networkStore";
import { useQuestionLogStore } from "@/lib/store/questionLogStore";

export type LessonLog = Tables<"lessonlog">;

interface LessonLogState {
  logs: LessonLog[];
  loading: boolean;
  error: string | null;
  lastSynced: string | null;

  fetchLessonLogs: () => Promise<void>;
  addLessonLog: (newLog: LessonLog) => Promise<void>;
  updateLessonLog: (id: string, updated: Partial<LessonLog>) => void;
  removeLessonLog: (id: string) => void;
  clearLogs: () => void;

  /** NEW: Auto-completion helpers */
  isLessonLogged: (lessonId: string, childId: string) => boolean;
  checkAndAutoCompleteLesson: (
    lessonId: string,
    childId: string
  ) => Promise<void>;
}

export const useLessonLogStore = create<LessonLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      loading: false,
      error: null,
      lastSynced: null,

      /* ========================================================
         FETCH LESSON LOGS
      ======================================================== */
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

          const uniqueLogs = Array.from(
            new Map((data ?? []).map((log) => [log.id, log])).values()
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

      /* ========================================================
         ADD LESSON LOG (LOCAL FIRST)
      ======================================================== */
      addLessonLog: async (newLog) => {
        // Prevent duplicates
        const exists = get().logs.some(
          (l) =>
            l.completedlesson === newLog.completedlesson &&
            l.childid === newLog.childid
        );

        if (exists) {
          console.log("⚠️ Lesson already logged — skipping");
          return;
        }

        set((state) => ({
          logs: [newLog, ...state.logs],
        }));

        const { isConnected } = useNetworkStore.getState();

        if (!isConnected) {
          console.log("📴 Offline — saved lesson log locally.");
          return;
        }

        const { error } = await supabase.from("lessonlog").insert([newLog]);

        if (error) console.warn("⚠️ Failed to sync lessonlog:", error.message);
        else console.log("✅ Synced lesson log to Supabase");
      },

      /* ========================================================
         UPDATE LESSON LOG
      ======================================================== */
      updateLessonLog: (id, updated) => {
        set((state) => ({
          logs: state.logs.map((l) => (l.id === id ? { ...l, ...updated } : l)),
        }));

        const { isConnected } = useNetworkStore.getState();
        if (isConnected) {
          supabase.from("lessonlog").update(updated).eq("id", id);
        }
      },

      /* ========================================================
         REMOVE LESSON LOG
      ======================================================== */
      removeLessonLog: (id) => {
        set((state) => ({
          logs: state.logs.filter((l) => l.id !== id),
        }));

        const { isConnected } = useNetworkStore.getState();
        if (isConnected) {
          supabase.from("lessonlog").delete().eq("id", id);
        }
      },

      clearLogs: () => set({ logs: [] }),

      /* ========================================================
         NEW FUNCTIONS — INTEGRATION WITH questionLogStore
      ======================================================== */

      /** Check if lesson is already logged */
      isLessonLogged: (lessonId, childId) => {
        return get().logs.some(
          (log) => log.completedlesson === lessonId && log.childid === childId
        );
      },

      /** Auto-insert into lessonlog when all sections are completed */
      checkAndAutoCompleteLesson: async (lessonId, childId) => {
        const questionLogStore = useQuestionLogStore.getState();

        const isCompleted = questionLogStore.isLessonCompleted(lessonId);

        if (!isCompleted) return;

        // avoid duplicates
        if (get().isLessonLogged(lessonId, childId)) {
          console.log("✔ Lesson already completed — skip logging");
          return;
        }

        console.log(`🏆 Auto-marking lesson ${lessonId} complete!`);

        // build lessonlog row
        const newLog: LessonLog = {
          id: crypto.randomUUID(),
          childid: childId,
          completedlesson: lessonId,
          completedat: new Date().toISOString(),
          user_id: null,
        };

        await get().addLessonLog(newLog);
      },
    }),
    {
      name: "lessonlog-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
