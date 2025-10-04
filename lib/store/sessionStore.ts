import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import { formatDate, formatTime } from "@/utils/formatter";

interface SessionState {
  sessionID: string | null;
  currentDate: string | null;
  sessionStartTime: string | null;
  sessionEndTime: string | null;
  isOnboarded: boolean;
  isLoggedIn: boolean;
  role: "parent" | "child" | "default";
  isParent: boolean;
  isChild: boolean;

  // setters
  setSessionID: (id: string | null) => void;
  setCurrentDate: () => void;
  setStartTime: () => void;
  setEndTime: () => void;

  // auth-related
  setRole: (role: "parent" | "child" | "default") => void;
  setOnboarded: (value: boolean) => void;
  setIsLoggedIn: (status: boolean) => void;
  setIsParent: (status: boolean) => void;
  setIsChild: (status: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionID: null,
      currentDate: null,
      sessionStartTime: null,
      sessionEndTime: null,
      isLoggedIn: false,
      isOnboarded: false,
      role: "default",
      isParent: false,
      isChild: false,

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

      setRole: (role) => set({ role }),
      setOnboarded: (value) => set({ isOnboarded: value }),
      setIsLoggedIn: (status) => set({ isLoggedIn: status }),
      setIsParent: (status) => set({ isParent: status }),
      setIsChild: (status) => set({ isChild: status }),
    }),
    {
      name: "session-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
