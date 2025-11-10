import React, { useState } from "react";
import { View, Text, StyleSheet, Image, StatusBar } from "react-native";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { checkNetworkOnce } from "@/utils/networkMonitor";

interface NetworkLostProps {
  /** Optional callback to retry network-dependent actions */
  onRetry?: () => Promise<void> | void;
}

const NetworkLost: React.FC<NetworkLostProps> = ({ onRetry }) => {
  const [loading, setLoading] = useState(false);

  const handleRetry = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);

    try {
      const connected = await checkNetworkOnce();
      if (connected) {
        console.log("✅ Connection restored. Retrying sync...");
        await onRetry?.();
      } else {
        console.warn("📴 Still offline. Retry failed.");
      }
    } catch (err) {
      console.error("❌ Retry failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <Image
        source={require("@/assets/images/network-lost.png")}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Network Connection Lost</Text>
      <Text style={styles.subtitle}>
        Please check your internet connection.
      </Text>

      <Button
        title={loading ? "Retrying..." : "Retry"}
        onPress={handleRetry}
        backgroundColor="#6366F1"
        textColor="#F9FAFB"
        fontSize={responsive.buttonFontSize}
        paddingVertical={responsive.buttonHeight * 0.25}
        paddingHorizontal={responsive.buttonHeight * 0.8}
        marginTop={responsive.screenHeight * 0.03}
        loading={loading}
        disabled={loading}
      />
    </View>
  );
};

export default NetworkLost;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsive.screenWidth * 0.08,
  },
  image: {
    width: responsive.screenWidth * 0.6,
    height: responsive.screenHeight * 0.3,
    marginBottom: responsive.screenHeight * 0.03,
  },
  title: {
    fontFamily: "Fredoka-Bold",
    color: "#F9FAFB",
    fontSize: responsive.buttonFontSize * 1.4,
    textAlign: "center",
    marginBottom: responsive.screenHeight * 0.01,
  },
  subtitle: {
    fontFamily: "Fredoka-Regular",
    color: "#D1D5DB",
    fontSize: responsive.buttonFontSize,
    textAlign: "center",
    marginBottom: responsive.screenHeight * 0.015,
  },
});
