import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import ProfileIcon from "@/components/ProfileIcon";
import SwitchAccount from "@/components/SwitchAccount";
import { responsive } from "@/utils/responsive";
import { useChildAuthStore } from "@/lib/store/childAuthStore";

export default function ChildHome() {
  const { id } = useLocalSearchParams();
  const childId = String(id);
  const { children, getCurrentChild } = useChildAuthStore();

  const child = children.find((c) => c.id === childId) ?? getCurrentChild();

  if (!child) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Child not found</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("@/assets/images/app-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <View style={styles.overlay}>
        <View style={styles.profileContainer}>
          <ProfileIcon
            source={child.profilePicture}
            size={responsive.screenWidth * 0.18}
            style={styles.profileIcon}
          />
          <Text style={styles.childName}>
            {child.firstName} {child.lastName}
          </Text>
          <View style={styles.switchWrapper}>
            <SwitchAccount />
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 0) + responsive.screenHeight * 0.025
        : responsive.screenHeight * 0.045,
  },
  profileContainer: {
    width: responsive.screenWidth * 0.85,
    backgroundColor: "#D9D9D9",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    paddingVertical: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.04,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  profileIcon: {
    borderRadius: responsive.screenWidth * 0.12,
    aspectRatio: 1,
  },
  childName: {
    marginTop: responsive.screenHeight * 0.01,
    fontSize: responsive.isNarrowScreen ? 18 : 22,
    fontFamily: "Fredoka-Bold",
    color: "#111827",
    textAlign: "center",
  },
  switchWrapper: {
    marginTop: responsive.screenHeight * 0.008,
    marginBottom: responsive.screenHeight * 0.005,
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
