import React, { useEffect, useState } from 'react';
import { Text, View, SafeAreaView, StyleSheet, Alert, Button } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';  
import { Coordinate, Direction, GestureEventType } from './types/types';
import Snake from './Snake';
import { checkGameOver } from './utils/checkGameOver';
import Food from './Food';
import { checkEatsFood } from './utils/checkEatsFood';
import { randomFoodPosition } from './utils/randomFoodPosition';
import Header from './Header';
import { fetchQuestions } from '../backend/fetchquestions'; 
import { supabase } from '../backend/supabase';
import QuestionIcon from './QuestionIcon'; // NEW IMPORT

const SNAKE_INITIAL_POSITION = [{ x: 5, y: 5 }];
const FOOD_INITIAL_POSITION = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 63 };
const MOVE_INTERVAL = 50;
const SCORE_INCREMENT = 10;

const primaryColor = 'blue'; 
const backgroundColor = 'gray'; 

interface SnakeGameProps {
    navigation: any;
}

function SnakeGame({ navigation }: SnakeGameProps): JSX.Element { 
    const [childId, setChildId] = useState<string | null>(null); 
    const [direction, setDirection] = useState<Direction>(Direction.Right);
    const [snake, setSnake] = useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
    const [food, setFood] = useState<Coordinate>(FOOD_INITIAL_POSITION);
    const [score, setScore] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number>(3); 
    const [foodEaten, setFoodEaten] = useState<number>(0); 
    const [questions, setQuestions] = useState<any[]>([]); 
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false); 
    const [showQuestionIcon, setShowQuestionIcon] = useState<boolean>(false);
    const [questionIconPos, setQuestionIconPos] = useState<Coordinate | null>(null);

    useEffect(() => {
        const fetchChildId = async () => {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError) return console.error('Error fetching user:', authError);
            const user = authData?.user;
            if (user) {
                const { data: childData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id') 
                    .eq('parent_id', user.id);
                if (profileError) return console.error('Error fetching child ID:', profileError);
                if (childData && childData.length > 0) setChildId(childData[0].id);
            }
        };
        fetchChildId();
    }, []);

    useEffect(() => {
        if (childId) {
            const loadQuestions = async () => {
                try {
                    const fetchedQuestions = await fetchQuestions(childId); 
                    setQuestions(fetchedQuestions);
                } catch (error) {
                    console.error('Error fetching questions:', error);
                }
            };
            loadQuestions();
        }
    }, [childId]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (countdown > 0) {
            intervalId = setInterval(() => setCountdown(prev => prev - 1), 1000);
        } else if (countdown === 0) {
            setIsPaused(false); 
        }
        return () => clearInterval(intervalId);
    }, [countdown]);

    useEffect(() => {
        if (!isPaused && countdown === 0) {
            const intervalId = setInterval(() => {
                moveSnake();
            }, MOVE_INTERVAL);
            return () => clearInterval(intervalId);
        }
    }, [snake, isPaused, countdown]);

    const moveSnake = () => {
        if (isGameOver) return;

        const snakeHead = snake[0];
        const newHead = { ...snakeHead };

        switch (direction) {
            case Direction.Up: newHead.y -= 1; break;
            case Direction.Down: newHead.y += 1; break;
            case Direction.Left: newHead.x -= 1; break;
            case Direction.Right: newHead.x += 1; break;
        }

        if (checkGameOver(newHead, GAME_BOUNDS)) {
            setIsGameOver(true);
            setIsPaused(true);
            return; 
        }

        if (checkEatsFood(newHead, food, 2)) {
            setFood(randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax));
            setSnake([newHead, ...snake]);
            setScore(score + SCORE_INCREMENT);
            const newFoodEaten = foodEaten + 1;
            setFoodEaten(newFoodEaten);

            if (newFoodEaten % 2 === 0) {
                const questionPos = randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax);
                setQuestionIconPos(questionPos);
                setShowQuestionIcon(true);
            }
        } else if (showQuestionIcon && questionIconPos && checkEatsFood(newHead, questionIconPos, 2)) {
            setShowQuestionIcon(false);
            setIsPaused(true);
            askQuestion();
            setSnake([newHead, ...snake]);
        } else {
            setSnake([newHead, ...snake.slice(0, -1)]);
        }
    };

    const askQuestion = () => {
        if (questions.length > 0) {
            const randomIndex = Math.floor(Math.random() * questions.length);
            setCurrentQuestion(questions[randomIndex]);
            setIsQuestionVisible(true);
        }
    };

    const answerQuestion = (isCorrect: boolean) => {
        setIsQuestionVisible(false);
        setCurrentQuestion(null);
        if (isCorrect) {
            Alert.alert('Correct!', 'You got the answer right!');
        } else {
            Alert.alert('Incorrect', 'Sorry, that is not correct.');
        }
    };

    const handleGesture = (event: GestureEventType) => {
        if (isGameOver || isQuestionVisible) return;

        const { translationX, translationY } = event.nativeEvent;
        if (Math.abs(translationX) > Math.abs(translationY)) {
            translationX > 0 ? setDirection(Direction.Right) : setDirection(Direction.Left);
        } else {
            translationY > 0 ? setDirection(Direction.Down) : setDirection(Direction.Up);
        }
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
    };

    const pauseGame = () => {
        setIsPaused(!isPaused);
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>  
            <PanGestureHandler onGestureEvent={handleGesture}>
                <SafeAreaView style={styles.container}>
                    <Header reloadGame={reloadGame} pauseGame={pauseGame} isPaused={isPaused}>
                        <Text style={styles.scoreText}>{score}</Text>
                    </Header>

                    {countdown > 0 ? (
                        <Text style={styles.countdown}>{countdown}</Text>
                    ) : (
                        <View style={styles.boundaries}>
                            <Snake snake={snake} />
                            <Food x={food.x} y={food.y} />
                            {showQuestionIcon && questionIconPos && (
                                <QuestionIcon x={questionIconPos.x} y={questionIconPos.y} />
                            )}
                        </View>
                    )}

                    {isGameOver && (
                        <Text style={styles.gameOverText}>
                            Game Over{'\n'}Score: {score}
                        </Text>
                    )}

                    {isQuestionVisible && currentQuestion && (
                        <View style={styles.questionContainer}>
                            <Text style={styles.questionText}>{currentQuestion.question}</Text>
                            {currentQuestion.options.map((option: string, index: number) => (
                                <Button
                                    key={index}
                                    title={option}
                                    onPress={() => answerQuestion(option === currentQuestion.correct_answer)}
                                />
                            ))}
                        </View>
                    )}
                </SafeAreaView>
            </PanGestureHandler>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boundaries: {
    flex: 1,
    width: '100%', 
    height: '100%',
    borderColor: primaryColor,
    borderWidth: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: backgroundColor,
  },
  countdown: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'orange',
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "red",
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    textAlign: "center",
    zIndex: 1,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "orange"
  },
  questionContainer: {
      position: 'absolute',
      top: '40%',
      left: '10%',
      right: '10%',
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 10,
      elevation: 5,
      zIndex: 2,
      alignItems: 'center',
      justifyContent: 'center',
  },
  questionText: {
      fontSize: 24,
      marginBottom: 20,
  },
});

export default SnakeGame;
