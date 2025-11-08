import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import StatusIndicator from "./StatusIndicator";
import { responsive } from "@/utils/responsive";
import { parseISO, isToday, compareDesc } from "date-fns";
import sessionData from "@/test/data/session";
import { ChildCardModel } from "@/services/fetchChildren";
import { Tables } from "@/types/database.types";
import { deleteChildAndAssociations } from "@/services/deleteChild";

type SessionRow = Tables<"answer_log">; 

type ChildCardProps = {
  child: ChildCardModel; 
};

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function ChildCard({ child }: ChildCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const getStatusColor = (status: ChildCardModel["activityStatus"]) => {
    switch (status) {
      case "active":
        return "green";
      case "pending":
        return "yellow";
      case "inactive":
      default:
        return "red";
    }
  };

  const handleManageChild = () => {
    router.push(`/manage-child/${child.id}`);
  };

const handleDeleteChild = async () => {
  try {
    await deleteChildAndAssociations(child.id);
    console.log(`✅ Child deleted: ${child.firstName} ${child.lastName}`);
    setShowDeleteModal(false);
  } catch (err: any) {
    console.error("❌ Failed to delete child:", err.message);
  }
};

  // Filter today's mock sessions (until real DB sessions exist)
  const todaysSessions = sessionData
    .filter((s) => s.childId === child.id && isToday(parseISO(s.date)))
    .sort((a, b) =>
      compareDesc(
        parseISO(`${a.date}T${a.startTime}`),
        parseISO(`${b.date}T${b.startTime}`)
      )
    )
    .slice(0, 3);

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.cardContainer}>
        <StatusIndicator
          status={getStatusColor(child.activityStatus)}
          iconSource={child.profilePicture}
          size={60}
          borderWidth={4}
        />

        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>
            {child.firstName} {child.lastName}
          </Text>
          <TouchableOpacity onPress={handleManageChild}>
            <Text style={styles.manageText}>Manage Child Data</Text>
          </TouchableOpacity>
        </View>

        {/* Expand & Delete Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
            <Text style={styles.expandButtonText}>{expanded ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDeleteModal(true)}
            style={styles.deleteButton}
          >
            <Ionicons
              name="trash-outline"
              size={responsive.isNarrowScreen ? 22 : 26}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded Drawer */}
      {expanded && (
        <View style={styles.drawer}>
          <Text style={[styles.drawerText, styles.drawerTitle]}>
            Today's Activity
          </Text>
          {todaysSessions.length === 0 ? (
            <Text style={styles.drawerText}>No current activity</Text>
          ) : (
            todaysSessions.map((session) => (
              <View key={session.id} style={styles.sessionRow}>
                <Text style={styles.drawerText}>{session.activityType}</Text>
                <Text style={[styles.drawerText, { color: "#4F46E5" }]}>
                  {session.sessionStatus}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              You are about to remove {child.firstName} from your account. Are
              you sure?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.yesButton]}
                onPress={handleDeleteChild}
              >
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.noButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: responsive.screenHeight * 0.01,
  },
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: responsive.screenWidth * 0.04,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  infoContainer: { flex: 1, marginLeft: responsive.screenWidth * 0.03 },
  nameText: {
    fontSize: responsive.buttonFontSize,
    color: "#111827",
    fontFamily: "Fredoka-SemiBold",
  },
  manageText: {
    color: "#4F46E5",
    textDecorationLine: "underline",
    marginTop: responsive.screenHeight * 0.005,
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Medium",
  },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  expandButton: {
    paddingHorizontal: responsive.screenWidth * 0.03,
    justifyContent: "center",
    alignItems: "center",
  },
  expandButtonText: {
    fontSize: responsive.isNarrowScreen ? 16 : 20,
    color: "#4B5563",
    fontFamily: "Fredoka-Medium",
  },
  deleteButton: {
    marginLeft: responsive.screenWidth * 0.02,
    justifyContent: "center",
    alignItems: "center",
  },
  drawer: {
    backgroundColor: "#F3F4F6",
    padding: responsive.screenWidth * 0.04,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: 4,
  },
  drawerText: {
    color: "#111827",
    fontSize: responsive.buttonFontSize * 0.85,
    fontFamily: "Fredoka-Regular",
  },
  drawerTitle: {
    fontFamily: "Fredoka-SemiBold",
    marginBottom: responsive.screenHeight * 0.01,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: responsive.screenHeight * 0.005,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: responsive.screenWidth * 0.05,
  },
  modalTitle: {
    fontSize: responsive.isNarrowScreen ? 16 : 18,
    fontFamily: "Fredoka-SemiBold",
    marginBottom: responsive.screenHeight * 0.025,
    color: "#111827",
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: responsive.screenHeight * 0.012,
    marginHorizontal: responsive.screenWidth * 0.01,
    borderRadius: 10,
    alignItems: "center",
  },
  yesButton: { backgroundColor: "#48b42dff" },
  noButton: { backgroundColor: "#EF4444" },
  modalButtonText: {
    color: "#fff",
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.85,
  },
});
