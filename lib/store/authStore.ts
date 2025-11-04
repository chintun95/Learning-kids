import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";

interface AuthState {
  role: "parent" | "child" | "default";
  onBoardedStatus: "completed" | "pending";

  // auth-related
  setRole: (role: "parent" | "child" | "default") => void;
  setOnBoardedStatus: (status: "completed" | "pending") => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      role: "default",
      onBoardedStatus: "pending",

      setRole: (role) => set({ role }),
      setOnBoardedStatus: (onBoardedStatus) => set({ onBoardedStatus }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
