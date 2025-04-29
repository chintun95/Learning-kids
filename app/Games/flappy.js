/* Flappy Bird Clone Game */

import { StatusBar } from "expo-status-bar";
import React, {useEffect, useState} from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GameEngine } from "react-native-game-engine";
import getGameEntities from "../../entities/games-index";
import Physics from '../../entities/flappy/physics';
import { 
    QuestionScreen, 
    getRandomQuestion, 
    checkAnswer, 
    calculateBonus, 
    shouldShowQuestion 
  } from '../../app/QuestionsManager';

export default function startFlappyGame() {
    const [running, setRunning] = useState(false)
    const [gameEngine, setGameEngine] = useState(null)
    const [currentPoints, setCurrentPoints] = useState(0)
    const [gameState, setGameState] = useState("menu");
    const [currentQuestion, setCurrentQuestion] = useState(null);

    useEffect(() => {
        setRunning(false)
        setGameState("menu");
    }, [])

    //function to handle answers
    const handleAnswer = (selectedAnswer) => {
        const isCorrect = checkAnswer(currentQuestion, selectedAnswer);
        const bonusPoints = calculateBonus(isCorrect);
        
        // Add bonus points for correct answers
        if (bonusPoints > 0) {
            setCurrentPoints(currentPoints + bonusPoints);
        }
        
        // Resume game
        setGameState("running");
        setRunning(true);
        setCurrentQuestion(null);
    };

    return (
        <View style={{flex: 1}}>
            <Text style={{textAlign: 'center', fontSize: 40, fontWeight: 'bold', margin: 20}}>{currentPoints}</Text>
            <GameEngine
                ref={(ref) => {setGameEngine(ref)}}
                systems={[Physics]}
                entities={getGameEntities('flappy')}
                running={running}
                onEvent={(e) => {
                    switch(e.type){
                        case 'game_over':
                            setRunning(false)
                            setGameState("game_over")
                            gameEngine.stop()
                            break;
                        case 'new_point':
                            const newPoints = currentPoints + 1
                            setCurrentPoints(newPoints)

                            //show question every 5 points (make this variable at later date)
                            if(shouldShowQuestion(newPoints)) {
                                setRunning(false)
                                setGameState("question")
                                setCurrentQuestion(getRandomQuestion());
                            }
                            break;
                    }
                }}
                style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,}}
            >
                <StatusBar style="auto" hidden={true}/>
            </GameEngine>
            {/* Menu Screen */}
            {gameState === "menu" && (
                <View style={styles.menuContainer}>
                    <TouchableOpacity 
                        style={styles.startButton}
                        onPress={() => {
                            setCurrentPoints(0);
                            setRunning(true);
                            setGameState("running");
                            gameEngine.swap(getGameEntities('flappy'));
                        }}
                    >
                        <Text style={styles.buttonText}>START GAME</Text>
                    </TouchableOpacity>
                </View>
            )}
            
            {/* Game Over Screen */}
            {gameState === "game_over" && (
                <View style={styles.menuContainer}>
                    <Text style={styles.gameOverText}>Game Over!</Text>
                    <Text style={styles.scoreText}>Score: {currentPoints}</Text>
                    <TouchableOpacity 
                        style={styles.startButton}
                        onPress={() => {
                            setCurrentPoints(0);
                            setRunning(true);
                            setGameState("running");
                            gameEngine.swap(getGameEntities('flappy'));
                        }}
                    >
                        <Text style={styles.buttonText}>PLAY AGAIN</Text>
                    </TouchableOpacity>
                </View>
            )}
            
            {/* Question Screen */}
            {gameState === "question" && (
                <QuestionScreen 
                    currentQuestion={currentQuestion} 
                    onAnswerSelected={handleAnswer} 
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    menuContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: 'black',
        paddingHorizontal: 30,
        paddingVertical: 10,
    },
    buttonText: {
        fontWeight: 'bold',
        color: 'white',
        fontSize: 30,
    },
    gameOverText: {
        fontSize: 40,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    scoreText: {
        fontSize: 30,
        marginBottom: 20,
    },
});