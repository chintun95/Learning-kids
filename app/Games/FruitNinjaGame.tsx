// app/Games/FruitNinjaGame.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  Animated,
  PanResponder,
  Pressable,
  Easing,
  TouchableOpacity,
} from "react-native";
import { getAuth } from 'firebase/auth';
import { supabase } from '../../backend/supabase';
import { fetchQuestions, Question } from '../../backend/fetchquestions';
import { useChild } from '../ChildContext';

const { width, height } = Dimensions.get("window");

const FRUIT_EMOJIS = ["🍎", "🍌", "🍉", "🍓", "🍊", "🍒"];
const FRUIT_SIZE = 64;
const HALF = FRUIT_SIZE / 2;
const HITBOX = FRUIT_SIZE * 0.9;

const ROUND_SECONDS = 30;
const BASE_SPAWN_MS = 1000;
const MIN_SPAWN_MS = 650;
const EDGE_PADDING = 24;
const OFFSCREEN_Y = height + 160;
const MAX_FRUITS_ON_SCREEN = 7;

const START_Y_MIN = height * 0.62;
const START_Y_MAX = height * 0.82;
const PEAK_Y_MIN = height * 0.18;
const PEAK_Y_MAX = height * 0.32;

type LaunchPattern = "bottomUp" | "leftToRight" | "rightToLeft" | "diagUpRight" | "diagUpLeft";
type Vec2 = { x: number; y: number };

interface Fruit {
  id: number;
  x: Animated.Value;  // top-left (render)
  y: Animated.Value;
  currentX: number;   // center (hit-test)
  currentY: number;
  progress: Animated.Value;
  scale: Animated.Value;
  fade: Animated.Value;
  p0: Vec2; p1: Vec2; p2: Vec2;
  driftAmp: number;
  driftFreq: number;
  emoji: string;
  sliced: boolean;
}

interface EffectBurst { id: number; x: number; y: number; }

