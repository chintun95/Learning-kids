import { useSessionStore } from "@/lib/store/sessionStore";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Colors } from "../styles/colors";

interface HeaderProps {
  reloadGame: () => void;
  pauseGame: () => void;
  onClose: () => void;
  children: React.ReactNode;
  isPaused: boolean;
}

export default function Header({
  children,
  reloadGame,
  pauseGame,
  onClose,
  isPaused,
}: HeaderProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname(); // helps identify current route
  const { setExitedFlappyGame, setExitedSnake } = useSessionStore();

  /** ---------- Handle Close Press ---------- **/
  const handleClosePress = () => {
    // Determine which game is active based on route
    if (pathname.includes("Flappy")) {
      setExitedFlappyGame(true);
      console.log("🚪 Exiting Flappy game — session flagged as exited.");
    } else if (pathname.includes("Snake")) {
      setExitedSnake(true);
      console.log("🚪 Exiting Snake game — session flagged as exited.");
    }

    onClose();
    router.replace("/Games");
  };

  return (
    <View style={styles.container}>
      {/* 🔁 Restart Game */}
      <TouchableOpacity onPress={reloadGame}>
        <Ionicons name="reload-circle" size={35} color={Colors.primary} />
      </TouchableOpacity>

      {/* ⏸ Pause or ▶ Resume */}
      <TouchableOpacity onPress={pauseGame}>
        <FontAwesome
          name={isPaused ? "play-circle" : "pause-circle"}
          size={35}
          color={Colors.primary}
        />
      </TouchableOpacity>

      {/* ❌ Close Game */}
      <TouchableOpacity onPress={handleClosePress}>
        <Ionicons name="close-circle" size={35} color="#EF4444" />
      </TouchableOpacity>

      {/* 🧮 Score Display */}
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
