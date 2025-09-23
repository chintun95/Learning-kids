//for snake
// Food.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

/*
function getRandomFruitEmoji() {
    const collectionEmojis = ["🪙", "❓"];
  const randomIndex = Math.floor(Math.random() * collectionEmojis.length);
  return collectionEmojis[randomIndex];
}
*/

const CELL = 10;
export default function Food({ x, y }: { x: number; y: number }) {
  const s = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    s.setValue(0.6);
    Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [x, y]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x * CELL,
        top: y * CELL,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ff5252',
        borderWidth: 1.5,
        borderColor: '#9c1212',
        transform: [{ scale: s }],
      }}
    />
  );
}