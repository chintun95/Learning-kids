import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { Asset } from "expo-asset";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider } from "@clerk/clerk-expo";

// Catch any errors thrown by the Layout component.
export { ErrorBoundary } from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const imageAssets = [
  require("../assets/images/adaptive-icon.png"),
  require("../assets/images/app-background.png"),
  require("../assets/images/app-logo.png"),
  require("../assets/images/app-game-page.png"),
  require("../assets/images/favicon.png"),
  require("../assets/images/splash-icon.png"),
  require("../assets/icons/apple-icon.png"),
  require("../assets/icons/facebook-icon.png"),
  require("../assets/icons/google-icon.png"),
];

const videoAssets = [require("../assets/video/app-welcome-page.mp4")];

const fontAssets = {
  "Fredoka-Light": require("../assets/fonts/Fredoka_300Light.ttf"),
  "Fredoka-Regular": require("../assets/fonts/Fredoka_400Regular.ttf"),
  "Fredoka-Medium": require("../assets/fonts/Fredoka_500Medium.ttf"),
  "Fredoka-SemiBold": require("../assets/fonts/Fredoka_600SemiBold.ttf"),
  "Fredoka-Bold": require("../assets/fonts/Fredoka_700Bold.ttf"),
};

const InitialLayout = () => {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load fonts
  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync(fontAssets);
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  // Load images and videos
  useEffect(() => {
    async function loadAssets() {
      const videos = videoAssets.map((asset) => Asset.loadAsync(asset));
      const images = imageAssets.map((asset) => Asset.loadAsync(asset));
      await Promise.all([...videos, ...images]);
      setAssetsLoaded(true);
    }
    loadAssets();
  }, []);

  useEffect(() => {
    if (assetsLoaded && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [assetsLoaded, fontsLoaded]);

  if (!assetsLoaded || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Onboarding Screen */}
        <Stack.Screen name="index" />

      {/* Authentication Screens */}
        <Stack.Screen name="(auth)" />

      {/* Protected Screens */}
        <Stack.Screen name="(protected)" />

      {/* Games Screens */}
      <Stack.Screen name="games" />
    </Stack>
  );
};

const RootLayoutNav = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider> 
      <InitialLayout />
      </ClerkProvider>
    </GestureHandlerRootView>    
  );
};

export default RootLayoutNav;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
