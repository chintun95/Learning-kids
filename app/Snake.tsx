// file: app/Games/Snake.tsx
import React, { useEffect, useRef, Fragment } from 'react';
import { StyleSheet, Animated, View } from 'react-native';
import { Coordinate } from './types/types';

interface SnakeProps {
  snake: Coordinate[];
}

const CELL = 10; // matches board arithmetic used in SnakeGame

// Direction helper can live outside the component
const dirFromNeighbors = (cur: Coordinate, next?: Coordinate) => {
  if (!next) return 'right';
  if (next.x < cur.x) return 'right';
  if (next.x > cur.x) return 'left';
  if (next.y < cur.y) return 'down';
  return 'up';
};
const rotForDir: Record<string, string> = {
  up: '0deg',
  right: '90deg',
  down: '180deg',
  left: '270deg',
};

export default function Snake({ snake }: SnakeProps): JSX.Element {
  // head breathing
  const headScale = useRef(new Animated.Value(1)).current;

  // body wobble anims (one per segment)
  const bodyAnimations = useRef<Animated.Value[]>([]).current;

  // sparkle trail puffs
  const puffsRef = useRef<{ x: number; y: number; a: Animated.Value }[]>([]);

  // head breathe loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(headScale, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(headScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [headScale]);

  // keep body anims array sized to the snake length
  useEffect(() => {
    if (snake.length > bodyAnimations.length) {
      const add = snake.length - bodyAnimations.length;
      for (let i = 0; i < add; i++) {
        const anim = new Animated.Value(1);
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 0.85, duration: 800, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ])
        );
        loop.start();
        bodyAnimations.push(anim);
      }
    } else if (snake.length < bodyAnimations.length) {
      bodyAnimations.splice(snake.length); // trim extras when snake shrinks
    }
  }, [snake.length, bodyAnimations]);

  // spawn a tiny puff at the head position on movement
  useEffect(() => {
    const head = snake[0];
    if (!head) return;
    const puff = { x: head.x * CELL, y: head.y * CELL, a: new Animated.Value(0.7) };
    puffsRef.current.push(puff);
    Animated.timing(puff.a, { toValue: 0, duration: 480, useNativeDriver: true }).start(() => {
      const idx = puffsRef.current.indexOf(puff);
      if (idx > -1) puffsRef.current.splice(idx, 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snake[0]?.x, snake[0]?.y]);

  return (
    <Fragment>
      {/* sparkle trail */}
      {puffsRef.current.map((p, i) => (
        <Animated.View
          key={`p${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: p.x + 4,
            top: p.y + 4,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#b3ecff',
            opacity: p.a,
            transform: [
              { scale: p.a.interpolate({ inputRange: [0, 0.7], outputRange: [1.4, 1] }) },
            ],
          }}
        />
      ))}

      {/* snake segments */}
      {snake.map((segment, index) => {
        const isHead = index === 0;
        const dir = isHead ? dirFromNeighbors(segment, snake[1]) : 'right';
        const rotate = isHead ? rotForDir[dir] : '0deg';

        const segmentStyle = {
          left: segment.x * CELL,
          top: segment.y * CELL,
          width: isHead ? 18 : 15,
          height: isHead ? 18 : 15,
          borderRadius: isHead ? 9 : 7,
          transform: isHead ? [{ scale: headScale }, { rotate }] : undefined,
          backgroundColor: isHead ? '#00BFFF' : '#66BB6A',
          opacity: !isHead ? (bodyAnimations[index] || 1) : 1,
        };

        return (
          <Animated.View key={index} style={[styles.snakeSegment, segmentStyle]}>
            {isHead && (
              <View style={styles.face}>
                <View style={styles.eye} />
                <View style={[styles.eye, { left: 11 }]} />
              </View>
            )}
          </Animated.View>
        );
      })}
    </Fragment>
  );
}

const styles = StyleSheet.create({
  snakeSegment: {
    position: 'absolute',
    shadowColor: '#00BFFF',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
    borderWidth: 1.2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  face: { position: 'absolute', top: 4, left: 3, width: 12, height: 6, flexDirection: 'row' },
  eye: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#0a2540', left: 2 },
});
