import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { Fragment } from 'react';
import { Coordinate } from './types/types';

interface SnakeProps {
  snake: Coordinate[];
}

export default function Snake({ snake }: SnakeProps): JSX.Element {
  const headScale = useRef(new Animated.Value(1)).current;
  const bodyAnimations = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    // Animate the head
    Animated.loop(
      Animated.sequence([
        Animated.timing(headScale, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(headScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (snake.length > bodyAnimations.length) {
      const additionalSegments = snake.length - bodyAnimations.length;
      for (let i = 0; i < additionalSegments; i++) {
        const anim = new Animated.Value(1);
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ])
        ).start();
        bodyAnimations.push(anim);
      }
    }
  }, [snake.length]);

  return (
    <Fragment>
      {snake.map((segment, index) => {
        const isHead = index === 0;
        const segmentStyle = {
          left: segment.x * 10,
          top: segment.y * 10,
          backgroundColor: isHead ? '#00BFFF' : '#66BB6A',
          width: isHead ? 18 : 15,
          height: isHead ? 18 : 15,
          borderRadius: isHead ? 9 : 7,
          transform: isHead ? [{ scale: headScale }] : undefined,
          opacity: !isHead ? bodyAnimations[index] || 1 : 1,
        };
        return (
          <Animated.View
            key={index}
            style={[styles.snakeSegment, segmentStyle]}
            accessible={false}
          />
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
  },
});