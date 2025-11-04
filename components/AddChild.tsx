import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { responsive } from "@/utils/responsive";

const AddChild: React.FC = () => {
  const router = useRouter();

  const handlePress = () => {
    router.push("/(protected)/(parent)/add-child");
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Ionicons
        name="add-circle-outline"
        size={responsive.buttonFontSize * 1.5}
        color="#4F46E5"
        style={styles.icon}
      />
      <Text style={styles.text}>Add Child (Maximum Number: 12)</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsive.screenHeight * 0.01,
    paddingHorizontal: responsive.screenWidth * 0.04,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    marginVertical: responsive.screenHeight * 0.01,
  },
  icon: {
    marginRight: responsive.screenWidth * 0.02,
  },
  text: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize,
    color: "#111827",
  },
});

export default AddChild;
