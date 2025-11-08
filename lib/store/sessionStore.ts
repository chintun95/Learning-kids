import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import { formatDate, formatTime } from "@/utils/formatter";

/**
 * Represents a single session record for a child.
 */
export type ChildSessionRecord = {
  childId: string;
  sessionType: "auth" | "lesson" | "quiz" | "game";
  date: string;
  startTime: string;
  endTime?: string | null;
};

export interface SessionState {
  /** The type of the current session (auth | lesson | quiz | game) */
  sessionType: "auth" | "lesson" | "quiz" | "game" | null;

  /** Which child this session belongs to (null if none) */
  childId: string | null;

  /** Active session details */
  currentDate: string | null;
  sessionStartTime: string | null;
  sessionEndTime: string | null;

  /** All locally stored sessions grouped by childId */
  childSessions: Record<string, ChildSessionRecord[]>;

  // === Actions ===
  setSessionType: (type: "auth" | "lesson" | "quiz" | "game" | null) => void;
  setCurrentDate: () => void;
  setStartTime: () => void;
  setEndTime: () => void;

  /** Start a new session tied to a child */
  startChildSession: (
    childId: string,
    type: "auth" | "lesson" | "quiz" | "game"
  ) => void;

  /** End the currently active session and save it into the history */
  endSession: () => void;

  /** Clear all active session data (does NOT delete history) */
  resetSession: () => void;

  /** Clear all session history */
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
      childSessions: {},

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

      startChildSession: (childId, type) => {
        const now = new Date();
        set({
          childId,
          sessionType: type,
          currentDate: formatDate(now),
          sessionStartTime: formatTime(now),
          sessionEndTime: null,
        });
      },

      endSession: () => {
        const {
          childId,
          sessionType,
          currentDate,
          sessionStartTime,
          childSessions,
        } = get();
        if (!childId || !sessionType || !currentDate || !sessionStartTime)
          return;

        const now = new Date();
        const endTime = formatTime(now);

        const newRecord: ChildSessionRecord = {
          childId,
          sessionType,
          date: currentDate,
          startTime: sessionStartTime,
          endTime,
        };

        const existing = childSessions[childId] ?? [];
        set({
          sessionEndTime: endTime,
          childSessions: {
            ...childSessions,
            [childId]: [...existing, newRecord],
          },
        });
      },

      resetSession: () =>
        set({
          sessionType: null,
          childId: null,
          currentDate: null,
          sessionStartTime: null,
          sessionEndTime: null,
        }),

      clearAllSessions: () => set({ childSessions: {} }),
    }),
    {
      name: "session-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
