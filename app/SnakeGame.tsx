import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, SafeAreaView, StyleSheet, Button, Animated, ActivityIndicator, Alert, TextInput } from 'react-native'; // Keep TextInput import if needed elsewhere, but logic removed below
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Snake from './Snake';
import { checkGameOver } from './utils/checkGameOver';
import Food from './Food';
import { checkEatsFood } from './utils/checkEatsFood';
import { randomFoodPosition } from './utils/randomFoodPosition';
import Header from './Header';
import { Direction, Coordinate, GestureEventType } from './types/types';
import { fetchQuestions, Question } from '../backend/fetchquestions'; // Import Question type
import { fetchUserProfile } from '../backend/fetchUserProfile';
import { supabase } from '../backend/supabase'; // Import supabase client
import { getAuth } from 'firebase/auth'; // Import getAuth
import { SNAKE_MODES, SnakeModeKey } from './snakeModes';

// --- Constants ---
const FOOD_INITIAL_POSITION: Coordinate = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 58 }; // grid units
const SNAKE_INITIAL_POSITION: Coordinate[] = [{ x: 5, y: 5 }];
const COLS = Math.ceil(GAME_BOUNDS.xMax);
const ROWS = Math.ceil(GAME_BOUNDS.yMax);
const primaryColor = '#00BFFF';
const backgroundColor = '#B2EBF2';
const COMBO_WINDOW_MS = 2000;
const DEFAULT_QUESTION_LIMIT = 5;

// --- Types ---
type Phase = 'ready' | 'countdown' | 'playing' | 'paused' | 'gameover' | 'quiz_complete';

// --- Small Helpers ---
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const equal = (a: Coordinate, b: Coordinate) => a.x === b.x && a.y === b.y;

/** Lightweight grid (memoized) */
const Grid = React.memo(function Grid({
  cols, rows, cell, radius = 18,
}: { cols: number; rows: number; cell: number; radius?: number }) {
  // ... (Grid component remains the same)
      return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={`r${r}`} style={{ flexDirection: 'row', height: cell }}>
          {Array.from({ length: cols }).map((__, c) => (
            <View
              key={`c${c}`}
              style={{
                width: cell,
                height: cell,
                borderRightWidth: 0.5,
                borderBottomWidth: 0.5,
                borderColor: 'rgba(0,0,0,0.08)',
              }}
            />
          ))}
        </View>
      ))}
      <View style={{ ...StyleSheet.absoluteFillObject as any, borderRadius: radius, overflow: 'hidden' }} />
    </View>
  );
});

// --- Overlays ---
function StartOverlay({ onStart }: { onStart: () => void }) {
 // ... (StartOverlay component remains the same)
   return (
    <View style={styles.overlayFill}>
      <View style={styles.card}>
        <Text style={styles.title}>Snake Quiz!</Text>
        <Text style={styles.subtle}>Eat food to answer questions. Don’t crash.</Text>
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <Text style={styles.hint}>Swipe ◀︎▶︎▲▼</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.hint}>Answer questions correctly for bonus points!</Text>
        </View>
        <View style={{ height: 16 }} />
        <View style={styles.primaryBtn} onTouchEnd={onStart}>
          <Text style={styles.primaryBtnTxt}>Tap to Play</Text>
        </View>
      </View>
    </View>
  );
}
function CountdownOverlay({ n }: { n: number }) {
 // ... (CountdownOverlay component remains the same)
   return (
    <View style={styles.overlayFill}>
      <View style={styles.countDownBubble}>
        <Text style={styles.countDownTxt}>{n}</Text>
      </View>
    </View>
  );
}

