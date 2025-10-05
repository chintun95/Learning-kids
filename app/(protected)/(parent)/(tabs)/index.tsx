import { useUser } from "@clerk/clerk-expo";
import {
  Text,
  View,
  StyleSheet,
  Platform,
  StatusBar,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChildCard from "@/components/ChildCard";
import childData from "@/test/data/child";
import { Child } from "@/types/types";

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

export default function ProtectedParentIndex() {
  const { user } = useUser();
  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";

  const renderChild = ({ item }: { item: Child }) => <ChildCard child={item} />;

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

        {/* Child List */}
        <FlatList
          data={childData as Child[]}
          keyExtractor={(item) => item.id}
          renderItem={renderChild}
          contentContainerStyle={{ padding: 16 }}
        />
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: "center",
  },
  welcomeText: { color: "#FFFFFF", fontSize: 22, fontWeight: "600" },
  nameText: { fontWeight: "700", color: "#E0E7FF" },
});
