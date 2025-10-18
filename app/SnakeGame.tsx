import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, SafeAreaView, StyleSheet, Button, Animated } from 'react-native';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Snake from './Snake';
import { checkGameOver } from './utils/checkGameOver';
import Food from './Food';
import { checkEatsFood } from './utils/checkEatsFood';
import { randomFoodPosition } from './utils/randomFoodPosition';
import Header from './Header';
import QuestionIcon from './QuestionIcon';
import { Direction, Coordinate, GestureEventType } from './types/types';
import { fetchQuestions } from '../backend/fetchquestions';
import { fetchUserProfile } from '../backend/fetchUserProfile';
import { SNAKE_MODES, SnakeModeKey } from './snakeModes';

const FOOD_INITIAL_POSITION: Coordinate = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 58 }; // grid units
const SNAKE_INITIAL_POSITION: Coordinate[] = [{ x: 5, y: 5 }];

const COLS = Math.ceil(GAME_BOUNDS.xMax);
const ROWS = Math.ceil(GAME_BOUNDS.yMax);

const primaryColor = '#00BFFF';
const backgroundColor = '#B2EBF2';

type PowerUpType = 'ghost' | 'slow' | 'bonus';
type SpawnedPowerUp = { type: PowerUpType; pos: Coordinate };
type ActivePowerUp = { type: PowerUpType; until: number } | null;
const POWERUP_DURATION_MS = 8000;
const COMBO_WINDOW_MS = 2000;

type Phase = 'ready' | 'countdown' | 'playing' | 'paused' | 'gameover';

// small helpers
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const equal = (a: Coordinate, b: Coordinate) => a.x === b.x && a.y === b.y;

