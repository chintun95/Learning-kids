// file: app/Games/SnakeGame.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const CELL = 10;
const SNAKE_INITIAL_POSITION: Coordinate[] = [{ x: 5, y: 5 }];
const FOOD_INITIAL_POSITION: Coordinate = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 58 }; // all integers now
const BASE_MOVE_INTERVAL = 90;
const SCORE_INCREMENT = 10;

const primaryColor = '#00BFFF';
const backgroundColor = '#B2EBF2';

function SnakeGame({ navigation }: { navigation: any }): JSX.Element {
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

    if (checkGameOver(newHead, GAME_BOUNDS)) {
      return consumeLifeOrEnd();
    }

    if (current.slice(1).some((seg) => equal(seg, newHead))) {
      return consumeLifeOrEnd();
    }

    // eats food
    if (checkEatsFood(newHead, food)) {
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
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={handleGesture}>
        <SafeAreaView style={styles.container}>
          <Header reloadGame={reloadGame} pauseGame={() => setIsPaused((p) => !p)} isPaused={isPaused}>
            <View style={styles.hudRow}>
              <Text style={styles.scoreText}>{score}</Text>
              <Text style={styles.hudPill}>HS {highScore}</Text>
              <Text style={styles.hudPill}>♥ {lives}</Text>
            </View>
          </Header>

          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : (
            <View style={styles.boundaries}>
              <Snake snake={snake} />
              <Food x={food.x} y={food.y} />
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
    borderColor: primaryColor,
    borderWidth: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor,
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
});

export default SnakeGame;
