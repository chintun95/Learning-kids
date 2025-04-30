/* Flappy Bird Clone Game */


import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import getGameEntities from '../../entities/games-index';
import Physics from '../../entities/flappy/physics';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';

export default function StartFlappyGame() {
  const [running, setRunning] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [powerUp, setPowerUp] = useState(null);
  const [powerUpActive, setPowerUpActive] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const gameEngine = useRef(null);
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const backgroundOffset = useRef(new Animated.Value(0)).current;

  const bgLayers = [
    require("@/assets/images/fb-game-background.png")
  ];

  useEffect(() => {
    startParallax();
  }, []);

  const startParallax = () => {
    Animated.loop(
      Animated.timing(backgroundOffset, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  };

  const spawnPowerUp = () => {
    if (!powerUpActive) {
      const types = ['double', 'shield'];
      const selected = types[Math.floor(Math.random() * types.length)];
      setPowerUp(selected);
      setPowerUpActive(true);
      setTimeout(() => {
        setPowerUp(null);
        setPowerUpActive(false);
      }, 10000);
    }
  };

  const handleGameEvent = (e) => {
    if (e.type === 'game_over') {
      setRunning(false);
      gameEngine.current?.stop();
    } else if (e.type === 'new_point') {
      const newScore = currentPoints + (powerUp === 'double' ? 2 : 1);
      setCurrentPoints(newScore);
      scoreAnim.setValue(1.5);
      Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true }).start();
      if (newScore % 5 === 0) setDifficulty((prev) => prev + 1);
      if (newScore % 7 === 0) spawnPowerUp();
    }
  };

  const handleStartGame = () => {
    setCurrentPoints(0);
    setDifficulty(1);
    setPowerUp(null);
    setPowerUpActive(false);
    setRunning(true);
    gameEngine.current?.swap(getGameEntities('flappy', difficulty));
  };

  return (
    <View style={styles.container}>
      {bgLayers.map((src, idx) => (
        <Animated.Image
          key={idx}
          source={src}
          resizeMode="repeat"
          style={[
            styles.bgLayer,
            {
              zIndex: -idx,
              transform: [
                {
                  translateX: backgroundOffset.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -50 * (idx + 1)],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      <Animated.Text style={[styles.scoreText, { transform: [{ scale: scoreAnim }] }]}>
        {currentPoints}
      </Animated.Text>

      {powerUp && (
        <Text style={styles.powerUpText}>🔹 Power-Up: {powerUp.toUpperCase()} 🔹</Text>
      )}

      <GameEngine
        ref={(ref) => (gameEngine.current = ref)}
        systems={[Physics]}
        entities={getGameEntities('flappy', difficulty)}
        running={running}
        onEvent={handleGameEvent}
        style={styles.gameContainer}
      >
        <StatusBar hidden={true} />
      </GameEngine>

      {!running && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
            <Text style={styles.startButtonText}>START GAME</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameContainer: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
  },
  bgLayer: {
    position: 'absolute',
    top: 0, left: 0,
    width: '200%',
    height: '100%',
    opacity: 0.6,
  },
  scoreText: {
    position: 'absolute',
    top: 60,
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    zIndex: 2,
  },
  powerUpText: {
    position: 'absolute',
    top: 110,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffff00',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 2,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#222',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 14,
    elevation: 10,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 26,
    letterSpacing: 1.2,
  },
});
