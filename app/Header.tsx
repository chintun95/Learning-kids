// app/Header.tsx
import React, { useEffect } from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { useTheme } from "@react-navigation/native";

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
  const { colors } = useTheme(); // colors.primary, colors.background, colors.border, colors.text

  useEffect(() => {
    if (isUpdatePending) {
      Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  return (
    <View
      style={[
        styles.container,
        { borderColor: colors.primary, backgroundColor: colors.background },
      ]}
    >
      {/* Left: Reset Button */}
      <TouchableOpacity onPress={reloadGame}>
        <Ionicons name="reload-circle" size={35} color={colors.primary} />
      </TouchableOpacity>

      {/* Center: Placeholder Profile Icon */}
      <View>
        <FontAwesome name="user-circle" size={35} color={colors.primary} />
      </View>

      {/* Right: Pause/Play Button */}
      <TouchableOpacity onPress={pauseGame}>
        <FontAwesome
          name={isPaused ? "play-circle" : "pause-circle"}
          size={35}
          color={colors.primary}
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
    borderWidth: 12,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomWidth: 0,
    padding: 15,
  },
});
