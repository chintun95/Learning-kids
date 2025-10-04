// components/ChildCard.tsx
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
import StatusIndicator from "./StatusIndicator";
import { responsive } from "@/utils/responsive";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  activityStatus: "active" | "inactive" | "pending";
  profilePin: string | null;
  profilePicture: any;
}

interface ChildCardProps {
  child: Child;
}

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const ChildCard: React.FC<ChildCardProps> = ({ child }) => {
  const [expanded, setExpanded] = useState(false);

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
          <TouchableOpacity
            onPress={() => console.log(`Manage ${child.firstName}`)}
          >
            <Text style={styles.manageText}>Manage Child</Text>
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
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 8,
  },
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nameText: {
    fontSize: responsive.buttonFontSize,
    fontWeight: "600",
    color: "#111827",
  },
  manageText: {
    color: "#4F46E5",
    textDecorationLine: "underline",
    marginTop: 4,
    fontSize: responsive.buttonFontSize * 0.8,
  },
  expandButton: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  expandButtonText: {
    fontSize: 20,
    color: "#4B5563",
  },
  drawer: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: 4,
  },
  drawerText: {
    color: "#111827",
    fontSize: responsive.buttonFontSize * 0.85,
  },
});

export default ChildCard;
