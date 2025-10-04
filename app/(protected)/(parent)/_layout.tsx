// app/(protected)/(parent)/_layout.tsx
import { Stack } from "expo-router";

export default function ParentLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-child" options={{ title: "Add Child" }} />
      <Stack.Screen
        name="manage-child/[id]"
        options={{ title: "Manage Child" }}
      />
    </Stack>
  );
}
