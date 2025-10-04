import { useUser } from "@clerk/clerk-expo";
import {
  Text,
  View,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChildCard from "@/components/ChildCard";
import childData from "@/test/data/child.json";

export default function ProtectedParentIndex() {
  const { user } = useUser();

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      <View style={styles.container}>
        {/* Welcome Banner */}
        <View style={styles.banner}>
          <Text style={styles.welcomeText}>
            Welcome,{" "}
            <Text style={styles.nameText}>
              {firstName} {lastName}
            </Text>
          </Text>
        </View>

        {/* Content with ChildCard */}
        <ScrollView contentContainerStyle={styles.content}>
          {/* Render first child as example */}
          {childData.length > 0 && <ChildCard child={childData[1]} />}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#4F46E5",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  banner: {
    backgroundColor: "#4F46E5",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: "center",
  },
  welcomeText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
  },
  nameText: {
    fontWeight: "700",
    color: "#E0E7FF",
  },
  content: {
    padding: 16,
  },
});
