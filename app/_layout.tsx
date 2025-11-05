import React, { useEffect, useState } from "react";
import { Text, View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { Asset } from "expo-asset";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useAuthStore } from "@/lib/store/authStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClinet = new QueryClient();

// --- preload assets ---
const imageAssets = [
  // images
  require("../assets/images/app-logo.png"),
  require("../assets/images/splash-icon.png"),
  require("../assets/images/adaptive-icon.png"),
  require("../assets/images/app-background.png"),
  require("../assets/images/app-game-page.png"),
  require("../assets/images/favicon.png"),

  // icons
  require("../assets/icons/apple-icon.png"),
  require("../assets/icons/facebook-icon.png"),
  require("../assets/icons/google-icon.png"),

  // profile-icons
  require("../assets/profile-icons/avatar1.png"),
  require("../assets/profile-icons/avatar2.png"),
  require("../assets/profile-icons/avatar3.png"),
  require("../assets/profile-icons/avatar4.png"),
];
const videoAssets = [require("../assets/video/app-welcome-page.mp4")];
const fontAssets = {
  "Fredoka-Bold": require("../assets/fonts/Fredoka_700Bold.ttf"),
  "Fredoka-SemiBold": require("../assets/fonts/Fredoka_600SemiBold.ttf"),
};

// Prevent splash screen from hiding until everything is ready
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const [ready, setReady] = useState(false);

  //  Clerk auth state
  const { isSignedIn } = useAuth();

  // Zustand store state
  const onBoardedStatus = useAuthStore((state) => state.onBoardedStatus);
  const role = useAuthStore((state) => state.role);

  // derived values
  const isLoggedIn = !!isSignedIn;
  const isOnboarded = onBoardedStatus === "completed";

  // preload fonts, images, and videos
  useEffect(() => {
    const prepare = async () => {
      try {
        await Font.loadAsync(fontAssets);
        const images = imageAssets.map((asset) => Asset.loadAsync(asset));
        const videos = videoAssets.map((asset) => Asset.loadAsync(asset));
        await Promise.all([...images, ...videos]);
      } catch (e) {
        console.warn("Asset preloading failed:", e);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    };
    prepare();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading Application...</Text>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // --- Define navigation stack behavior ---
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Public onboarding screen */}
      <Stack.Protected guard={!isOnboarded}>
        <Stack.Screen name="index" />
      </Stack.Protected>

      {/* Auth Screens */}
      <Stack.Protected guard={!isLoggedIn && isOnboarded}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Protected Screens */}
      <Stack.Protected
        guard={
          isLoggedIn && isOnboarded && (role === "parent" || role === "child")
        }
      >
        <Stack.Screen name="(protected)" />
        <Stack.Screen name="games" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClinet}>
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
