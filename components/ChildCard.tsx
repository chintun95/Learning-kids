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
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import StatusIndicator from "./StatusIndicator";
import { responsive } from "@/utils/responsive";
import { deleteChildAndAssociations } from "@/services/deleteChild";
import { ChildCardModel } from "@/services/fetchChildren";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface ChildCardProps {
  child: ChildCardModel;
}

export default function ChildCard({ child }: ChildCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const getStatusColor = (
    status: ChildCardModel["activityStatus"]
  ): "green" | "yellow" | "red" => {
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
      setDeleting(true);
      await deleteChildAndAssociations(child.id);

      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "children-for-parent-email" ||
          query.queryKey[0] === "children",
      });

      setShowDeleteModal(false);
      Alert.alert("Deleted", `${child.firstName} has been removed.`);
    } catch (err: any) {
      Alert.alert("Error", "Failed to delete child. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

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

      {/* EXPANDED AREA — NEW CONTENT */}
      {expanded && (
        <View style={styles.drawer}>
          <Text style={[styles.drawerText, styles.drawerTitle]}>
            Progress Chart
          </Text>

          <TouchableOpacity
            onPress={() => router.push(`/progress-chart/${child.id}`)}
          >
            <Text style={styles.chartLink}>Click to view chart</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {deleting ? (
              <>
                <ActivityIndicator size="large" color="#000" />
                <Text
                  style={[
                    styles.modalTitle,
                    { marginTop: responsive.screenHeight * 0.02 },
                  ]}
                >
                  Deleting {child.firstName}...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  You are about to remove {child.firstName} from your account.
                  {"\n"}Are you sure?
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
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: responsive.screenHeight * 0.012,
  },
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    padding: responsive.screenWidth * 0.04,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  infoContainer: { flex: 1, marginLeft: responsive.screenWidth * 0.03 },
  nameText: {
    fontSize: responsive.buttonFontSize,
    color: "#000",
    fontFamily: "Fredoka-SemiBold",
  },
  manageText: {
    color: "#000",
    textDecorationLine: "underline",
    marginTop: responsive.screenHeight * 0.005,
    fontSize: responsive.buttonFontSize * 0.85,
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
    color: "#000",
    fontFamily: "Fredoka-Medium",
  },
  deleteButton: {
    marginLeft: responsive.screenWidth * 0.02,
    justifyContent: "center",
    alignItems: "center",
  },
  drawer: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderWidth: 2,
    borderColor: "#999",
    borderBottomLeftRadius: responsive.screenWidth * 0.04,
    borderBottomRightRadius: responsive.screenWidth * 0.04,
    padding: responsive.screenWidth * 0.04,
    marginTop: 4,
  },
  drawerText: {
    color: "#000",
    fontSize: responsive.buttonFontSize * 0.85,
    fontFamily: "Fredoka-Regular",
  },
  drawerTitle: {
    fontFamily: "Fredoka-SemiBold",
    marginBottom: responsive.screenHeight * 0.01,
  },
  chartLink: {
    color: "#000",
    textDecorationLine: "underline",
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.85,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "rgba(217,217,217,0.85)",
    borderColor: "#999",
    borderWidth: 2,
    borderRadius: responsive.screenWidth * 0.04,
    padding: responsive.screenWidth * 0.05,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  modalTitle: {
    fontSize: responsive.isNarrowScreen ? 16 : 18,
    fontFamily: "Fredoka-SemiBold",
    marginBottom: responsive.screenHeight * 0.025,
    color: "#000",
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: responsive.screenHeight * 0.012,
    marginHorizontal: responsive.screenWidth * 0.01,
    borderRadius: 10,
    alignItems: "center",
  },
  yesButton: { backgroundColor: "#000" },
  noButton: { backgroundColor: "#EF4444" },
  modalButtonText: {
    color: "#fff",
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.85,
  },
});
