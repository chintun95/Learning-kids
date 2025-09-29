
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";

type Role = "default" | "parent" | "child";

interface SessionState {
  role: Role;
  sessionID: string | null;
  currentDate: string | null;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  isOnboarded: boolean;
  // Actions
  setRole: (role: Role) => void;
  setOnboarded: (value: boolean) => void;
  startSession: (sessionID: string) => void;
  endSession: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      role: "default",
      sessionID: null,
      currentDate: null,
      sessionStartTime: null,
      sessionEndTime: null,
      isOnboarded: false,

      setRole: (role) => set({ role }),
      setOnboarded: (value) => set({ isOnboarded: value }),

      startSession: (sessionID) =>
        set({
          sessionID,
          currentDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
          sessionStartTime: Date.now(),
          sessionEndTime: null,
        }),

      endSession: () =>
        set({
          sessionEndTime: Date.now(),
        }),

      resetSession: () =>
        set({
          role: "default",
          sessionID: null,
          currentDate: null,
          sessionStartTime: null,
          sessionEndTime: null,
          isOnboarded: false,
        }),
    }),
    {
      name: "session-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
