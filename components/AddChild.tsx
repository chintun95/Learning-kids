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
        color="#000"
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
    justifyContent: "center",
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    paddingVertical: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.05,
    marginTop: responsive.screenHeight * 0.025,
    marginHorizontal: responsive.screenWidth * 0.05,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  icon: {
    marginRight: responsive.screenWidth * 0.03,
  },
  text: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.05,
    color: "#000",
    textAlign: "center",
  },
});

export default AddChild;
