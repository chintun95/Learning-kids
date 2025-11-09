// app/(protected)/(parent)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useNetworkMonitor } from "@/utils/networkMonitor";
import NetworkLost from "@/components/NetworkLost";

/**
 * ParentLayout — Global parent section layout wrapper.
 * Handles network monitoring and shows fallback UI when offline.
 */
export default function ParentLayout() {
  const { isConnected, isInternetReachable } = useNetworkMonitor(false);
  const [showNetworkLost, setShowNetworkLost] = useState(false);

  // ✅ Smooth transition: prevent screen flicker when reconnecting
  useEffect(() => {
    if (isConnected && isInternetReachable) {
      const timer = setTimeout(() => setShowNetworkLost(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowNetworkLost(true);
    }
  }, [isConnected, isInternetReachable]);

  // If offline, display the full NetworkLost screen
  if (showNetworkLost) {
    return (
      <View style={styles.offlineContainer}>
        <NetworkLost />
      </View>
    );
  }

  // Otherwise render normal stack
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-child"
        options={{ title: "Add Child Information" }}
      />
      <Stack.Screen
        name="manage-child/[id]"
        options={{ title: "Information" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  offlineContainer: {
    flex: 1,
    backgroundColor: "#111827",
  },
});
