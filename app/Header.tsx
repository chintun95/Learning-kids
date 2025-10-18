// app/Header.tsx
import React, { useEffect } from "react";
import { TouchableOpacity, StyleSheet, View, Text } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { useTheme } from "@react-navigation/native";

export interface HeaderProps {
  reloadGame: () => void;
  pauseGame: () => void;
  openSettings?: () => void;
  children?: React.ReactNode;     // ← was JSX.Element; make optional & flexible
  isPaused: boolean;
}

export default function Header({
  children,
  reloadGame,
  openSettings,
  pauseGame,
  isPaused,
}: HeaderProps): JSX.Element {
  const { isUpdatePending } = Updates.useUpdates();
  const { colors } = useTheme();

  useEffect(() => {
    if (isUpdatePending) {
      Updates.reloadAsync().catch(() => {});
    }
  }, [isUpdatePending]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Left: Reset */}
      <TouchableOpacity
        onPress={reloadGame}
        accessibilityRole="button"
        accessibilityLabel="Restart"
      >
        <Ionicons name="reload-circle" size={28} color={colors.primary} />
      </TouchableOpacity>

      {/* Middle: Title / HUD slot */}
      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.text }]}>Snake</Text>
        {/* Children HUD (score, lives, mode, etc.) */}
        {!!children && <View style={styles.hudRow}>{children}</View>}
      </View>

      {/* Right: Pause / Settings */}
      <View style={styles.right}>
        {openSettings && (
          <TouchableOpacity
            onPress={openSettings}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={pauseGame}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? "Resume" : "Pause"}
        >
          <FontAwesome
            name={isPaused ? "play-circle" : "pause-circle"}
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",


    // Optional: subtle bottom divider to separate from board
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  center: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
  hudRow: { marginTop: 6, flexDirection: "row", alignItems: "center" },
  right: { flexDirection: "row", alignItems: "center" },
  iconBtn: { marginLeft: 8 },
});
