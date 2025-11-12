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
import { randomFoodPosition } from "../utils/randomFoodPosition";
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
  } = useGameStore();
  const { getCurrentChild } = useChildAuthStore();
  const { logs: questionLogs } = useQuestionLogStore();
  const { questions } = useQuestionStore();
  const { setExitedSnake } = useSessionStore();

  const router = useRouter();
  const currentChild = getCurrentChild();
  const highScore = getHighScore();

  /** ---------- Restore persisted current score on mount ---------- **/
  useEffect(() => {
    const savedScore = getCurrentScore();
    if (savedScore > 0) {
      console.log(`🎯 Restoring saved score: ${savedScore}`);
      setScore(savedScore);
    }
  }, []);

  /** ---------- Persist current score whenever it changes ---------- **/
  useEffect(() => {
    setCurrentScore(score);
  }, [score, setCurrentScore]);

  /** ---------- Debug log ---------- **/
  useEffect(() => {
    console.log("🧩 Question Logs:", questionLogs);
    console.log("🧠 QuestionBank Entries:", questions);
  }, [questionLogs, questions]);

  /** ---------- GAME LOOP ---------- **/
  useEffect(() => {
    if (!hasStarted || isGameOver) return;
    const intervalId = setInterval(() => {
      if (!isPaused) moveSnake();
    }, MOVE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [snake, isGameOver, isPaused, hasStarted]);

  /** ---------- GAME OVER CHECKS ---------- **/
  const isOutOfBounds = (head: Coordinate) =>
    head.x < GAME_BOUNDS.xMin ||
    head.x > GAME_BOUNDS.xMax ||
    head.y < GAME_BOUNDS.yMin ||
    head.y > GAME_BOUNDS.yMax;

  const hasSelfCollision = (head: Coordinate, body: Coordinate[]) =>
    body.some((segment) => segment.x === head.x && segment.y === head.y);

  /** ---------- MOVE ---------- **/
  const moveSnake = () => {
    const snakeHead = snake[0];
    const newHead = { ...snakeHead };

    switch (direction) {
      case Direction.Up:
        newHead.y -= 1;
        break;
      case Direction.Down:
        newHead.y += 1;
        break;
      case Direction.Left:
        newHead.x -= 1;
        break;
      case Direction.Right:
        newHead.x += 1;
        break;
    }

    if (isOutOfBounds(newHead) || hasSelfCollision(newHead, snake)) {
      console.log("💀 Game Over — collision or out of bounds!");
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

  /** ---------- FOOD EATEN ---------- **/
  const handleFoodEaten = () => {
    const isMystery = Math.random() < 0.25;
    setIsQuestionFood(isMystery);

    if (isMystery) {
      if (questionLogs.length > 0 && questions.length > 0) {
        const randomLog =
          questionLogs[Math.floor(Math.random() * questionLogs.length)];
        const matchedQuestion = questions.find(
          (q) => q.id === randomLog.completedquestion
        );

        if (matchedQuestion) {
          setCurrentQuestion(matchedQuestion);
          setSelectedAnswer(null);
          setIsPaused(true);
          setShowQuestionModal(true);
        } else {
          console.warn("⚠️ No matching question found for log.");
          setScore((prev) => prev + SCORE_INCREMENT);
          setFood(randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax));
        }
      } else {
        setScore((prev) => prev + SCORE_INCREMENT);
        setFood(randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax));
      }
    } else {
      setScore((prev) => prev + SCORE_INCREMENT);
      setFood(randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax));
    }
  };

  /** ---------- QUESTION HANDLING ---------- **/
  const handleSubmitAnswer = () => {
    if (!currentQuestion || selectedAnswer === null) return;

    const correctAnswer = currentQuestion.correctanswer?.trim().toLowerCase();
    const playerAnswer = selectedAnswer.trim().toLowerCase();

    setShowQuestionModal(false);

    if (playerAnswer === correctAnswer) {
      console.log("✅ Correct answer! Ending game.");
      setScore((prev) => prev + SCORE_INCREMENT * 2);
      setIsGameOver(true);
    } else {
      console.log("❌ Incorrect answer. Resuming in 3s...");
      setTimeout(() => setIsPaused(false), 3000);
    }
  };

  /** ---------- CONTROLS ---------- **/
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const { translationX, translationY } = event;
      if (Math.abs(translationX) > Math.abs(translationY)) {
        setDirection(translationX > 0 ? Direction.Right : Direction.Left);
      } else {
        setDirection(translationY > 0 ? Direction.Down : Direction.Up);
      }
    })
    .runOnJS(true);

  /** ---------- RELOAD / RESET ---------- **/
  const reloadGame = () => {
    setSnake(SNAKE_INITIAL_POSITION);
    setFood(randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax));
    setIsQuestionFood(false);
    setIsGameOver(false);
    setScore(0);
    resetCurrentScore(); // ✅ reset persisted current score
    setDirection(Direction.Right);
    setIsPaused(false);
    setHasStarted(false);
  };

  const pauseGame = () => setIsPaused((prev) => !prev);

  /** ---------- EXIT GAME ---------- **/
  const handleClose = () => {
    setHighScore(score);
    resetCurrentScore(); // ✅ clear persisted current score on exit
    setExitedSnake(true);
    router.back();
  };

  /** ---------- RENDER ---------- **/
  return (
    <GestureDetector gesture={panGesture}>
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <Header
          reloadGame={reloadGame}
          pauseGame={pauseGame}
          onClose={handleClose}
          isPaused={isPaused}
        >
          <View style={{ alignItems: "center" }}>
            <Score score={score} />
            <Text style={styles.highScoreText}>🏆 High: {highScore}</Text>
            {currentChild && (
              <Text style={styles.childName}>
                👤 {currentChild.firstName} {currentChild.lastName}
              </Text>
            )}
          </View>
        </Header>

        {/* START SCREEN */}
        {!hasStarted && !isGameOver && (
          <Pressable
            style={styles.startOverlay}
            onPress={() => setHasStarted(true)}
          >
            <Text style={styles.startTitle}>🐍 Snake Game</Text>
            <Text style={styles.rulesHeader}>How to Play:</Text>
            <Text style={styles.rulesText}>
              • Swipe up, down, left, or right to move the snake.
            </Text>
            <Text style={styles.rulesText}>• Eat 🟡 foods to gain points.</Text>
            <Text style={styles.rulesText}>
              • Avoid running into the walls or yourself.
            </Text>
            <Text style={styles.rulesText}>
              • Occasionally, a ❓ will appear — eat it to answer a question!
            </Text>
            <Text style={styles.rulesText}>
              • Choose the correct answer to win instantly.
            </Text>
            <Text style={styles.rulesText}>
              • If you answer incorrectly, the game resumes after 3 seconds.
            </Text>
            <Text style={styles.tapToStart}>👉 Tap anywhere to start!</Text>
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
        <Modal
          visible={showQuestionModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowQuestionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Answer the Question</Text>
              <Text style={styles.modalQuestion}>
                {currentQuestion?.question ?? "No question found."}
              </Text>

              {Array.isArray(currentQuestion?.answerchoices) &&
                currentQuestion.answerchoices.map(
                  (option: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedAnswer === option && styles.optionSelected,
                      ]}
                      onPress={() => setSelectedAnswer(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedAnswer === option &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  )
                )}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !selectedAnswer && { backgroundColor: "#ccc" },
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

/** ---------- STYLES ---------- **/
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
  childName: { fontSize: 14, color: "#666", marginTop: 4 },
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
  rulesHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 16,
    color: "#222",
    marginBottom: 5,
    textAlign: "center",
  },
  tapToStart: {
    fontSize: 18,
    color: "#4F46E5",
    marginTop: 20,
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
    borderColor: "#ccc",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  optionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: { fontSize: 16, color: "#333", textAlign: "center" },
  optionTextSelected: { color: "#fff", fontWeight: "bold" },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
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
  closeText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
