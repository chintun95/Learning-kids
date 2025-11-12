import { Stack } from "expo-router";
import { useAuthStore } from "@/lib/store/authStore";

export default function ProtectedLayout() {
  const state = useAuthStore.getState();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={state.role === "parent"}>
        <Stack.Screen name="(parent)" />
      </Stack.Protected>

      <Stack.Protected guard={state.role === "child"}>
        <Stack.Screen name="(child)" />
      </Stack.Protected>
    </Stack>
  );
}
