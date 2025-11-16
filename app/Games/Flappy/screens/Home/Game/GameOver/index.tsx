import React, { useEffect } from "react";
import { View, Image, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { styles } from "./styles";
import GAME_OVER from "../../../../assets/images/game-over.png";

import { useSessionStore } from "@/lib/store/sessionStore";
import { useGameStore } from "@/lib/store/gameStore";

/** ---------- Props ---------- **/
interface GameOverProps {
  handleBackToStart: () => void;
  score: number;
  highScore: number;
}

/** ---------- Component ---------- **/
const GameOver: React.FC<GameOverProps> = ({
  handleBackToStart,
  score,
  highScore,
}) => {
  const router = useRouter();
  const { setExitedFlappyGame } = useSessionStore();

  /** ⭐ Retrieve total points for THIS CHILD for THIS GAME */
  const totalPoints = useGameStore((state) => state.getPoints("flappy"));

  /** ---------- Auto-return after 3 seconds ---------- **/
  useEffect(() => {
    const timer = setTimeout(() => {
      handleBackToStart();
    }, 3000);
    return () => clearTimeout(timer);
  }, [handleBackToStart]);

  /** ---------- Quit Game ---------- **/
  const handleQuit = () => {
    setExitedFlappyGame(true);
    router.replace("/Games");
  };

  return (
    <View style={styles.container}>
      <Image source={GAME_OVER} style={styles.logo} />

      <Text
        style={{
          marginTop: 20,
          fontSize: 36,
          fontFamily: "Fredoka-Bold",
          color: "#FFD700",
        }}
      >
        High Score: {highScore}
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontSize: 28,
          fontFamily: "Fredoka-Bold",
          color: "#fff",
        }}
      >
        Your Score: {score}
      </Text>

      {/* ⭐ Updated: Show points for FLAPPY only */}
      <Text
        style={{
          marginTop: 8,
          fontSize: 24,
          fontFamily: "Fredoka-SemiBold",
          color: "#00FFAA",
        }}
      >
        ⭐ Points Earned: {totalPoints}
      </Text>

      {/* Quit Button */}
      <TouchableOpacity onPress={handleQuit}>
        <Text
          style={{
            marginTop: 25,
            fontSize: 20,
            color: "#FF5555",
            fontFamily: "Fredoka-SemiBold",
            textDecorationLine: "underline",
          }}
        >
          Quit
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export { GameOver };
