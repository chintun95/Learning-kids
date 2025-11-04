import React from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { useLocalSearchParams } from "expo-router";
import childData from "@/test/data/child";
import ProfileIcon from "@/components/ProfileIcon";
import SwitchAccount from "@/components/SwitchAccount";
import { responsive } from "@/utils/responsive";
import { Child } from "@/types/types";

export default function ChildHome() {
  const { id } = useLocalSearchParams();
  const child: Child | undefined = childData.find((c) => c.id === id);

  if (!child) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Child not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.header}>
        <ProfileIcon
          source={child.profilePicture}
          size={responsive.screenWidth * 0.25}
        />
        <Text style={styles.childName}>
          {child.firstName} {child.lastName}
        </Text>
      </View>
      <SwitchAccount />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
  },
  childName: {
    marginTop: responsive.screenHeight * 0.015,
    fontSize: responsive.isNarrowScreen ? 20 : 24,
    fontFamily: "Fredoka-Bold",
    color: "#111827",
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize,
    color: "#6B7280",
  },
});
