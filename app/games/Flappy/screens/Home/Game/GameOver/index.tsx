import React, { useEffect } from "react";
import { View, Image, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { styles } from "./styles";
import GAME_OVER from "../../../../assets/images/game-over.png";
import { useSessionStore } from "@/lib/store/sessionStore"; // ✅ Added

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
  const { setExitedFlappyGame } = useSessionStore(); // ✅ Use store

  useEffect(() => {
    const timer = setTimeout(() => {
      handleBackToStart();
    }, 3000);
    return () => clearTimeout(timer);
  }, [handleBackToStart]);

  /** ---------- Handle Quit ---------- **/
  const handleQuit = () => {
    setExitedFlappyGame(true); // ✅ Mark game as exited
    router.back(); // Navigate back to game selection screen
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

      {/* ✅ Quit Button */}
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
