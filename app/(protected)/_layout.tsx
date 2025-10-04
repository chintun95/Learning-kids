import { Stack } from "expo-router";
import { useSessionStore } from "@/lib/store/sessionStore";

export default function ProtectedLayout() {
  const isParent = useSessionStore((state) => state.isParent);
  const isChild = useSessionStore((state) => state.isChild);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isParent}>
        <Stack.Screen name="(parent)" />
      </Stack.Protected>

      <Stack.Protected guard={isChild}>
        <Stack.Screen name="(child)" />
      </Stack.Protected>
    </Stack>
  );
}