/** Lightweight grid (memoized) */
const Grid = React.memo(function Grid({
  cols, rows, cell, radius = 18,
}: { cols: number; rows: number; cell: number; radius?: number }) {
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

function PowerProgress({ until }: { until: number }) {
  const [pct, setPct] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      const remain = until - Date.now();
      setPct(clamp(remain / POWERUP_DURATION_MS, 0, 1));
    }, 100);
    return () => clearInterval(id);
  }, [until]);
  return (
    <View style={styles.powerBar}>
      <View style={[styles.powerFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

function PowerUpIcon({ kind, x, y, cell }: { kind: PowerUpType; x: number; y: number; cell: number }) {
  const emoji = kind === 'ghost' ? '👻' : kind === 'slow' ? '🐌' : '⭐';
  const size = cell * 1.8;
  return (
    <View style={[styles.powerIcon, {
      left: x * cell - (size - cell) / 2, top: y * cell - (size - cell) / 2,
      width: size, height: size, borderRadius: size / 2,
    }]}>
      <Text style={{ fontSize: Math.max(12, Math.floor(cell)) }}>{emoji}</Text>
    </View>
  );
}

function StartOverlay({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.overlayFill}>
      <View style={styles.card}>
        <Text style={styles.title}>Snake</Text>
        <Text style={styles.subtle}>Swipe to move. Eat food. Don’t crash.</Text>
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <Text style={styles.hint}>Swipe ◀︎▶︎▲▼</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.hint}>Mode controls wrap & walls</Text>
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
  return (
    <View style={styles.overlayFill}>
      <View style={styles.countDownBubble}>
        <Text style={styles.countDownTxt}>{n}</Text>
      </View>
    </View>
  );
}

function SnakeGame({ navigation }: { navigation: any }): JSX.Element {
  // --- modes/settings ---
  const [modeKey, setModeKey] = useState<SnakeModeKey>('classic');
  const mode = useMemo(() => SNAKE_MODES[modeKey], [modeKey]);
  const [showSettings, setShowSettings] = useState(false);
  const [speedOffset, setSpeedOffset] = useState(0); // tweak +/- ms

  // --- phase ---
  const [phase, setPhase] = useState<Phase>('ready');

  // --- core game ---
  const [direction, setDirection] = useState<Direction>(Direction.Right);
  const [snake, setSnake] = useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
  const [food, setFood] = useState<Coordinate>(FOOD_INITIAL_POSITION);
  const foodRef = useRef(food);
  useEffect(() => { foodRef.current = food; }, [food]);

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(0);
  const [lives, setLives] = useState<number>(2);

  // questions
  const [foodEaten, setFoodEaten] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // power-ups (optional)
  const [boardPowerUp, setBoardPowerUp] = useState<SpawnedPowerUp | null>(null);
  const [activePowerUp, setActivePowerUp] = useState<ActivePowerUp>(null);
  const activePowerUpRef = useRef<ActivePowerUp>(null);

  // HUD/FX / combo
  const [combo, setCombo] = useState(1);
  const lastEatAtRef = useRef<number>(0);
  const [bonusPending, setBonusPending] = useState(false);
  const [showQuestionIcon] = useState(false);
  const [questionIconPos] = useState<Coordinate | null>(null);

  // refs
  const directionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const pausedRef = useRef(isPaused);
  const gameOverRef = useRef(isGameOver);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { activePowerUpRef.current = activePowerUp; }, [activePowerUp]);

  // sizing (dynamic cell + centered stage)
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

  // load user + questions
  useEffect(() => { (async () => { try { setUserProfile(await fetchUserProfile()); } catch {} })(); }, []);
  useEffect(() => {
    (async () => {
      if (!userProfile) return;
      try {
        const qs = await fetchQuestions(userProfile.user_id);
        if (qs.length > 0) setCurrentQuestion(qs[Math.floor(Math.random() * qs.length)]);
      } catch (e) { console.error('Error fetching questions in SnakeGame:', e); }
    })();
  }, [userProfile]);

  // load high score
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

  // build walls for "walls" mode
  const walls = useMemo<Coordinate[]>(() => {
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

  // animations
  const chipPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chipPulse, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(chipPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [chipPulse]);

  const foodScale = useRef(new Animated.Value(1)).current;
  const popFood = useCallback(() => {
    foodScale.setValue(0.6);
    Animated.spring(foodScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [foodScale]);

  const comboAnim = useRef(new Animated.Value(0)).current;
  const triggerComboToast = useCallback(() => {
    comboAnim.setValue(0);
    Animated.timing(comboAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start(() => {
      Animated.timing(comboAnim, { toValue: 0, delay: 600, duration: 180, useNativeDriver: true }).start();
    });
  }, [comboAnim]);

  const eatRipple = useRef(new Animated.Value(0)).current;
  const triggerEatRipple = useCallback(() => {
    eatRipple.setValue(0);
    Animated.timing(eatRipple, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [eatRipple]);

  const hitFlash = useRef(new Animated.Value(0)).current;
  const triggerHitFlash = useCallback(() => {
    hitFlash.setValue(0.9);
    Animated.timing(hitFlash, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  }, [hitFlash]);

  // move interval based on mode & score & speed tweak
  const effectiveInterval = useMemo(() => {
    const base = mode.baseSpeedMs + speedOffset;
    const level = 1 + Math.floor(score / 50);
    const speedUp = Math.max(0, level - 1) * 6;
    return clamp(base - speedUp, 45, 200);
  }, [mode.baseSpeedMs, speedOffset, score]);

  // game loop
  useEffect(() => {
    if (phase !== 'playing' || isPaused || isGameOver) return;
    const id = setInterval(() => moveSnake(), effectiveInterval);
    return () => clearInterval(id);
  }, [effectiveInterval, isPaused, isGameOver, phase]);

  // overlays flow: ready -> countdown -> playing
  const startGame = () => {
    setPhase('countdown');
    setCountdown(3);
    setIsPaused(true);
  };
  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          hitFlash.stopAnimation(); hitFlash.setValue(0);
          setIsPaused(false);
          setPhase('playing');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, hitFlash]);

  // helpers
  const occupied = (p: Coordinate) =>
    snakeRef.current.some((c) => equal(c, p)) || equal(foodRef.current, p) || walls.some(w => equal(w, p));

  const spawnFood = () => {
    let pos = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
    // clamp and avoid occupied
    pos.x = clamp(pos.x, GAME_BOUNDS.xMin, GAME_BOUNDS.xMax - 1);
    pos.y = clamp(pos.y, GAME_BOUNDS.yMin, GAME_BOUNDS.yMax - 1);
    while (occupied(pos)) pos = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
    setFood(pos);
    foodRef.current = pos;
    popFood();
  };

  const consumeLifeOrEnd = () => {
    triggerHitFlash();
    if (lives > 0) {
      setLives((l) => l - 1);
      setSnake(SNAKE_INITIAL_POSITION);
      setDirection(Direction.Right);
      hitFlash.stopAnimation(); hitFlash.setValue(0);
      setPhase('countdown');
      setCountdown(3);
      setIsPaused(true);
    } else {
      setPhase('gameover');
      setIsGameOver(true);
      setIsPaused(true);
    }
  };

  const moveSnake = () => {
    if (gameOverRef.current || pausedRef.current) return;

    const current = snakeRef.current;
    const head = current[0];
    let newHead: Coordinate = { ...head };

    switch (directionRef.current) {
      case Direction.Up: newHead.y -= 1; break;
      case Direction.Down: newHead.y += 1; break;
      case Direction.Left: newHead.x -= 1; break;
      case Direction.Right: newHead.x += 1; break;
    }

    // wrapping if mode.wrap or ghost active
    const doWrap = mode.wrap || activePowerUpRef.current?.type === 'ghost';
    if (doWrap) {
      const width = GAME_BOUNDS.xMax;
      const height = GAME_BOUNDS.yMax;
      if (newHead.x < GAME_BOUNDS.xMin) newHead.x = width;
      if (newHead.x > width) newHead.x = GAME_BOUNDS.xMin;
      if (newHead.y < GAME_BOUNDS.yMin) newHead.y = height;
      if (newHead.y > height) newHead.y = GAME_BOUNDS.yMin;
    } else {
      if (checkGameOver(newHead, GAME_BOUNDS)) return consumeLifeOrEnd();
    }

    // wall collision (only when not wrapping)
    if (!doWrap && walls.some(w => w.x === newHead.x && w.y === newHead.y)) {
      return consumeLifeOrEnd();
    }

    // self collision
    if (current.slice(1).some((seg) => equal(seg, newHead))) {
      return consumeLifeOrEnd();
    }

    // eats food (cell-perfect)
    if (checkEatsFood(newHead, foodRef.current)) {
      const now = Date.now();
      const within = now - (lastEatAtRef.current || 0) <= COMBO_WINDOW_MS;
      const nextCombo = within ? combo + 1 : 1;
      lastEatAtRef.current = now;
      setCombo(nextCombo);
      if (nextCombo >= 3) triggerComboToast();

      const points = (mode.foods?.[0]?.points ?? 10) + (nextCombo - 1) * 2 + (bonusPending ? (mode.foods?.[0]?.points ?? 10) : 0);
      setScore((s) => {
        const newScore = s + points;
        if (newScore > highScore) { setHighScore(newScore); persistHighScore(newScore); }
        return newScore;
      });

      setSnake([newHead, ...current]); // grow
      setFoodEaten((n) => n + 1);

      // ask a question every 3rd food
      const willAsk = (foodEaten + 1) % 3 === 0 && currentQuestion;
      if (willAsk) { setIsPaused(true); setIsQuestionVisible(true); }

      spawnFood();
      triggerEatRipple();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }

    // normal move
    setSnake([newHead, ...current.slice(0, -1)]);
  };

  const answerQuestion = (isCorrect: boolean) => {
    setIsQuestionVisible(false);
    if (isCorrect) setScore((s) => s + 25);
    setPhase('countdown');
    setCountdown(3);
    setIsPaused(true);
  };

  const handleGesture = (event: GestureEventType) => {
    if (isGameOver || isQuestionVisible) return;
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

  const reloadGame = () => {
    setSnake(SNAKE_INITIAL_POSITION);
    setFood(FOOD_INITIAL_POSITION);
    foodRef.current = FOOD_INITIAL_POSITION;
    setScore(0);
    setFoodEaten(0);
    setDirection(Direction.Right);
    setIsGameOver(false);
    setIsPaused(true);
    setLives(2);
    setActivePowerUp(null);
    setBonusPending(false);
    setCombo(1);
    hitFlash.stopAnimation(); hitFlash.setValue(0);
    popFood();
    setPhase('countdown');
    setCountdown(3);
  };

  const pauseGame = () => {
    setIsPaused((p) => {
      const next = !p;
      setPhase(next ? 'paused' : 'playing');
      return next;
    });
  };

  // --- HUD bits ---
  const chipText =
    activePowerUp?.type === 'ghost' ? '👻 GHOST' :
    activePowerUp?.type === 'slow'  ? '🐌 SLOW'  : '⭐ BONUS';

  const powerChip = activePowerUp ? (
    <Animated.View style={[styles.powerChip, { transform: [{ scale: chipPulse }] }]}>
      <Text style={styles.powerChipTxt}>{chipText}</Text>
      {activePowerUp.type !== 'bonus' && <PowerProgress until={activePowerUp.until} />}
    </Animated.View>
  ) : null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={handleGesture}>
        <SafeAreaView style={styles.container}>
          <Header
            reloadGame={reloadGame}
            pauseGame={pauseGame}
            isPaused={isPaused}
            openSettings={() => setShowSettings(true)}
          >
            <View style={styles.hudRow}>
              <Text style={styles.scoreText}>{score}</Text>
              <Text style={styles.hudPill}>HS {highScore}</Text>
              <Text style={styles.hudPill}>♥ {lives}</Text>
              <Text style={styles.hudPill}>{SNAKE_MODES[modeKey].label}</Text>
              {powerChip}
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
            {/* STAGE: exact pixel area for the grid */}
            <View style={{ position: 'absolute', left: stageOffsetX, top: stageOffsetY, width: stageW, height: stageH }}>
              <Grid cols={COLS} rows={ROWS} cell={cell} />

              {/* walls */}
              {walls.map((w, i) => (
                <View key={`w${i}`} style={{ position: 'absolute', left: w.x * cell, top: w.y * cell, width: cell, height: cell, backgroundColor: '#263238' }} />
              ))}

              {/* actors */}
              <Snake snake={snake} cell={cell} />
              <Animated.View style={{ transform: [{ scale: foodScale }] }}>
                <Food x={food.x} y={food.y} cell={cell} />
              </Animated.View>

              {boardPowerUp && <PowerUpIcon kind={boardPowerUp.type} x={boardPowerUp.pos.x} y={boardPowerUp.pos.y} cell={cell} />}
              {showQuestionIcon && questionIconPos && <QuestionIcon x={questionIconPos.x} y={questionIconPos.y} />}
            </View>

            {/* combo toast */}
            <Animated.View
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

            {/* eat ripple */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  opacity: eatRipple.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] }),
                  transform: [{ scale: eatRipple.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] }) }],
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                },
              ]}
            />

            {/* hit flash */}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { backgroundColor: '#ff5252', opacity: hitFlash, borderRadius: 16 }]}
            />

            {phase === 'ready' && <StartOverlay onStart={startGame} />}
            {phase === 'countdown' && <CountdownOverlay n={countdown} />}
          </View>

          {isGameOver && (
            <View style={styles.overlayCenter}>
              <Text style={styles.gameOverTitle}>Game Over</Text>
              <Text style={styles.gameOverStats}>Score: {score}</Text>
              <Text style={styles.gameOverStats}>Best: {highScore}</Text>
              <Text style={styles.gameOverHint}>Tap Restart in the header</Text>
            </View>
          )}

          {isQuestionVisible && currentQuestion && (
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
              {currentQuestion.options && typeof currentQuestion.options === 'object' ? (
                Object.entries(currentQuestion.options).map(([key, option]) => (
                  <View key={key} style={{ marginTop: 8 }}>
                    <Button title={String(option)} onPress={() => answerQuestion(key === currentQuestion.correct_answer)} />
                  </View>
                ))
              ) : (
                <Text>No options available</Text>
              )}
            </View>
          )}

          {/* SETTINGS PANEL */}
          {showSettings && (
            <View style={styles.settingsPanel}>
              <Text style={styles.settingsTitle}>Settings</Text>

              <Text style={styles.settingsSection}>Mode</Text>
              {Object.entries(SNAKE_MODES).map(([k, m]) => (
                <View key={k} style={{ marginBottom: 6 }}>
                  <Button title={`${m.label}${modeKey === k ? ' ✓' : ''}`} onPress={() => setModeKey(k as SnakeModeKey)} />
                </View>
              ))}

              <View style={{ height: 10 }} />
              <Text style={styles.settingsSection}>Speed tweak (ms): {speedOffset}</Text>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ marginRight: 8 }}>
                  <Button title="-10" onPress={() => setSpeedOffset(s => Math.max(-40, s - 10))} />
                </View>
                <Button title="+10" onPress={() => setSpeedOffset(s => Math.min(60, s + 10))} />
              </View>

              <View style={{ height: 12 }} />
              <Button title="Close" onPress={() => setShowSettings(false)} />
            </View>
          )}
        </SafeAreaView>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center' },
  boundaries: {
    width: '92%',
    aspectRatio: 2.7 / 4,
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
  hudRow: { flexDirection: 'row', alignItems: 'center' },
  hudPill: {
    marginLeft: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontWeight: '700',
  },
  scoreText: { fontSize: 22, fontWeight: 'bold', color: primaryColor },
  overlayCenter: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 16,
    borderRadius: 12,
  },
  gameOverTitle: { fontSize: 32, fontWeight: 'bold', color: 'red' },
  gameOverStats: { marginTop: 6, fontSize: 18, fontWeight: '700' },
  gameOverHint: { marginTop: 6, opacity: 0.8 },

  // overlays
  overlayFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 18, 33, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '78%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtle: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  hint: { fontSize: 14, fontWeight: '600' },
  dot: { marginHorizontal: 6, opacity: 0.5 },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: '#0b5cff',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryBtnTxt: { color: 'white', fontWeight: '800', letterSpacing: 0.3 },
  countDownBubble: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  countDownTxt: { fontSize: 42, fontWeight: '900', color: '#ff9800' },

  // power up HUD chip
  powerChip: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffd84d',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  powerChipTxt: { fontWeight: '900', marginRight: 6 },
  powerBar: {
    height: 6,
    width: 60,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  powerFill: { height: '100%', backgroundColor: '#00c853' },

  // power-up icon base (sizes overridden at runtime)
  powerIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
  },

  // combo toast
  comboToast: {
    position: 'absolute',
    top: 6,
    right: 12,
    backgroundColor: '#0b1221',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffd84d',
  },
  comboTxt: { color: '#ffd84d', fontWeight: '900', letterSpacing: 0.4 },

  // question dialog
  questionContainer: {
    position: 'absolute',
    top: '25%',
    left: '8%',
    right: '8%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 6,
  },
  questionText: { fontSize: 18, fontWeight: 'bold' },

  // settings
  settingsPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    elevation: 8,
  },
  settingsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  settingsSection: { fontWeight: '700', marginBottom: 6 },
});

export default SnakeGame;
