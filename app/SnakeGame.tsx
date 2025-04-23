import React, { useEffect } from 'react';
import { Text, View, SafeAreaView, StyleSheet } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';  
import { Coordinate, Direction, GestureEventType } from './types/types';
import Snake from './Snake';
import { checkGameOver } from './utils/checkGameOver';
import Food from './Food';
import { checkEatsFood } from './utils/checkEatsFood';
import { randomFoodPosition } from './utils/randomFoodPosition';
import Header from './Header'; 

// Constants for the game state
const SNAKE_INITIAL_POSITION = [{ x: 5, y: 5 }];
const FOOD_INITIAL_POSITION = { x: 5, y: 20 };
const GAME_BOUNDS = { xMin: 0, xMax: 36, yMin: 0, yMax: 63 };
const MOVE_INTERVAL = 50;
const SCORE_INCREMENT = 10;

const primaryColor = 'blue'; 
const backgroundColor = 'gray'; 

function SnakeGame(): JSX.Element {
    const [direction, setDirection] = React.useState<Direction>(Direction.Right);
    const [snake, setSnake] = React.useState<Coordinate[]>(SNAKE_INITIAL_POSITION);
    const [food, setFood] = React.useState<Coordinate>(FOOD_INITIAL_POSITION);
    const [score, setScore] = React.useState<number>(0);
    const [isGameOver, setIsGameOver] = React.useState<boolean>(false);
    const [isPaused, setIsPaused] = React.useState<boolean>(false);
    const [countdown, setCountdown] = React.useState<number>(3); // Countdown state

    // Countdown effect
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (countdown > 0) {
            intervalId = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (countdown === 0) {
            // Start the game after countdown reaches 0
            setIsPaused(false);
        }

        return () => clearInterval(intervalId);
    }, [countdown]);

    // Game loop and movement logic only starts after countdown finishes
    useEffect(() => {
        if (!isPaused && countdown === 0) {
            const intervalId = setInterval(() => {
                moveSnake();
            }, MOVE_INTERVAL);
            return () => clearInterval(intervalId);
        }
    }, [snake, isPaused, countdown]);

    const moveSnake = () => {
        if (isGameOver) return;  // Prevent movement if the game is over
        
        const snakeHead = snake[0];
        const newHead = { ...snakeHead };
    
        // Move the head based on direction
        switch (direction) {
            case Direction.Up:
                newHead.y -= 1;
                break;
            case Direction.Down:
                newHead.y += 1;
                break;
            case Direction.Left:
                newHead.x -= 1;
                break;
            case Direction.Right:
                newHead.x += 1;
                break;
        }

        // Check for game over using the new position
        if (checkGameOver(newHead, GAME_BOUNDS)) {
            setIsGameOver(true);
            setIsPaused(true);
            return;  // Exit the function early if the game is over
        }
    
        if (checkEatsFood(newHead, food, 2)) {
            setFood(randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax));
            setSnake([newHead, ...snake]);
            setScore(score + SCORE_INCREMENT);
        } else {
            setSnake([newHead, ...snake.slice(0, -1)]);
        }
    };
    
    const handleGesture = (event: GestureEventType) => {
        if (isGameOver) return; // Prevent movement when game is over

        const { translationX, translationY } = event.nativeEvent;
        if (Math.abs(translationX) > Math.abs(translationY)) {
            if (translationX > 0) {
                setDirection(Direction.Right);
            } else {
                setDirection(Direction.Left);
            }
        } else {
            if (translationY > 0) {
                setDirection(Direction.Down);
            } else {
                setDirection(Direction.Up);
            }
        }
    };

    const reloadGame = () => {
        // Reset everything when game is reloaded
        setSnake(SNAKE_INITIAL_POSITION);
        setFood(FOOD_INITIAL_POSITION);
        setScore(0); // Reset score
        setDirection(Direction.Right);
        setIsGameOver(false);  // Reset game over state
        setIsPaused(false);     // Ensure the game is active
        setCountdown(3);        // Reset countdown when restarting the game
    };

    const pauseGame = () => {
        setIsPaused(!isPaused);
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>  
            <PanGestureHandler onGestureEvent={handleGesture}>
                <SafeAreaView style={styles.container}>
                    <Header
                        reloadGame={reloadGame}
                        pauseGame={pauseGame}
                        isPaused={isPaused}
                    >
                        <Text style={{
                            fontSize: 22,
                            fontWeight: "bold",
                            color: "orange"
                        }}>{score}</Text>
                    </Header>

                    {/* Countdown display */}
                    {countdown > 0 ? (
                        <Text style={styles.countdown}>{countdown}</Text>
                    ) : (
                        <View style={styles.boundaries}>
                            <Snake snake={snake} />
                            <Food x={food.x} y={food.y} />
                        </View>
                    )}

                    {/* Game Over message */}
                    {isGameOver && (
                        <Text style={styles.gameOverText}>
                            Game Over{'\n'}Score: {score}{'\n'}
                            <Text onPress={reloadGame} style={styles.restartText}>
                                Tap to Restart
                            </Text>
                        </Text>
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
  restartText: {
    fontSize: 18,
    color: 'white',
    textDecorationLine: 'underline',
  }
});

export default SnakeGame;