// app/(protected)/(parent)/(tabs)/index.tsx
import { useUser } from "@clerk/clerk-expo";
import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Platform,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ChildCard from "@/components/ChildCard";
import AddChild from "@/components/AddChild";
import { responsive } from "@/utils/responsive";

import {
  useChildrenByParentEmail,
  ChildCardModel,
} from "@/services/fetchChildren";
import { useCreateParent } from "@/services/createParent";
import { fetchParentByEmail } from "@/services/fetchParent";
import { useAuthStore } from "@/lib/store/authStore";

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

export default function ProtectedParentIndex() {
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [syncingParent, setSyncingParent] = useState(false);

  const setParentSynced = useAuthStore((s) => s.setParentSynced);
  const isParentSynced = useAuthStore((s) => s.isParentSynced);

  const { mutateAsync: createParent } = useCreateParent();

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const emailAddress =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";

  const CHILD_THRESHOLD = 12;

  useEffect(() => {
    const ensureParentExists = async () => {
      if (!emailAddress || isParentSynced) return;
      try {
        setSyncingParent(true);

        const existingParent = await fetchParentByEmail(emailAddress);

        if (existingParent) {
          console.log("🟢 Parent already exists:", existingParent.id);
          setParentSynced(true);
          return;
        }

        await createParent({
          firstname: firstName,
          lastname: lastName,
          emailaddress: emailAddress,
        });

        console.log("✅ Parent created in Supabase.");
        setParentSynced(true);
      } catch (err) {
        console.error("❌ Failed to sync parent record:", err);
      } finally {
        setSyncingParent(false);
      }
    };

    ensureParentExists();
  }, [emailAddress, isParentSynced]);

  const {
    data: children,
    isLoading,
    isError,
    error,
  } = useChildrenByParentEmail(isParentSynced ? emailAddress : undefined);

  const childCount = children?.length ?? 0;
  const renderChild = ({ item }: { item: ChildCardModel }) => (
    <ChildCard child={item} />
  );

  const handleCloseModal = () => setShowModal(false);

  if (syncingParent) {
    return (
      <SafeAreaView
        style={[
          styles.safeContainer,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#000" />
        <Text
          style={{
            color: "#000",
            marginTop: 10,
            fontFamily: "Fredoka-SemiBold",
          }}
        >
          Setting up your account...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      {/* Header background fills the status bar area */}
      <View style={styles.headerBackground} />

      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* --- Fixed Header Area --- */}
        <View style={{ zIndex: 2 }}>
          {/* --- Welcome Banner --- */}
          <View style={styles.banner}>
            <Text style={styles.welcomeText}>
              Welcome 👋,{" "}
              <Text style={styles.nameText}>
                {firstName} {lastName}
              </Text>
            </Text>
          </View>

          {/* --- Children Header (Fixed) --- */}
          <View style={styles.childrenHeaderContainer}>
            <Text style={styles.childrenHeaderText}>
              Children Under Account
            </Text>
            <TouchableOpacity onPress={() => setShowModal(true)}>
              <Ionicons
                name="help-circle-outline"
                size={responsive.isNarrowScreen ? 20 : 24}
                color="#000"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Scrollable Content --- */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: responsive.screenWidth * 0.04,
            paddingBottom: responsive.screenHeight * 0.1,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* --- Loading and Error States --- */}
          {isLoading && (
            <View style={{ paddingVertical: responsive.screenWidth * 0.05 }}>
              <ActivityIndicator />
            </View>
          )}
          {isError && (
            <View style={{ paddingVertical: responsive.screenWidth * 0.05 }}>
              <Text style={{ color: "#EF4444" }}>
                Failed to load children.{" "}
                {String((error as Error)?.message || "")}
              </Text>
            </View>
          )}

          {/* --- Add Child Button --- */}
          {!isLoading && !isError && childCount < CHILD_THRESHOLD && (
            <AddChild />
          )}

          {/* --- No Children Fallback --- */}
          {!isLoading && !isError && childCount === 0 && (
            <View style={styles.noChildContainer}>
              <Text style={styles.noChildText}>
                No Children Registered Under Account
              </Text>
            </View>
          )}

          {/* --- Child List --- */}
          {!isLoading && !isError && childCount > 0 && (
            <FlatList
              data={children as ChildCardModel[]}
              keyExtractor={(item) => item.id}
              renderItem={renderChild}
              scrollEnabled={false}
              contentContainerStyle={{
                paddingBottom: responsive.screenHeight * 0.05,
              }}
            />
          )}
        </ScrollView>

        {/* --- Status Indicator Modal --- */}
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>Status Indicator</Text>

              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: "green" }]} />
                <Text style={styles.statusText}>- Logged in and Online</Text>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: "gold" }]} />
                <Text style={styles.statusText}>
                  - Logged in but Lost Connection
                </Text>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: "red" }]} />
                <Text style={styles.statusText}>- Logged Out and Offline</Text>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#fff" },
  background: { flex: 1, width: "100%", height: "100%" },
  backgroundImage: { transform: [{ scale: 1.2 }] }, // Zoomed like profile
  container: { flex: 1 },

  // New overlay to extend header color into the status bar area
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: statusBarHeight + 40, // covers the status bar area
    backgroundColor: "rgba(217,217,217,0.85)",
    zIndex: 1,
  },

  banner: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderBottomColor: "#999",
    borderBottomWidth: 2,
    paddingTop: statusBarHeight * 0.4,
    paddingBottom: responsive.screenHeight * 0.035,
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
  welcomeText: {
    color: "#000",
    fontSize: responsive.isNarrowScreen ? 18 : 22,
    fontFamily: "Fredoka-SemiBold",
    textAlign: "center",
  },
  nameText: {
    fontFamily: "Fredoka-Bold",
    color: "#111827",
  },
  childrenHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.02,
    marginHorizontal: responsive.screenWidth * 0.05,
    zIndex: 2,
  },
  childrenHeaderText: {
    fontSize: responsive.isNarrowScreen ? 16 : 18,
    fontFamily: "Fredoka-Medium",
    color: "#111827",
  },
  noChildContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: responsive.screenHeight * 0.06,
  },
  noChildText: {
    fontSize: responsive.isNarrowScreen ? 14 : 16,
    color: "#6B7280",
    fontFamily: "Fredoka-Regular",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "rgba(217,217,217,0.85)",
    borderColor: "#999",
    borderWidth: 2,
    borderRadius: 20,
    padding: responsive.screenWidth * 0.05,
    elevation: 5,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
  },
  modalTitle: {
    fontSize: responsive.isNarrowScreen ? 18 : 20,
    fontFamily: "Fredoka-Bold",
    marginBottom: responsive.screenHeight * 0.02,
    textAlign: "center",
    color: "#000",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive.screenHeight * 0.015,
  },
  dot: {
    width: responsive.isNarrowScreen ? 12 : 14,
    height: responsive.isNarrowScreen ? 12 : 14,
    borderRadius: 7,
    marginRight: 10,
  },
  statusText: {
    fontSize: responsive.isNarrowScreen ? 14 : 16,
    color: "#000",
    fontFamily: "Fredoka-Regular",
  },
});
