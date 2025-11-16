import React, { useRef, useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { styles as engineStyles } from "./styles";

import { Start } from "./Start";
import { GameOver } from "./GameOver";
import entities from "../../../entities";
import { Physics } from "../../../utils/physics";

import { useGameStore } from "@/lib/store/gameStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useQuestionStore } from "@/lib/store/questionStore";
import { useQuestionLogStore } from "@/lib/store/questionLogStore";

interface GameEvent {
  type: string;
}

const Game: React.FC = () => {
  /* -----------------------------------------------------
     REFS
  ----------------------------------------------------- */
  const questionTimerRef = useRef<number | null>(null);
  const lastQuestionRef = useRef<number | null>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  const exitingRef = useRef(false); // 🔥 ensures sync runs ONCE ONLY

  /* -----------------------------------------------------
     GAME STATE
  ----------------------------------------------------- */
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);

  const [highScore, setLocalHighScore] = useState(0);

  const [showQuestion, setShowQuestion] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);

  /* -----------------------------------------------------
     STORES
  ----------------------------------------------------- */
  const childId = useChildAuthStore.getState().currentChildId;

  const {
    getHighScore,
    setHighScore,
    setCurrentScore,
    setPoints: storeSetPoints,
    syncGameDataToSupabase,
  } = useGameStore();

  const { questions } = useQuestionStore();
  const { logs: questionLogs } = useQuestionLogStore();

  /* -----------------------------------------------------
     LOAD HIGH SCORE ON MOUNT
  ----------------------------------------------------- */
  useEffect(() => {
    setLocalHighScore(getHighScore("flappy"));
  }, []);

  /* -----------------------------------------------------
     QUESTION HELPERS
  ----------------------------------------------------- */
  const getQuestionPoints = (q: any) => {
    const t = (q?.questiontype || "").toLowerCase();
    if (t === "medium") return 10;
    if (t === "hard") return 15;
    return 5;
  };

  const extractLetter = (str: string) => str.trim().charAt(0).toLowerCase();

  /* -----------------------------------------------------
     TRIGGER QUESTION EVERY 2 SCORE
  ----------------------------------------------------- */
  useEffect(() => {
    if (
      running &&
      !paused &&
      !gameOver &&
      score > 0 &&
      score % 2 === 0 &&
      countdown === null &&
      !showQuestion
    ) {
      if (questions.length === 0 || questionLogs.length === 0) return;
      if (lastQuestionRef.current === score) return;

      lastQuestionRef.current = score;

      let q: any = null;
      const log = questionLogs[Math.floor(Math.random() * questionLogs.length)];
      q = questions.find((x: any) => x.id === log.completedquestion);

      if (!q) q = questions[Math.floor(Math.random() * questions.length)];

      setQuestion(q);
      setSelectedAnswer(null);
      setPaused(true);
      setShowQuestion(true);
    }
  }, [
    score,
    running,
    paused,
    gameOver,
    countdown,
    showQuestion,
    questions,
    questionLogs,
  ]);

  /* -----------------------------------------------------
     SUBMIT ANSWER
  ----------------------------------------------------- */
  const submitAnswer = () => {
    if (!question || !selectedAnswer) return;

    const correct = extractLetter(question.correctanswer);
    const player = extractLetter(selectedAnswer);

    setShowQuestion(false);

    if (player === correct) {
      setPoints((p) => p + getQuestionPoints(question));

      setCountdown(3);
      let remain = 3;

      if (questionTimerRef.current) clearInterval(questionTimerRef.current);

      questionTimerRef.current = setInterval(() => {
        remain -= 1;

        if (remain <= 0) {
          clearInterval(questionTimerRef.current!);
          questionTimerRef.current = null;

          setCountdown(null);
          setPaused(false);
          setRunning(true);
        } else {
          setCountdown(remain);
        }
      }, 1000);
    } else {
      triggerGameOver();
    }
  };

  /* -----------------------------------------------------
     GAME OVER
  ----------------------------------------------------- */
  const triggerGameOver = () => {
    setRunning(false);
    setPaused(false);
    setGameOver(true);

    if (score > highScore) setLocalHighScore(score);

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
  };

  /* -----------------------------------------------------
     SAVE TO STORE → SYNC TO SUPABASE (ONCE ONLY)
  ----------------------------------------------------- */
  const saveAndSync = async () => {
    if (!childId) return;

    if (exitingRef.current) return;
    exitingRef.current = true; // mark as synced

    const finalHigh = Math.max(highScore, score);

    console.log("🟦 [SYNC] Writing to gameStore (local)...");
    await setHighScore("flappy", finalHigh);
    await setCurrentScore("flappy", score);
    await storeSetPoints("flappy", points);

    // ensure zustand writes flush
    await new Promise((r) => setTimeout(r, 50));

    console.log("🟥 [SYNC] Now syncing to Supabase...");
    await syncGameDataToSupabase(childId, "flappy");

    console.log("🟩 [SYNC COMPLETE] Supabase row updated.");
  };

  const handleBackToStart = async () => {
    await saveAndSync();

    setRunning(false);
    setPaused(false);
    setGameOver(false);

    setScore(0);
    setPoints(0);
    setShowQuestion(false);
    setSelectedAnswer(null);
    setQuestion(null);
    setCountdown(null);

    lastQuestionRef.current = null;
    exitingRef.current = false;
  };

  /* -----------------------------------------------------
     START GAME
  ----------------------------------------------------- */
  const startGame = () => {
    exitingRef.current = false;

    setRunning(true);
    setPaused(false);
    setGameOver(false);

    setScore(0);
    setPoints(0);
    setSelectedAnswer(null);
    setShowQuestion(false);

    lastQuestionRef.current = null;
    setLocalHighScore(getHighScore("flappy"));
  };

  /* -----------------------------------------------------
     EVENTS FROM PHYSICS
  ----------------------------------------------------- */
  const handleEvent = (e: GameEvent) => {
    if (e.type === "score" && running) setScore((s) => s + 1);
    if (e.type === "game_over") triggerGameOver();
  };

  /* -----------------------------------------------------
     UI SCREENS
  ----------------------------------------------------- */
  if (!running && !gameOver && !paused && countdown === null) {
    return <Start handleOnStartGame={startGame} />;
  }

  if (gameOver) {
    return (
      <GameOver
        handleBackToStart={handleBackToStart}
        score={score}
        highScore={highScore}
      />
    );
  }

  /* -----------------------------------------------------
     MAIN GAME UI
  ----------------------------------------------------- */
  return (
    <View style={{ flex: 1 }}>
      <Text style={stylesLocal.score}>{score}</Text>
      <Text style={stylesLocal.points}>⭐ {points}</Text>

      <GameEngine
        ref={gameEngineRef}
        running={running && !paused}
        systems={[Physics]}
        entities={entities()}
        onEvent={handleEvent}
        style={engineStyles.engineContainer}
      />

      {/* QUESTION MODAL */}
      <Modal visible={showQuestion} transparent>
        <View style={stylesLocal.modalOverlay}>
          <View style={stylesLocal.modalBox}>
            <Text style={stylesLocal.modalTitle}>Answer the Question</Text>
            <Text style={stylesLocal.modalQuestion}>{question?.question}</Text>

            {Array.isArray(question?.answerchoices) &&
              question.answerchoices.map((opt: string, i: number) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelectedAnswer(opt)}
                  style={[
                    stylesLocal.option,
                    selectedAnswer === opt && stylesLocal.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      stylesLocal.optionText,
                      selectedAnswer === opt && stylesLocal.optionTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}

            <TouchableOpacity
              disabled={!selectedAnswer}
              onPress={submitAnswer}
              style={[
                stylesLocal.submit,
                !selectedAnswer && { backgroundColor: "#999" },
              ]}
            >
              <Text style={stylesLocal.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {countdown !== null && (
        <View style={stylesLocal.countdownOverlay}>
          <Text style={stylesLocal.countdownText}>{countdown}</Text>
        </View>
      )}
    </View>
  );
};

/* -----------------------------------------------------
   STYLES
----------------------------------------------------- */
const stylesLocal = StyleSheet.create({
  score: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    fontSize: 42,
    color: "#fff",
    zIndex: 50,
    fontFamily: "Fredoka-Bold",
  },
  points: {
    position: "absolute",
    right: 20,
    top: 40,
    fontSize: 24,
    color: "#FFD700",
    zIndex: 50,
    fontFamily: "Fredoka-Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  modalQuestion: {
    fontSize: 18,
    marginVertical: 15,
    textAlign: "center",
    color: "#333",
  },
  option: {
    borderWidth: 1,
    borderColor: "#777",
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  optionText: {
    textAlign: "center",
    fontSize: 16,
    color: "#333",
  },
  optionTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  submit: {
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  submitText: {
    textAlign: "center",
    color: "#fff",
    fontFamily: "Fredoka-Bold",
    fontSize: 17,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownText: {
    fontSize: 70,
    color: "#fff",
    fontFamily: "Fredoka-Bold",
  },
});

export { Game };