// --- Main Game Component ---
function SnakeGame({ navigation }: { navigation: any }): JSX.Element {
  // --- Auth & User ---
  const auth = getAuth();
  const uid = auth.currentUser?.uid; // Get current user ID

  // --- Modes/Settings ---
  const [modeKey, setModeKey] = useState<SnakeModeKey>('classic');
  const mode = useMemo(() => SNAKE_MODES[modeKey], [modeKey]);
  const [showSettings, setShowSettings] = useState(false);

  // --- Phase ---
  const [phase, setPhase] = useState<Phase>('ready');

  // --- Core Game ---
  const [direction, setDirection] = useState<Direction>(Direction.Right);
  const [snake, setSnake] = useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
  const [food, setFood] = useState<Coordinate>(FOOD_INITIAL_POSITION);
  const foodRef = useRef(food);
  useEffect(() => { foodRef.current = food; }, [food]);

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(true); // Start paused until ready/countdown
  const [countdown, setCountdown] = useState<number>(0);
  const [lives, setLives] = useState<number>(2); // Kept for collision logic

  // --- Questions ---
  const [allQuestions, setAllQuestions] = useState<Question[]>([]); // Store all fetched questions
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]); // Questions remaining in this session
  // No longer needed: const [nextQuestionIndex, setNextQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false);
  const [questionsAnsweredCount, setQuestionsAnsweredCount] = useState<number>(0);
  const [questionsToComplete, setQuestionsToComplete] = useState<number>(DEFAULT_QUESTION_LIMIT); // Parent-set limit
  const [userProfile, setUserProfile] = useState<any>(null);
  // No longer needed: const [userAnswer, setUserAnswer] = useState('');

  // --- HUD/FX / Combo ---
  const [combo, setCombo] = useState(1);
  const lastEatAtRef = useRef<number>(0);

  // --- Loading State ---
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- Refs ---
  const directionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const pausedRef = useRef(isPaused);
  const gameOverRef = useRef(isGameOver);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameOverRef.current = isGameOver; }, [isGameOver]);

  // --- Sizing ---
  const [boardW, setBoardW] = useState(0);
  const [boardH, setBoardH] = useState(0);
  const cell = useMemo(() => {
    if (!boardW || !boardH) return 10;
    return Math.floor(Math.min(boardW / COLS, boardH / ROWS) * 1.10);
  }, [boardW, boardH]);
  const stageW = cell * COLS;
  const stageH = cell * ROWS;
  const stageOffsetX = (boardW - stageW) / 2;
  const stageOffsetY = (boardH - stageH) / 2;

  // --- Fetch User Profile, Questions, and Limit on Mount ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!uid) {
        Alert.alert("Error", "User not logged in.");
        navigation.navigate("LogInPage");
        return;
      }
      setIsLoadingData(true);
      try {
        const profile = await fetchUserProfile();
        setUserProfile(profile);

        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('question_limit')
          .eq('user_id', uid)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        const limit = settingsData?.question_limit || DEFAULT_QUESTION_LIMIT;
        setQuestionsToComplete(limit);

        let fetchedQuestions = await fetchQuestions(uid);
        fetchedQuestions = fetchedQuestions.filter(q => q.question_type !== 'typed_answer' && q.options);

        if (!fetchedQuestions || fetchedQuestions.length === 0) {
           Alert.alert("No Suitable Questions", "Ask your parent to add some Multiple Choice or True/False questions!");
           setPhase('ready');
           setIsLoadingData(false);
           return;
        }
        setAllQuestions(fetchedQuestions); // Store the filtered bank
        setAvailableQuestions([...fetchedQuestions].sort(() => 0.5 - Math.random())); // Initial shuffle

      } catch (e) {
        console.error('Error loading initial data:', e);
        Alert.alert("Error", "Could not load game data. Please try again.");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadInitialData();
  }, [uid, navigation]);

  // --- High Score Persistence ---
   useEffect(() => {
    (async () => {
      try {
        const mod = await import('@react-native-async-storage/async-storage');
        const raw = await mod.default.getItem('@snake_high_score');
        if (raw) setHighScore(Number(raw) || 0);
      } catch {}
    })();
  }, []);
  const persistHighScore = async (s: number) => {
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      await mod.default.setItem('@snake_high_score', String(s));
    } catch {}
  };


  // --- Walls ---
  const walls = useMemo<Coordinate[]>(() => {
    // ... (walls logic remains the same)
      if (!mode.hasWalls) return [];
    const arr: Coordinate[] = [];
    const w = GAME_BOUNDS.xMax;
    const h = GAME_BOUNDS.yMax;
    for (let x = 6; x <= w - 6; x++) { arr.push({ x, y: 10 }); arr.push({ x, y: h - 10 }); }
    for (let y = 14; y <= h - 14; y++) { arr.push({ x: 8, y }); arr.push({ x: w - 8, y }); }
    for (let x = Math.floor(w / 2) - 6; x <= Math.floor(w / 2) + 6; x++) arr.push({ x, y: Math.floor(h / 2) });
    for (let y = Math.floor(h / 2) - 6; y <= Math.floor(h / 2) + 6; y++) arr.push({ x: Math.floor(w / 2), y });
    return arr;
  }, [mode.hasWalls]);

  // --- Animations ---
  const foodScale = useRef(new Animated.Value(1)).current;
  const popFood = useCallback(() => {
    foodScale.setValue(0.6);
    Animated.spring(foodScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [foodScale]);

  const comboAnim = useRef(new Animated.Value(0)).current;
  const triggerComboToast = useCallback(() => {
     // ... (combo animation remains the same)
       comboAnim.setValue(0);
    Animated.timing(comboAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start(() => {
      Animated.timing(comboAnim, { toValue: 0, delay: 600, duration: 180, useNativeDriver: true }).start();
    });
  }, [comboAnim]);

  const eatRipple = useRef(new Animated.Value(0)).current;
  const triggerEatRipple = useCallback(() => {
    // ... (ripple animation remains the same)
      eatRipple.setValue(0);
    Animated.timing(eatRipple, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [eatRipple]);

  const hitFlash = useRef(new Animated.Value(0)).current;
  const triggerHitFlash = useCallback(() => {
    // ... (hit flash animation remains the same)
      hitFlash.setValue(0.9);
    Animated.timing(hitFlash, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  }, [hitFlash]);


  // --- Move Interval ---
   const effectiveInterval = useMemo(() => {
    const base = mode.baseSpeedMs;
    const level = 1 + Math.floor(score / 50);
    const speedUp = Math.max(0, level - 1) * 6;
    return clamp(base - speedUp, 45, 200);
  }, [mode.baseSpeedMs, score]);

  // --- Game Loop ---
  useEffect(() => {
    if (phase !== 'playing' || isPaused || isGameOver) return;
    const id = setInterval(() => moveSnake(), effectiveInterval);
    return () => clearInterval(id);
  }, [effectiveInterval, isPaused, isGameOver, phase]);

  // --- Start Game Flow ---
  const startGame = () => {
     if (isLoadingData || availableQuestions.length === 0) {
        Alert.alert("Cannot Start", isLoadingData ? "Loading data..." : "No suitable questions available. Please ask your parent to add some.");
        return;
     }
    setPhase('countdown');
    setCountdown(3);
    setIsPaused(true);
  };
   useEffect(() => {
    if (phase !== 'countdown') return;
    let count = 3;
    setCountdown(count);
    const id = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(id);
        hitFlash.stopAnimation(); hitFlash.setValue(0);
        setIsPaused(false);
        setPhase('playing');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, hitFlash]);


  // --- Helper Functions ---
  const occupied = (p: Coordinate) =>
    snakeRef.current.some((c) => equal(c, p)) || equal(foodRef.current, p) || walls.some(w => equal(w, p));

  const spawnFood = () => {
    // ... (spawnFood logic remains the same)
      let pos = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
    pos.x = clamp(pos.x, GAME_BOUNDS.xMin, GAME_BOUNDS.xMax - 1);
    pos.y = clamp(pos.y, GAME_BOUNDS.yMin, GAME_BOUNDS.yMax - 1);
    while (occupied(pos)) pos = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
    setFood(pos);
    foodRef.current = pos;
    popFood();
  };

  const endGame = (reason: 'crash' | 'quiz_complete') => {
    setIsGameOver(true);
    setIsPaused(true);
    setPhase(reason === 'quiz_complete' ? 'quiz_complete' : 'gameover');
  };

   const consumeLifeOrEnd = () => {
    triggerHitFlash();
    if (lives > 0) {
      setLives((l) => l - 1);
      setSnake(SNAKE_INITIAL_POSITION);
      setDirection(Direction.Right);
      setPhase('countdown');
      setIsPaused(true);
    } else {
      endGame('crash');
    }
  };


  // --- Move Snake Logic ---
  const moveSnake = () => {
    if (gameOverRef.current || pausedRef.current || phase === 'quiz_complete') return;

    const current = snakeRef.current;
    const head = current[0];
    let newHead: Coordinate = { ...head };

    switch (directionRef.current) {
      case Direction.Up: newHead.y -= 1; break;
      case Direction.Down: newHead.y += 1; break;
      case Direction.Left: newHead.x -= 1; break;
      case Direction.Right: newHead.x += 1; break;
    }

    const doWrap = mode.wrap;
    if (doWrap) {
      // ... (wrapping logic)
        const width = GAME_BOUNDS.xMax;
        const height = GAME_BOUNDS.yMax;
        if (newHead.x < GAME_BOUNDS.xMin) newHead.x = width;
        if (newHead.x > width) newHead.x = GAME_BOUNDS.xMin;
        if (newHead.y < GAME_BOUNDS.yMin) newHead.y = height;
        if (newHead.y > height) newHead.y = GAME_BOUNDS.yMin;
    } else {
      if (checkGameOver(newHead, GAME_BOUNDS)) return consumeLifeOrEnd();
    }

    if (!doWrap && walls.some(w => equal(w, newHead))) {
      return consumeLifeOrEnd();
    }
    if (current.slice(1).some((seg) => equal(seg, newHead))) {
      return consumeLifeOrEnd();
    }

    // --- Eats Food Logic ---
    if (checkEatsFood(newHead, foodRef.current)) {
      const now = Date.now();
      const within = now - (lastEatAtRef.current || 0) <= COMBO_WINDOW_MS;
      const nextCombo = within ? combo + 1 : 1;
      lastEatAtRef.current = now;
      setCombo(nextCombo);
      if (nextCombo >= 3) triggerComboToast();

      const points = (mode.foods?.[0]?.points ?? 10) + (nextCombo - 1) * 2;
      setScore((s) => {
        const newScore = s + points;
        if (newScore > highScore) { setHighScore(newScore); persistHighScore(newScore); }
        return newScore;
      });

      setSnake([newHead, ...current]);

      // --- Trigger Question ---
      if (questionsAnsweredCount < questionsToComplete && availableQuestions.length > 0) { // Check if questions are still available
          // Select a random index from the remaining available questions
          const randomIndex = Math.floor(Math.random() * availableQuestions.length);
          const questionToAsk = availableQuestions[randomIndex];

          setCurrentQuestion(questionToAsk);

          // Remove the selected question from the available list for this session
          setAvailableQuestions(prev => prev.filter((q, index) => index !== randomIndex));

          setIsQuestionVisible(true);
          setIsPaused(true);
          setPhase('paused');
      } else if (questionsAnsweredCount >= questionsToComplete) {
          endGame('quiz_complete');
      }

      spawnFood();
      triggerEatRipple();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }

    // Normal move
    setSnake([newHead, ...current.slice(0, -1)]);
  };

  // --- Answer Question Logic ---
  const answerQuestion = async (isCorrect: boolean, selectedOptionKey?: string) => {
    setIsQuestionVisible(false);
    let bonusPoints = 0;

    if (isCorrect) {
        bonusPoints = 25;
        Alert.alert('Correct!', '+25 points!');
    } else {
        Alert.alert('Incorrect', 'Try again next time!');
    }

    setScore(s => s + bonusPoints);

    const newAnsweredCount = questionsAnsweredCount + 1;
    setQuestionsAnsweredCount(newAnsweredCount);
    // No longer need to increment nextQuestionIndex

    if (newAnsweredCount >= questionsToComplete) {
        endGame('quiz_complete');
    } else {
        setPhase('countdown');
        setIsPaused(true);
    }
     setCurrentQuestion(null);
  };


  // --- Handle Gesture ---
  const handleGesture = (event: GestureEventType) => {
    if (isGameOver || isQuestionVisible || phase === 'quiz_complete') return;
    // ... (rest of gesture handling remains the same)
      const { translationX, translationY } = event.nativeEvent;
    const absX = Math.abs(translationX);
    const absY = Math.abs(translationY);
    const next =
      absX > absY
        ? (translationX > 0 ? Direction.Right : Direction.Left)
        : (translationY > 0 ? Direction.Down : Direction.Up);
    const opposite =
      (directionRef.current === Direction.Left && next === Direction.Right) ||
      (directionRef.current === Direction.Right && next === Direction.Left) ||
      (directionRef.current === Direction.Up && next === Direction.Down) ||
      (directionRef.current === Direction.Down && next === Direction.Up);
    if (!opposite) setDirection(next);
  };

  // --- Reload Game Logic ---
  const reloadGame = () => {
     if (isLoadingData || allQuestions.length === 0) {
        Alert.alert("Cannot Reload", isLoadingData ? "Still loading..." : "No suitable questions available.");
        return;
     }
    setSnake(SNAKE_INITIAL_POSITION);
    setFood(FOOD_INITIAL_POSITION);
    foodRef.current = FOOD_INITIAL_POSITION;
    setScore(0);
    setDirection(Direction.Right);
    setIsGameOver(false);
    setIsPaused(true);
    setLives(2);
    setCombo(1);
    hitFlash.stopAnimation(); hitFlash.setValue(0);
    popFood();

    // Reset Questions
    setQuestionsAnsweredCount(0);
    setAvailableQuestions([...allQuestions].sort(() => 0.5 - Math.random())); // Reshuffle from the full bank
    // No longer need nextQuestionIndex reset
    setIsQuestionVisible(false);
    setCurrentQuestion(null);

    // Start Countdown
    setPhase('countdown');
  };

  // --- Pause Game Logic ---
  const pauseGame = () => {
    if (phase === 'playing' || phase === 'paused') {
        setIsPaused((p) => {
            const nextPausedState = !p;
            setPhase(nextPausedState ? 'paused' : 'playing');
            return nextPausedState;
        });
    }
  };

  // --- Render ---
  if (isLoadingData) {
      return (
          <SafeAreaView style={styles.container}>
              <ActivityIndicator size="large" color={primaryColor} />
              <Text>Loading Game Data...</Text>
          </SafeAreaView>
      );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={handleGesture} enabled={!isQuestionVisible && phase === 'playing'}>
        <SafeAreaView style={styles.container}>
          <Header
            reloadGame={reloadGame}
            pauseGame={pauseGame}
            isPaused={isPaused || isQuestionVisible || phase === 'countdown' || phase === 'quiz_complete'}
            openSettings={() => setShowSettings(true)}
          >
            <View style={styles.hudRow}>
              <Text style={styles.scoreText}>{score}</Text>
              <Text style={styles.hudPill}>HS {highScore}</Text>
              <Text style={styles.hudPill}>♥ {lives}</Text>
              <Text style={styles.hudPill}>Q: {questionsAnsweredCount}/{questionsToComplete}</Text>
              <Text style={styles.hudPill}>{SNAKE_MODES[modeKey].label}</Text>

            </View>
          </Header>

          <View
            style={styles.boundaries}
            onLayout={e => {
              const { width, height } = e.nativeEvent.layout;
              setBoardW(width);
              setBoardH(height);
            }}
          >
            {/* STAGE */}
            <View style={{ position: 'absolute', left: stageOffsetX, top: stageOffsetY, width: stageW, height: stageH }}>
              <Grid cols={COLS} rows={ROWS} cell={cell} />
              {walls.map((w, i) => (
                <View key={`w${i}`} style={{ position: 'absolute', left: w.x * cell, top: w.y * cell, width: cell, height: cell, backgroundColor: '#263238' }} />
              ))}
              <Snake snake={snake} cell={cell} />
              <Animated.View style={{ transform: [{ scale: foodScale }] }}>
                <Food x={food.x} y={food.y} cell={cell} />
              </Animated.View>
            </View>

            {/* Effects */}
             <Animated.View // Combo Toast
              pointerEvents="none"
              style={[
                styles.comboToast,
                {
                  opacity: comboAnim,
                  transform: [
                    { translateY: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                    { scale: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  ],
                },
              ]}
            >
              <Text style={styles.comboTxt}>Combo x{combo}</Text>
            </Animated.View>
             <Animated.View // Eat Ripple
              pointerEvents="none"
              style={[ StyleSheet.absoluteFillObject, { opacity: eatRipple.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] }), transform: [{ scale: eatRipple.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] }) }], backgroundColor: '#ffffff', borderRadius: 16, } ]}
            />
             <Animated.View // Hit Flash
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { backgroundColor: '#ff5252', opacity: hitFlash, borderRadius: 16 }]}
            />

            {/* Overlays */}
            {phase === 'ready' && <StartOverlay onStart={startGame} />}
            {phase === 'countdown' && <CountdownOverlay n={countdown} />}
          </View>

           {/* Game Over / Quiz Complete Overlays */}
           {(isGameOver || phase === 'quiz_complete') && (
            <View style={styles.overlayCenter}>
              <Text style={styles.gameOverTitle}>{phase === 'quiz_complete' ? 'Quiz Complete!' : 'Game Over'}</Text>
              <Text style={styles.gameOverStats}>Final Score: {score}</Text>
              <Text style={styles.gameOverStats}>High Score: {highScore}</Text>
              <Text style={styles.gameOverHint}>Tap Restart in the header</Text>
            </View>
          )}

          {/* Question Modal */}
          {isQuestionVisible && currentQuestion && (
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
               {currentQuestion.options && typeof currentQuestion.options === 'object' &&
                 Object.entries(currentQuestion.options).map(([key, option]) => (
                   <View key={key} style={{ marginTop: 8 }}>
                     <Button title={String(option)} onPress={() => answerQuestion(key === currentQuestion.correct_answer, key)} />
                   </View>
                 ))
               }
            </View>
          )}

           {/* Settings Panel */}
            {showSettings && (
             <View style={styles.settingsPanel}>
              <Text style={styles.settingsTitle}>Settings</Text>
               <Text style={styles.settingsSection}>Mode</Text>
               {Object.entries(SNAKE_MODES).map(([k, m]) => (
                <View key={k} style={{ marginBottom: 6 }}>
                  <Button title={`${m.label}${modeKey === k ? ' ✓' : ''}`} onPress={() => { setModeKey(k as SnakeModeKey); reloadGame(); setShowSettings(false); }} />
                </View>
              ))}
               <View style={{ height: 12 }} />
               <Button title="Close" onPress={() => setShowSettings(false)} />
             </View>
           )}
        </SafeAreaView>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  // ... (Most styles remain the same)
    container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', backgroundColor: '#e0f7fa' },
    boundaries: {
        width: '92%',
        aspectRatio: COLS / ROWS,
        backgroundColor,
        borderRadius: 22,
        overflow: 'hidden',
        alignSelf: 'center',
        marginTop: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    hudRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
    hudPill: {
        marginLeft: 4,
        marginRight: 4,
        marginTop: 4,
        backgroundColor: 'rgba(0,0,0,0.08)',
        color: '#000',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        fontWeight: '700',
        fontSize: 12,
    },
    scoreText: { fontSize: 22, fontWeight: 'bold', color: primaryColor },
    overlayCenter: {
        position: 'absolute',
        top: '30%',
        alignSelf: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
        borderRadius: 12,
    },
    gameOverTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffccbc' },
    gameOverStats: { marginTop: 6, fontSize: 18, fontWeight: '700', color: '#fff' },
    gameOverHint: { marginTop: 10, opacity: 0.8, color: '#eee' },
    overlayFill: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 18, 33, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 22,
        paddingHorizontal: 20,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center'},
    subtle: { fontSize: 15, opacity: 0.8, textAlign: 'center', marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    hint: { fontSize: 14, fontWeight: '600', color: '#555' },
    dot: { marginHorizontal: 8, opacity: 0.5, fontSize: 18 },
    primaryBtn: {
        marginTop: 10,
        backgroundColor: '#007AFF',
        borderRadius: 999,
        paddingHorizontal: 25,
        paddingVertical: 12,
        elevation: 3,
    },
    primaryBtnTxt: { color: 'white', fontWeight: '800', letterSpacing: 0.5, fontSize: 16 },
    countDownBubble: {
        width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.96)',
        elevation: 5,
    },
    countDownTxt: { fontSize: 48, fontWeight: '900', color: '#ff9800' },
    comboToast: {
        position: 'absolute',
        top: 10,
        alignSelf: 'center',
        backgroundColor: '#212121',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffd84d',
        elevation: 4,
    },
    comboTxt: { color: '#ffd84d', fontWeight: '900', letterSpacing: 0.4 },
    questionContainer: {
        position: 'absolute',
        top: '20%',
        left: '5%',
        right: '5%',
        backgroundColor: 'white',
        padding: 25,
        borderRadius: 15,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    questionText: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    // Removed answerInput style as it's no longer used
    settingsPanel: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    settingsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
    settingsSection: { fontWeight: '700', marginBottom: 6, marginTop: 10 },
});

export default SnakeGame;

