import { Stack } from "expo-router";

export default function ProtectedParentLayout() {
      return (
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    );
}
