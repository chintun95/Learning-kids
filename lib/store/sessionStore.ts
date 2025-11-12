import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import { formatDate, formatTime } from "@/utils/formatter";
import { syncSessionToSupabase } from "@/services/updateSession";

/**
 * Represents a single session record for a child — aligned with the database table.
 */
export type ChildSessionRecord = {
  date: string;
  startTime: string;
  endTime?: string | null;
  sessionStatus: "In Progress" | "Completed" | "Stalled";
  activityType: "auth" | "lesson" | "quiz" | "game";
  sessionDetails: string | null;
  childID: string; // FK to Child(id)
  user_id: string | null;
};

export interface SessionState {
  sessionType: "auth" | "lesson" | "quiz" | "game" | null;
  childId: string | null;
  currentDate: string | null;
  sessionStartTime: string | null;
  sessionEndTime: string | null;
  sessionStatus: "In Progress" | "Completed" | "Stalled" | null;
  sessionDetails: string | null;
  childSessions: Record<string, ChildSessionRecord[]>;

  /** Track if the player exited specific games */
  exitedFlappyGame: boolean;
  exitedSnake: boolean;

  /** Setters for exit flags */
  setExitedFlappyGame: (exited: boolean) => void;
  setExitedSnake: (exited: boolean) => void;

  /** Standard session controls */
  setSessionType: (type: "auth" | "lesson" | "quiz" | "game" | null) => void;
  setCurrentDate: () => void;
  setStartTime: () => void;
  setEndTime: () => void;
  setSessionStatus: (
    status: "In Progress" | "Completed" | "Stalled" | null
  ) => void;
  setSessionDetails: (details: string | null) => void;

  startChildSession: (
    childId: string,
    type: "auth" | "lesson" | "quiz" | "game"
  ) => void;
  endSession: () => Promise<void>;
  resetSession: () => void;
  clearAllSessions: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionType: null,
      childId: null,
      currentDate: null,
      sessionStartTime: null,
      sessionEndTime: null,
      sessionStatus: null,
      sessionDetails: null,
      childSessions: {},

      exitedFlappyGame: false,
      exitedSnake: false,

      /** Exit flag setters */
      setExitedFlappyGame: (exited) => set({ exitedFlappyGame: exited }),
      setExitedSnake: (exited) => set({ exitedSnake: exited }),

      setSessionType: (type) => set({ sessionType: type }),

      setCurrentDate: () => {
        const now = new Date();
        set({ currentDate: formatDate(now) });
      },

      setStartTime: () => {
        const now = new Date();
        set({ sessionStartTime: formatTime(now) });
      },

      setEndTime: () => {
        const now = new Date();
        set({ sessionEndTime: formatTime(now) });
      },

      setSessionStatus: (status) => set({ sessionStatus: status }),
      setSessionDetails: (details) => set({ sessionDetails: details }),

      /** Begin new child session */
      startChildSession: (childId, type) => {
        const now = new Date();
        set({
          childId,
          sessionType: type,
          currentDate: formatDate(now),
          sessionStartTime: formatTime(now),
          sessionEndTime: null,
          sessionStatus: "In Progress",
          sessionDetails: null,
          exitedFlappyGame: false,
          exitedSnake: false,
        });
      },

      /** End session, save locally, and sync to Supabase if online */
      endSession: async () => {
        const {
          childId,
          sessionType,
          currentDate,
          sessionStartTime,
          sessionDetails,
          childSessions,
        } = get();

        if (!childId || !sessionType || !currentDate || !sessionStartTime) {
          console.warn("⚠️ Cannot end session — missing data.");
          return;
        }

        const now = new Date();
        const endTime = formatTime(now);

        const newRecord: ChildSessionRecord = {
          date: currentDate,
          startTime: sessionStartTime,
          endTime,
          sessionStatus: "Completed",
          activityType: sessionType,
          sessionDetails,
          childID: childId,
          user_id: null,
        };

        const existing = childSessions[childId] ?? [];
        set({
          sessionEndTime: endTime,
          sessionStatus: "Completed",
          childSessions: {
            ...childSessions,
            [childId]: [...existing, newRecord],
          },
        });

        // Validate UUID before syncing
        const isUUID = /^[0-9a-fA-F-]{36}$/.test(childId);
        if (!isUUID) {
          console.warn(
            `⚠️ Skipping Supabase sync — invalid childId: ${childId}`
          );
          return;
        }

        const sessionPayload = {
          activitytype: newRecord.activityType,
          childid: newRecord.childID,
          date: newRecord.date,
          starttime: newRecord.startTime,
          endtime: newRecord.endTime,
          sessionstatus: newRecord.sessionStatus,
          sessiondetails: newRecord.sessionDetails,
          user_id: newRecord.user_id,
        };

        const success = await syncSessionToSupabase(sessionPayload);
        console.log(
          success
            ? "✅ Synced session successfully."
            : "⚠️ Stored session locally."
        );
      },

      /** Reset active session */
      resetSession: () =>
        set({
          sessionType: null,
          childId: null,
          currentDate: null,
          sessionStartTime: null,
          sessionEndTime: null,
          sessionStatus: null,
          sessionDetails: null,
          exitedFlappyGame: false,
          exitedSnake: false,
        }),

      /** Clear all stored session data */
      clearAllSessions: () => set({ childSessions: {} }),
    }),
    {
      name: "session-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
