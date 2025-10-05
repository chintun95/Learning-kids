import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";

interface AuthState {
  isOnboarded: boolean;
  isLoggedIn: boolean;
  role: "parent" | "child" | "default";
  isParent: boolean;
  isChild: boolean;

  // auth-related
  setRole: (role: "parent" | "child" | "default") => void;
  setOnboarded: (value: boolean) => void;
  setIsLoggedIn: (status: boolean) => void;
  setIsParent: (status: boolean) => void;
  setIsChild: (status: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      isOnboarded: false,
      role: "default",
      isParent: false,
      isChild: false,

      setRole: (role) => set({ role }),
      setOnboarded: (value) => set({ isOnboarded: value }),
      setIsLoggedIn: (status) => set({ isLoggedIn: status }),
      setIsParent: (status) => set({ isParent: status }),
      setIsChild: (status) => set({ isChild: status }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
