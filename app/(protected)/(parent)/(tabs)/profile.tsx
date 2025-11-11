// (tabs)/profile.tsx
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
} from "react-native";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import SignOutButton from "@/components/SignOutButton";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { updateProfileSchema, UpdateProfileInput } from "@/utils/formatter";
import { useDeleteParent } from "@/services/deleteParent";
import { useAuthStore } from "@/lib/store/authStore";

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

  const [showEditModal, setShowEditModal] = useState(false);
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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const file = result.assets[0];
      setImageSource({
        uri: file.uri,
        size: file.fileSize ?? 0,
        type: file.mimeType ?? "image/jpeg",
        name: file.fileName ?? "profile.jpg",
      });
    }
  };

  const handleRemoveImage = () => setImageSource(null);

  const handleSaveChanges = async (): Promise<void> => {
    if (!user) return;
    try {
      setSaving(true);
      const validated: UpdateProfileInput = updateProfileSchema.parse({
        firstName,
        lastName,
        emailAddress: email,
        imageSource,
      });

      await user.update({
        firstName: validated.firstName ?? undefined,
        lastName: validated.lastName ?? undefined,
      });

      const currentEmail =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.[0]?.emailAddress;
      if (validated.emailAddress && validated.emailAddress !== currentEmail) {
        const newEmail = await user.createEmailAddress({
          email: validated.emailAddress,
        });
        await user.update({ primaryEmailAddressId: newEmail.id });
        await user.reload();
      }

      if (validated.imageSource && validated.imageSource.uri) {
        const file = {
          uri: validated.imageSource.uri,
          type: validated.imageSource.type || "image/jpeg",
          name: validated.imageSource.name || "profile.jpg",
        } as any;
        await user.setProfileImage({ file });
      }

      Alert.alert("Success", "Profile updated successfully!");
      setShowEditModal(false);
      setImageSource(null);
    } catch (err: any) {
      console.error("❌ Clerk update failed:", err);
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

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
              console.error("❌ Account deletion failed:", err);
              Alert.alert("Error", err.message || "Failed to delete account.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

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
          { useNativeDriver: false }
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
            <TouchableOpacity onPress={() => setShowEditModal(true)}>
              <Text style={styles.actionText}>View / Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.actionText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.actionText}>Help</Text>
            </TouchableOpacity>
            <TouchableOpacity>
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
              paddingVertical={responsive.buttonHeight * 0.2}
              paddingHorizontal={responsive.buttonHeight * 0.8}
              fontSize={responsive.buttonFontSize * 0.85}
            />
          </View>
        </View>
      </Animated.ScrollView>

      {/* --- Edit Profile Modal --- */}
      <Modal visible={showEditModal} animationType="slide">
        <View style={styles.modalContainer}>
          <TouchableOpacity
            onPress={() => setShowEditModal(false)}
            style={styles.modalClose}
          >
            <Ionicons
              name="close"
              size={responsive.screenWidth * 0.06}
              color="#000"
            />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Edit Profile</Text>

          <InputBox
            label="First Name"
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            iconLeft="person-outline"
          />
          <InputBox
            label="Last Name"
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            iconLeft="person-outline"
          />
          <InputBox
            label="Email Address"
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            iconLeft="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity onPress={handlePickImage}>
            <Text style={styles.modalUploadText}>Select Profile Image</Text>
          </TouchableOpacity>

          {imageSource && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: imageSource.uri }}
                style={styles.imagePreview}
              />
              <TouchableOpacity
                onPress={handleRemoveImage}
                style={styles.removeImageButton}
              >
                <Ionicons name="trash-outline" size={22} color="#000" />
              </TouchableOpacity>
            </View>
          )}

          <Button
            title="Save Changes"
            onPress={handleSaveChanges}
            loading={saving}
            marginTop={responsive.screenHeight * 0.02}
            backgroundColor="#000"
            textColor="#fff"
          />
        </View>
      </Modal>
    </ImageBackground>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  background: { flex: 1, width: "100%", height: "100%" },
  backgroundImage: { transform: [{ scale: 1.2 }] },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: responsive.screenHeight * 0.05,
  },
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
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    paddingVertical: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.04,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  welcomeText: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#111827",
    marginBottom: responsive.screenHeight * 0.006,
    textAlign: "center",
  },
  profileImage: {
    width: responsive.screenWidth * 0.25,
    height: responsive.screenWidth * 0.25,
    borderRadius: 999,
  },
  nameText: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#111827",
    marginTop: responsive.screenHeight * 0.008,
  },
  emailText: {
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.9,
    color: "#4B5563",
  },
  dateText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#6B7280",
  },
  signOutWrapper: {
    marginTop: responsive.screenHeight * 0.02,
    alignItems: "center",
  },
  actionsContainer: {
    width: responsive.screenWidth * 0.9,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    marginTop: responsive.screenHeight * 0.03,
    paddingVertical: responsive.screenHeight * 0.02,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  actionText: {
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-Medium",
    color: "#000",
    textDecorationLine: "underline",
    marginVertical: responsive.screenHeight * 0.008,
  },
  deleteButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: responsive.screenHeight * 0.03,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(217,217,217,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsive.screenWidth * 0.06,
  },
  modalClose: {
    position: "absolute",
    top: responsive.screenHeight * 0.05,
    right: responsive.screenWidth * 0.06,
  },
  modalTitle: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#000",
    textAlign: "center",
    marginBottom: responsive.screenHeight * 0.025,
  },
  modalUploadText: {
    fontFamily: "Fredoka-Medium",
    color: "#000",
    textDecorationLine: "underline",
    textAlign: "left",
    marginTop: responsive.screenHeight * 0.015,
  },
  imagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.015,
  },
  imagePreview: {
    width: responsive.screenWidth * 0.25,
    height: responsive.screenWidth * 0.25,
    borderRadius: 12,
    marginRight: 10,
  },
  removeImageButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
  },
});
