import { useQuizStore } from "@/lib/store/quizStore";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

export default function QuizResultsScreen() {
  const { questions } = useQuizStore();
  const router = useRouter();

  const correctCount = questions.filter(
    (q) => q.userAnswer === q.question_answer
  ).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Quiz Results</Text>
      <Text style={styles.score}>
        You got {correctCount} out of {questions.length} correct!
      </Text>

      {questions.map((q, idx) => {
        return (
          <View key={q.question_id} style={styles.card}>
            <Text style={styles.question}>
              Q{idx + 1}: {q.question}
            </Text>
            {q.choices.map((choice, i) => {
              const isUserChoice = q.userAnswer === choice.text;
              const isCorrect = choice.isCorrect;

              let bgColor = "#f0f0f0";
              if (isUserChoice && isCorrect) {
                bgColor = "#C8E6C9"; // green for correct
              } else if (isUserChoice && !isCorrect) {
                bgColor = "#FFCDD2"; // red for wrong
              } else if (isCorrect) {
                bgColor = "#E3F2FD"; // blue for correct answer
              }

              return (
                <View
                  key={i}
                  style={[styles.choice, { backgroundColor: bgColor }]}
                >
                  <Text style={styles.choiceText}>
                    {choice.text}
                    {isCorrect ? " (Correct)" : ""}
                    {isUserChoice ? " ← your answer" : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}

      <TouchableOpacity
        onPress={() => router.replace("/games-temp")}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Back to Games</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  score: {
    fontSize: 18,
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  question: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  choice: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  choiceText: {
    fontSize: 14,
  },
  button: {
    marginTop: 24,
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 999,
    alignSelf: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
