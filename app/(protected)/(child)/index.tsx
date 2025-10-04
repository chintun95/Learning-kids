import { Text, View } from "react-native";
import { SignOutButton } from "@/components/SignOutButton";

export default function ProtectedChildIndex() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Profile Selection Screen</Text>

      <SignOutButton />
    </View>
  );
}
