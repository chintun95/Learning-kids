import InputBox from "@/components/InputBox";
import ProfileIcon from "@/components/ProfileIcon";
import SignOutButton from "@/components/SignOutButton";
import { useChildAchievementStore } from "@/lib/store/childAchievementStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useSessionStore } from "@/lib/store/sessionStore";
import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/database.types"; // adjust if your Supabase types differ
import { sanitizeInput } from "@/utils/formatter";
import { useNetworkMonitor } from "@/utils/networkMonitor";
import { responsive } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

const ChildIndexScreen: React.FC = () => {
  const {
    children,
    getCurrentChild,
    selectChildUnsafe,
    loadedForEmail,
    loading,
    error,
    markFirstTimeComplete,
  } = useChildAuthStore();

  const { achievementsByChild, fetchChildAchievements } =
    useChildAchievementStore();

  const { startChildSession, setSessionDetails } = useSessionStore();
  const queryClient = useQueryClient();
  const currentChild = getCurrentChild();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();

  const [localChildren, setLocalChildren] = useState(children);
  useEffect(() => setLocalChildren(children), [children]);

  const { isConnected, isInternetReachable, initialized } = useNetworkMonitor();

  useEffect(() => {
    if (loadedForEmail) {
      console.log(`🟢 Listening for updates for ${loadedForEmail}`);
    }
  }, [loadedForEmail]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  /** ----------------- Update active child online ------------------ **/
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

  /** 🏆 Award "First Login" Achievement (Correct FK + TypeScript safe) */
  const handleFirstTimeLoginAchievement = useCallback(
    async (childId: string): Promise<void> => {
      try {
        if (!childId) return;

        // Ensure global + child achievements exist
        await fetchChildAchievements(childId);

        const global = useChildAchievementStore.getState().allAchievements;
        const childEarned = achievementsByChild?.[childId] ?? [];

        // Find achievement row in Achievements table
        const firstLoginAchievement = global.find(
          (a) => a.title.trim().toLowerCase() === "first login"
        );

        if (!firstLoginAchievement) {
          console.warn(
            "⚠️ 'First Login' achievement not found in Achievements table."
          );
          return;
        }

        const achievementId = firstLoginAchievement.id; // UUID (FK)

        // Check if already earned (joined store uses "achievement" object)
        const alreadyEarned = childEarned.some(
          (entry) => entry.achievement?.id === achievementId
        );

        if (alreadyEarned) return;

        console.log("🏆 Adding 'First Login' to ChildAchievement...");

        // Correct Insert type
        const payload: TablesInsert<"ChildAchievement"> = {
          childid: childId,
          achievementearned: achievementId, // ✅ correct FK column
          dateearned: new Date().toISOString(),
          user_id: null,
        };

        const { data, error } = await supabase
          .from("ChildAchievement")
          .insert(payload)
          .select(
            `
            id,
            achievementearned,
            childid,
            dateearned,
            user_id,
            achievement:achievementearned (
              id,
              title,
              description
            )
          `
          )
          .single();

        if (error) {
          console.warn("❌ Failed to insert ChildAchievement:", error.message);
          return;
        }

        console.log("✅ 'First Login' achievement saved!");

        // Update local store
        useChildAchievementStore.setState((state) => {
          const prev = state.achievementsByChild[childId] ?? [];
          return {
            achievementsByChild: {
              ...state.achievementsByChild,
              [childId]: [...prev, data],
            },
          };
        });

        markFirstTimeComplete();
      } catch (err: any) {
        console.warn("⚠️ Achievement error:", err.message);
      }
    },
    [fetchChildAchievements, achievementsByChild, markFirstTimeComplete]
  );

  /** -------------- No PIN Login -------------- **/
  const handleSelectChild = useCallback(
    async (childId: string): Promise<void> => {
      const child = localChildren.find((c) => c.id === childId);
      if (!child) return;

      if (child.profilePin) {
        setSelectedChildId(childId);
        setModalVisible(true);
        return;
      }

      selectChildUnsafe(childId);

      if (isConnected && isInternetReachable) {
        try {
          await setActiveStatus(childId);
        } catch (err) {
          console.warn("⚠️ Failed to update Supabase:", err);
        }
      }

      startChildSession(childId, "auth");
      setSessionDetails(
        `${child.firstName} ${child.lastName} signed into their profile`
      );

      // Award first-time login achievement
      await handleFirstTimeLoginAchievement(childId);

      router.push(`/home/${childId}`);
    },
    [
      localChildren,
      selectChildUnsafe,
      router,
      setActiveStatus,
      startChildSession,
      setSessionDetails,
      isConnected,
      isInternetReachable,
      handleFirstTimeLoginAchievement,
    ]
  );

  /** -------------- PIN Login -------------- **/
  const handlePinSubmit = useCallback(async (): Promise<void> => {
    if (!selectedChildId) return;
    const child = localChildren.find((c) => c.id === selectedChildId);
    if (!child) return;

    const sanitizedPin = sanitizeInput(enteredPin);
    if (sanitizedPin !== child.profilePin) {
      setPinError("Incorrect PIN. Please try again.");
      return;
    }

    setPinError("");
    setModalVisible(false);
    selectChildUnsafe(selectedChildId);

    if (isConnected && isInternetReachable) {
      try {
        await setActiveStatus(selectedChildId);
      } catch (err) {
        console.warn("⚠️ Online update failed:", err);
      }
    }

    startChildSession(selectedChildId, "auth");
    setSessionDetails(
      `${child.firstName} ${child.lastName} signed into their profile`
    );

    // Award first-time login achievement
    await handleFirstTimeLoginAchievement(selectedChildId);

    setEnteredPin("");
    router.push(`/home/${selectedChildId}`);
  }, [
    selectedChildId,
    localChildren,
    enteredPin,
    selectChildUnsafe,
    isConnected,
    isInternetReachable,
    setActiveStatus,
    startChildSession,
    setSessionDetails,
    handleFirstTimeLoginAchievement,
    router,
  ]);

  const handleBack = (): void => {
    setEnteredPin("");
    setPinError("");
    setSelectedChildId(null);
    setModalVisible(false);
  };

  /** ---------- Loading / Empty States ---------- **/
  if (loading || !initialized) {
    return (
      <SafeAreaView style={[styles.safeContainer, styles.centered]}>
        <Text style={styles.emptyText}>Loading profiles...</Text>
      </SafeAreaView>
    );
  }

  if (error) console.warn("⚠️ Child store error:", error);

  if (!localChildren || localChildren.length === 0) {
    return (
      <SafeAreaView style={[styles.safeContainer, styles.centered]}>
        <Text style={styles.emptyText}>No profiles found</Text>
        <View style={styles.signOutWrapper}>
          <SignOutButton />
        </View>
      </SafeAreaView>
    );
  }

  /** ---------- Main UI ---------- **/
  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      <View style={styles.headerBackground} />
      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Select Your Profile</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons
              name="close"
              size={responsive.isNarrowScreen ? 20 : 24}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        {/* Profile list */}
        <View style={styles.contentWrapper}>
          <FlatList
            data={localChildren}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            renderItem={({
              item,
            }: ListRenderItemInfo<(typeof localChildren)[number]>) => {
              const isActive = currentChild?.id === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.iconContainer,
                    isActive && styles.activeContainer,
                  ]}
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
        </View>

        {/* Footer Sign-Out */}
        <View
          style={[
            styles.signOutWrapper,
            Platform.OS === "android" && { marginBottom: 20 },
          ]}
        >
          <SignOutButton />
        </View>
      </ImageBackground>

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

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: "rgba(217,217,217,0.85)" },
                ]}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#000" }]}
                onPress={handlePinSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default ChildIndexScreen;

/** ---------- Styles ---------- **/
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#fff" },
  background: { flex: 1, width: "100%", height: "100%" },
  backgroundImage: { transform: [{ scale: 1.2 }] },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: statusBarHeight + 40,
    backgroundColor: "rgba(217,217,217,0.85)",
    zIndex: 1,
  },
  headerBar: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderBottomColor: "#999",
    borderBottomWidth: 2,
    paddingTop: statusBarHeight * 0.4,
    paddingBottom: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.05,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },
  headerTitle: {
    color: "#000",
    fontSize: responsive.isNarrowScreen ? 18 : 22,
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: responsive.screenWidth * 0.05,
    top: "50%",
    transform: [{ translateY: -responsive.screenHeight * 0.015 }],
    padding: 6,
  },
  contentWrapper: { flex: 1, justifyContent: "center" },
  listContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: responsive.screenHeight * 0.05,
  },
  row: {
    justifyContent: "space-evenly",
    marginBottom: responsive.screenHeight * 0.03,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    borderColor: "#999",
    borderWidth: 2,
    margin: responsive.screenWidth * 0.04,
    padding: responsive.screenWidth * 0.04,
    width: responsive.screenWidth * 0.4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  activeContainer: { borderColor: "#6366F1" },
  nameText: {
    marginTop: responsive.screenHeight * 0.01,
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-Medium",
    color: "#000",
    textAlign: "center",
  },
  signOutWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: Platform.OS === "android" ? 25 : 10,
  },
  centered: { justifyContent: "center", alignItems: "center" },
  emptyText: {
    fontSize: responsive.buttonFontSize,
    color: "#333",
    marginBottom: responsive.screenHeight * 0.02,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsive.screenWidth * 0.08,
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: "#000",
  },
  pinInput: { textAlign: "center", fontSize: 18, color: "#000" },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorText: { color: "#EF4444", marginTop: 10, fontSize: 14 },
});
