import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';

const SnakeGame: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Welcome to Snake Game!</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SnakeGame;

