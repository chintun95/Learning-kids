// lib/store/questionLogStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { zustandStorage } from "@/lib/mmkv-storage";
import { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import { useNetworkStore } from "@/lib/networkStore";
import { useQuestionStore } from "@/lib/store/questionStore";
import { useSectionStore } from "@/lib/store/sectionStore"; // ✅ NEW FIX

/** ---------- Types ---------- **/
export type QuestionLog = Tables<"questionlog">;
export type QuestionLogInsert = TablesInsert<"questionlog">;
export type QuestionLogUpdate = TablesUpdate<"questionlog">;

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

  /** ---------- NEW COMPLETION HELPERS ---------- **/
  getCompletedQuestionIds: () => Set<string>;
  getCompletedQuestionCount: (sectionId: string) => number;
  isSectionCompleted: (sectionId: string) => boolean;
  getLessonSectionCompletion: (lessonId: string) => {
    completed: number;
    total: number;
    allCompleted: boolean;
  };
  isLessonCompleted: (lessonId: string) => boolean;
}

export const useQuestionLogStore = create<QuestionLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      loading: false,
      error: null,
      lastSynced: null,

      /* =========================================
         FETCH LOGS
      ========================================= */
      fetchQuestionLogs: async () => {
        const { isConnected } = useNetworkStore.getState();
        if (!isConnected) return;

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

      /* =========================================
         ADD LOG
      ========================================= */
      addQuestionLog: async (newLog) => {
        const localId = newLog.id ?? crypto.randomUUID();

        const enrichedLog: QuestionLog = {
          id: localId,
          completedat: newLog.completedat ?? new Date().toISOString(),
          iscorrect: newLog.iscorrect ?? false,
          childid: newLog.childid,
          completedquestion: newLog.completedquestion,
          user_id: newLog.user_id ?? null,
        };

        // local insert
        set((state) => ({ logs: [enrichedLog, ...state.logs] }));

        const { isConnected } = useNetworkStore.getState();
        if (!isConnected) return;

        const { error } = await supabase
          .from("questionlog")
          .insert([{ ...newLog, id: localId }]);

        if (error)
          console.warn("⚠️ Failed to sync questionlog:", error.message);
      },

      /* =========================================
         UPDATE LOG
      ========================================= */
      updateQuestionLog: async (id, updated) => {
        set((state) => ({
          logs: state.logs.map((l) => (l.id === id ? { ...l, ...updated } : l)),
        }));

        const { isConnected } = useNetworkStore.getState();
        if (!isConnected) return;

        await supabase.from("questionlog").update(updated).eq("id", id);
      },

      /* =========================================
         REMOVE LOG
      ========================================= */
      removeQuestionLog: async (id) => {
        set((state) => ({
          logs: state.logs.filter((l) => l.id !== id),
        }));

        const { isConnected } = useNetworkStore.getState();
        if (!isConnected) return;

        await supabase.from("questionlog").delete().eq("id", id);
      },

      clearLogs: () => set({ logs: [] }),

      /* ================================================================
         NEW COMPLETION TRACKING LOGIC
      ================================================================ */

      /** Return set of completed question IDs */
      getCompletedQuestionIds: () => {
        return new Set(get().logs.map((log) => log.completedquestion));
      },

      /** Count of completed questions in a section */
      getCompletedQuestionCount: (sectionId: string) => {
        const allQuestions = useQuestionStore.getState().questions;
        const completed = get().getCompletedQuestionIds();

        return allQuestions.filter(
          (q) => q.section_id === sectionId && completed.has(q.id)
        ).length;
      },

      /** Section is complete if all section questions are answered */
      isSectionCompleted: (sectionId: string) => {
        const allQuestions = useQuestionStore.getState().questions;

        const sectionQs = allQuestions.filter(
          (q) => q.section_id === sectionId
        );

        if (sectionQs.length === 0) return false;

        const completed = get().getCompletedQuestionIds();

        return sectionQs.every((q) => completed.has(q.id));
      },

      /** Lesson-level completion overview */
      getLessonSectionCompletion: (lessonId: string) => {
        const sections = useSectionStore
          .getState()
          .sections.filter((s) => s.lessonid === lessonId);

        const total = sections.length;
        let completedCount = 0;

        for (const sec of sections) {
          if (get().isSectionCompleted(sec.id)) completedCount++;
        }

        return {
          completed: completedCount,
          total,
          allCompleted: completedCount === total,
        };
      },

      /** Lesson is complete when all sections are complete */
      isLessonCompleted: (lessonId: string) => {
        return get().getLessonSectionCompletion(lessonId).allCompleted;
      },
    }),
    {
      name: "questionlog-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
