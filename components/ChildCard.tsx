import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import StatusIndicator from "./StatusIndicator";
import { responsive } from "@/utils/responsive";
import { Child } from "@/types/types";

type ChildCardProps = {
  child: Child;
  handleManageChild?: () => void;
};

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function ChildCard({ child }: ChildCardProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const getStatusColor = (status: Child["activityStatus"]) => {
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

        <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
          <Text style={styles.expandButtonText}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.drawer}>
          <Text style={styles.drawerText}>
            Session Data for {child.firstName} goes here
          </Text>
        </View>
      )}
    </View>
  );
}

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
});
