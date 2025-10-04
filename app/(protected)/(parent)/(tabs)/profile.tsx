import { useUser } from "@clerk/clerk-expo";
import { SignOutButton } from "@/components/SignOutButton";
import { Text, View } from "react-native";

export default function ProtectedProfileIndex() {
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
        {" "}
        {user?.firstName} {user?.lastName}{" "}
      </Text>

      <SignOutButton />
    </View>
  );
}
