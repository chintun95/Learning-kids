//for snake  
import React from 'react';
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
const GAME_BOUNDS = { xMin: 0, xMax: 35, yMin: 0, yMax: 69 };
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

    React.useEffect(() => {
        if (!isGameOver) {
          const intervalId = setInterval(() => {
            !isPaused && moveSnake();
          }, MOVE_INTERVAL);
          return () => clearInterval(intervalId);
        }
      }, [snake, isGameOver, isPaused]);
    
      /*const moveSnake = () => {
        const snakeHead = snake[0];
        const newHead = { ...snakeHead }; // create a new head object to avoid mutating the original head
    
        // GAME OVER
        if (checkGameOver(snakeHead, GAME_BOUNDS)) {
          setIsGameOver((prev) => !prev);
          return;
        }
    
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
          default:
            break;
        }
    
        if (checkEatsFood(newHead, food, 2)) {
            setFood(randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax));
            setSnake([newHead, ...snake]);
            setScore(score + SCORE_INCREMENT);
        } else {
          setSnake([newHead, ...snake.slice(0, -1)]);
        }
      };
*/
const moveSnake = () => {
  const snakeHead = snake[0];
  const newHead = { ...snakeHead }; // Create a new head object to avoid mutating the original head

  // Check for Game Over based on boundaries
  if (checkGameOver(snakeHead, GAME_BOUNDS)) {
    setIsGameOver(true); // Set game over when snake hits the boundary
    return;
  }

  switch (direction) {
    case Direction.Up:
      if (newHead.y > GAME_BOUNDS.yMin) newHead.y -= 1; // Prevent moving out of bounds upwards
      break;
    case Direction.Down:
      if (newHead.y < GAME_BOUNDS.yMax) newHead.y += 1; // Prevent moving out of bounds downwards
      break;
    case Direction.Left:
      if (newHead.x > GAME_BOUNDS.xMin) newHead.x -= 1; // Prevent moving out of bounds left
      break;
    case Direction.Right:
      if (newHead.x < GAME_BOUNDS.xMax) newHead.x += 1; // Prevent moving out of bounds right
      break;
    default:
      break;
  }

  // If the snake eats food, spawn new food and increase the score
  if (checkEatsFood(newHead, food, 2)) {
    setFood(randomFoodPosition(GAME_BOUNDS.xMax, GAME_BOUNDS.yMax));
    setSnake([newHead, ...snake]);
    setScore(score + SCORE_INCREMENT);
  } else {
    setSnake([newHead, ...snake.slice(0, -1)]);
  }
};
  

          const handleGesture = (event: GestureEventType) => {
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
            setSnake(SNAKE_INITIAL_POSITION);
            setFood(FOOD_INITIAL_POSITION);
            setIsGameOver(false);
            setScore(0);
            setDirection(Direction.Right);
            setIsPaused(false);
          };

          const pauseGame = () => {
            setIsPaused(!isPaused);
          };
        
  


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>  {/* Wrap the entire component */}
      <PanGestureHandler onGestureEvent={handleGesture}>
        <SafeAreaView style={styles.container}>
            <Header
                reloadGame={reloadGame}
                pauseGame={pauseGame}
                isPaused={isPaused}
            >
                <Text style={{
                    fontSize:22,
                    fontWeight: "bold",
                    color: "orange"
                }}>{score}</Text>
            </Header>
          <View style={styles.boundaries}>
            <Snake snake={snake} />
            <Food x={food.x} y={food.y} />
          </View>
        </SafeAreaView>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

export default SnakeGame;

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
});
