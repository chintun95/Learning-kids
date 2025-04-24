import React from 'react';
import { View, StyleSheet } from 'react-native';

interface QuestionIconProps {
  x: number;
  y: number;
}

const CELL_SIZE = 10;

const QuestionIcon: React.FC<QuestionIconProps> = ({ x, y }) => {
  // Ensure that x and y are numbers before applying arithmetic operations
  const positionX = typeof x === 'number' ? x * CELL_SIZE : 0;
  const positionY = typeof y === 'number' ? y * CELL_SIZE : 0;

  return (
    <View
      style={[
        styles.icon,
        {
          left: positionX,
          top: positionY,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: 'purple',
    borderRadius: CELL_SIZE / 2,
  },
});

export default QuestionIcon;
