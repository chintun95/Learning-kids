// app/(protected)/(parent)/(tabs)/index.tsx
import { useUser } from "@clerk/clerk-expo";
import React, { useMemo } from "react";
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

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

export default function ProtectedParentIndex() {
  const { user } = useUser();
  const [showModal, setShowModal] = React.useState(false);

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  // Clerk recommended way to get a stable email:
  const emailAddress =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";

  const CHILD_THRESHOLD = 12;

  // Fetch children by parent's email
  const {
    data: children,
    isLoading,
    isError,
    error,
    refetch,
  } = useChildrenByParentEmail(emailAddress);

  const childCount = children?.length ?? 0;

  const renderChild = ({ item }: { item: ChildCardModel }) => (
    <ChildCard child={item as any} />
  );

  const handleCloseModal = () => setShowModal(false);

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      <View style={styles.container}>
        {/* Centered Welcome Banner */}
        <View style={styles.banner}>
          <Text style={styles.welcomeText}>
            Welcome 👋,{" "}
            <Text style={styles.nameText}>
              {firstName} {lastName}
            </Text>
          </Text>
        </View>

        {/* Children Section Header */}
        <View style={styles.childrenHeaderContainer}>
          <Text style={styles.childrenHeaderText}>Children Under Account</Text>
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <Ionicons
              name="help-circle-outline"
              size={responsive.isNarrowScreen ? 20 : 24}
              color="#4F46E5"
            />
          </TouchableOpacity>
        </View>

        {/* Loading / Error states */}
        {isLoading && (
          <View style={{ padding: responsive.screenWidth * 0.05 }}>
            <ActivityIndicator />
          </View>
        )}
        {isError && (
          <View style={{ padding: responsive.screenWidth * 0.05 }}>
            <Text style={{ color: "#EF4444" }}>
              Failed to load children. {String((error as Error)?.message || "")}
            </Text>
          </View>
        )}

        {/* AddChild Button: only shows if children are below threshold */}
        {!isLoading && !isError && childCount < CHILD_THRESHOLD && <AddChild />}

        {/* No Children Fallback */}
        {!isLoading && !isError && childCount === 0 && (
          <View style={styles.noChildContainer}>
            <Text style={styles.noChildText}>
              No Children Registered Under Account
            </Text>
          </View>
        )}

        {/* Child List */}
        {!isLoading && !isError && childCount > 0 && (
          <FlatList
            data={children as ChildCardModel[]}
            keyExtractor={(item) => item.id}
            renderItem={renderChild}
            contentContainerStyle={{ padding: responsive.screenWidth * 0.04 }}
          />
        )}

        {/* Modal for Status Indicator */}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#4F46E5" },
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  banner: {
    backgroundColor: "#4F46E5",
    paddingTop: statusBarHeight * 0.4,
    paddingBottom: responsive.screenHeight * 0.035,
    paddingHorizontal: responsive.screenWidth * 0.05,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeText: {
    color: "#FFFFFF",
    fontSize: responsive.isNarrowScreen ? 18 : 22,
    fontFamily: "Fredoka-SemiBold",
    textAlign: "center",
  },
  nameText: {
    fontFamily: "Fredoka-Bold",
    color: "#E0E7FF",
  },

  childrenHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.02,
    marginHorizontal: responsive.screenWidth * 0.05,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
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
    color: "#111827",
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
    color: "#374151",
    fontFamily: "Fredoka-Regular",
  },
});
