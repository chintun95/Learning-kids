import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "../mmkv-storage";

// Define possible roles
type UserRole = "parent" | "child" | "default";

// Define the shape of your auth state
interface AuthState {
  isLoggedIn: boolean;
  isOnboarded: boolean;
  role: UserRole;

  // Actions to update the state
  setIsLoggedIn: (value: boolean) => void;
  setIsOnboarded: (value: boolean) => void;
  setRole: (role: UserRole) => void;
  resetAuth: () => void;
}

// Create the Zustand store with persistence
export const useAuthStore = create(
  persist<AuthState>(
    (set) => ({
      isLoggedIn: false,
      isOnboarded: false,
      role: "default",

      setIsLoggedIn: (value: boolean) => set({ isLoggedIn: value }),

      setIsOnboarded: (value: boolean) => set({ isOnboarded: value }),


      setRole: (role: UserRole) => set({ role }),

      resetAuth: () =>
        set({
          isLoggedIn: false,
          isOnboarded: false,
          role: "default",
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
