import { Stack } from "expo-router";
import { useAuthStore } from "@/lib/store/authStore";

export default function ProtectedLayout() {
  const isParent = useAuthStore((state) => state.isParent);
  const isChild = useAuthStore((state) => state.isChild);

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
