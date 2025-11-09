import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import ProfileIcon from "@/components/ProfileIcon";
import { responsive } from "@/utils/responsive";
import SignOutButton from "@/components/SignOutButton";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { sanitizeInput } from "@/utils/formatter";
import { useNetworkMonitor } from "@/utils/networkMonitor";
const ChildIndexScreen: React.FC = () => {
  const {
    children,
    getCurrentChild,
    selectChildUnsafe,
    loadedForEmail,
    loading,
    error,
  } = useChildAuthStore();

  const { startChildSession } = useSessionStore();
  const queryClient = useQueryClient();
  const currentChild = getCurrentChild();
  const router = useRouter();

  const [localChildren, setLocalChildren] = useState(children);
  useEffect(() => setLocalChildren(children), [children]);

  // Global network state (persistent across layouts)
  const { isConnected, isInternetReachable, initialized } = useNetworkMonitor();

  // Log updates
  useEffect(() => {
    if (loadedForEmail) {
      console.log(`🟢 Listening for updates for ${loadedForEmail}`);
    }
  }, [loadedForEmail]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  // --- Online mutation (will fail gracefully when offline)
  const { mutateAsync: setActiveStatus } = useMutation({
    mutationFn: async (childId: string) => {
      const { error: updateError } = await supabase
        .from("Child")
        .update({ activitystatus: "active" })
        .eq("id", childId);
      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: (_data, childId) => {
      queryClient.invalidateQueries({ queryKey: ["child-by-id", childId] });
      queryClient.invalidateQueries({
        queryKey: ["children-for-parent-email"],
      });
      console.log(`✅ Child ${childId} marked active online.`);
    },
    onError: (mutationError: Error) => {
      console.warn(
        "⚠️ Offline mode: Supabase update skipped.",
        mutationError.message
      );
    },
  });

  // --- Handle selecting a child
  const handleSelectChild = useCallback(
    (childId: string) => {
      const child = localChildren.find((c) => c.id === childId);
      if (!child) return;

      if (child.profilePin) {
        setSelectedChildId(childId);
        setModalVisible(true);
      } else {
        // No PIN: start session immediately (works offline)
        selectChildUnsafe(childId);
        if (isConnected && isInternetReachable) {
          setActiveStatus(childId).catch(() => {
            console.warn(
              "⚠️ Online but failed to update Supabase, continuing locally."
            );
          });
        } else {
          console.warn(
            "📴 Offline: skipping Supabase update, continuing locally."
          );
        }
        startChildSession(childId, "auth");
        console.log(`🟢 Session started (no PIN) for ${child.firstName}`);
        router.push(`/home/${childId}`);
      }
    },
    [
      localChildren,
      selectChildUnsafe,
      router,
      setActiveStatus,
      startChildSession,
      isConnected,
      isInternetReachable,
    ]
  );

  // --- Handle PIN submission
  const handlePinSubmit = async () => {
    if (!selectedChildId) return;
    const child = localChildren.find((c) => c.id === selectedChildId);
    if (!child) return;

    const sanitizedPin = sanitizeInput(enteredPin);
    if (sanitizedPin === child.profilePin) {
      setPinError("");
      setModalVisible(false);
      selectChildUnsafe(selectedChildId);

      // Use global connection state (no need for one-time check)
      if (isConnected && isInternetReachable) {
        try {
          await setActiveStatus(selectedChildId);
          console.log("✅ Online: status updated in Supabase.");
        } catch (err) {
          console.warn("⚠️ Online update failed:", err);
        }
      } else {
        console.warn("📴 Offline: using local session only.");
      }

      // Always start session locally (even offline)
      startChildSession(selectedChildId, "auth");
      console.log(
        `🟢 Auth session started locally for ${child.firstName} ${child.lastName}`
      );

      setEnteredPin("");
      router.push(`/home/${selectedChildId}`);
    } else {
      setPinError("Incorrect PIN. Please try again.");
    }
  };

  const handleBack = () => {
    setEnteredPin("");
    setPinError("");
    setSelectedChildId(null);
    setModalVisible(false);
  };

  // --- Loading / Error States ---
  if (loading || !initialized) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <Text style={styles.emptyText}>Loading profiles...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    console.warn("⚠️ Child store error:", error);
  }

  if (!localChildren || localChildren.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <Text style={styles.emptyText}>No profiles found</Text>
        <View style={styles.signOutWrapper}>
          <SignOutButton />
        </View>
      </SafeAreaView>
    );
  }

  // --- Main UI ---
  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <Text style={styles.header}>Select Your Profile</Text>

      <FlatList
        data={localChildren}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isActive = currentChild?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.iconContainer, isActive && styles.activeContainer]}
              onPress={() => handleSelectChild(item.id)}
              activeOpacity={0.8}
            >
              <ProfileIcon source={item.profilePicture} />
              <Text style={styles.nameText}>
                {item.firstName} {item.lastName}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.signOutWrapper}>
        <SignOutButton />
      </View>

      {/* --- PIN Modal --- */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleBack}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Enter PIN</Text>
            <InputBox
              placeholder="Enter 4-digit PIN"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={enteredPin}
              onChangeText={setEnteredPin}
              style={styles.pinInput}
            />
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
            <View style={styles.buttonRow}>
              <View style={styles.modalButtonWrapper}>
                <Button
                  title="Back"
                  onPress={handleBack}
                  backgroundColor="#374151"
                  textColor="#F9FAFB"
                  fontSize={responsive.buttonFontSize * 0.8}
                  paddingVertical={responsive.buttonHeight * 0.2}
                  paddingHorizontal={responsive.buttonHeight * 0.6}
                />
              </View>
              <View style={styles.modalButtonWrapper}>
                <Button
                  title="Done"
                  onPress={handlePinSubmit}
                  backgroundColor="#6366F1"
                  textColor="#F9FAFB"
                  fontSize={responsive.buttonFontSize * 0.8}
                  paddingVertical={responsive.buttonHeight * 0.2}
                  paddingHorizontal={responsive.buttonHeight * 0.6}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default ChildIndexScreen;

