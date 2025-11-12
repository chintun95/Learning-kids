import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { responsive } from "@/utils/responsive";
import { useSessionStore } from "@/lib/store/sessionStore";
import { useQuestionLogStore } from "@/lib/store/questionLogStore";
import { useLessonLogStore } from "@/lib/store/lessonLogStore";
import { useQuestionStore } from "@/lib/store/questionStore";
import { useLessonStore } from "@/lib/store/lessonStore";
import { useSectionStore } from "@/lib/store/sectionStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { Tables, Json } from "@/types/database.types";

type Question = Tables<"questionbank">;

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

/** 🔹 Local UUID generator */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 🔹 Normalize Supabase JSON into {A:"text"} map */
function parseAnswerChoices(input: Json): Record<string, string> {
  if (Array.isArray(input)) {
    const labels = ["A", "B", "C", "D", "E", "F"];
    return input.reduce<Record<string, string>>((acc, val, i) => {
      if (typeof val === "string" || typeof val === "number") {
        const clean = String(val)
          .replace(/^[A-F]\.\s*/i, "")
          .trim();
        acc[labels[i] || String(i + 1)] = clean;
      }
      return acc;
    }, {});
  }
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = input as Record<string, Json>;
    const result: Record<string, string> = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value != null) result[key] = String(value);
    });
    return result;
  }
  return {};
}

/** 🔹 Explanation parser */
function parseExplanation(
  choiceDesc: Json | null,
  selectedAnswer: string | null,
  answerChoices: Record<string, string>
): string {
  if (!choiceDesc) return "No explanation provided.";
  if (!selectedAnswer) return "Please select an answer first.";

  let data: any = choiceDesc;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return String(data);
    }
  }

  if (Array.isArray(data)) {
    const index = Object.values(answerChoices).findIndex(
      (ans) => ans.trim().toLowerCase() === selectedAnswer.trim().toLowerCase()
    );
    return (
      (index >= 0 && typeof data[index] === "string" && data[index]) ||
      "No explanation found for this choice."
    );
  }

  if (data && typeof data === "object") {
    const explanationMap = data as Record<string, Json>;
    const matchedKey = Object.entries(answerChoices).find(
      ([, val]) =>
        val.trim().toLowerCase() === selectedAnswer.trim().toLowerCase()
    )?.[0];
    if (!matchedKey) return "No explanation found for this choice.";

    for (const key of [
      matchedKey,
      matchedKey.toLowerCase(),
      matchedKey.toUpperCase(),
    ]) {
      if (key in explanationMap) {
        const val = explanationMap[key];
        if (typeof val === "string") return val;
      }
    }
  }

  return "No explanation found for this choice.";
}

