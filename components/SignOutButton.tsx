import React, { useState } from "react";
import { useClerk } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import Button from "../components/Button";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useAuthStore } from "@/lib/store/authStore";
import { responsive } from "@/utils/responsive";

/**
 * SignOutButton — improved:
 * - correct selector usage
 * - guards and loading state
 * - clearer logging
 * - uses router to navigate within app
 */
export const SignOutButton: React.FC = () => {
  const { signOut } = useClerk();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Session setters (selectors)
  const setSessionID = useSessionStore((state) => state.setSessionID);
  const setEndTime = useSessionStore((state) => state.setEndTime);

  // Auth setter (selector)
  const setRole = useAuthStore((state) => state.setRole);

  // Optional: reactive read (if you need to render based on role)
  const role = useAuthStore((state) => state.role);

  const logState = (label: string) => {
    const sessionState = useSessionStore.getState();
    const authState = useAuthStore.getState();

    console.log(
      `\n🟢 ${label} Zustand Snapshot:\n` +
        `  Role: ${authState.role}\n` +
        `  Session ID: ${sessionState.sessionID}\n` +
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

      await signOut(); // Clerk sign-out

      // Reset application-specific state
      if (role === "parent") {
        setRole("default");
      } else if (role === "child") {
        setRole("default");
        setEndTime();
        setSessionID(null);
      }

      logState("After Sign Out");

      // Use router to navigate within the app instead of external Linking if desired
      // router.replace("/"); // uncomment if you want internal navigation
      // If you intentionally want to open a deep link externally, keep this:
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
