import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import ProfileIcon from "@/components/ProfileIcon";
import { SignOutButton } from "@/components/SignOutButton";
import childData from "@/test/data/child";
import { Child } from "@/types/types";
import { responsive } from "@/utils/responsive";

export default function ProtectedChildIndex() {
  const router = useRouter();

  const handleSelectChild = (child: Child) => {
    router.push(`/home/${child.id}`);
  };

  const renderChildItem = ({ item }: { item: Child }) => (
    <TouchableOpacity
      style={styles.childContainer}
      onPress={() => handleSelectChild(item)}
    >
      <ProfileIcon
        source={item.profilePicture}
        size={responsive.screenWidth * 0.25}
      />
      <Text style={styles.childNameText}>
        {item.firstName} {item.lastName}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Account:</Text>

      <FlatList
        data={childData}
        keyExtractor={(item) => item.id}
        renderItem={renderChildItem}
        numColumns={2} // display 2 per row
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={{ justifyContent: "space-around" }}
        showsVerticalScrollIndicator={false}
      />
      <SignOutButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: responsive.screenHeight * 0.08,
    alignItems: "center",
  },
  title: {
    fontSize: responsive.isNarrowScreen ? 20 : 24,
    fontFamily: "Fredoka-Bold",
    color: "#111827",
    marginBottom: responsive.screenHeight * 0.04,
  },
  listContainer: {
    paddingHorizontal: responsive.screenWidth * 0.05,
  },
  childContainer: {
    alignItems: "center",
    marginBottom: responsive.screenHeight * 0.04,
  },
  childNameText: {
    marginTop: responsive.screenHeight * 0.015,
    fontSize: responsive.isNarrowScreen ? 16 : 18,
    fontFamily: "Fredoka-Medium",
    color: "#111827",
    textAlign: "center",
  },
});
