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
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 58 }; // all integers now
const BASE_MOVE_INTERVAL = 90;
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

function SnakeGame({ navigation }: { navigation: any }): JSX.Element {
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

  // questions
  const [foodEaten, setFoodEaten] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // refs
  const directionRef = useRef(direction);
  const snakeRef = useRef(snake);
  const pausedRef = useRef(isPaused);
  const gameOverRef = useRef(isGameOver);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameOverRef.current = isGameOver; }, [isGameOver]);

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

  // countdown
  useEffect(() => {
    let id: any;
    if (countdown > 0) id = setInterval(() => setCountdown((c) => c - 1), 1000);
    else if (countdown === 0) setIsPaused(false);
    return () => clearInterval(id);
  }, [countdown]);

  const effectiveInterval = useMemo(() => {
    const level = 1 + Math.floor(score / 50);
    const speedUp = Math.max(0, level - 1) * 6;
    return Math.max(55, BASE_MOVE_INTERVAL - speedUp);
  }, [score]);

  useEffect(() => {
    if (isPaused || isGameOver || countdown > 0) return;
    const id = setInterval(() => moveSnake(), effectiveInterval);
    return () => clearInterval(id);
  }, [effectiveInterval, isPaused, isGameOver, countdown]);

  // helpers
  const equal = (a: Coordinate, b: Coordinate) => a.x === b.x && a.y === b.y;
  const occupied = (p: Coordinate) => snakeRef.current.some((c) => equal(c, p)) || equal(food, p);

  const spawnFood = () => {
    let pos = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
    while (occupied(pos)) pos = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
    setFood(pos);
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

    // ghost power wrap
    if (activePowerUpRef.current?.type === 'ghost') {
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

    if (current.slice(1).some((seg) => equal(seg, newHead))) {
      return consumeLifeOrEnd();
    }

    // eats food
    if (checkEatsFood(newHead, food, 2)) {
      const now = Date.now();
      const within = now - (lastEatAtRef.current || 0) <= COMBO_WINDOW_MS;
      const nextCombo = within ? combo + 1 : 1;
      lastEatAtRef.current = now;
      setCombo(nextCombo);
      if (nextCombo >= 3) triggerComboToast();

      const base = SCORE_INCREMENT;
      const comboBonus = (nextCombo - 1) * 2;
      const bonus = bonusPending ? base : 0; // double this bite
      const gained = base + comboBonus + bonus;

      setScore((s) => {
        const newScore = s + SCORE_INCREMENT;
        if (newScore > highScore) { setHighScore(newScore); persistHighScore(newScore); }
        return newScore;
      });

      setSnake([newHead, ...current]); // grow

      const nextFoodEaten = foodEaten + 1;
      setFoodEaten(nextFoodEaten);

      // ask a question every 3rd food
      if (nextFoodEaten % 3 === 0 && currentQuestion) {
        setIsPaused(true);
        setIsQuestionVisible(true);
      }

      spawnFood();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }

    // normal move
    setSnake([newHead, ...current.slice(0, -1)]);
  };

  const consumeLifeOrEnd = () => {
    if (lives > 0) {
      setLives((l) => l - 1);
      setSnake(SNAKE_INITIAL_POSITION);
      setDirection(Direction.Right);
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={handleGesture}>
        <SafeAreaView style={styles.container}>
          <Header reloadGame={reloadGame} pauseGame={() => setIsPaused((p) => !p)} isPaused={isPaused}>
            <View style={styles.hudRow}>
              <Text style={styles.scoreText}>{score}</Text>
              <Text style={styles.hudPill}>HS {highScore}</Text>
              <Text style={styles.hudPill}>♥ {lives}</Text>
              {powerChip}
            </View>
          </Header>

          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : (
            <View style={styles.boundaries}>
              {/* grid */}
              <Grid cols={Math.ceil(GAME_BOUNDS.xMax)} rows={Math.ceil(GAME_BOUNDS.yMax)} cell={CELL} />

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
});

export default SnakeGame;
