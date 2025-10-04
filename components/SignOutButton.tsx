import { useClerk } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import Button from "../components/Button";
import { useSessionStore } from "@/lib/store/sessionStore";
import { responsive } from "@/utils/responsive";

export const SignOutButton = () => {
  const { signOut } = useClerk();
  const setRole = useSessionStore((state) => state.setRole);
  const setSessionID = useSessionStore((state) => state.setSessionID);
  const setIsLoggedIn = useSessionStore((state) => state.setIsLoggedIn);
  const setIsParent = useSessionStore((state) => state.setIsParent);
  const setIsChild = useSessionStore((state) => state.setIsChild);
  const setEndTime = useSessionStore((state) => state.setEndTime);

  const logState = (label: string) => {
    const state = useSessionStore.getState();
    console.log(
      `\n🟢 ${label} Zustand Session State:\n` +
        `  Role: ${state.role}\n` +
        `  Session ID: ${state.sessionID}\n` +
        `  Current Date: ${state.currentDate}\n` +
        `  Start Time: ${state.sessionStartTime}\n` +
        `  End Time: ${state.sessionEndTime}\n` +
        `  Onboarded: ${state.isOnboarded}\n` +
        `  Logged In: ${state.isLoggedIn}\n` +
        `  Is role Parent: ${state.isParent}\n` +
        `  Is role Child: ${state.isChild}\n`
    );
  };

  const handleSignOut = async () => {
    const state = useSessionStore.getState();

    try {
      logState("Before Sign Out");

      await signOut();

      // Reset session in store
      if (state.role === "parent") {
        setIsParent(false);
      } else if (state.role === "child") {
        setIsChild(false);
      }

      setSessionID(null);
      setRole("default"), 
      setEndTime();
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
