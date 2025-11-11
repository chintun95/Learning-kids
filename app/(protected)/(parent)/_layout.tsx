import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useNetworkMonitor } from "@/utils/networkMonitor";
import NetworkLost from "@/components/NetworkLost";

export default function ParentLayout() {
  const { isConnected, isInternetReachable, initialized } = useNetworkMonitor();
  const [showNetworkLost, setShowNetworkLost] = useState(false);

  useEffect(() => {
    if (!initialized) return;

    if (isConnected && isInternetReachable) {
      const timer = setTimeout(() => setShowNetworkLost(false), 500);
      return () => clearTimeout(timer);
    } else {
      setShowNetworkLost(true);
    }
  }, [isConnected, isInternetReachable, initialized]);

  if (!initialized) {
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
