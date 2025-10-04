import { useUser } from '@clerk/clerk-expo'
import { SignOutButton } from "@/components/SignOutButton";
import { Text, View } from "react-native";

export default function ProtectedParentIndex() {
  const { user } = useUser();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>
        Welcome! {user?.firstName} {user?.lastName}
      </Text>
      <Text> {user?.emailAddresses[0].emailAddress}</Text>
    </View>
  );
}
