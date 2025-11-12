import React, { useState } from "react";
import { useClerk } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import Button from "../components/Button";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useChildAchievementStore } from "@/lib/store/childAchievementStore";
import { useGameStore } from "@/lib/store/gameStore";
import { useLessonLogStore } from "@/lib/store/lessonLogStore";
import { useLessonStore } from "@/lib/store/lessonStore";
import { useQuestionLogStore } from "@/lib/store/questionLogStore";
import { useQuestionStore } from "@/lib/store/questionStore";
import { useSectionStore } from "@/lib/store/sectionStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { responsive } from "@/utils/responsive";

/**
 * SignOutButton — integrated with all local stores
 * - Ends the current session for a child before sign-out
 * - Marks the child inactive in Supabase
 * - Clears *all* child-related local and cached data
 */
export const SignOutButton: React.FC = () => {
  const { signOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Zustand selectors
  const {
    endSession,
    resetSession,
    clearAllSessions, // ✅ Added clearAllSessions
  } = useSessionStore();
  const setRole = useAuthStore((state) => state.setRole);
  const setParentSynced = useAuthStore((state) => state.setParentSynced);
  const role = useAuthStore((state) => state.role);
  const { getCurrentChild, resetStore: resetChildAuthStore } =
    useChildAuthStore();
  const { resetStore: resetChildAchievementStore } = useChildAchievementStore();
  const { resetCurrentScore, resetHighScore } = useGameStore();
  const { clearLogs: clearLessonLogs } = useLessonLogStore();
  const { clearAll: clearLessonStore } = useLessonStore();
  const { clearLogs: clearQuestionLogs } = useQuestionLogStore();
  const { clearAll: clearQuestionStore } = useQuestionStore();
  const { clearAll: clearSectionStore } = useSectionStore();

  // Mutation: mark child inactive in Supabase
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
          // End active session (records end time)
          endSession();
          console.log(`🕒 Ended local session for child ${child.id}`);

          // Mark child inactive in Supabase
          console.log(
            `⚙️ Setting activityStatus to inactive for ${child.firstName} ${child.lastName}...`
          );
          await setInactiveStatus(child.id);
        }

        // Reset all game-related scores
        resetCurrentScore();
        resetHighScore();
        console.log("🎮 Reset current and high scores for child.");

        // Clear all lesson-related data
        clearLessonLogs();
        clearLessonStore();
        console.log("📘 Cleared lesson logs and lesson store for child.");

        // Clear all question-related data
        clearQuestionLogs();
        clearQuestionStore();
        console.log("❓ Cleared question logs and question store for child.");

        // Clear section data
        clearSectionStore();
        console.log("📚 Cleared section store for child.");

        // Clear all session records
        clearAllSessions();
        console.log("🕓 Cleared all saved session records.");

        // Clear child-specific stores completely
        resetChildAuthStore();
        resetChildAchievementStore();
        console.log(
          "🧹 Cleared childAuthStore & childAchievementStore after child sign-out."
        );
      }

      // Sign out from Clerk
      await signOut();

      //Reset parent/session states
      resetSession();
      setRole("default");
      setParentSynced(false);

      logState("After Sign Out");

      // Redirect to root
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
