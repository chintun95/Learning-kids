import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { Colors } from "react-native/Libraries/NewAppScreen";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import React from "react";

interface HeaderProps {
  reloadGame: () => void;
  pauseGame: () => void;
  children: JSX.Element;
  isPaused: boolean;
}

export default function Header({
  children,
  reloadGame,
  pauseGame,
  isPaused,
}: HeaderProps): JSX.Element {
  const { isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (isUpdatePending) {
      Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  return (
    <View style={styles.container}>
      {/* Left: Reset Button */}
      <TouchableOpacity onPress={reloadGame}>
        <Ionicons name="reload-circle" size={35} color={Colors.primary} />
      </TouchableOpacity>

      {/* Center: Placeholder Profile Icon */}
      <View>
        <FontAwesome name="user-circle" size={35} color={Colors.primary} />
      </View>

      {/* Right: Pause/Play Button */}
      <TouchableOpacity onPress={pauseGame}>
        <FontAwesome
          name={isPaused ? "play-circle" : "pause-circle"}
          size={35}
          color={Colors.primary}
        />
      </TouchableOpacity>

      {/* Child content if needed */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0.05,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: Colors.primary,
    borderWidth: 12,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomWidth: 0,
    padding: 15,
    backgroundColor: Colors.background,
  },
});
