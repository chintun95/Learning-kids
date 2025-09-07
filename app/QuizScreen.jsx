import React, { useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QuizScreen = () => {//question place holder
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const questions = [
    { question: '2 + 2 = ?', options: ['3', '4', '5'], answer: '4' },
  ];

  const handleAnswer = (option) => {
    if (option === questions[currentQuestion].answer) {
      alert('Correct!');
    } else {
      alert('Try again!');
    }
    setCurrentQuestion((prev) => (prev + 1) % questions.length);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.question}>{questions[currentQuestion].question}</Text>
      {questions[currentQuestion].options.map((option, idx) => (
        <Button key={idx} title={option} onPress={() => handleAnswer(option)} />
      ))}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  question: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default QuizScreen;
