// app/Games/Food.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

const CELL = 10;

type Props = {
  x: number;
  y: number;
  emoji?: string;      // optional: render emoji fruit like '🍎'
  size?: number;       // default 10
};

export default function Food({ x, y, emoji, size = 10 }: Props) {
  const s = useRef(new Animated.Value(0.6)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    s.setValue(0.6);
    Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: true }).start();

    // subtle bob
    bob.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [x, y]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -0.6] });

  if (emoji) {
    return (
      <Animated.Text
        style={{
          position: 'absolute',
          left: x * CELL,
          top: y * CELL,
          fontSize: size + 4,
          transform: [{ scale: s }, { translateY }],
        }}
        accessibilityLabel="Fruit"
      >
        {emoji}
      </Animated.Text>
    );
  }

  // classic dot
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x * CELL,
        top: y * CELL,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#ff3b30',
        transform: [{ scale: s }, { translateY }],
        elevation: 3,
        shadowColor: '#ff3b30',
        shadowOpacity: 0.35,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 0 },
      }}
      accessibilityLabel="Food"
    />
  );
}
