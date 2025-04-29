import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

// Sample question database, please replace this with calls to the questions database
const questionsDB = [
  {
    id: 1,
    question: "What is your favorite food?",
    options: ["Pizza", "Ice Cream", "Broccoli", "Tacos"],
    correctAnswer: "Pizza"
  },
  {
    id: 2,
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4"
  },
];

// Function to get a random question from the database
export const getRandomQuestion = () => {
  const randomIndex = Math.floor(Math.random() * questionsDB.length);
  return questionsDB[randomIndex];
};

// render question UI
export const QuestionScreen = ({ currentQuestion, onAnswerSelected }) => {
  if (!currentQuestion) return null;
  
  return (
    <View style={styles.questionContainer}>
      <View style={styles.questionBox}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => onAnswerSelected(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// check answer, may need to be altered based on database
export const checkAnswer = (question, selectedAnswer) => {
  return selectedAnswer === question.correctAnswer;
};

// bonus points awarded (can be changed)
export const calculateBonus = (isCorrect) => {
  return isCorrect ? 2 : 0;
};

// determine if question should be shown (make this variable at a later time)
export const shouldShowQuestion = (score) => {
  // Show question every 5 points
  return (score % 5 === 0) && score > 0;
};

const styles = StyleSheet.create({
  questionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  optionText: {
    fontSize: 18,
    textAlign: 'center',
  },
});