const LearnSection: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const sectionId =
    typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;

  const { lessons } = useLessonStore();
  const { sections } = useSectionStore();
  const { questions, fetchQuestions } = useQuestionStore();
  const { getCurrentChild } = useChildAuthStore();
  const currentChild = getCurrentChild();

  const {
    startChildSession,
    endSession,
    setSessionStatus,
    setSessionDetails,
    sessionStatus,
  } = useSessionStore();

  const { addQuestionLog } = useQuestionLogStore();
  const { addLessonLog, fetchLessonLogs } = useLessonLogStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const currentSection = useMemo(
    () => sections.find((sec) => sec.id === sectionId) ?? null,
    [sections, sectionId]
  );

  const relatedLesson = useMemo(() => {
    if (!currentSection) return null;
    return lessons.find((les) => les.section_id === currentSection.id) ?? null;
  }, [lessons, currentSection]);

  const sectionQuestions = useMemo<Question[]>(() => {
    if (!sectionId || !questions.length) return [];
    return questions.filter(
      (q) =>
        q.section_id &&
        String(q.section_id).trim().toLowerCase() ===
          String(sectionId).trim().toLowerCase()
    );
  }, [questions, sectionId]);

  useEffect(() => {
    if (!sectionId || !currentSection) return;

    const lessonName = relatedLesson?.title ?? "Unknown Lesson";
    const sectionName = currentSection.title ?? "Unknown Section";
    setSessionDetails(
      `Started lesson "${lessonName}" section "${sectionName}"`
    );

    if (currentChild?.id) startChildSession(currentChild.id, "lesson");
    else startChildSession("local-session", "lesson");

    fetchQuestions().finally(() => setLoading(false));

    return () => {
      if (sessionStatus !== "Completed" && sessionStatus !== "Stalled") {
        console.log("⚠️ Session ended unexpectedly — marking Stalled.");
        setSessionStatus("Stalled");
        endSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const handleSubmitAnswer = () => {
    const question = sectionQuestions[currentQuestionIndex];
    if (!question || !selectedAnswer) return;

    const correct = question.correctanswer.trim() === selectedAnswer.trim();
    setIsCorrect(correct);
    setShowExplanation(true);

    if (currentChild?.id) {
      addQuestionLog({
        id: generateUUID(),
        childid: currentChild.id,
        completedquestion: question.id,
        completedat: new Date().toISOString(),
        user_id: null,
      } as Tables<"questionlog">);
    }
  };

  const handleNextQuestion = async () => {
    setShowExplanation(false);
    setSelectedAnswer(null);
    setIsCorrect(null);

    if (currentQuestionIndex + 1 < sectionQuestions.length) {
      setCurrentQuestionIndex((i) => i + 1);
      return;
    }

    setSessionStatus("Completed");
    await endSession();

    if (relatedLesson && currentSection && currentChild?.id) {
      addLessonLog({
        id: generateUUID(),
        childid: currentChild.id,
        completedlesson: relatedLesson.id,
        completedat: new Date().toISOString(),
        user_id: null,
      } as Tables<"lessonlog">);
    }

    const lessonTitle = relatedLesson?.title?.toLowerCase() ?? "";
    const sectionTitle = currentSection?.title?.toLowerCase() ?? "";
    if (
      lessonTitle.includes("lesson 1") &&
      sectionTitle.includes("section 1")
    ) {
      console.log("🎉 Lesson 1 Section 1 completed — unlocking all sections!");
      await fetchLessonLogs();
    }

    const lessonName = relatedLesson?.title ?? "Unknown Lesson";
    const sectionName = currentSection?.title ?? "Unknown Section";
    setSessionDetails(
      `Completed lesson "${lessonName}" section "${sectionName}"`
    );

    Alert.alert("✅ Section Complete", "All questions answered!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );

  if (!sectionId || !currentSection)
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid or missing section.</Text>
      </View>
    );

  if (!sectionQuestions.length)
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          ⚠️ No questions found for this section.
        </Text>
      </View>
    );

  const currentQuestion = sectionQuestions[currentQuestionIndex];
  const answerChoices = parseAnswerChoices(currentQuestion.answerchoices);
  const explanationText = parseExplanation(
    currentQuestion.choicedescription ?? null,
    selectedAnswer,
    answerChoices
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{currentSection.title}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentBox}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            {Object.entries(answerChoices).map(([key, text]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.choiceButton,
                  selectedAnswer === text && styles.choiceSelected,
                ]}
                onPress={() => setSelectedAnswer(text)}
              >
                <Text style={styles.choiceText}>
                  {key}. {text}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={handleSubmitAnswer}
              disabled={!selectedAnswer}
              style={[styles.submitButton, !selectedAnswer && { opacity: 0.6 }]}
            >
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Explanation Modal */}
        <Modal visible={showExplanation} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* ✅ Replace confusing ❌ icon with a neutral "Next" button */}
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNextQuestion}
              >
                <Text style={styles.nextButtonText}>Next →</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {isCorrect ? "✅ Correct!" : "❌ Incorrect"}
              </Text>
              <Text style={styles.modalExplanation}>{explanationText}</Text>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default LearnSection;

/** ---------- Styles ---------- **/
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#fff" },
  background: { flex: 1, width: "100%", height: "100%" },
  backgroundImage: { transform: [{ scale: 1.2 }] },

  headerBar: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderBottomColor: "#999",
    borderBottomWidth: 2,
    paddingTop: statusBarHeight * 0.4,
    paddingBottom: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.05,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },

  headerTitle: {
    color: "#000",
    fontSize: responsive.isNarrowScreen ? 18 : 22,
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },

  closeButton: {
    position: "absolute",
    right: responsive.screenWidth * 0.05,
    top: "50%",
    transform: [{ translateY: -responsive.screenHeight * 0.015 }],
    padding: 6,
  },

  scrollContainer: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: responsive.screenHeight * 0.03,
    paddingHorizontal: responsive.screenWidth * 0.05,
  },

  contentBox: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#999",
    padding: responsive.screenWidth * 0.05,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  questionText: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#000",
    marginBottom: responsive.screenHeight * 0.02,
  },

  choiceButton: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderColor: "#999",
    borderWidth: 2,
    borderRadius: 10,
    padding: responsive.screenHeight * 0.015,
    marginVertical: responsive.screenHeight * 0.006,
  },
  choiceSelected: { backgroundColor: "#C7D2FE", borderColor: "#4F46E5" },
  choiceText: {
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize,
    color: "#000",
  },
  submitButton: {
    backgroundColor: "#000",
    borderRadius: 9999,
    paddingVertical: responsive.screenHeight * 0.015,
    marginTop: responsive.screenHeight * 0.02,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 16,
    padding: responsive.screenWidth * 0.06,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  nextButton: {
    position: "absolute",
    top: 10,
    right: 15,
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  nextButtonText: {
    color: "#fff",
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize * 0.85,
  },
  modalTitle: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#000",
    marginTop: responsive.screenHeight * 0.01,
    textAlign: "center",
  },
  modalExplanation: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize * 0.9,
    color: "#111",
    marginTop: responsive.screenHeight * 0.02,
    lineHeight: 22,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.9,
    color: "#000",
    marginTop: responsive.screenHeight * 0.01,
  },
  errorText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize,
    color: "#000",
    textAlign: "center",
    paddingHorizontal: responsive.screenWidth * 0.05,
  },
});
