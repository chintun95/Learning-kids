import { Stack } from "expo-router";

export default function ProtectedChildLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
