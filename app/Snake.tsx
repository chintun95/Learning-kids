import React, { useEffect, useRef, Fragment } from 'react';
import { StyleSheet, Animated, View } from 'react-native';
import { Coordinate } from './types/types';

interface SnakeProps {
  snake: Coordinate[];
  cell?: number; // dynamic cell size
  theme?: { head: string; body: string; glow?: string };
}

const dirFromNeighbors = (cur: Coordinate, next?: Coordinate) => {
  if (!next) return 'right';
  if (next.x < cur.x) return 'left';
  if (next.x > cur.x) return 'right';
  if (next.y < cur.y) return 'up';
  return 'down';
};
const rotForDir: Record<string, string> = { up: '0deg', right: '90deg', down: '180deg', left: '270deg' };

export default function Snake({
  snake,
  cell = 10,
  theme = { head: '#1e88e5', body: '#43a047', glow: '#1e88e5' },
}: SnakeProps): JSX.Element {
  const headScale = useRef(new Animated.Value(1)).current;
  const bodyAnimations = useRef<Animated.Value[]>([]).current;
  const puffsRef = useRef<{ x: number; y: number; a: Animated.Value }[]>([]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(headScale, { toValue: 1.18, duration: 500, useNativeDriver: true }),
        Animated.timing(headScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [headScale]);

  useEffect(() => {
    if (snake.length > bodyAnimations.length) {
      const add = snake.length - bodyAnimations.length;
      for (let i = 0; i < add; i++) {
        const anim = new Animated.Value(1);
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 0.9, duration: 800, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ])
        ).start();
        bodyAnimations.push(anim);
      }
    } else if (snake.length < bodyAnimations.length) {
      bodyAnimations.splice(snake.length);
    }
  }, [snake.length, bodyAnimations]);

  // subtle sparkle trail
  useEffect(() => {
    const head = snake[0];
    if (!head) return;
    const puff = { x: head.x * cell, y: head.y * cell, a: new Animated.Value(0.7) };
    puffsRef.current.push(puff);
    Animated.timing(puff.a, { toValue: 0, duration: 420, useNativeDriver: true }).start(() => {
      const idx = puffsRef.current.indexOf(puff);
      if (idx > -1) puffsRef.current.splice(idx, 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snake[0]?.x, snake[0]?.y, cell]);

  return (
    <Fragment>
      {puffsRef.current.map((p, i) => (
        <Animated.View
          key={`p${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: p.x + Math.max(2, cell * 0.4),
            top: p.y + Math.max(2, cell * 0.4),
            width: Math.max(3, cell * 0.6),
            height: Math.max(3, cell * 0.6),
            borderRadius: Math.max(1.5, cell * 0.3),
            backgroundColor: theme.glow || theme.head,
            opacity: p.a,
            transform: [{ scale: p.a.interpolate({ inputRange: [0, 0.7], outputRange: [1.3, 1] }) }],
          }}
        />
      ))}

      {snake.map((segment, index) => {
        const isHead = index === 0;
        const dir = isHead ? dirFromNeighbors(segment, snake[1]) : 'right';
        const rotate = isHead ? rotForDir[dir] : '0deg';

        const headSize = Math.max(12, Math.floor(cell * 1.8));
        const bodySize = Math.max(10, Math.floor(cell * 1.4));

        const segmentStyle = {
          left: segment.x * cell,
          top: segment.y * cell,
          width: isHead ? headSize : bodySize,
          height: isHead ? headSize : bodySize,
          borderRadius: isHead ? Math.floor(headSize / 3) : Math.floor(bodySize / 3.5),
          transform: isHead ? [{ scale: headScale }, { rotate }] : undefined,
          backgroundColor: isHead ? theme.head : theme.body,
          opacity: !isHead ? (bodyAnimations[index] || 1) : 1,
          elevation: isHead ? 5 : 3,
          shadowColor: theme.glow || theme.head,
          shadowOpacity: isHead ? 0.35 : 0.22,
          shadowRadius: isHead ? 4 : 3,
          shadowOffset: { width: 0, height: 0 },
        } as const;

        return (
          <Animated.View key={index} style={[styles.seg, segmentStyle]}>
            {isHead && (
              <View style={styles.face}>
                <View style={styles.eye} />
                <View style={[styles.eye, { left: 9 }]} />
              </View>
            )}
          </Animated.View>
        );
      })}
    </Fragment>
  );
}

const styles = StyleSheet.create({
  seg: { position: 'absolute' },
  face: { position: 'absolute', top: 3, left: 3, width: 12, height: 6, flexDirection: 'row' },
  eye: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#0a2540', left: 2 },
});