// --- Styles (unchanged) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    fontSize: responsive.buttonFontSize * 1.2,
    fontWeight: "600",
    marginVertical: responsive.screenHeight * 0.025,
    color: "#F9FAFB",
  },
  listContainer: {
    justifyContent: "center",
    paddingHorizontal: responsive.screenWidth * 0.05,
    paddingBottom: responsive.screenHeight * 0.1,
  },
  row: {
    justifyContent: "space-around",
    marginBottom: responsive.screenHeight * 0.03,
  },
  iconContainer: {
    alignItems: "center",
    marginHorizontal: responsive.screenWidth * 0.05,
  },
  activeContainer: {
    borderWidth: 2,
    borderColor: "#6366F1",
    borderRadius: responsive.profileIconSize() / 2,
    padding: responsive.screenWidth * 0.01,
  },
  nameText: {
    marginTop: responsive.screenHeight * 0.01,
    fontSize: responsive.buttonFontSize,
    fontWeight: "500",
    textAlign: "center",
    color: "#E5E7EB",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: responsive.buttonFontSize,
    color: "#9CA3AF",
    marginBottom: responsive.screenHeight * 0.02,
  },
  signOutWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsive.screenWidth * 0.05,
    paddingBottom: Platform.OS === "android" ? 25 : 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsive.screenWidth * 0.08,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#1F2937",
    borderRadius: responsive.screenWidth * 0.03,
    padding: responsive.screenHeight * 0.03,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: responsive.buttonFontSize * 1.2,
    fontWeight: "600",
    marginBottom: responsive.screenHeight * 0.015,
    color: "#F9FAFB",
  },
  pinInput: {
    textAlign: "center",
    fontSize: responsive.buttonFontSize,
    color: "#000",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: responsive.screenHeight * 0.025,
  },
  modalButtonWrapper: {
    flex: 1,
    alignItems: "center",
  },
  errorText: {
    color: "#F87171",
    marginTop: responsive.screenHeight * 0.01,
    fontSize: responsive.buttonFontSize * 0.85,
  },
});
