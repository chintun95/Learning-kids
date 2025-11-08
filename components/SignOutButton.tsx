import React, { useState } from "react";
import { useClerk } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import Button from "../components/Button";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { responsive } from "@/utils/responsive";

/**
 * SignOutButton — integrated with the new sessionStore
 * - Ends the current session for a child before sign-out
 * - Marks the child inactive in Supabase
 * - Preserves loading state and clean reset
 */
export const SignOutButton: React.FC = () => {
  const { signOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Zustand selectors
  const { endSession, resetSession } = useSessionStore();
  const setRole = useAuthStore((state) => state.setRole);
  const role = useAuthStore((state) => state.role);
  const { getCurrentChild } = useChildAuthStore();

  // Mutation: mark child inactive
  const { mutateAsync: setInactiveStatus } = useMutation({
    mutationFn: async (childId: string) => {
      const { error } = await supabase
        .from("Child")
        .update({ activitystatus: "inactive" })
        .eq("id", childId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, childId) => {
      queryClient.invalidateQueries({ queryKey: ["child-by-id", childId] });
      queryClient.invalidateQueries({
        queryKey: ["children-for-parent-email"],
      });
      console.log(`✅ Child ${childId} set to inactive before sign-out.`);
    },
    onError: (error) => {
      console.error("❌ Failed to update child status before sign-out:", error);
    },
  });

  const logState = (label: string) => {
    const sessionState = useSessionStore.getState();
    const authState = useAuthStore.getState();

    console.log(
      `\n🟢 ${label} Zustand Snapshot:\n` +
        `  Role: ${authState.role}\n` +
        `  Session Type: ${sessionState.sessionType}\n` +
        `  Current Date: ${sessionState.currentDate}\n` +
        `  Start Time: ${sessionState.sessionStartTime}\n` +
        `  End Time: ${sessionState.sessionEndTime}\n` +
        `  Onboarded: ${authState.onBoardedStatus}\n`
    );
  };

  const handleSignOut = async () => {
    if (loading) return;
    setLoading(true);

    try {
      logState("Before Sign Out");

      if (role === "child") {
        const child = getCurrentChild();
        if (child) {
          // 1️⃣ End the local session (records endTime + saves to history)
          endSession();
          console.log(`🕒 Ended local session for child ${child.id}`);

          // 2️⃣ Mark as inactive in Supabase
          console.log(
            `⚙️ Setting activityStatus to inactive for ${child.firstName} ${child.lastName}...`
          );
          await setInactiveStatus(child.id);
        }
      }

      // 3️⃣ Sign out from Clerk
      await signOut();

      // 4️⃣ Reset local state
      resetSession();
      setRole("default");

      logState("After Sign Out");

      // 5️⃣ Redirect to root
      Linking.openURL(Linking.createURL("/"));
    } catch (err) {
      console.error("❌ Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      title={loading ? "Signing out..." : "Sign Out"}
      onPress={handleSignOut}
      backgroundColor="#000"
      textColor="#fff"
      fontSize={responsive.buttonFontSize}
      disabled={loading}
      loading={loading}
    />
  );
};

export default SignOutButton;