export default function FruitNinjaGame() {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const { selectedChild } = useChild();

  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [effects, setEffects] = useState<EffectBurst[]>([]);
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [isRunning, setIsRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  // Question system
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isQuestionVisible, setIsQuestionVisible] = useState(false);
  const [fruitsSliced, setFruitsSliced] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState<{ icon: string; text: string; correctAnswer?: string } | null>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  const nextFruitId = useRef(0);
  const nextEffectId = useRef(0);

  const fruitsRef = useRef<Fruit[]>([]);
  const slicingIds = useRef<Set<number>>(new Set());
  const rafSlice = useRef<number | null>(null);
  const spawnTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeLeftRef = useRef(timeLeft);
  const isRunningRef = useRef(isRunning);
  const gameOverRef = useRef(gameOver);

  useEffect(() => { fruitsRef.current = fruits; }, [fruits]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  // Load questions on mount
  useEffect(() => {
    if (uid && selectedChild) {
      console.log('Fruit Ninja: Loading questions for uid:', uid, 'child:', selectedChild.id);
      fetchQuestions(uid, selectedChild.id).then((questions) => {
        console.log('Fruit Ninja: Loaded questions:', questions.length);
        setAllQuestions(questions);
        setAvailableQuestions(questions);
      }).catch((err) => console.error('Failed to load questions:', err));
    }
  }, [uid, selectedChild]);

  useEffect(() => () => {
    if (rafSlice.current) cancelAnimationFrame(rafSlice.current);
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
  }, []);

  // slice (why: prevent double-slice + remove cleanly)
  const sliceFruit = useCallback((fruit: Fruit) => {
    if (slicingIds.current.has(fruit.id) || fruit.sliced) return;
    slicingIds.current.add(fruit.id);

    setScore((s) => s + 1);
    spawnEffect(fruit.currentX, fruit.currentY);
    setFruits((prev) => prev.map((f) => (f.id === fruit.id ? { ...f, sliced: true } : f)));

    Animated.parallel([
      Animated.sequence([
        Animated.timing(fruit.scale, { toValue: 1.25, duration: 110, useNativeDriver: false }),
        Animated.timing(fruit.scale, { toValue: 0.1, duration: 200, useNativeDriver: false }),
      ]),
      Animated.timing(fruit.fade, { toValue: 0, duration: 230, useNativeDriver: false }),
    ]).start(() => {
      setFruits((curr) => curr.filter((f) => f.id !== fruit.id));
      slicingIds.current.delete(fruit.id);
    });

    // Check for question after state updates
    setFruitsSliced((count) => {
      const newCount = count + 1;
      console.log('Fruit Ninja: Fruits sliced:', newCount);
      // Show question every 5 fruits
      if (newCount % 5 === 0) {
        console.log('Fruit Ninja: Triggering question check at 5 fruits');
        setAvailableQuestions((prevQuestions) => {
          console.log('Fruit Ninja: Available questions:', prevQuestions.length);
          if (prevQuestions.length > 0) {
            setIsQuestionVisible((prevVisible) => {
              console.log('Fruit Ninja: Is question already visible?', prevVisible);
              if (!prevVisible) {
                const randomIndex = Math.floor(Math.random() * prevQuestions.length);
                const questionToAsk = prevQuestions[randomIndex];
                console.log('Fruit Ninja: Showing question:', questionToAsk.question);
                setCurrentQuestion(questionToAsk);
                setIsRunning(false);
                setAvailableQuestions(prevQuestions.filter((_, index) => index !== randomIndex));
                return true;
              }
              return prevVisible;
            });
          }
          return prevQuestions;
        });
      }
      return newCount;
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, g) => {
        if (!isRunning || gameOver) return;
        const { moveX, moveY } = g;
        if (rafSlice.current != null) return;
        rafSlice.current = requestAnimationFrame(() => {
          rafSlice.current = null;
          const candidates = fruitsRef.current;
          for (let i = 0; i < candidates.length; i++) {
            const f = candidates[i];
            if (
              !f.sliced &&
              !slicingIds.current.has(f.id) &&
              Math.abs(f.currentX - moveX) < HITBOX &&
              Math.abs(f.currentY - moveY) < HITBOX
            ) { sliceFruit(f); }
          }
        });
      },
    })
  ).current;

  // timer
  useEffect(() => {
    if (!isRunning || gameOver) return;
    const t = setInterval(() => {
      setTimeLeft((sec) => {
        if (sec <= 1) { clearInterval(t); endGame(); return 0; }
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning, gameOver]);

  // spawner
  useEffect(() => {
    if (!isRunning || gameOver) return;
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      const progress = 1 - timeLeftRef.current / ROUND_SECONDS;
      const ms = Math.max(MIN_SPAWN_MS, Math.round(BASE_SPAWN_MS - (BASE_SPAWN_MS - MIN_SPAWN_MS) * progress));
      spawnTimeout.current = setTimeout(loop, ms);
    };

    const loop = () => {
      if (!isRunningRef.current || gameOverRef.current) return;
      if (fruitsRef.current.length < MAX_FRUITS_ON_SCREEN) spawnFruit();
      scheduleNext();
    };

    spawnFruit();
    spawnTimeout.current = setTimeout(loop, 350);

    return () => { cancelled = true; if (spawnTimeout.current) clearTimeout(spawnTimeout.current); };
  }, [isRunning, gameOver]);

  const endGame = () => {
    setIsRunning(false);
    setGameOver(true);
    setHiScore((h) => Math.max(h, score));
  };

  const resetGame = () => {
    setFruits([]); setEffects([]); slicingIds.current.clear();
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
    setScore(0); setTimeLeft(ROUND_SECONDS); setGameOver(false); setIsRunning(true);
    setFruitsSliced(0);
    setAvailableQuestions(allQuestions);
    setIsQuestionVisible(false);
    setCurrentQuestion(null);
  };

  // Answer question handler
  const answerQuestion = async (selectedOptionKey: string) => {
    if (isAnswering || !currentQuestion || !currentQuestion.options) return;
    setIsAnswering(true);

    const isCorrect = selectedOptionKey === currentQuestion.correct_answer;

    // Log answer to database
    if (uid && selectedChild?.id && currentQuestion) {
      await supabase.from('answer_log').insert({
        user_id: uid,
        child_id: selectedChild.id,
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        game_name: 'Fruit Ninja',
      });
    }

    // Set feedback based on correctness
    if (isCorrect) {
      setScore((s) => s + 25);
      setFeedbackContent({ icon: '🎉👍', text: 'Great job!', correctAnswer: undefined });
    } else {
      const correctAnswerText = currentQuestion.options[currentQuestion.correct_answer];
      setFeedbackContent({
        icon: '❌',
        text: 'Incorrect',
        correctAnswer: `Correct answer: ${currentQuestion.correct_answer.toUpperCase()}: ${correctAnswerText}`,
      });
    }

    // Hide question UI immediately
    setIsQuestionVisible(false);

    // Show feedback animation
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setFeedbackContent(null);
      setCurrentQuestion(null);
      setIsAnswering(false);
      setIsRunning(true);
    });
  };

  // arcs
  const choosePattern = (): LaunchPattern => {
    const r = Math.random();
    if (r < 0.35) return "bottomUp";
    if (r < 0.55) return "leftToRight";
    if (r < 0.75) return "rightToLeft";
    if (r < 0.88) return "diagUpRight";
    return "diagUpLeft";
  };
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  const makePath = (pattern: LaunchPattern): {
    p0: Vec2; p1: Vec2; p2: Vec2;
    riseMs: number; holdMs: number; fallMs: number;
  } => {
    const startY = rand(START_Y_MIN, START_Y_MAX);
    const peakY = rand(PEAK_Y_MIN, PEAK_Y_MAX);
    const wobble = (Math.random() - 0.5) * 100;
    const riseMs = rand(650, 900);
    const holdMs = rand(120, 220);
    const fallMs = rand(740, 980);

    if (pattern === "bottomUp") {
      const startX = rand(EDGE_PADDING, width - EDGE_PADDING);
      return { p0: { x: startX, y: startY }, p1: { x: startX + wobble, y: peakY }, p2: { x: startX + wobble * 1.4, y: OFFSCREEN_Y }, riseMs, holdMs, fallMs };
    }
    if (pattern === "leftToRight") {
      const p0 = { x: -EDGE_PADDING, y: startY };
      const midX = width * 0.45 + Math.random() * width * 0.25;
      const p1 = { x: midX, y: peakY };
      const p2 = { x: width + EDGE_PADDING * 2, y: OFFSCREEN_Y };
      return { p0, p1, p2, riseMs, holdMs, fallMs };
    }
    if (pattern === "rightToLeft") {
      const p0 = { x: width + EDGE_PADDING, y: startY };
      const midX = width * 0.55 - Math.random() * width * 0.25;
      const p1 = { x: midX, y: peakY };
      const p2 = { x: -EDGE_PADDING * 2, y: OFFSCREEN_Y };
      return { p0, p1, p2, riseMs, holdMs, fallMs };
    }
    if (pattern === "diagUpRight") {
      const p0 = { x: -EDGE_PADDING, y: rand(START_Y_MIN, START_Y_MAX) };
      const p1 = { x: width * 0.45, y: peakY };
      const p2 = { x: width + EDGE_PADDING * 2, y: OFFSCREEN_Y };
      return { p0, p1, p2, riseMs, holdMs, fallMs };
    }
    const p0 = { x: width + EDGE_PADDING, y: rand(START_Y_MIN, START_Y_MAX) };
    const p1 = { x: width * 0.55, y: peakY };
    const p2 = { x: -EDGE_PADDING * 2, y: OFFSCREEN_Y };
    return { p0, p1, p2, riseMs, holdMs, fallMs };
  };

  const quadBezier = (t: number, p0: Vec2, p1: Vec2, p2: Vec2): Vec2 => {
    const u = 1 - t, uu = u * u, tt = t * t;
    return { x: uu * p0.x + 2 * u * t * p1.x + tt * p2.x, y: uu * p0.y + 2 * u * t * p1.y + tt * p2.y };
  };

  const apexT = (p0y: number, p1y: number, p2y: number) => {
    const denom = p0y - 2 * p1y + p2y;
    if (Math.abs(denom) < 1e-6) return 0.5;
    const t = (p0y - p1y) / denom;
    return Math.max(0.05, Math.min(0.95, t));
  };

  // spawn
  const spawnFruit = () => {
    const id = nextFruitId.current++;
    const pattern = choosePattern();
    const { p0, p1, p2, riseMs, holdMs, fallMs } = makePath(pattern);

    const progress = new Animated.Value(0);
    const x = new Animated.Value(p0.x - HALF);
    const y = new Animated.Value(p0.y - HALF);

    const driftAmp = rand(10, 22);
    const driftFreq = rand(0.8, 1.6);

    const fruit: Fruit = {
      id, x, y,
      currentX: p0.x, currentY: p0.y,
      progress,
      scale: new Animated.Value(0.88),
      fade: new Animated.Value(0),
      p0, p1, p2,
      driftAmp, driftFreq,
      emoji: FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)],
      sliced: false,
    };

    setFruits((prev) => [...prev, fruit]);

    const sub = progress.addListener(({ value }) => {
      const pos = quadBezier(value, fruit.p0, fruit.p1, fruit.p2);
      const drift = Math.sin(value * Math.PI * 2 * fruit.driftFreq) * fruit.driftAmp;
      const cx = pos.x + drift;
      const cy = pos.y;
      fruit.currentX = cx;
      fruit.currentY = cy;
      fruit.x.setValue(cx - HALF);
      fruit.y.setValue(cy - HALF);
    });

    Animated.timing(fruit.fade, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    Animated.timing(fruit.scale, { toValue: 1, duration: 200, easing: Easing.out(Easing.back(1.2)), useNativeDriver: false }).start();

    const tStar = apexT(p0.y, p1.y, p2.y);
    Animated.sequence([
      Animated.timing(progress, { toValue: tStar, duration: riseMs, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.delay(holdMs),
      Animated.timing(progress, { toValue: 1, duration: fallMs, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start(() => {
      progress.removeListener(sub);
      setFruits((prev) => prev.filter((f) => f.id !== fruit.id));
    });
  };

  // effects
  const spawnEffect = (x: number, y: number) => {
    const id = nextEffectId.current++;
    setEffects((prev) => [...prev, { id, x, y }]);
  };
  const handleEffectDone = useCallback((id: number) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <View style={styles.container}>
      {/* touch layer (high z so swipes always register) */}
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
        pointerEvents={gameOver ? "none" : "auto"}
        {...panResponder.panHandlers}
      />

      {/* bg */}
      <Text style={[styles.bgEmoji, { left: 16, top: 90, opacity: 0.14 }]}>☁️</Text>
      <Text style={[styles.bgEmoji, { right: 26, top: 160, opacity: 0.12 }]}>☁️</Text>
      <Text style={[styles.bgEmoji, { left: 42, bottom: 160, opacity: 0.1 }]}>🌈</Text>

      {/* HUD */}
      <View style={styles.hudRow}>
        <View style={[styles.pill, { backgroundColor: "#E6F7FF", borderColor: "#98D5FF" }]}><Text style={styles.pillText}>⏱ {timeLeft}s</Text></View>
        <View style={[styles.pill, { backgroundColor: "#E8F8EF", borderColor: "#9AD9B9" }]}><Text style={styles.pillText}>🍉 {score}</Text></View>
        <View style={[styles.pill, { backgroundColor: "#FFF6E6", borderColor: "#FFD28C" }]}><Text style={styles.pillText}>⭐ {hiScore}</Text></View>
      </View>

      {/* Fruits */}
      {fruits.map((fruit) => {
        const spins = 1.6 + fruit.driftFreq * 0.5;
        const rotateDeg = fruit.progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${360 * spins}deg`] });
        return (
          <Animated.Text
            key={fruit.id}
            pointerEvents="none"
            style={[styles.fruit, { left: fruit.x, top: fruit.y, opacity: fruit.fade, transform: [{ rotate: rotateDeg }, { scale: fruit.scale }] }]}
          >
            {fruit.emoji}
          </Animated.Text>
        );
      })}

      {/* Effects */}
      {effects.map((e) => (
        <SliceEffect key={e.id} id={e.id} x={e.x} y={e.y} onDone={handleEffectDone} />
      ))}

      {!gameOver && <Text style={styles.footer}>Swipe to slice fruits!</Text>}

      {gameOver && (
        <View style={[styles.overlay, { zIndex: 1000 }]} pointerEvents="auto">
          <View style={styles.modal}>
            <Text style={styles.endTitle}>Great job! 🎉</Text>
            <Text style={styles.endScore}>Score: {score}</Text>
            <Text style={styles.endSub}>Best: {hiScore}</Text>
            <Pressable onPress={resetGame} style={styles.btn}><Text style={styles.btnText}>Play Again</Text></Pressable>
          </View>
        </View>
      )}

      {/* Question Overlay */}
      {isQuestionVisible && currentQuestion && currentQuestion.options && (
        <View style={styles.questionOverlay} pointerEvents="auto">
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            <View style={styles.optionsContainer}>
              {Object.entries(currentQuestion.options).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.optionButton}
                  onPress={() => answerQuestion(key)}
                  disabled={isAnswering}
                >
                  <Text style={styles.optionText}>
                    {key.toUpperCase()}: {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Feedback Overlay */}
      {feedbackContent && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.feedbackOverlay,
            {
              opacity: feedbackAnim,
              transform: [
                {
                  scale: feedbackAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.feedbackIcon}>{feedbackContent.icon}</Text>
          {feedbackContent.text ? (
            <Text style={styles.feedbackText}>{feedbackContent.text}</Text>
          ) : null}
          {feedbackContent.correctAnswer ? (
            <Text style={styles.correctAnswerText}>{feedbackContent.correctAnswer}</Text>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
}

/* Slice effect */
function SliceEffect({ id, x, y, onDone }: { id: number; x: number; y: number; onDone: (id: number) => void; }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 550, useNativeDriver: false }).start(() => onDone(id));
  }, [id, onDone, progress]);

  const angles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
  const distances = [28, 34, 40, 36, 32, 38];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{ position: "absolute", left: x - 10, top: y - 10 }}>
        {angles.map((a, i) => {
          const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * distances[i]] });
          const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * distances[i]] });
          const scale = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.4, 1.1, 0.6] });
          const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 1, 0] });
          return <Animated.Text key={`spark-${i}`} style={{ position: "absolute", fontSize: 20, transform: [{ translateX: tx }, { translateY: ty }, { scale }], opacity }}>✨</Animated.Text>;
        })}
        {angles.map((a, i) => {
          const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a + Math.PI / 6) * (distances[i] * 0.7)] });
          const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a + Math.PI / 6) * (distances[i] * 0.7)] });
          const scale = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 1.0, 0.7] });
          const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.9, 0.9, 0] });
          return <Animated.Text key={`drop-${i}`} style={{ position: "absolute", fontSize: 18, transform: [{ translateX: tx }, { translateY: ty }, { scale }], opacity }}>💦</Animated.Text>;
        })}
      </Animated.View>
    </View>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#BDE7FF", alignItems: "center", justifyContent: "flex-end" },
  bgEmoji: { position: "absolute", fontSize: 48, color: "#fff", textShadowColor: "rgba(0,0,0,0.07)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  hudRow: { position: "absolute", top: 36, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 2 },
  pillText: { fontSize: 18, fontWeight: "800", color: "#1C2333" },
  fruit: { position: "absolute", fontSize: FRUIT_SIZE, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  footer: { fontSize: 18, marginBottom: 28, color: "#0F2C63", fontWeight: "700", backgroundColor: "rgba(255,255,255,0.5)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 2, borderColor: "rgba(0,0,0,0.1)", overflow: "hidden", zIndex: 10 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },

  modal: { width: Math.min(width * 0.82, 360), padding: 20, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#000", alignItems: "center" },
  endTitle: { fontSize: 28, fontWeight: "900", color: "#1E1E1E", marginBottom: 6 },
  endScore: { fontSize: 22, fontWeight: "800", color: "#2E7D32", marginBottom: 4 },
  endSub: { fontSize: 18, color: "#444", marginBottom: 14 },
  btn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#FF9F1C", borderWidth: 2, borderColor: "#000" },
  btnText: { fontSize: 18, fontWeight: "900", color: "#111" },

  // Question Overlay Styles (popout with semi-transparent background)
  questionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1500, padding: 20 },
  questionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '100%', maxWidth: 500, alignItems: 'center', borderWidth: 3, borderColor: '#FF9F1C', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  questionText: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 30, textAlign: 'center', lineHeight: 32 },
  optionsContainer: { width: '100%', gap: 12 },
  optionButton: { backgroundColor: '#4A90E2', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, width: '100%', alignItems: 'center' },
  optionText: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },

  // Feedback Styles
  feedbackOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 2000 },
  feedbackIcon: { fontSize: 80, textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  feedbackText: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 10, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  correctAnswerText: { fontSize: 18, fontWeight: '600', color: '#4CAF50', marginTop: 15, backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, textAlign: 'center', maxWidth: '90%' },
});
