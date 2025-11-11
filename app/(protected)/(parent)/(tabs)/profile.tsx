// file: app/(protected)/(parent)/(tabs)/profile.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  StatusBar,
  ImageBackground,
  Platform,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import SignOutButton from "@/components/SignOutButton";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { updateProfileSchema, UpdateProfileInput } from "@/utils/formatter";
import { useDeleteParent } from "@/services/deleteParent";
import { useAuthStore } from "@/lib/store/authStore";

// ✅ Notification utilities
import {
  registerForPushNotificationsAsync,
  scheduleLocalNotification,
} from "@/utils/notifications";

type ImageSource = {
  uri: string;
  size: number;
  type: string;
  name: string;
} | null;

export default function ProtectedProfileIndex() {
  const { user } = useUser();
  const router = useRouter();
  const resetAuth = useAuthStore();

  // --- Modals ---
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false); // daily/weekly/monthly
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false); // Send notification modal

  // --- States ---
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      ""
  );
  const [imageSource, setImageSource] = useState<ImageSource>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- Notification Send ---
  const [sending, setSending] = useState(false);
  const [notifTitle, setNotifTitle] = useState("Learning Kids");
  const [notifBody, setNotifBody] = useState(
    "Keep learning something new every day!"
  );

  // --- UI state ---
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [notifFrequency, setNotifFrequency] = useState({
    daily: false,
    weekly: false,
    monthly: false,
  });

  const deleteParentMutation = useDeleteParent(user?.id || "");
  const profileImage =
    user?.imageUrl ?? require("@/assets/profile-icons/avatar1.png");
  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "Unknown";

  const scrollY = useRef(new Animated.Value(0)).current;
  const [blurVisible, setBlurVisible] = useState(false);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setBlurVisible(value < 50);
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY]);

  // --- Delete Parent ---
  const handleDeleteUser = async () => {
    if (!user) return;
    Alert.alert(
      "Confirm Account Deletion",
      "This will permanently remove your account and all associated data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteParentMutation.mutateAsync();
              await user.delete();
              resetAuth.setRole("default");
              resetAuth.setOnBoardedStatus("pending");
              Alert.alert("Account Deleted", "Your account has been removed.");
              router.replace("/(auth)");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete account.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ✅ Send Notification
  const handleSendNotification = async () => {
    try {
      if (!notifTitle.trim() || !notifBody.trim()) {
        Alert.alert(
          "Missing Fields",
          "Please fill out both title and message."
        );
        return;
      }
      setSending(true);
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        Alert.alert("Error", "Failed to register for push notifications.");
        setSending(false);
        return;
      }
      await scheduleLocalNotification(notifTitle, notifBody, 3);
      Alert.alert(
        "Notification Scheduled",
        "A notification will appear in about 3 seconds."
      );
      setShowNotificationModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Notification failed.");
    } finally {
      setSending(false);
    }
  };

  // --- Render ---
  return (
    <ImageBackground
      source={require("@/assets/images/app-background.png")}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      {Platform.OS === "android" && blurVisible && (
        <BlurView tint="light" intensity={70} style={StyleSheet.absoluteFill} />
      )}

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
          }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.overlay}>
          {/* --- Profile Header --- */}
          <View style={styles.profileContainer}>
            <Text style={styles.welcomeText}>Profile</Text>
            <Image
              source={
                typeof profileImage === "string"
                  ? { uri: profileImage }
                  : profileImage
              }
              style={styles.profileImage}
            />
            <Text style={styles.nameText}>
              {user?.firstName ?? "First"} {user?.lastName ?? "Last"}
            </Text>
            <Text style={styles.emailText}>
              {email || "No email available"}
            </Text>
            <Text style={styles.dateText}>Joined on {createdAt}</Text>
            <View style={styles.signOutWrapper}>
              <SignOutButton />
            </View>
          </View>

          {/* --- Actions --- */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPreferencesModal(true)}>
              <Text style={styles.actionText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHelpModal(true)}>
              <Text style={styles.actionText}>Help</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFAQModal(true)}>
              <Text style={styles.actionText}>FAQ</Text>
            </TouchableOpacity>
          </View>

          {/* --- Delete Button --- */}
          <View style={styles.deleteButtonWrapper}>
            <Button
              title="Delete Account"
              onPress={handleDeleteUser}
              backgroundColor="#EF4444"
              borderColor="#000"
              borderWidth={2}
              loading={deleting}
            />
          </View>

          {/* ✅ Send Notification Button */}
          <View style={styles.sendNotificationWrapper}>
            <Button
              title="Send Notification"
              onPress={() => setShowNotificationModal(true)}
              backgroundColor="#4F46E5"
              textColor="#fff"
              fontSize={responsive.buttonFontSize * 0.9}
            />
          </View>
        </View>
      </Animated.ScrollView>

      {/* --- Settings Modal --- */}
      <Modal visible={showSettingsModal} animationType="slide">
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            onPress={() => setShowSettingsModal(false)}
            style={styles.fullscreenClose}
          >
            <Ionicons
              name="close"
              size={responsive.screenWidth * 0.08}
              color="#000"
            />
          </TouchableOpacity>
          <Text style={styles.fullscreenTitle}>Settings</Text>
          <View style={styles.separator} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable Dark Mode</Text>
            <TouchableOpacity
              onPress={() => setDarkModeEnabled(!darkModeEnabled)}
            >
              <Ionicons
                name={darkModeEnabled ? "moon" : "sunny"}
                size={responsive.screenWidth * 0.07}
                color="#000"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>Feature is a work in progress.</Text>
        </View>
      </Modal>

      {/* --- Notifications Preferences Modal --- */}
      <Modal visible={showPreferencesModal} animationType="slide">
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            onPress={() => setShowPreferencesModal(false)}
            style={styles.fullscreenClose}
          >
            <Ionicons
              name="close"
              size={responsive.screenWidth * 0.08}
              color="#000"
            />
          </TouchableOpacity>
          <Text style={styles.fullscreenTitle}>Notifications</Text>
          <View style={styles.separator} />
          {["daily", "weekly", "monthly"].map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.checkboxRow}
              onPress={() =>
                setNotifFrequency((prev) => ({
                  ...prev,
                  [key]: !prev[key as keyof typeof prev],
                }))
              }
            >
              <Ionicons
                name={
                  notifFrequency[key as keyof typeof notifFrequency]
                    ? "checkbox"
                    : "square-outline"
                }
                size={responsive.screenWidth * 0.07}
                color="#000"
              />
              <Text style={styles.checkboxLabel}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <Button
            title="Confirm"
            onPress={() =>
              Alert.alert("Confirmed", "Selections saved (UI only).")
            }
            backgroundColor="#111827"
            textColor="#fff"
            marginTop={responsive.screenHeight * 0.04}
          />
        </View>
      </Modal>

      {/* --- Help Modal --- */}
      <Modal visible={showHelpModal} animationType="slide">
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            onPress={() => setShowHelpModal(false)}
            style={styles.fullscreenClose}
          >
            <Ionicons
              name="close"
              size={responsive.screenWidth * 0.08}
              color="#000"
            />
          </TouchableOpacity>
          <Text style={styles.fullscreenTitle}>Help</Text>
          <View style={styles.separator} />
          <Text style={styles.placeholderText}>More Information Required</Text>
        </View>
      </Modal>

      {/* --- FAQ Modal --- */}
      <Modal visible={showFAQModal} animationType="slide">
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            onPress={() => setShowFAQModal(false)}
            style={styles.fullscreenClose}
          >
            <Ionicons
              name="close"
              size={responsive.screenWidth * 0.08}
              color="#000"
            />
          </TouchableOpacity>
          <Text style={styles.fullscreenTitle}>FAQ</Text>
          <View style={styles.separator} />
          <Text style={styles.placeholderText}>More Information Required</Text>
        </View>
      </Modal>

      {/* ✅ Send Custom Notification Modal */}
      <Modal visible={showNotificationModal} animationType="slide">
        <KeyboardAvoidingView
          style={styles.fullscreenModal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            onPress={() => setShowNotificationModal(false)}
            style={styles.fullscreenClose}
          >
            <Ionicons
              name="close"
              size={responsive.screenWidth * 0.08}
              color="#000"
            />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.fullscreenTitle}>Send Custom Notification</Text>
            <TextInput
              style={styles.input}
              placeholder="Notification Title"
              value={notifTitle}
              onChangeText={setNotifTitle}
              placeholderTextColor="#555"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notification Message"
              value={notifBody}
              onChangeText={setNotifBody}
              placeholderTextColor="#555"
              multiline
            />
            <Button
              title={sending ? "Sending..." : "Send Notification"}
              onPress={handleSendNotification}
              loading={sending}
              backgroundColor="#111827"
              textColor="#fff"
              marginTop={responsive.screenHeight * 0.04}
            />
            <Text style={styles.fullscreenHint}>
              This will schedule a test notification in about 3 seconds.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  backgroundImage: { transform: [{ scale: 1.2 }] },
  scrollContainer: { flexGrow: 1, alignItems: "center" },
  overlay: {
    flex: 1,
    alignItems: "center",
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 0) + responsive.screenHeight * 0.025
        : responsive.screenHeight * 0.045,
  },
  profileContainer: {
    width: responsive.screenWidth * 0.9,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    paddingVertical: 20,
  },
  welcomeText: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#111827",
  },
  profileImage: {
    width: responsive.screenWidth * 0.25,
    height: responsive.screenWidth * 0.25,
    borderRadius: 999,
    marginTop: 8,
  },
  nameText: { fontFamily: "Fredoka-Bold", fontSize: responsive.buttonFontSize },
  emailText: { fontFamily: "Fredoka-Medium", color: "#4B5563" },
  dateText: { fontFamily: "Fredoka-Regular", color: "#6B7280" },
  signOutWrapper: { marginTop: 10 },
  actionsContainer: {
    width: responsive.screenWidth * 0.9,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#999",
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 15,
  },
  actionText: {
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-Medium",
    color: "#000",
    textDecorationLine: "underline",
    marginVertical: 6,
  },
  deleteButtonWrapper: { marginTop: 20 },
  sendNotificationWrapper: { marginTop: 20 },
  fullscreenModal: {
    flex: 1,
    backgroundColor: "rgba(217,217,217,0.95)",
    paddingTop: responsive.screenHeight * 0.08,
    paddingHorizontal: responsive.screenWidth * 0.06,
  },
  fullscreenClose: { position: "absolute", top: 50, right: 25 },
  fullscreenTitle: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.2,
    textAlign: "center",
    color: "#000",
  },
  separator: { height: 2, backgroundColor: "#000", marginVertical: 20 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: { fontFamily: "Fredoka-Medium", color: "#000" },
  disclaimer: { marginTop: 10, fontFamily: "Fredoka-Regular", color: "#444" },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  checkboxLabel: {
    fontFamily: "Fredoka-Medium",
    marginLeft: 10,
    color: "#000",
  },
  placeholderText: {
    textAlign: "center",
    color: "#000",
    fontFamily: "Fredoka-Medium",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    width: "100%",
    borderColor: "#000",
    borderWidth: 2,
    borderRadius: 15,
    padding: 12,
    backgroundColor: "#fff",
    fontFamily: "Fredoka-Medium",
    marginBottom: 10,
  },
  textArea: { height: responsive.screenHeight * 0.2, textAlignVertical: "top" },
  fullscreenHint: { textAlign: "center", marginTop: 10, color: "#333" },
});
