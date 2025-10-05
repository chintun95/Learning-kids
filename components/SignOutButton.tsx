import { useClerk } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import Button from "../components/Button";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useAuthStore } from "@/lib/store/authStore";
import { responsive } from "@/utils/responsive";

export const SignOutButton = () => {
  const { signOut } = useClerk();

  // Session Related
  const setSessionID = useSessionStore((state) => state.setSessionID);
  const setEndTime = useSessionStore((state) => state.setEndTime);

  // Auth Related
  const setRole = useAuthStore((state) => state.setRole);
  const setIsLoggedIn = useAuthStore((state) => state.setIsLoggedIn);
  const setIsParent = useAuthStore((state) => state.setIsParent);
  const setIsChild = useAuthStore((state) => state.setIsChild);

  const logState = (label: string) => {
    const sessionState = useSessionStore.getState();
    const authState = useAuthStore.getState();

    console.log(
      `\n🟢 ${label} Zustand Session State:\n` +
        `  Role: ${authState.role}\n` +
        `  Session ID: ${sessionState.sessionID}\n` +
        `  Current Date: ${sessionState.currentDate}\n` +
        `  Start Time: ${sessionState.sessionStartTime}\n` +
        `  End Time: ${sessionState.sessionEndTime}\n` +
        `  Onboarded: ${authState.isOnboarded}\n` +
        `  Logged In: ${authState.isLoggedIn}\n` +
        `  Is role Parent: ${authState.isParent}\n` +
        `  Is role Child: ${authState.isChild}\n`
    );
  };

  const handleSignOut = async () => {
    const state = useAuthStore.getState();

    try {
      logState("Before Sign Out");

      await signOut();

      // Rest Session
      setEndTime();
      setSessionID(null);

      // Reset Authentication
      if (state.role === "parent") {
        setIsParent(false);
      } else if (state.role === "child") {
        setIsChild(false);
      }
      setRole("default");
      setIsLoggedIn(false);

      logState("After Sign Out");

      // Redirect to onboarding or root
      Linking.openURL(Linking.createURL("/"));
    } catch (err) {
      console.error("❌ Sign out error:", err);
    }
  };

  return (
    <Button
      title="Sign Out"
      onPress={handleSignOut}
      backgroundColor="#000"
      textColor="white"
      fontSize={responsive.buttonFontSize}
    />
  );
};
