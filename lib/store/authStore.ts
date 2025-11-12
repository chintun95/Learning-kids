import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";

interface AuthState {
  role: "parent" | "child" | "default";
  onBoardedStatus: "completed" | "pending";
  isParentSynced: boolean;

  // actions
  setRole: (role: "parent" | "child" | "default") => void;
  setOnBoardedStatus: (status: "completed" | "pending") => void;
  setParentSynced: (synced: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      role: "default",
      onBoardedStatus: "pending",
      isParentSynced: false, // default

      setRole: (role) => set({ role }),
      setOnBoardedStatus: (onBoardedStatus) => set({ onBoardedStatus }),
      setParentSynced: (isParentSynced) => set({ isParentSynced }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
