// app/Games/SnakeGame.tsx
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

const CELL = 10;
const SNAKE_INITIAL_POSITION: Coordinate[] = [{ x: 5, y: 5 }];
const FOOD_INITIAL_POSITION: Coordinate = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 58 }; // integer grid
const SCORE_INCREMENT = 10;

const primaryColor = '#00BFFF';
const backgroundColor = '#B2EBF2';

type PowerUpType = 'ghost' | 'slow' | 'bonus';
type SpawnedPowerUp = { type: PowerUpType; pos: Coordinate };
type ActivePowerUp = { type: PowerUpType; until: number } | null;

const POWERUP_DURATION_MS = 8000;
const COMBO_WINDOW_MS = 2000;

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Small inline components */
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

function PowerUpIcon({ kind, x, y }: { kind: PowerUpType; x: number; y: number }) {
  const emoji = kind === 'ghost' ? '👻' : kind === 'slow' ? '🐌' : '⭐';
  return (
    <View style={[styles.powerIcon, { left: x * CELL - 4, top: y * CELL - 4 }]}>
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
    </View>
  );
}

function SnakeGame({ navigation }: { navigation: any }): JSX.Element {
  // --- modes/settings ---
  const [modeKey, setModeKey] = useState<SnakeModeKey>('classic');
  const mode = useMemo(() => SNAKE_MODES[modeKey], [modeKey]);
  const [showSettings, setShowSettings] = useState(false);
  const [speedOffset, setSpeedOffset] = useState(0); // tweak +/- ms

  // --- core game ---
  const [direction, setDirection] = useState<Direction>(Direction.Right);
  const [snake, setSnake] = useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
  const [food, setFood] = useState<Coordinate>(FOOD_INITIAL_POSITION);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(true); // paused until countdown finishes
  const [countdown, setCountdown] = useState<number>(3);
  const [lives, setLives] = useState<number>(2);

  // questions
  const [foodEaten, setFoodEaten] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // optional board goodies (kept simple / off by default)
  const [boardPowerUp, setBoardPowerUp] = useState<SpawnedPowerUp | null>(null);
  const [activePowerUp, setActivePowerUp] = useState<ActivePowerUp>(null);
  const activePowerUpRef = useRef<ActivePowerUp>(null);

  // misc HUD/FX state
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
  const foodRef = useRef(food);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { activePowerUpRef.current = activePowerUp; }, [activePowerUp]);
  useEffect(() => { foodRef.current = food; }, [food]);

  // load user + questions
  useEffect(() => {
    (async () => {
      try { setUserProfile(await fetchUserProfile()); } catch {}
    })();
  }, []);
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

  // build walls for "walls" mode (simple box + cross)
  const walls = useMemo<Coordinate[]>(() => {
    if (!mode.hasWalls) return [];
    const arr: Coordinate[] = [];
    const w = GAME_BOUNDS.xMax;
    const h = GAME_BOUNDS.yMax;
    // frame
    for (let x = 6; x <= w - 6; x++) {
      arr.push({ x, y: 10 });
      arr.push({ x, y: h - 10 });
    }
    for (let y = 14; y <= h - 14; y++) {
      arr.push({ x: 8, y });
      arr.push({ x: w - 8, y });
    }
    // cross
    for (let x = Math.floor(w / 2) - 6; x <= Math.floor(w / 2) + 6; x++) {
      arr.push({ x, y: Math.floor(h / 2) });
    }
    for (let y = Math.floor(h / 2) - 6; y <= Math.floor(h / 2) + 6; y++) {
      arr.push({ x: Math.floor(w / 2), y });
    }
    return arr;
  }, [mode.hasWalls]);

  // countdown start
  useEffect(() => {
    let id: any;
    if (countdown > 0) {
      setIsPaused(true);
      id = setInterval(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      hitFlash.stopAnimation();      
      hitFlash.setValue(0);
      setIsPaused(false);
    }
    return () => clearInterval(id);
  }, [countdown]);

  // --- animations ---
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

  useEffect(() => {
    if (isPaused || isGameOver || countdown > 0) return;
    const id = setInterval(() => moveSnake(), effectiveInterval);
    return () => clearInterval(id);
  }, [effectiveInterval, isPaused, isGameOver, countdown]);

  // helpers
  const equal = (a: Coordinate, b: Coordinate) => a.x === b.x && a.y === b.y;
  const occupied = (p: Coordinate) =>
    snakeRef.current.some((c) => equal(c, p)) || equal(foodRef.current, p) || walls.some(w => equal(w, p));

  const spawnFood = () => {
    let pos = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
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
      hitFlash.stopAnimation();      
      hitFlash.setValue(0);   
      setIsPaused(true);
      setCountdown(3);
    } else {
      setIsGameOver(true);
      setIsPaused(true);
    }
  };

  const activatePowerUp = (type: PowerUpType) => {
    if (type === 'bonus') {
      setBonusPending(true);
      setActivePowerUp({ type, until: Date.now() + 3000 });
      return;
    }
    setActivePowerUp({ type, until: Date.now() + POWERUP_DURATION_MS });
  };

  // power-up expiry ticker
  useEffect(() => {
    if (!activePowerUp) return;
    const t = setInterval(() => {
      if (Date.now() >= (activePowerUpRef.current?.until ?? 0)) {
        setActivePowerUp(null);
        setBonusPending(false);
      }
    }, 200);
    return () => clearInterval(t);
  }, [activePowerUp]);

  const askQuestion = () => setIsQuestionVisible(true);

  const answerQuestion = (isCorrect: boolean) => {
    setIsQuestionVisible(false);
    if (isCorrect) {
      setScore((s) => s + 25);
    }
    setCountdown(3);
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
      if (checkGameOver(newHead, GAME_BOUNDS)) {
        consumeLifeOrEnd();
        return;
      }
    }

    // wall collision (only when not wrapping)
    if (!doWrap && walls.some(w => w.x === newHead.x && w.y === newHead.y)) {
      consumeLifeOrEnd();
      return;
    }

    // self collision
    if (current.slice(1).some((seg) => equal(seg, newHead))) {
      consumeLifeOrEnd();
      return;
    }

    // eats food
    if (checkEatsFood(newHead, foodRef.current, 2)) {
      const now = Date.now();
      const within = now - (lastEatAtRef.current || 0) <= COMBO_WINDOW_MS;
      const nextCombo = within ? combo + 1 : 1;
      lastEatAtRef.current = now;
      setCombo(nextCombo);
      if (nextCombo >= 3) triggerComboToast();

      // points from mode foods (single food used)
      const points = mode.foods[0]?.points ?? SCORE_INCREMENT;
      const comboBonus = (nextCombo - 1) * 2;
      const bonus = bonusPending ? points : 0; // double this bite if bonus
      const gained = points + comboBonus + bonus;

      setScore((s) => {
        const newScore = s + gained;
        if (newScore > highScore) { setHighScore(newScore); persistHighScore(newScore); }
        return newScore;
      });

      setSnake([newHead, ...current]); // grow
      setFoodEaten((n) => n + 1);

      // ask a question every 3rd food
      const willAsk = (foodEaten + 1) % 3 === 0 && currentQuestion;
      if (willAsk) {
        setIsPaused(true);
        setIsQuestionVisible(true);
      }

      spawnFood();
      triggerEatRipple();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }

    // normal move
    setSnake([newHead, ...current.slice(0, -1)]);
  };

  const reloadGame = () => {
    setSnake(SNAKE_INITIAL_POSITION);
    setFood(FOOD_INITIAL_POSITION);
    setScore(0);
    setFoodEaten(0);
    setDirection(Direction.Right);
    setIsGameOver(false);
    setIsPaused(true);
    setCountdown(3);
    setIsQuestionVisible(false);
    setLives(2);
    setActivePowerUp(null);
    setBonusPending(false);
    setCombo(1);
    hitFlash.stopAnimation();
    hitFlash.setValue(0);
    popFood();
  };

  const pauseGame = () => setIsPaused((p) => !p);

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
          <Header reloadGame={reloadGame} pauseGame={pauseGame} isPaused={isPaused} openSettings={() => setShowSettings(true)}>
            <View style={styles.hudRow}>
              <Text style={styles.scoreText}>{score}</Text>
              <Text style={styles.hudPill}>HS {highScore}</Text>
              <Text style={styles.hudPill}>♥ {lives}</Text>
              <Text style={styles.hudPill}>{SNAKE_MODES[modeKey].label}</Text>
              {powerChip}
            </View>
          </Header>

          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : (
            <View style={styles.boundaries}>
              {/* grid */}
              <Grid cols={Math.ceil(GAME_BOUNDS.xMax)} rows={Math.ceil(GAME_BOUNDS.yMax)} cell={CELL} />

              {/* walls */}
              {walls.map((w, i) => (
                <View key={`w${i}`} style={{
                  position: 'absolute',
                  left: w.x * CELL, top: w.y * CELL,
                  width: CELL, height: CELL, backgroundColor: '#263238'
                }} />
              ))}

              {/* actors */}
              <Snake snake={snake} />
              <Animated.View style={{ transform: [{ scale: foodScale }] }}>
                <Food x={food.x} y={food.y} />
              </Animated.View>
              {boardPowerUp && <PowerUpIcon kind={boardPowerUp.type} x={boardPowerUp.pos.x} y={boardPowerUp.pos.y} />}
              {showQuestionIcon && questionIconPos && <QuestionIcon x={questionIconPos.x} y={questionIconPos.y} />}

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
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: '#ff5252', opacity: hitFlash, borderRadius: 16 },
                ]}
              />
            </View>
          )}

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
                    <Button
                      title={String(option)}
                      onPress={() => answerQuestion(key === currentQuestion.correct_answer)}
                    />
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
                  <Button
                    title={`${m.label}${modeKey === k ? ' ✓' : ''}`}
                    onPress={() => setModeKey(k as SnakeModeKey)}
                  />
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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  boundaries: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  countdown: { fontSize: 48, fontWeight: 'bold', color: 'orange' },
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
  // power-up icon on board
  powerIcon: {
    position: 'absolute',
    width: CELL * 1.8,
    height: CELL * 1.8,
    borderRadius: (CELL * 1.8) / 2,
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
