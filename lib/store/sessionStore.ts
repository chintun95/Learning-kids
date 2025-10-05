import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import { formatDate, formatTime } from "@/utils/formatter";

interface SessionState {
  sessionID: string | null;
  currentDate: string | null;
  sessionStartTime: string | null;
  sessionEndTime: string | null;

  // Setters
  setSessionID: (id: string | null) => void;
  setCurrentDate: () => void;
  setStartTime: () => void;
  setEndTime: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionID: null,
      currentDate: null,
      sessionStartTime: null,
      sessionEndTime: null,

      // Assigns sessionID manually (useful for restore)
      setSessionID: (id) => set({ sessionID: id }),

      // Automatically assigns current date
      setCurrentDate: () => {
        const now = new Date();
        set({ currentDate: formatDate(now) });
      },

      // Automatically assigns session start time
      setStartTime: () => {
        const now = new Date();
        set({ sessionStartTime: formatTime(now) });
      },

      // Automatically assigns session end time
      setEndTime: () => {
        const now = new Date();
        set({ sessionEndTime: formatTime(now) });
      },
    }),
    {
      name: "session-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
