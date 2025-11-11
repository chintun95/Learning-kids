import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { responsive } from "@/utils/responsive";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import Button from "@/components/Button";
import { updateChild } from "@/services/updateChild";

/** -------------------------
 *  Local Assets
 * ------------------------- */
const profileIcons = [
  { key: "avatar1.png", src: require("@/assets/profile-icons/avatar1.png") },
  { key: "avatar2.png", src: require("@/assets/profile-icons/avatar2.png") },
  { key: "avatar3.png", src: require("@/assets/profile-icons/avatar3.png") },
  { key: "avatar4.png", src: require("@/assets/profile-icons/avatar4.png") },
];

export default function ProfileSelectScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const childId = String(id);

  const { children, setChildren } = useChildAuthStore();
  const childIndex = children.findIndex((c) => c.id === childId);
  const currentChild = children[childIndex];
  const [selectedIconKey, setSelectedIconKey] = useState<string | null>(null);
  const selectedIconRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** -------------------------------
   * Initialize current selection
   * ------------------------------- */
  useEffect(() => {
    if (!currentChild) return;
    console.log(
      "🟢 Current child profilePicture:",
      currentChild.profilePicture
    );

    if (typeof currentChild.profilePicture === "string") {
      const filename = currentChild.profilePicture.split("/").pop();
      if (filename) {
        setSelectedIconKey(filename);
        selectedIconRef.current = filename;
      }
    } else {
      // Try to match require() sources
      for (const icon of profileIcons) {
        if (icon.src === currentChild.profilePicture) {
          setSelectedIconKey(icon.key);
          selectedIconRef.current = icon.key;
          break;
        }
      }
    }
  }, [currentChild]);

  /** -------------------------------
   * Handle Avatar Selection
   * ------------------------------- */
  const handleSelect = (key: string) => {
    console.log("🟣 Avatar selected:", key);
    setSelectedIconKey(key);
    selectedIconRef.current = key; // keep latest sync
  };

  /** -------------------------------
   * Confirm Button Press
   * ------------------------------- */
  const handleConfirm = async () => {
    const key = selectedIconRef.current;
    console.log("🔍 Confirm pressed. Current selectedIconKey:", key);

    if (childIndex === -1 || !key) {
      Alert.alert("Selection Required", "Please select a profile picture.");
      return;
    }

    const selectedAsset = profileIcons.find((p) => p.key === key);
    if (!selectedAsset) {
      Alert.alert("Error", "Selected avatar not found.");
      return;
    }

    setLoading(true);

    try {
      console.log("🟢 Updating local store with:", key);

      // Update locally
      const updatedChildren = [...children];
      updatedChildren[childIndex] = {
        ...updatedChildren[childIndex],
        profilePicture: selectedAsset.src,
      };
      setChildren(updatedChildren);
      console.log("✅ Local update done for:", key);

      // Push to Supabase
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        console.log("🌐 Online. Updating Supabase...");
        await updateChild(childId, { profilepicture: key });
        console.log("✅ Supabase update successful!");
      } else {
        console.warn("⚠️ Offline. Update will sync later.");
        Alert.alert(
          "Offline Mode",
          "You're offline. Your avatar will sync when you reconnect."
        );
      }

      router.back();
    } catch (err: any) {
      console.error("❌ Profile update failed:", err);
      Alert.alert("Error", "Could not update profile picture.");
    } finally {
      setLoading(false);
    }
  };

  /** -------------------------------
   * Render UI
   * ------------------------------- */
  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Select New Profile Picture</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="close"
            size={responsive.screenWidth * 0.06}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      {/* Avatar Grid */}
      <FlatList
        data={profileIcons}
        numColumns={3}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.iconGrid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = selectedIconKey === item.key;
          return (
            <TouchableOpacity
              style={[styles.iconWrapper, isSelected && styles.iconSelected]}
              onPress={() => handleSelect(item.key)}
              activeOpacity={0.8}
            >
              <Image
                source={item.src}
                style={styles.iconImage}
                resizeMode="contain"
              />
              {isSelected && (
                <View style={styles.checkOverlay}>
                  <Ionicons name="checkmark" size={28} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Confirm Button */}
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
          title={loading ? "Saving..." : "Confirm"}
          backgroundColor="#111827"
          textColor="#FFFFFF"
          onPress={handleConfirm}
          marginTop={responsive.screenHeight * 0.01}
          disabled={loading}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}

/** -------------------------------
 * Styles
 * ------------------------------- */
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
    paddingBottom: responsive.screenHeight * 0.12,
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
    borderColor: "#4F46E5",
    backgroundColor: "#C7D2FE",
  },
  iconImage: {
    width: "85%",
    height: "85%",
    borderRadius: 100,
  },
  checkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: responsive.screenWidth * 0.15,
  },
  buttonWrapper: {
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
});