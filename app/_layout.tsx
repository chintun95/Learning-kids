// app/_layout.tsx
import { useAuthStore } from "@/lib/store/authStore";
import { useAssetStore } from "@/lib/store/assetStore";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";

const queryClient = new QueryClient();
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const [ready, setReady] = useState(false);

  const { isSignedIn } = useAuth();
  const onBoardedStatus = useAuthStore((state) => state.onBoardedStatus);
  const role = useAuthStore((state) => state.role);

  const { isAssetLoadingCompleted, preloadAssets } = useAssetStore();

  const isLoggedIn = !!isSignedIn;
  const isOnboarded = onBoardedStatus === "completed";

  // Load assets only once per session
  useEffect(() => {
    const prepare = async () => {
      try {
        if (!isAssetLoadingCompleted) {
          await preloadAssets();
        }
      } catch (e) {
        console.warn("Asset preload failed:", e);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    };
    prepare();
  }, [isAssetLoadingCompleted]);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading Application...</Text>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // --- Navigation Stack ---
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Public onboarding */}
      <Stack.Protected guard={!isOnboarded}>
        <Stack.Screen name="index" />
      </Stack.Protected>

      {/* Auth screens */}
      <Stack.Protected guard={!isLoggedIn && isOnboarded}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Protected screens */}
      <Stack.Protected
        guard={
          isLoggedIn && isOnboarded && (role === "parent" || role === "child")
        }
      >
        <Stack.Screen name="(protected)" />
        <Stack.Screen name="games" />
        <Stack.Screen name="lessons" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ClerkProvider tokenCache={tokenCache}>
          <ClerkLoaded>
            <InitialLayout />
          </ClerkLoaded>
        </ClerkProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
