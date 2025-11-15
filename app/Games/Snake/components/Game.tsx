/** FULLY FIXED SNAKE GAME — NO ADJACENT QUESTION FOOD + CORRECT ANSWER LOGIC **/

import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Colors } from "../styles/colors";
import { Direction, Coordinate } from "../types/types";
import { checkEatsFood } from "../utils/checkEatsFood";
import { generateSafeFoodPosition } from "../utils/randomFoodPosition";

import Snake from "./Snake";
import Header from "./Header";
import Score from "./Score";

import { useGameStore } from "@/lib/store/gameStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useQuestionLogStore } from "@/lib/store/questionLogStore";
import { useQuestionStore } from "@/lib/store/questionStore";
import { useSessionStore } from "@/lib/store/sessionStore";

const SNAKE_INITIAL_POSITION = [{ x: 5, y: 5 }];
const FOOD_INITIAL_POSITION = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 35, yMin: 0, yMax: 63 };
const MOVE_INTERVAL = 50;
const SCORE_INCREMENT = 10;

export default function Game() {
  const [direction, setDirection] = useState(Direction.Right);
  const [snake, setSnake] = useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
  const [food, setFood] = useState<Coordinate>(FOOD_INITIAL_POSITION);
  const [isQuestionFood, setIsQuestionFood] = useState(false);

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Question modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Stores
  const {
    getHighScore,
    setHighScore,
    getCurrentScore,
    setCurrentScore,
    resetCurrentScore,
    getPoints,
    addPoints,
  } = useGameStore();

  const { logs: questionLogs } = useQuestionLogStore();
  const { questions } = useQuestionStore();
  const { setExitedSnake } = useSessionStore();
  const router = useRouter();

  const highScore = getHighScore();
  const points = getPoints();

  /** ------------------ DIFFICULTY → POINTS ------------------ **/
  const getQuestionPoints = () => {
    const t = currentQuestion?.questiontype?.toLowerCase() ?? "";
    if (t === "easy") return 5;
    if (t === "medium") return 10;
    if (t === "hard") return 15;
    return 5;
  };

  /** ------------------ RESTORE SCORE ------------------ **/
  useEffect(() => {
    const saved = getCurrentScore();
    if (saved > 0) setScore(saved);
  }, []);

  useEffect(() => {
    setCurrentScore(score);
  }, [score]);

  /** ------------------ GAME LOOP (direction added) ------------------ **/
  useEffect(() => {
    if (!hasStarted || isPaused || isGameOver) return;

    const id = setInterval(() => moveSnake(), MOVE_INTERVAL);
    return () => clearInterval(id);
  }, [snake, direction, isPaused, isGameOver, hasStarted]);

  /** ------------------ MOVEMENT ------------------ **/
  const moveSnake = () => {
    const head = snake[0];
    const newHead = { ...head };

    if (direction === Direction.Up) newHead.y -= 1;
    if (direction === Direction.Down) newHead.y += 1;
    if (direction === Direction.Left) newHead.x -= 1;
    if (direction === Direction.Right) newHead.x += 1;

    const hitWall =
      newHead.x < GAME_BOUNDS.xMin ||
      newHead.x > GAME_BOUNDS.xMax ||
      newHead.y < GAME_BOUNDS.yMin ||
      newHead.y > GAME_BOUNDS.yMax;

    const hitSelf = snake.some(
      (seg) => seg.x === newHead.x && seg.y === newHead.y
    );

    if (hitWall || hitSelf) {
      setIsGameOver(true);
      return;
    }

    if (checkEatsFood(newHead, food, 2)) {
      handleFoodEaten();
      setSnake([newHead, ...snake]);
    } else {
      setSnake([newHead, ...snake.slice(0, -1)]);
    }
  };

  /** ------------------ FOOD + SAFE SPAWN ------------------ **/
  const handleFoodEaten = () => {
    const mystery = Math.random() < 0.25;
    setIsQuestionFood(mystery);

    if (mystery && questionLogs.length > 0) {
      const randomLog =
        questionLogs[Math.floor(Math.random() * questionLogs.length)];
      const q = questions.find((k) => k.id === randomLog.completedquestion);

      if (q) {
        setCurrentQuestion(q);
        setSelectedAnswer(null);
        setIsPaused(true);
        setShowQuestionModal(true);
        return;
      }
    }

    // normal food
    setScore((s) => s + SCORE_INCREMENT);
    setFood(
      generateSafeFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax, food, snake)
    );
  };

  /** ------------------ FIXED ANSWER LOGIC ------------------ **/
  const extractLetter = (ans: string): string => {
    // "A. Crawl low" → "A"
    return ans.trim().charAt(0).toUpperCase();
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !selectedAnswer) return;

    const correctLetter = currentQuestion.correctanswer.trim().toUpperCase();
    const playerLetter = extractLetter(selectedAnswer);

    setShowQuestionModal(false);

    if (playerLetter === correctLetter) {
      // CORRECT!
      addPoints(getQuestionPoints());
      setIsPaused(false);
      setScore((s) => s + SCORE_INCREMENT);
    } else {
      // WRONG
      setIsGameOver(true);
    }
  };

  /** ------------------ CONTROLS ------------------ **/
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        setDirection(e.translationX > 0 ? Direction.Right : Direction.Left);
      } else {
        setDirection(e.translationY > 0 ? Direction.Down : Direction.Up);
      }
    })
    .runOnJS(true);

  /** ------------------ EXIT GAME ------------------ **/
  const handleClose = () => {
    setHighScore(score);
    resetCurrentScore();
    setExitedSnake(true);
    router.back();
  };

  /** ------------------ START GAME ------------------ **/
  const startGame = () => {
    setFood(
      generateSafeFoodPosition(
        GAME_BOUNDS.xMax,
        GAME_BOUNDS.yMax,
        FOOD_INITIAL_POSITION,
        SNAKE_INITIAL_POSITION
      )
    );
    setHasStarted(true);
  };

  /** ------------------ UI ------------------ **/
  return (
    <GestureDetector gesture={panGesture}>
      <SafeAreaView style={styles.container}>
        <Header
          reloadGame={() => {
            setSnake([...SNAKE_INITIAL_POSITION]);
            setFood(
              generateSafeFoodPosition(
                GAME_BOUNDS.xMax,
                GAME_BOUNDS.yMax,
                FOOD_INITIAL_POSITION,
                SNAKE_INITIAL_POSITION
              )
            );
            setScore(0);
            resetCurrentScore();
            setDirection(Direction.Right);
            setIsPaused(false);
            setIsGameOver(false);
            setHasStarted(false);
          }}
          pauseGame={() => setIsPaused((p) => !p)}
          onClose={handleClose}
          isPaused={isPaused}
        >
          <View style={{ alignItems: "center" }}>
            <Score score={score} />
            <Text style={styles.highScoreText}>🏆 High: {highScore}</Text>
            <Text style={styles.pointsText}>⭐ Points: {points}</Text>
          </View>
        </Header>

        {/* START SCREEN */}
        {!hasStarted && !isGameOver && (
          <Pressable style={styles.startOverlay} onPress={startGame}>
            <Text style={styles.startTitle}>🐍 Snake Game</Text>

            <Text style={styles.rulesHeader}>How to Play:</Text>
            <Text style={styles.rulesText}>• Swipe to move the snake.</Text>
            <Text style={styles.rulesText}>• Eat 🟡 to gain points.</Text>
            <Text style={styles.rulesText}>• Eat ❓ to answer a question.</Text>
            <Text style={styles.rulesText}>✔️ Correct → Continue + Bonus</Text>
            <Text style={styles.rulesText}>❌ Wrong → Game Over</Text>

            <Text style={styles.tapToStart}>👉 Tap to Start</Text>
          </Pressable>
        )}

        {/* GAME AREA */}
        {hasStarted && (
          <View style={styles.boundaries}>
            <Snake snake={snake} />

            <Text
              style={[styles.foodItem, { top: food.y * 10, left: food.x * 10 }]}
            >
              {isQuestionFood ? "❓" : "🟡"}
            </Text>
          </View>
        )}

        {/* QUESTION MODAL */}
        <Modal visible={showQuestionModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Answer</Text>
              <Text style={styles.modalQuestion}>
                {currentQuestion?.question}
              </Text>

              {Array.isArray(currentQuestion?.answerchoices) &&
                currentQuestion.answerchoices.map(
                  (opt: string, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.optionButton,
                        selectedAnswer === opt && styles.optionSelected,
                      ]}
                      onPress={() => setSelectedAnswer(opt)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedAnswer === opt && styles.optionTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  )
                )}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !selectedAnswer && { backgroundColor: "#777" },
                ]}
                onPress={handleSubmitAnswer}
                disabled={!selectedAnswer}
              >
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* GAME OVER */}
        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverText}>Game Over</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeText}>Exit Game</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureDetector>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  boundaries: {
    flex: 1,
    borderColor: Colors.primary,
    borderWidth: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: Colors.background,
  },
  foodItem: { position: "absolute", fontSize: 16 },
  highScoreText: { fontSize: 16, fontWeight: "600", color: Colors.primary },
  pointsText: { fontSize: 14, color: "#666", marginTop: 4 },
  startOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  startTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 20,
  },
  rulesHeader: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  rulesText: { fontSize: 16, color: "#222", marginBottom: 5 },
  tapToStart: {
    marginTop: 20,
    fontSize: 18,
    color: "#4F46E5",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalQuestion: { fontSize: 16, marginBottom: 15, textAlign: "center" },
  optionButton: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  optionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: { fontSize: 16, textAlign: "center", color: "#333" },
  optionTextSelected: { color: "#fff", fontWeight: "bold" },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  submitText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  gameOverText: {
    fontSize: 36,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
