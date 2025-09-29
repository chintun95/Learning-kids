import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Sign-Up Screen */}
      <Stack.Screen name="index" />
      <Stack.Screen name="reset-password" />

      {/* Sign-Up Screen */}
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
