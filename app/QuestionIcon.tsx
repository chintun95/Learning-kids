// QuestionIcon.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Coordinate } from './types/types';

export default function QuestionIcon({ x, y }: Coordinate): JSX.Element {
  return (
    <Text style={[{ top: y * 10, left: x * 10 }, styles.icon]}>❓</Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 20,
    height: 20,
    position: 'absolute',
    fontSize: 18,
  },
});
