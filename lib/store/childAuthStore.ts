import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/mmkv-storage";
import { supabase } from "@/lib/supabase";
import {
  fetchChildrenByParentEmail,
  type ChildCardModel,
} from "@/services/fetchChildren";
import { formatChildPin } from "@/utils/formatter";

export type ChildSwitchEvent = {
  childId: string;
  at: string;
};

type ChildAuthState = {
  children: ChildCardModel[];
  loadedForEmail: string | null;
  currentChildId: string | null;
  previousChildId: string | null;
  lastSwitchAt: string | null;
  switchHistory: ChildSwitchEvent[];
  firstTimeLogin: boolean;
  loading: boolean;
  error: string | null;

  getCurrentChild: () => ChildCardModel | null;
  getPreviousChild: () => ChildCardModel | null;

  hydrate: (parentEmail: string) => Promise<void>;
  setChildren: (
    children: ChildCardModel[],
    parentEmail?: string | null
  ) => void;
  selectChildUnsafe: (childId: string) => void;
  verifyPinAndSelect: (childId: string, pinInput?: string | null) => void;
  clearSelection: () => void;
  removeChildLocally: (childId: string) => void;

  setFirstTimeLogin: (value: boolean) => void;
  markFirstTimeComplete: () => void;

  /** Completely clears all data from the store */
  resetStore: () => void;
};

let realtimeSubscription: ReturnType<typeof supabase.channel> | null = null;

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
      firstTimeLogin: true,

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

          const { currentChildId } = get();
          if (
            currentChildId &&
            !children.some((c) => c.id === currentChildId)
          ) {
            set({ currentChildId: null });
          }

          if (realtimeSubscription) {
            supabase.removeChannel(realtimeSubscription);
          }

          realtimeSubscription = supabase
            .channel("child-auth-realtime")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "Child" },
              async () => {
                try {
                  console.log("🔁 Re-fetching children (real-time update)...");
                  const updated = await fetchChildrenByParentEmail(parentEmail);
                  set({ children: updated });
                } catch (err: any) {
                  console.error("❌ Real-time update failed:", err);
                }
              }
            )
            .subscribe();

          console.log("✅ Subscribed to real-time updates for Child table.");
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

      setFirstTimeLogin: (value) => set({ firstTimeLogin: value }),
      markFirstTimeComplete: () => set({ firstTimeLogin: false }),

      /** --- NEW --- */
      resetStore: () => {
        console.log("🧹 Clearing childAuthStore data...");
        if (realtimeSubscription) {
          supabase.removeChannel(realtimeSubscription);
          realtimeSubscription = null;
        }
        set({
          children: [],
          loadedForEmail: null,
          currentChildId: null,
          previousChildId: null,
          lastSwitchAt: null,
          switchHistory: [],
          firstTimeLogin: true,
          loading: false,
          error: null,
        });
        zustandStorage.removeItem("child-auth-storage");
      },
    }),
    {
      name: "child-auth-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        ...state,
        switchHistory: state.switchHistory.slice(-50),
        firstTimeLogin: state.firstTimeLogin,
      }),
    }
  )
);
