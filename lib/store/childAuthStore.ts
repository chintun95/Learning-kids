import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import {
  fetchChildrenByParentEmail,
  type ChildCardModel,
} from "@/services/fetchChildren";
import { formatChildPin } from "@/utils/formatter";

/**
 * A compact record for selection & auditing.
 */
export type ChildSwitchEvent = {
  childId: string;
  at: string; // ISO string
};

type ChildAuthState = {
  /** All children fetched for the current parent email */
  children: ChildCardModel[];
  /** Email used for the last hydrate() call (useful for cache validation) */
  loadedForEmail: string | null;

  /** Currently selected child id (null if none) */
  currentChildId: string | null;

  /** Previously logged in child (for switch tracking) */
  previousChildId: string | null;

  /** Last time a profile switch occurred (ISO) */
  lastSwitchAt: string | null;

  /** Append-only local switch history (optional UI/telemetry) */
  switchHistory: ChildSwitchEvent[];

  /** UI helpers */
  loading: boolean;
  error: string | null;

  // Derived getters
  getCurrentChild: () => ChildCardModel | null;
  getPreviousChild: () => ChildCardModel | null;

  // Actions
  hydrate: (parentEmail: string) => Promise<void>;
  setChildren: (
    children: ChildCardModel[],
    parentEmail?: string | null
  ) => void;
  selectChildUnsafe: (childId: string) => void;
  verifyPinAndSelect: (childId: string, pinInput?: string | null) => void;
  clearSelection: () => void;
  removeChildLocally: (childId: string) => void;
};

export const useChildAuthStore = create<ChildAuthState>()(
  persist(
    (set, get) => ({
      children: [],
      loadedForEmail: null,
      currentChildId: null,
      previousChildId: null,
      lastSwitchAt: null,
      switchHistory: [],
      loading: false,
      error: null,

      getCurrentChild: () => {
        const { children, currentChildId } = get();
        return children.find((c) => c.id === currentChildId) ?? null;
      },

      getPreviousChild: () => {
        const { children, previousChildId } = get();
        return children.find((c) => c.id === previousChildId) ?? null;
      },

      setChildren: (children, parentEmail = null) =>
        set({
          children,
          loadedForEmail: parentEmail ?? get().loadedForEmail,
          error: null,
        }),

      hydrate: async (parentEmail: string) => {
        if (!parentEmail) {
          set({
            children: [],
            loadedForEmail: null,
            error: "Missing parent email",
          });
          return;
        }
        set({ loading: true, error: null });
        try {
          const children = await fetchChildrenByParentEmail(parentEmail);
          set({
            children,
            loadedForEmail: parentEmail,
            loading: false,
            error: null,
          });

          // If current selection no longer exists, clear it
          const { currentChildId } = get();
          if (
            currentChildId &&
            !children.some((c) => c.id === currentChildId)
          ) {
            set({ currentChildId: null });
          }
        } catch (err: any) {
          set({
            loading: false,
            error: err?.message ?? "Failed to fetch children",
          });
        }
      },

      selectChildUnsafe: (childId: string) => {
        const { currentChildId, children } = get();
        const exists = children.some((c) => c.id === childId);
        if (!exists) {
          set({ error: "Child not found" });
          return;
        }

        // Save previous child before switching
        if (currentChildId && currentChildId !== childId) {
          set({ previousChildId: currentChildId });
          const prevChild = children.find((c) => c.id === currentChildId);
          if (prevChild) {
            console.log(
              `👤 Last logged-in child before switch: ${prevChild.firstName} ${prevChild.lastName}`
            );
          }
        }

        const at = new Date().toISOString();
        set((state) => ({
          currentChildId: childId,
          lastSwitchAt: at,
          switchHistory: [...state.switchHistory, { childId, at }],
          error: null,
        }));
      },

      verifyPinAndSelect: (childId: string, pinInput?: string | null) => {
        const child = get().children.find((c) => c.id === childId);
        if (!child) {
          set({ error: "Child not found" });
          return;
        }

        // If no PIN on the profile, allow selection; otherwise validate.
        const profilePin = child.profilePin?.trim() ?? "";
        if (profilePin.length === 0) {
          get().selectChildUnsafe(childId);
          return;
        }

        try {
          const cleaned = formatChildPin(pinInput ?? "");
          if (cleaned !== profilePin) {
            set({ error: "Invalid PIN" });
            return;
          }
          get().selectChildUnsafe(childId);
        } catch (e: any) {
          set({ error: e?.message ?? "Invalid PIN" });
        }
      },

      clearSelection: () =>
        set((state) => ({
          previousChildId: state.currentChildId ?? state.previousChildId,
          currentChildId: null,
          lastSwitchAt: null,
        })),

      removeChildLocally: (childId: string) => {
        set((state) => {
          const remain = state.children.filter((c) => c.id !== childId);
          const next: Partial<ChildAuthState> = { children: remain };
          if (state.currentChildId === childId) {
            next.currentChildId = null;
            next.lastSwitchAt = null;
          }
          if (state.previousChildId === childId) {
            next.previousChildId = null;
          }
          return next as Pick<ChildAuthState, keyof ChildAuthState>;
        });
      },
    }),
    {
      name: "child-auth-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        ...state,
        switchHistory: state.switchHistory.slice(-50),
      }),
    }
  )
);
