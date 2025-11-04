import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { responsive } from "@/utils/responsive";

export default function SwitchAccount() {
  const router = useRouter();

  const handlePress = () => {
    router.push("/(protected)/(child)");
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Text style={styles.text}>Switch Account</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: responsive.screenHeight * 0.02,
  },
  text: {
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-Medium",
    color: "#4F46E5",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
