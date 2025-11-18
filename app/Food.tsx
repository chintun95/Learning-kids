import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

export default function Food({
  x, y, emoji, cell = 10,
}: { x: number; y: number; emoji?: string; cell?: number }) {
  const s = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    s.setValue(0.6);
    Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [x, y, s]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x * cell,
        top: y * cell,
        width: cell * 1.5,
        height: cell * 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: s }],
        zIndex: 1000,
      }}
    >
      <Text style={{ fontSize: Math.floor(cell * 1.5) }}>{emoji ?? '🟡'}</Text>
    </Animated.View>
  );
}
