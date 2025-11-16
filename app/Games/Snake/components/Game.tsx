import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../styles/colors";
import { Coordinate, Direction } from "../types/types";
import { checkEatsFood } from "../utils/checkEatsFood";
import { generateSafeFoodPosition } from "../utils/randomFoodPosition";

import Header from "./Header";
import Score from "./Score";
import Snake from "./Snake";

// ---------- STORES ----------
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useGameStore } from "@/lib/store/gameStore";
import { useQuestionLogStore } from "@/lib/store/questionLogStore";
import { useQuestionStore } from "@/lib/store/questionStore";
import { useSessionStore } from "@/lib/store/sessionStore";

// ---------- CONSTANTS ----------
const SNAKE_INITIAL_POSITION = [{ x: 5, y: 5 }];
const FOOD_INITIAL_POSITION = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 35, yMin: 0, yMax: 63 };
const MOVE_INTERVAL = 50;
const SCORE_INCREMENT = 10;

export default function Game() {
  const router = useRouter();

  // 🟩 Child
  const childId = useChildAuthStore.getState().currentChildId;

  // 🟥 Prevent duplicated syncs
  const hasSyncedRef = useRef(false);

  // GAME STATE -----------------------------------------
  const [direction, setDirection] = useState(Direction.Right);
  const [snake, setSnake] = useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
  const [food, setFood] = useState<Coordinate>(FOOD_INITIAL_POSITION);

  const [isQuestionFood, setIsQuestionFood] = useState(false);
  const [score, setScore] = useState(0); // LOCAL SCORE ONLY
  const [points, setPointsLocal] = useState(0); // LOCAL POINTS ONLY
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // QUESTION
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // STORES (SYNC ONLY ON EXIT)
  const {
    getHighScore,
    setHighScore,
    setCurrentScore,
    setPoints: storeSetPoints,
    syncGameDataToSupabase,
  } = useGameStore();

  const { logs: questionLogs, fetchQuestionLogs } = useQuestionLogStore();
  const { questions, fetchQuestions } = useQuestionStore();
  const { setExitedSnake } = useSessionStore();

  // Load stored high score only
  const highScore = getHighScore("snake");

  // ----------------------------------------------------
  // INITIAL LOAD
  // ----------------------------------------------------
  useEffect(() => {
    fetchQuestions();
    fetchQuestionLogs();
  }, []);

  // ----------------------------------------------------
  // GAME LOOP
  // ----------------------------------------------------
  useEffect(() => {
    if (!hasStarted || isPaused || isGameOver || countdown !== null) return;

    const intervalId = setInterval(moveSnake, MOVE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [snake, direction, isPaused, isGameOver, hasStarted, countdown]);

  // ----------------------------------------------------
  // MOVEMENT
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // FOOD
  // ----------------------------------------------------
  const spawnNextFood = () => {
    const validQuestions =
      questions.length > 0 && questionLogs.length > 0 && Math.random() < 0.25;

    setIsQuestionFood(validQuestions);

    const nextFood = generateSafeFoodPosition(
      GAME_BOUNDS.xMax,
      GAME_BOUNDS.yMax,
      food,
      snake
    );

    setFood(nextFood);
  };

  const handleFoodEaten = () => {
    const qFood = isQuestionFood;
    setScore((s) => s + SCORE_INCREMENT);

    spawnNextFood();

    if (!qFood) return;

    const randomLog =
      questionLogs[Math.floor(Math.random() * questionLogs.length)];

    const q = questions.find((x) => x.id === randomLog.completedquestion);

    if (q) {
      setCurrentQuestion(q);
      setSelectedAnswer(null);
      setIsPaused(true);
      setShowQuestionModal(true);
    }
  };

  // ----------------------------------------------------
  // QUESTION LOGIC
  // ----------------------------------------------------
  const extractLetter = (str: string) => str.trim().charAt(0).toUpperCase();
  const getQuestionPoints = () => {
    const t = currentQuestion?.questiontype?.toLowerCase() ?? "";
    if (t === "medium") return 10;
    if (t === "hard") return 15;
    return 5;
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !selectedAnswer) return;

    const correct = extractLetter(currentQuestion.correctanswer);
    const player = extractLetter(selectedAnswer);

    setShowQuestionModal(false);

    if (correct === player) {
      setPointsLocal((p) => p + getQuestionPoints());
      setScore((s) => s + SCORE_INCREMENT);

      let t = 3;
      setCountdown(t);

      const timer = setInterval(() => {
        t -= 1;
        if (t <= 0) {
          clearInterval(timer);
          setCountdown(null);
          setIsPaused(false);
        } else {
          setCountdown(t);
        }
      }, 1000);
    } else {
      setIsGameOver(true);
    }
  };

  // ----------------------------------------------------
  // EXIT GAME → SYNC HERE ONLY
  // ----------------------------------------------------
  const handleClose = async () => {
    if (!childId) return;

    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;

      await setHighScore("snake", score);
      await setCurrentScore("snake", score);
      await storeSetPoints("snake", points);

      await syncGameDataToSupabase(childId, "snake");
    }

    setExitedSnake(true);
    router.back();
  };

  // ----------------------------------------------------
  // START GAME
  // ----------------------------------------------------
  const startGame = async () => {
    await fetchQuestions();
    await fetchQuestionLogs();

    const initialFood = generateSafeFoodPosition(
      GAME_BOUNDS.xMax,
      GAME_BOUNDS.yMax,
      FOOD_INITIAL_POSITION,
      SNAKE_INITIAL_POSITION
    );

    const allowQ = questions.length > 0 && questionLogs.length > 0;

    setFood(initialFood);
    setIsQuestionFood(allowQ && Math.random() < 0.25);

    setHasStarted(true);
  };

  // ----------------------------------------------------
  // GESTURE CONTROL
  // ----------------------------------------------------
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        setDirection(e.translationX > 0 ? Direction.Right : Direction.Left);
      } else {
        setDirection(e.translationY > 0 ? Direction.Down : Direction.Up);
      }
    })
    .runOnJS(true);

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------
  return (
    <GestureDetector gesture={panGesture}>
      <SafeAreaView style={styles.container}>
        <Header
          reloadGame={() => {
            setSnake([...SNAKE_INITIAL_POSITION]);
            setScore(0);
            setDirection(Direction.Right);
            setIsPaused(false);
            setIsGameOver(false);
            setHasStarted(false);
            setShowQuestionModal(false);
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
            <Text style={styles.tapToStart}>👉 Tap to Start</Text>
          </Pressable>
        )}

        {/* GAME */}
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
              <Text style={styles.modalTitle}>Answer the Question</Text>
              <Text style={styles.modalQuestion}>
                {currentQuestion?.question ?? ""}
              </Text>

              {Array.isArray(currentQuestion?.answerchoices) &&
                currentQuestion.answerchoices.map(
                  (opt: string, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedAnswer(opt)}
                      style={[
                        styles.optionButton,
                        selectedAnswer === opt && styles.optionSelected,
                      ]}
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
                disabled={!selectedAnswer}
                onPress={handleSubmitAnswer}
                style={[
                  styles.submitBtn,
                  !selectedAnswer && { backgroundColor: "#888" },
                ]}
              >
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* COUNTDOWN */}
        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        {/* GAME OVER */}
        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverText}>🏆 High: {highScore}</Text>
            <Text style={styles.gameOverText}>🎯 Score: {score}</Text>
            <Text style={styles.gameOverText}>⭐ Points: {points}</Text>

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
  pointsText: { fontSize: 14, color: "#444", marginTop: 4 },

  startOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  startTitle: { fontSize: 36, fontWeight: "bold", color: Colors.primary },
  tapToStart: { fontSize: 20, marginTop: 20, color: "#4F46E5" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  modalQuestion: { fontSize: 18, marginVertical: 15, color: "#111" },

  optionButton: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 6,
    paddingVertical: 12,
    marginBottom: 10,
  },
  optionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: { textAlign: "center", fontSize: 16, color: "#333" },
  optionTextSelected: { color: "#fff", fontWeight: "bold" },

  submitBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 6,
  },
  submitText: { color: "#fff", textAlign: "center", fontWeight: "700" },

  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownText: { fontSize: 80, fontWeight: "bold", color: "#fff" },

  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  gameOverTitle: { fontSize: 42, fontWeight: "bold", color: "#fff" },
  gameOverText: { fontSize: 24, color: "#FFD700" },

  closeButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
