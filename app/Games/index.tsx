// app/Games/index.tsx
import { responsive } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import {
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useGameStore } from "@/lib/store/gameStore";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useChildAchievementStore } from "@/lib/store/childAchievementStore";
import { supabase } from "@/lib/supabase";

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

export default function GamesIndex() {
  const router = useRouter();

  /** ----------------------------------------------------------
   * SESSION STORE
   ---------------------------------------------------------- */
  const {
    startChildSession,
    setSessionDetails,
    exitedFlappyGame,
    exitedSnake,
    setExitedFlappyGame,
    setExitedSnake,
    endSession,
  } = useSessionStore();

  /** ----------------------------------------------------------
   * GAME STORE
   ---------------------------------------------------------- */
  const { getHighScore, getPoints, resetCurrentScore } = useGameStore();

  const currentChildId = useChildAuthStore((state) => state.currentChildId);

  /** ----------------------------------------------------------
   * ACHIEVEMENTS STORE
   ---------------------------------------------------------- */
  const { allAchievements, achievementsByChild, fetchChildAchievements } =
    useChildAchievementStore();

  /** ----------------------------------------------------------
   * ADD ACHIEVEMENT ONCE
   ---------------------------------------------------------- */
  const addAchievementOnce = useCallback(
    async (achievementTitle: string) => {
      if (!currentChildId) return;

      if (!achievementsByChild[currentChildId]) {
        await fetchChildAchievements(currentChildId);
      }

      const childAchievements = achievementsByChild[currentChildId] ?? [];

      const achievement = allAchievements.find(
        (a) => a.title === achievementTitle
      );
      if (!achievement) return;

      const alreadyHas = childAchievements.some(
        (a) => a.achievement?.id === achievement.id
      );
      if (alreadyHas) return;

      await supabase.from("ChildAchievement").insert({
        achievementearned: achievement.id,
        childid: currentChildId,
        dateearned: new Date().toISOString(),
      });
    },
    [
      currentChildId,
      allAchievements,
      achievementsByChild,
      fetchChildAchievements,
    ]
  );

  /** ----------------------------------------------------------
   * HANDLE EXITED GAMES
   ---------------------------------------------------------- */
  useEffect(() => {
    const handleExitedGames = async () => {
      if (exitedFlappyGame) {
        const latestHigh = getHighScore("flappy");
        const points = getPoints("flappy");

        setSessionDetails(
          `Played Flappy Bird — Score ${latestHigh}, Points ${points}`
        );
        await endSession();
        resetCurrentScore("flappy");
        setExitedFlappyGame(false);
      }

      if (exitedSnake) {
        const latestHigh = getHighScore("snake");
        const points = getPoints("snake");

        setSessionDetails(
          `Played Snake — Score ${latestHigh}, Points ${points}`
        );
        await endSession();
        resetCurrentScore("snake");
        setExitedSnake(false);
      }
    };

    handleExitedGames();
  }, [
    exitedFlappyGame,
    exitedSnake,
    getHighScore,
    getPoints,
    resetCurrentScore,
    endSession,
    setExitedFlappyGame,
    setExitedSnake,
    setSessionDetails,
  ]);

  const handleClose = () => router.back();

  /** ----------------------------------------------------------
   * SELECT GAME
   ---------------------------------------------------------- */
  const handleSelectGame = async (
    gameName: string,
    route: "/Games/Flappy" | "/Games/Snake" | "/Games/Fruit-Ninja/FruitNinja"
  ) => {
    if (!currentChildId) return;

    setExitedFlappyGame(false);
    setExitedSnake(false);

    if (gameName === "Snake") {
      await addAchievementOnce("First Time Playing Snake");
    } else if (gameName === "Flappy Bird") {
      await addAchievementOnce("First Time Playing Flappy Bird");
    }

    startChildSession(currentChildId, "game");
    setSessionDetails(`Playing ${gameName}`);

    router.push(route);
  };

  /** ----------------------------------------------------------
   * UI
   ---------------------------------------------------------- */
  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      <View style={styles.headerBackground} />

      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* ---------- HEADER ---------- */}
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

        <View style={styles.infoMessageWrapper}>
          <Text style={styles.infoMessage}>
            Questions only appear in games if a lesson or section is completed.
          </Text>
        </View>

        {/* ---------- GAME CARDS ---------- */}
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

          <TouchableOpacity
            style={[styles.gameCard, { alignSelf: "center", marginTop: 20 }]}
            onPress={() =>
              handleSelectGame("Fruit Ninja", "/Games/Fruit-Ninja/FruitNinja")
            }
          >
            <Image
              source={require("@/app/Games/assets/watermelon.png")}
              style={[
                styles.gameImage,
                { height: responsive.screenHeight * 0.14 },
              ]}
              resizeMode="contain"
            />
            <Text style={styles.gameTitle}>Fruit Ninja</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

/* ----------------------------------------------------------
 *  STYLES
 * --------------------------------------------------------- */
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
