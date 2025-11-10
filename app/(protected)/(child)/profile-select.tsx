import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { responsive } from "@/utils/responsive";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import Button from "@/components/Button";

// Import all profile icons manually
const profileIcons = [
  require("@/assets/profile-icons/avatar1.png"),
  require("@/assets/profile-icons/avatar2.png"),
  require("@/assets/profile-icons/avatar3.png"),
  require("@/assets/profile-icons/avatar4.png"),
];

export default function ProfileSelectScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const childId = String(id);

  const { children, setChildren } = useChildAuthStore();
  const childIndex = children.findIndex((c) => c.id === childId);
  const currentChild = children[childIndex];
  const [selectedIcon, setSelectedIcon] = useState(
    currentChild?.profilePicture
  );

  const handleConfirm = () => {
    if (childIndex === -1 || !selectedIcon) return;

    const updatedChildren = [...children];
    updatedChildren[childIndex] = {
      ...updatedChildren[childIndex],
      profilePicture: selectedIcon,
    };

    setChildren(updatedChildren);
    router.push(`/home/${childId}`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* --- Header --- */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Select New Profile Picture</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.push(`/home/${childId}`)}
        >
          <Ionicons
            name="close"
            size={responsive.screenWidth * 0.06}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      {/* --- Grid of Profile Icons --- */}
      <FlatList
        data={profileIcons}
        numColumns={3}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.iconGrid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.iconWrapper,
              selectedIcon === item && styles.iconSelected,
            ]}
            onPress={() => setSelectedIcon(item)}
          >
            <Image
              source={item}
              style={styles.iconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      />

      {/* --- Confirm Button --- */}
      <View
        style={[
          styles.buttonWrapper,
          {
            paddingBottom:
              Platform.OS === "android"
                ? insets.bottom + responsive.screenHeight * 0.015
                : insets.bottom,
          },
        ]}
      >
        <Button
          title="Confirm"
          backgroundColor="#111827"
          textColor="#FFFFFF"
          onPress={handleConfirm}
          marginTop={responsive.screenHeight * 0.01}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 0) + responsive.screenHeight * 0.015
        : responsive.screenHeight * 0.03,
    marginBottom: responsive.screenHeight * 0.02,
  },
  title: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.2,
    color: "#111827",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: responsive.screenWidth * 0.02,
    padding: 6,
  },
  iconGrid: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: responsive.screenHeight * 0.02,
    paddingBottom: responsive.screenHeight * 0.12, // room for button
  },
  iconWrapper: {
    width: responsive.screenWidth * 0.25,
    height: responsive.screenWidth * 0.25,
    borderRadius: responsive.screenWidth * 0.15,
    margin: responsive.screenWidth * 0.025,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconSelected: {
    borderColor: "#111827",
    backgroundColor: "#D1D5DB",
  },
  iconImage: {
    width: "85%",
    height: "85%",
    borderRadius: 100,
  },
  buttonWrapper: {
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 0,
  },
});
