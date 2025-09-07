import React, { useEffect, useState } from 'react';
import { Text, View, SafeAreaView, StyleSheet, Alert, Button } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';  
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
const SNAKE_INITIAL_POSITION = [{ x: 5, y: 5 }];
const FOOD_INITIAL_POSITION = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 57.2 };
const MOVE_INTERVAL = 50;
const SCORE_INCREMENT = 10;

const primaryColor = '#00BFFF';
const backgroundColor = '#B2EBF2';
 

function SnakeGame({ navigation }: { navigation: any }): JSX.Element {
    const [direction, setDirection] = useState<Direction>(Direction.Right);
    const [snake, setSnake] = useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
    const [food, setFood] = useState<Coordinate>(FOOD_INITIAL_POSITION);
    const [score, setScore] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number>(3); 
    const [foodEaten, setFoodEaten] = useState<number>(0); 
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [isQuestionVisible, setIsQuestionVisible] = useState<boolean>(false); 
    const [showQuestionIcon, setShowQuestionIcon] = useState<boolean>(false);
    const [questionIconPos, setQuestionIconPos] = useState<Coordinate | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Fetch user profile when the component mounts
    useEffect(() => {
        const loadUserProfile = async () => {
            const profile = await fetchUserProfile();
            setUserProfile(profile);
        };
        loadUserProfile();
    }, []);

    // Fetch questions based on the parent_id when the user profile is logged
    useEffect(() => {
        const loadQuestions = async () => {
            if (userProfile) {
                try {
                    console.log('User profile:', userProfile);
                    const questions = await fetchQuestions(userProfile.user_id);
                    console.log('Fetched questions:', questions);
                    if (questions.length > 0) {
                        const randomIndex = Math.floor(Math.random() * questions.length);
                        setCurrentQuestion(questions[randomIndex]);
                    }
                } catch (error) {
                    console.error('Error fetching questions in SnakeGame:', error);
                }
            }
        };
    
        loadQuestions();
    }, [userProfile]);

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
        // No need to randomly pick from hardcoded questions, as we're fetching them
        setIsQuestionVisible(true);
    };

    const answerQuestion = (isCorrect: boolean) => {
        setIsQuestionVisible(false);
        setCurrentQuestion(null);
        Alert.alert(isCorrect ? 'Correct!' : 'Incorrect', isCorrect ? 'You got the answer right!' : 'Sorry, that is not correct.');
        setIsPaused(true);
        setCountdown(3);
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
        {currentQuestion.options && typeof currentQuestion.options === 'object' ? (
            Object.entries(currentQuestion.options).map(([key, option]) => (
                <Button
                    key={key}
                    title={option}
                    onPress={() => answerQuestion(key === currentQuestion.correct_answer)}
                />
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
    color: primaryColor,
    textAlign: 'center',
  },
  questionContainer: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SnakeGame;
