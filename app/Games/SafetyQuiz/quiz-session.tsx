import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuizStore } from "@/lib/store/quizStore";
import { useRouter } from "expo-router";

export default function SafetyQuiz() {
  const router = useRouter();
  const { questions, generateQuiz, markAnswered } = useQuizStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupQuiz = async () => {
      await generateQuiz(7); // pull 5 random questions
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setLoading(false);
    };

    setupQuiz();
  }, []);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (choiceText: string) => {
    if (selectedAnswer || !currentQuestion) return; // prevent re-answering or invalid question
    setSelectedAnswer(choiceText);
    const correct = choiceText === currentQuestion.question_answer;
    setIsCorrect(correct);
    markAnswered(currentQuestion.question_id, choiceText);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        router.push("/Games/SafetyQuiz/quiz-results"); // Ensure this path matches your folder structure
      }
    }, 1000);
  };

  if (loading || !currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading Quiz...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        Q{currentIndex + 1}: {currentQuestion.question}
      </Text>
      {currentQuestion.choices.map((choice, index) => {
        const isSelected = selectedAnswer === choice.text;
        const bgColor = isSelected
          ? choice.isCorrect
            ? "#4CAF50"
            : "#F44336"
          : "#f0f0f0";

        return (
          <TouchableOpacity
            key={index}
            onPress={() => handleAnswer(choice.text)}
            style={[styles.choiceButton, { backgroundColor: bgColor }]}
            disabled={!!selectedAnswer}
          >
            <Text style={styles.choiceText}>{choice.text}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  question: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  choiceButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  choiceText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
});
