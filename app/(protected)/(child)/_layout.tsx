import { Stack } from "expo-router";

export default function ProtectedChildLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="home/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="game-select" options={{ headerShown: false }} />
    </Stack>
  );
}
