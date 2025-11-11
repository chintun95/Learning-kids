import React, { useRef, useState, useEffect } from "react";
import { View, Text } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { styles } from "./styles";

import { Start } from "./Start";
import { GameOver } from "./GameOver";
import { Physics } from "../../../utils/physics";
import entities from "../../../entities";
import { useGameStore } from "@/lib/store/gameStore";

interface GameEvent {
  type: string;
}

const Game: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  const gameEngineRef = useRef<GameEngine | null>(null);

  const {
    getHighScore,
    setHighScore,
    getCurrentScore,
    setCurrentScore,
    resetCurrentScore,
  } = useGameStore();

  /** ---------- Restore persisted current score on mount ---------- **/
  useEffect(() => {
    const savedScore = getCurrentScore();
    if (savedScore > 0) {
      console.log(`🎯 Restoring saved Flappy score: ${savedScore}`);
      setScore(savedScore);
    }
  }, []);

  /** ---------- Persist current score whenever it changes ---------- **/
  useEffect(() => {
    setCurrentScore(score);
  }, [score, setCurrentScore]);

  /** ---------- Event Handlers ---------- **/
  const handleBackToStart = (): void => {
    setIsRunning(false);
    setIsGameOver(false);
    setScore(0);
    resetCurrentScore(); // ✅ reset persisted current score
  };

  const handleOnStartGame = (): void => {
    setIsRunning(true);
    setIsGameOver(false);
    setScore(0);
    resetCurrentScore(); // ✅ clear current score at new start
  };

  const handleOnGameOver = (): void => {
    // Update high score before game resets
    setHighScore(score);
    resetCurrentScore(); // ✅ clear persisted current score on game over
    setIsRunning(false);
    setIsGameOver(true);
  };

  const handleOnEvent = (event: GameEvent): void => {
    switch (event.type) {
      case "game_over":
        handleOnGameOver();
        break;
      case "score":
        setScore((prev) => prev + 1);
        break;
    }
  };

  /** ---------- Conditional Screens ---------- **/
  if (!isRunning && !isGameOver) {
    return <Start handleOnStartGame={handleOnStartGame} />;
  }

  if (!isRunning && isGameOver) {
    const highScore = getHighScore();
    return (
      <GameOver
        handleBackToStart={handleBackToStart}
        score={score}
        highScore={highScore}
      />
    );
  }

  /** ---------- Main Game Engine ---------- **/
  return (
    <View style={{ flex: 1 }}>
      {/* 🏆 Score Display */}
      <Text
        style={{
          position: "absolute",
          top: 40,
          alignSelf: "center",
          fontSize: 36,
          fontFamily: "Fredoka-Bold",
          color: "#fff",
          zIndex: 10,
        }}
      >
        {score}
      </Text>

      <GameEngine
        systems={[Physics]}
        ref={gameEngineRef}
        running={isRunning}
        entities={entities()}
        onEvent={handleOnEvent}
        style={styles.engineContainer}
      />
    </View>
  );
};

export { Game };
