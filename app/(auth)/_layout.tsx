import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useNetworkMonitor } from "@/utils/networkMonitor";
import NetworkLost from "@/components/NetworkLost";

export default function AuthLayout() {
  const { isConnected, isInternetReachable, initialized } = useNetworkMonitor();
  const [showNetworkLost, setShowNetworkLost] = useState(false);

  useEffect(() => {
    if (!initialized) return; // Don't show anything until initial state is known

    if (isConnected && isInternetReachable) {
      const timer = setTimeout(() => setShowNetworkLost(false), 500);
      return () => clearTimeout(timer);
    } else {
      setShowNetworkLost(true);
    }
  }, [isConnected, isInternetReachable, initialized]);

  if (!initialized) {
    // Optional: return a blank or splash to avoid flicker on first load
    return <View style={{ flex: 1, backgroundColor: "#111827" }} />;
  }

  if (showNetworkLost) {
    return (
      <View style={styles.offlineContainer}>
        <NetworkLost />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  offlineContainer: {
    flex: 1,
    backgroundColor: "#111827",
  },
});
