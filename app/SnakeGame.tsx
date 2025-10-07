// app/Games/SnakeGame.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, SafeAreaView, StyleSheet, Button, Animated, Pressable } from 'react-native';
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
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 57.2 };
const SCORE_INCREMENT = 10; // fallback

const primaryColor = '#00BFFF';
const backgroundColor = '#B2EBF2';

type PowerUpType = 'ghost' | 'slow' | 'bonus';
type SpawnedPowerUp = { type: PowerUpType; pos: Coordinate };
type ActivePowerUp = { type: PowerUpType; until: number } | null;

const POWERUP_DURATION_MS = 8000;
const COMBO_WINDOW_MS = 2000;

type Cell = { x: number; y: number };

function SnakeGame(): JSX.Element {
  // --- mode & settings ---
  const [modeKey, setModeKey] = useState<SnakeModeKey>('classic');
  const mode = SNAKE_MODES[modeKey];
  const [speedOffset, setSpeedOffset] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // --- core game ---
  const [direction, setDirection] = useState<Direction>(Direction.Right);
  const [snake, setSnake] = useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
  const [food, setFood] = useState<Coordinate>(FOOD_INITIAL_POSITION);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [lives, setLives] = useState<number>(2);

  // --- meta / feel-good ---
  const [combo, setCombo] = useState<number>(1);
  const lastEatAtRef = useRef<number>(0);
  const comboAnim = useRef(new Animated.Value(0)).current;

  // overlays & chip animation
  const eatRipple = useRef(new Animated.Value(0)).current;
  const hitFlash  = useRef(new Animated.Value(0)).current;
  const chipPulse = useRef(new Animated.Value(1)).current;

  // food pop wrapper
  const foodScale = useRef(new Animated.Value(1)).current;

  // --- questions ---
  const [foodEaten, setFoodEaten] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false);
  const [showQuestionIcon, setShowQuestionIcon] = useState<boolean>(false);
  const [questionIconPos, setQuestionIconPos] = useState<Coordinate | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // --- power-ups ---
  const [boardPowerUp, setBoardPowerUp] = useState<SpawnedPowerUp | null>(null);
  const [activePowerUp, setActivePowerUp] = useState<ActivePowerUp>(null);
  const [bonusPending, setBonusPending] = useState<boolean>(false);

  // --- walls (for modes with obstacles) ---
  const [walls, setWalls] = useState<Cell[]>([]);

  // --- refs to avoid stale closures in interval ---
  const directionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const pausedRef = useRef(isPaused);
  const gameOverRef = useRef(isGameOver);
  const activePowerUpRef = useRef<ActivePowerUp>(null);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { activePowerUpRef.current = activePowerUp; }, [activePowerUp]);

  // profile + questions
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

  // high score
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@react-native-async-storage/async-storage');
        const raw = await mod.default.getItem('@snake_high_score');
        if (!cancelled && raw) setHighScore(Number(raw) || 0);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);
  const persistHighScore = async (s: number) => {
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      await mod.default.setItem('@snake_high_score', String(s));
    } catch {}
  };

  // countdown
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (countdown > 0) intervalId = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    else if (countdown === 0) setIsPaused(false);
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [countdown]);

  // build walls when mode changes
  const buildWalls = useCallback(() => {
    if (!mode.hasWalls) { setWalls([]); return; }
    const inset = 4;
    const cells: Cell[] = [];
    for (let x = inset; x <= GAME_BOUNDS.xMax - inset; x++) {
      cells.push({ x, y: inset }, { x, y: GAME_BOUNDS.yMax - inset });
    }
    for (let y = inset; y <= GAME_BOUNDS.yMax - inset; y++) {
      cells.push({ x: inset, y }, { x: GAME_BOUNDS.xMax - inset, y });
    }
    setWalls(cells);
  }, [mode.hasWalls]);
  useEffect(() => { buildWalls(); }, [buildWalls]);

  // dynamic speed from mode + offset
  const level = useMemo(() => 1 + Math.floor(score / 50), [score]);
  const effectiveInterval = useMemo(() => {
    const speedUp = Math.max(0, level - 1) * 6; // -6ms per level
    let ms = Math.max(55, mode.baseSpeedMs + speedOffset - speedUp);
    if (activePowerUp?.type === 'slow') ms = Math.round(ms * 1.6);
    return ms;
  }, [level, activePowerUp, mode.baseSpeedMs, speedOffset]);

  // main loop
  useEffect(() => {
    if (isPaused || isGameOver || countdown > 0) return;
    const id = setInterval(() => moveSnake(), effectiveInterval);
    return () => clearInterval(id);
  }, [effectiveInterval, isPaused, isGameOver, countdown]);

  // power-up expiry tick
  useEffect(() => {
    if (!activePowerUp) return;
    const t = setInterval(() => {
      if (activePowerUpRef.current && Date.now() >= activePowerUpRef.current.until) setActivePowerUp(null);
    }, 200);
    return () => clearInterval(t);
  }, [activePowerUp]);

  // pulse chip while active
  useEffect(() => {
    if (!activePowerUp) return;
    chipPulse.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chipPulse, { toValue: 1.06, duration: 400, useNativeDriver: true }),
        Animated.timing(chipPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [activePowerUp, chipPulse]);

  // pop food when it appears/moves
  useEffect(() => {
    foodScale.setValue(0.6);
    Animated.spring(foodScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [food.x, food.y, foodScale]);

  // helpers
  const equal = (a: Coordinate, b: Coordinate) => a.x === b.x && a.y === b.y;
  const occupied = (p: Coordinate, extra: Coordinate[] = []) =>
    snakeRef.current.some((c) => equal(c, p)) || equal(food, p) || extra.some((c) => equal(c, p));

  const safeRandomCell = (exclude: Coordinate[] = []) => {
    let p = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
    let tries = 0;
    while (occupied(p, exclude) && tries < 200) {
      p = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
      tries++;
    }
    return p;
  };

  const spawnFood = () => setFood(safeRandomCell(boardPowerUp ? [boardPowerUp.pos] : []));

  const spawnPowerUp = () => {
    if (boardPowerUp || activePowerUp) return;
    const r = Math.random();
    const type: PowerUpType = r < 0.34 ? 'ghost' : r < 0.67 ? 'slow' : 'bonus';
    setBoardPowerUp({ type, pos: safeRandomCell([food]) });
  };

  const triggerComboToast = () => {
    comboAnim.setValue(0);
    Animated.timing(comboAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start(() => {
      Animated.timing(comboAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    });
  };

  // movement
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

    // wrap if mode says so (ghost still stacks as a bonus)
    if (mode.wrap || activePowerUpRef.current?.type === 'ghost') {
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
    if (!mode.wrap && walls.some(w => w.x === newHead.x && w.y === newHead.y)) {
      consumeLifeOrEnd();
      return;
    }

    // self-collision
    if (current.slice(1).some((seg) => equal(seg, newHead))) {
      consumeLifeOrEnd();
      return;
    }

    // eats food
    if (checkEatsFood(newHead, food, 2)) {
      const now = Date.now();
      const within = now - (lastEatAtRef.current || 0) <= COMBO_WINDOW_MS;
      const nextCombo = within ? combo + 1 : 1;
      lastEatAtRef.current = now;
      setCombo(nextCombo);
      if (nextCombo >= 3) triggerComboToast();

      // score from mode (fallback to old constant)
      const base = mode.foods[0]?.points ?? SCORE_INCREMENT;
      const comboBonus = (nextCombo - 1) * 2;
      const bonus = bonusPending ? base : 0; // double this bite
      const gained = base + comboBonus + bonus;

      setScore((s) => {
        const newScore = s + gained;
        if (newScore > highScore) { setHighScore(newScore); persistHighScore(newScore); }
        return newScore;
      });

      // eat ripple
      eatRipple.setValue(0);
      Animated.timing(eatRipple, { toValue: 1, duration: 350, useNativeDriver: true }).start();

      setSnake([newHead, ...current]); // grow
      spawnFood();
      setFoodEaten((n) => {
        const v = n + 1;
        if (v % 3 === 0) {
          const qPos = safeRandomCell(boardPowerUp ? [boardPowerUp.pos] : []);
          setQuestionIconPos(qPos);
          setShowQuestionIcon(true);
        } else if (v % 4 === 0) {
          spawnPowerUp();
        }
        return v;
      });

      if (bonusPending) setBonusPending(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }

    // eats power-up
    if (boardPowerUp && checkEatsFood(newHead, boardPowerUp.pos, 2)) {
      activatePowerUp(boardPowerUp.type);
      setBoardPowerUp(null);
      setSnake([newHead, ...current.slice(0, -1)]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }

    // eats question icon
    if (showQuestionIcon && questionIconPos && checkEatsFood(newHead, questionIconPos, 2)) {
      setShowQuestionIcon(false);
      setIsPaused(true);
      setIsQuestionVisible(true);
      setSnake([newHead, ...current.slice(0, -1)]);
      return;
    }

    // normal move
    setSnake([newHead, ...current.slice(0, -1)]);
  };

  const flashHit = () => {
    hitFlash.setValue(0.7);
    Animated.timing(hitFlash, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  };

  const consumeLifeOrEnd = () => {
    if (lives > 0) {
      setLives((l) => l - 1);
      flashHit();
      // soft reset (keep score/level)
      setSnake(SNAKE_INITIAL_POSITION);
      setDirection(Direction.Right);
      setIsPaused(true);
      setCountdown(3);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else {
      setIsGameOver(true);
      setIsPaused(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
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

  const answerQuestion = (isCorrect: boolean) => {
    setIsQuestionVisible(false);
    if (isCorrect) {
      setScore((s) => s + 25);
      const types: PowerUpType[] = ['ghost', 'slow', 'bonus'];
      activatePowerUp(types[Math.floor(Math.random() * types.length)]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setCountdown(3);
  };

  const handleGesture = (event: GestureEventType) => {
    if (isGameOver || isQuestionVisible) return;
    const { translationX, translationY } = event.nativeEvent;
    const absX = Math.abs(translationX);
    const absY = Math.abs(translationY);
    const next = absX > absY
      ? (translationX > 0 ? Direction.Right : Direction.Left)
      : (translationY > 0 ? Direction.Down : Direction.Up);
    const opposite =
      (direction === Direction.Left && next === Direction.Right) ||
      (direction === Direction.Right && next === Direction.Left) ||
      (direction === Direction.Up && next === Direction.Down) ||
      (direction === Direction.Down && next === Direction.Up);
    if (!opposite) setDirection(next);
  };

  const reloadGame = () => {
    setSnake(SNAKE_INITIAL_POSITION);
    setFood(FOOD_INITIAL_POSITION);
    setScore(0);
    setFoodEaten(0);
    setDirection(Direction.Right);
    setIsGameOver(false);
    setIsPaused(false);
    setCountdown(3);
    setIsQuestionVisible(false);
    setShowQuestionIcon(false);
    setQuestionIconPos(null);
    setLives(2);
    setBoardPowerUp(null);
    setActivePowerUp(null);
    setBonusPending(false);
    setCombo(1);
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

  const theme = { head: '#1e88e5', body: '#43a047', glow: '#1e88e5' };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={handleGesture}>
        <SafeAreaView style={styles.container}>
          <Header reloadGame={reloadGame} pauseGame={pauseGame} isPaused={isPaused}>
            <View style={styles.hudRow}>
              <Text style={styles.scoreText}>{score}</Text>
              <Text style={styles.hudPill}>HS {highScore}</Text>
              <Text style={styles.hudPill}>LV {level}</Text>
              <Text style={styles.hudPill}>♥ {lives}</Text>
              {powerChip}

              {/* Settings button */}
              <Pressable onPress={() => setShowSettings(true)} style={{ marginLeft: 8 }}>
                <Text style={[styles.hudPill, { paddingHorizontal: 10 }]}>⚙️</Text>
              </Pressable>
            </View>
          </Header>

          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown > 0 ? countdown : 'GO!'}</Text>
          ) : (
            <View style={styles.boundaries}>
              {/* simple grid tint removed for cleanliness; re-add if you want */}
              {/* walls */}
              {walls.map((w, i) => (
                <View key={i} style={{
                  position:'absolute',
                  left: w.x * CELL, top: w.y * CELL,
                  width: 10, height: 10,
                  backgroundColor: '#0a2540', opacity: 0.6, borderRadius: 2
                }}/>
              ))}

              {/* actors */}
              <Snake snake={snake} theme={theme} />
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
              <Text style={styles.gameOverHint}>Tap the reload to play again</Text>
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

function PowerProgress({ until }: { until: number }) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 120);
    return () => clearInterval(id);
  }, []);
  const pct = Math.max(0, Math.min(1, 1 - (until - Date.now()) / POWERUP_DURATION_MS));
  return (
    <View style={styles.powerBar}>
      <View style={[styles.powerFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

function PowerUpIcon({ kind, x, y }: { kind: PowerUpType; x: number; y: number }) {
  const label = kind === 'ghost' ? '👻' : kind === 'slow' ? '🐌' : '⭐️';
  return (
    <View style={[styles.powerIcon, { left: x * CELL, top: y * CELL }]}>
      <Text style={{ fontSize: 14 }}>{label}</Text>
    </View>
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
    // removed heavy border for Google-like clean canvas
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
    overflow: 'hidden',
    fontWeight: '700',
  },
  scoreText: { fontSize: 22, fontWeight: 'bold', color: primaryColor, textAlign: 'center' },

  // question
  questionContainer: {
    position: 'absolute',
    top: '25%',
    left: '8%',
    right: '8%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  questionText: { fontSize: 18, fontWeight: 'bold' },

  // game over
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

  // combo toast (sharper look)
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
    top: '22%',
    left: '8%',
    right: '8%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  settingsTitle: { fontWeight: '900', fontSize: 18, marginBottom: 8 },
  settingsSection: { fontWeight: '700', marginBottom: 6 },
});

export default SnakeGame;
