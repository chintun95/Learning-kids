import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  ImageBackground,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { responsive } from "@/utils/responsive";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useGameStore } from "@/lib/store/gameStore";

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

export default function GamesIndex() {
  const router = useRouter();

  const {
    startChildSession,
    setSessionDetails,
    exitedFlappyGame,
    exitedSnake,
    setExitedFlappyGame,
    setExitedSnake,
    endSession,
  } = useSessionStore();

  const { getCurrentScore, getHighScore, resetCurrentScore } = useGameStore();

  const currentChildId = useChildAuthStore((state) => state.currentChildId);

  /** ---------- Handle exited game detection ---------- **/
  useEffect(() => {
    const handleExitedGames = async () => {
      if (exitedFlappyGame) {
        console.log("🟡 Exited Flappy Bird detected — ending session...");
        const latestScore = Math.max(getCurrentScore(), getHighScore());
        setSessionDetails(`Played Flappy Bird; Score ${latestScore}`);

        await endSession();
        resetCurrentScore();
        setExitedFlappyGame(false);
      }

      if (exitedSnake) {
        console.log("🟢 Exited Snake detected — ending session...");
        const latestScore = Math.max(getCurrentScore(), getHighScore());
        setSessionDetails(`Played Snake; Score ${latestScore}`);

        await endSession();
        resetCurrentScore();
        setExitedSnake(false);
      }
    };

    handleExitedGames();
  }, [
    exitedFlappyGame,
    exitedSnake,
    endSession,
    setExitedFlappyGame,
    setExitedSnake,
    setSessionDetails,
    getCurrentScore,
    getHighScore,
    resetCurrentScore,
  ]);

  const handleClose = () => {
    router.back();
  };

  /** ---------- Game Selection Handler ---------- **/
  const handleSelectGame = (
    gameName: string,
    route: "/Games/Flappy" | "/Games/Snake"
  ) => {
    if (!currentChildId) {
      console.warn("⚠️ No child selected — cannot start game session.");
      return;
    }

    setExitedFlappyGame(false);
    setExitedSnake(false);

    startChildSession(currentChildId, "game");
    setSessionDetails(`Playing ${gameName}`);

    router.push(route);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      {/* Header background */}
      <View style={styles.headerBackground} />

      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* --- Header --- */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Select Game</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={responsive.isNarrowScreen ? 20 : 24}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        {/* --- Info Message --- */}
        <View style={styles.infoMessageWrapper}>
          <Text style={styles.infoMessage}>
            Questions only appear in games if a lesson or section is completed.
          </Text>
        </View>

        {/* --- Game Options --- */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gameGrid}>
            {/* --- Flappy Bird --- */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => handleSelectGame("Flappy Bird", "/Games/Flappy")}
            >
              <Image
                source={require("@/app/Games/assets/flappy.png")}
                style={styles.gameImage}
                resizeMode="contain"
              />
              <Text style={styles.gameTitle}>Flappy Bird</Text>
            </TouchableOpacity>

            {/* --- Snake --- */}
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => handleSelectGame("Snake", "/Games/Snake")}
            >
              <Image
                source={require("@/app/Games/assets/snake.png")}
                style={styles.gameImage}
                resizeMode="contain"
              />
              <Text style={styles.gameTitle}>Snake</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

/** ---------- Styles ---------- **/
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#fff" },

  background: { flex: 1, width: "100%", height: "100%" },
  backgroundImage: { transform: [{ scale: 1.2 }] },

  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: statusBarHeight + 40,
    backgroundColor: "rgba(217,217,217,0.85)",
    zIndex: 1,
  },

  headerBar: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderBottomColor: "#999",
    borderBottomWidth: 2,
    paddingTop: statusBarHeight * 0.4,
    paddingBottom: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.05,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },

  headerTitle: {
    color: "#000",
    fontSize: responsive.isNarrowScreen ? 18 : 22,
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },

  closeButton: {
    position: "absolute",
    right: responsive.screenWidth * 0.05,
    top: "50%",
    transform: [{ translateY: -responsive.screenHeight * 0.015 }],
    padding: 6,
  },
  infoMessageWrapper: { 
    width: "100%",
    alignItems: "center",
    paddingHorizontal: responsive.screenWidth * 0.08,
    marginTop: responsive.screenHeight * 0.02,
  },
  infoMessage: {
    textAlign: "center",
    fontSize: responsive.isNarrowScreen ? 14 : 16,
    fontFamily: "Fredoka-Medium",
    color: "#333",
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#999",
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: responsive.screenHeight * 0.05,
  },

  gameGrid: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    flexWrap: "wrap",
    width: "100%",
  },

  gameCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    borderColor: "#999",
    borderWidth: 2,
    margin: responsive.screenWidth * 0.04,
    padding: responsive.screenWidth * 0.04,
    width: responsive.screenWidth * 0.4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },

  gameImage: {
    width: "80%",
    height: responsive.screenHeight * 0.12,
    marginBottom: responsive.screenHeight * 0.01,
  },

  gameTitle: {
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.isNarrowScreen ? 14 : 16,
    color: "#000",
    textAlign: "center",
  },
});
