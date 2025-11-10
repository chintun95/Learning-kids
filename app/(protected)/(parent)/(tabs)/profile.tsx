import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imageSource, setImageSource] = useState<ImageSource>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteParentMutation = useDeleteParent(user?.id || "");

  const profileImage =
    user?.imageUrl ?? require("@/assets/profile-icons/avatar1.png");

  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "Unknown";

  // --- Pick image ---
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

  // --- Save profile changes ---
  const handleSaveChanges = async (): Promise<void> => {
    if (!user) return;
    try {
      setSaving(true);

      const validated: UpdateProfileInput = updateProfileSchema.parse({
        firstName,
        lastName,
        emailAddress: email,
        newPassword,
        confirmPassword,
        imageSource,
      });

      await user.update({
        firstName: validated.firstName ?? undefined,
        lastName: validated.lastName ?? undefined,
      });

      // Email update
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

      // Password update
      if (validated.newPassword && oldPassword) {
        await user.updatePassword({
          currentPassword: oldPassword,
          newPassword: validated.newPassword,
        });
      }

      // Profile image update
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
      setShowPasswordModal(false);
      setPasswordUnlocked(false);
      setNewPassword("");
      setConfirmPassword("");
      setOldPassword("");
      setImageSource(null);
    } catch (err: any) {
      console.error("❌ Clerk update failed:", err);
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // --- Verify old password ---
  const handleVerifyOldPassword = () => {
    if (!oldPassword.trim()) {
      Alert.alert("Error", "Please enter your current password.");
      return;
    }
    setPasswordUnlocked(true);
  };

  // --- Delete user ---
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

              // Step 1 — delete data from Supabase
              await deleteParentMutation.mutateAsync();

              // Step 2 — delete from Clerk
              await user.delete();

              // Step 3 — reset local auth store
              resetAuth.setRole("default");
              resetAuth.setOnBoardedStatus("pending");

              Alert.alert(
                "Account Deleted",
                "Your account has been permanently removed."
              );

              // Step 4 — navigate back to login
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
    <View style={styles.container}>
      {/* --- Profile Header --- */}
      <View style={styles.profileHeader}>
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
        <Text style={styles.emailText}>{email || "No email available"}</Text>
        <Text style={styles.dateText}>Joined on {createdAt}</Text>

        <View style={styles.signOutWrapper}>
          <SignOutButton />
        </View>
      </View>

      {/* --- Action Links --- */}
      <View style={styles.profileActions}>
        <TouchableOpacity onPress={() => setShowEditModal(true)}>
          <Text style={styles.actionText}>View Profile</Text>
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

      {/* --- Smaller, Centered Delete Button --- */}
      <View style={styles.deleteButtonWrapper}>
        <Button
          title="Delete Account"
          onPress={handleDeleteUser}
          backgroundColor="#EF4444"
          loading={deleting}
          paddingVertical={responsive.buttonHeight * 0.2}
          paddingHorizontal={responsive.buttonHeight * 0.8}
          fontSize={responsive.buttonFontSize * 0.85}
        />
      </View>

      {/* --- Edit Profile Modal --- */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={styles.modalClose}
            >
              <Ionicons
                name="close"
                size={responsive.screenWidth * 0.06}
                color="#111827"
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
              <Text style={styles.imageUploadText}>Select Profile Image</Text>
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
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setShowPasswordModal(true);
                setPasswordUnlocked(false);
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              style={{ marginTop: 15 }}
            >
              <Text style={styles.actionText}>Change Password</Text>
            </TouchableOpacity>

            <Button
              title="Save Changes"
              onPress={handleSaveChanges}
              loading={saving}
              marginTop={responsive.screenHeight * 0.02}
              backgroundColor="#4F46E5"
            />
          </View>
        </View>
      </Modal>

      {/* --- Change Password Modal --- */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowPasswordModal(false)}
              style={styles.modalClose}
            >
              <Ionicons
                name="close"
                size={responsive.screenWidth * 0.06}
                color="#111827"
              />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {passwordUnlocked ? "Set New Password" : "Enter Old Password"}
            </Text>

            {!passwordUnlocked ? (
              <>
                <InputBox
                  label="Current Password"
                  placeholder="Enter your current password"
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  iconLeft="lock-closed-outline"
                />
                <Button
                  title="Continue"
                  onPress={handleVerifyOldPassword}
                  backgroundColor="#4F46E5"
                />
              </>
            ) : (
              <>
                <InputBox
                  label="New Password"
                  placeholder="New Password"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  iconLeft="lock-closed-outline"
                />
                <InputBox
                  label="Confirm Password"
                  placeholder="Confirm Password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  iconLeft="lock-closed-outline"
                />
                <Button
                  title="Save Password"
                  onPress={handleSaveChanges}
                  backgroundColor="#4F46E5"
                  loading={saving}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: responsive.screenHeight * 0.05,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  profileImage: {
    width: responsive.screenWidth * 0.28,
    height: responsive.screenWidth * 0.28,
    borderRadius: 100,
    marginBottom: responsive.screenHeight * 0.02,
  },
  nameText: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#111827",
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
  signOutWrapper: { marginTop: responsive.screenHeight * 0.03 },
  profileActions: {
    marginTop: responsive.screenHeight * 0.04,
    marginLeft: responsive.screenWidth * 0.08,
  },
  actionText: {
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-Medium",
    color: "#4F46E5",
    textDecorationLine: "underline",
    marginBottom: responsive.screenHeight * 0.018,
  },
  deleteButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: responsive.screenHeight * 0.03,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: responsive.screenWidth * 0.06,
    position: "relative",
  },
  modalClose: {
    position: "absolute",
    top: responsive.screenHeight * 0.012,
    right: responsive.screenWidth * 0.04,
  },
  modalTitle: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#111827",
    textAlign: "center",
    marginBottom: responsive.screenHeight * 0.025,
  },
  imageUploadText: {
    fontFamily: "Fredoka-Medium",
    color: "#4F46E5",
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
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 8,
  },
});
