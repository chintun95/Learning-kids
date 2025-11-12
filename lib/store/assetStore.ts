import { create } from "zustand";
import { Asset } from "expo-asset";
import * as Font from "expo-font";

interface AssetState {
  isAssetLoadingCompleted: boolean;
  preloadAssets: () => Promise<void>;
}

// Predefined asset lists
const imageAssets = [
  require("@/assets/images/android-icon-background.png"),
  require("@/assets/images/android-icon-foreground.png"),
  require("@/assets/images/android-icon-monochrome.png"),
  require("@/assets/images/app-background.png"),
  require("@/assets/images/app-game-page.png"),
  require("@/assets/images/app-logo.png"),
  require("@/assets/images/favicon.png"),
  require("@/assets/images/icon.png"),
  require("@/assets/images/network-lost.png"),
  require("@/assets/images/splash-icon.png"),

  // Icons
  require("@/assets/icons/apple-icon.png"),
  require("@/assets/icons/facebook-icon.png"),
  require("@/assets/icons/google-icon.png"),

  // Profile icons
  require("@/assets/profile-icons/avatar1.png"),
  require("@/assets/profile-icons/avatar2.png"),
  require("@/assets/profile-icons/avatar3.png"),
  require("@/assets/profile-icons/avatar4.png"),
  require("@/assets/profile-icons/avatar5.png"),
  require("@/assets/profile-icons/avatar6.png"),
  require("@/assets/profile-icons/avatar7.png"),
  require("@/assets/profile-icons/avatar8.png"),
  require("@/assets/profile-icons/avatar9.png"),
  require("@/assets/profile-icons/avatar10.png"),
  require("@/assets/profile-icons/avatar11.png"),
  require("@/assets/profile-icons/avatar12.png"),
  require("@/assets/profile-icons/avatar13.png"),
];

const videoAssets = [require("@/assets/video/app-welcome-page.mp4")];

const fontAssets = {
  "Fredoka-Bold": require("@/assets/fonts/Fredoka_700Bold.ttf"),
  "Fredoka-SemiBold": require("@/assets/fonts/Fredoka_600SemiBold.ttf"),
};

export const useAssetStore = create<AssetState>((set, get) => ({
  isAssetLoadingCompleted: false,

  preloadAssets: async () => {
    // If already loaded, skip
    if (get().isAssetLoadingCompleted) return;

    try {
      const imagePromises = imageAssets.map((asset) => Asset.loadAsync(asset));
      const videoPromises = videoAssets.map((asset) => Asset.loadAsync(asset));
      await Font.loadAsync(fontAssets);
      await Promise.all([...imagePromises, ...videoPromises]);

      console.log("✅ Assets preloaded successfully.");
      set({ isAssetLoadingCompleted: true });
    } catch (error) {
      console.warn("⚠️ Asset preloading failed:", error);
      // Still mark completed to avoid blocking app
      set({ isAssetLoadingCompleted: true });
    }
  },
}));
