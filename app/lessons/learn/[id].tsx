// app/lessons/learn/[id].tsx
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
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

/** 🔹 Local UUID generator (for offline-safe IDs) */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 🔹 Normalize Supabase JSON into {A:"text"} map */
function parseAnswerChoices(input: Json): Record<string, string> {
  // Case 1: stored as array, e.g. ["A. Option 1", "B. Option 2", ...]
  if (Array.isArray(input)) {
    const labels = ["A", "B", "C", "D", "E", "F"];
    return input.reduce<Record<string, string>>((acc, val, i) => {
      if (typeof val === "string" || typeof val === "number") {
        const clean = String(val)
          .replace(/^[A-F]\.\s*/i, "") // Strip leading "A. "
          .trim();
        acc[labels[i] || String(i + 1)] = clean;
      }
      return acc;
    }, {});
  }

  // Case 2: stored as object {A:"...", B:"..."}
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

/**
 * 🔹 Compute correctness:
 *  - If correctanswer is a single letter (A–F) → compare by letter
 *  - Otherwise → compare by cleaned answer text (True/False or full text)
 */
function computeIsCorrect(
  question: Question,
  selectedKey: string | null,
  selectedText: string | null,
  answerChoices: Record<string, string>
): boolean | null {
  if (!selectedKey || !selectedText) return null;

  const correctRaw = (question.correctanswer ?? "").trim();
  if (!correctRaw) return null;

  const letterPattern = /^[A-F]$/i;

  // 🔹 Case 1: letter-based (MCQ like A/B/C/D)
  if (letterPattern.test(correctRaw)) {
    const correctLetter = correctRaw.toUpperCase();
    return selectedKey.toUpperCase() === correctLetter;
  }

  // 🔹 Case 2: value-based (e.g., True / False or full text)
  const normalizedCorrect = correctRaw.toLowerCase().trim();
  const normalizedSelected = selectedText.toLowerCase().trim();

  // Try to find a choice whose value matches the stored correctanswer
  const matchedChoice = Object.entries(answerChoices).find(
    ([, val]) => val.toLowerCase().trim() === normalizedCorrect
  );

  if (matchedChoice) {
    // We know which text is correct, so compare by text
    return normalizedSelected === normalizedCorrect;
  }

  // Fallback: direct text comparison
  return normalizedSelected === normalizedCorrect;
}

/**
 * 🔹 Explanation parser (supports both arrays and objects)
 *  - If choicedescription is an object, it can use:
 *    - keys like "A", "B", "C"  (MCQ)
 *    - keys like "True", "False" (TF)
 *  - If it's an array, align by index with answerChoices.
 */
function parseExplanation(
  choiceDesc: Json | null,
  selectedKey: string | null,
  selectedText: string | null,
  answerChoices: Record<string, string>
): string {
  if (!choiceDesc) return "No explanation provided.";
  if (!selectedKey && !selectedText) return "Please select an answer first.";

  let data: Json | any = choiceDesc;

  // Sometimes stored as a stringified JSON
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // It's just a raw string explanation
      return String(data);
    }
  }

  // Case 1: Array → align by index with choices
  if (Array.isArray(data)) {
    const keys = Object.keys(answerChoices);

    if (selectedKey) {
      const index = keys.indexOf(selectedKey);
      if (index >= 0 && typeof data[index] === "string") {
        return data[index] as string;
      }
    }

    if (selectedText) {
      const idx = Object.values(answerChoices).findIndex(
        (val) => val.toLowerCase().trim() === selectedText.toLowerCase().trim()
      );
      if (idx >= 0 && typeof data[idx] === "string") {
        return data[idx] as string;
      }
    }

    return "No explanation found for this choice.";
  }

  // Case 2: Object map (most common: {"B":"Correct!"} or {"True":"Correct!"})
  if (data && typeof data === "object") {
    const explanationMap = data as Record<string, Json>;
    const keyCandidates: string[] = [];

    if (selectedKey) {
      keyCandidates.push(
        selectedKey,
        selectedKey.toLowerCase(),
        selectedKey.toUpperCase()
      );
    }
    if (selectedText) {
      keyCandidates.push(
        selectedText,
        selectedText.toLowerCase(),
        selectedText.toUpperCase()
      );
    }

    for (const candidate of keyCandidates) {
      if (candidate in explanationMap) {
        const val = explanationMap[candidate];
        if (typeof val === "string") return val;
      }
    }

    return "No explanation found for this choice.";
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Animated progress value 0 → 1
  const [progressAnim] = useState(() => new Animated.Value(0));

  /** 🔹 Find the current section by ID */
  const currentSection = useMemo(
    () => sections.find((sec) => sec.id === sectionId) ?? null,
    [sections, sectionId]
  );

  /** 🔹 Related lesson via sections.lessonid → lessonbank.id */
  const relatedLesson = useMemo(() => {
    if (!currentSection) return null;
    const lessonId = currentSection.lessonid;
    if (!lessonId) return null;
    return lessons.find((les) => les.id === lessonId) ?? null;
  }, [lessons, currentSection]);

  /** 🔹 Filter questions for this section */
  const sectionQuestions = useMemo<Question[]>(() => {
    if (!sectionId || !questions.length) return [];
    return questions.filter(
      (q) =>
        q.section_id &&
        String(q.section_id).trim().toLowerCase() ===
          String(sectionId).trim().toLowerCase()
    );
  }, [questions, sectionId]);

  const totalQuestions = sectionQuestions.length;

  /** 🔹 Animate progress when current question or questions change */
  useEffect(() => {
    if (!totalQuestions) return;
    const nextProgress = (currentQuestionIndex + 1) / totalQuestions;

    Animated.timing(progressAnim, {
      toValue: nextProgress,
      duration: 400,
      useNativeDriver: false, // width animation can't use native driver
    }).start();
  }, [currentQuestionIndex, totalQuestions, progressAnim]);

  /** 🔹 On mount: start session & fetch questions */
  useEffect(() => {
    if (!sectionId || !currentSection) {
      setLoading(false);
      return;
    }

    const lessonName = relatedLesson?.title ?? "Unknown Lesson";
    const sectionName = currentSection.title ?? "Unknown Section";

    setSessionDetails(
      `Started lesson "${lessonName}" section "${sectionName}"`
    );

    if (currentChild?.id) {
      startChildSession(currentChild.id, "lesson");
    } else {
      // Local fallback session ID if no child yet (purely local tracking)
      startChildSession("child-local", "lesson");
    }

    fetchQuestions()
      .catch((err) => {
        console.warn("❌ Failed to fetch questions:", err);
      })
      .finally(() => setLoading(false));

    return () => {
      if (sessionStatus !== "Completed" && sessionStatus !== "Stalled") {
        console.log("⚠️ Session ended early — marking as Stalled.");
        setSessionStatus("Stalled");
        endSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  /** 🔹 Submit answer → compute isCorrect, log to questionlog, show modal */
  const handleSubmitAnswer = () => {
    const question = sectionQuestions[currentQuestionIndex];
    if (!question || !selectedKey) return;

    const answerChoices = parseAnswerChoices(question.answerchoices);
    const selectedText = answerChoices[selectedKey] ?? null;

    const correct = computeIsCorrect(
      question,
      selectedKey,
      selectedText,
      answerChoices
    );

    // Modal logic + DB logging share the SAME boolean
    const isCorrectFlag = correct === true;
    setIsCorrect(isCorrectFlag);
    setShowExplanation(true);

    // Only log to questionlog if we have an actual child (foreign key constraint)
    if (currentChild?.id) {
      const newLog = {
        id: generateUUID(),
        childid: currentChild.id,
        completedquestion: question.id,
        completedat: new Date().toISOString(),
        iscorrect: isCorrectFlag, // ✅ Matches the modal checkmark/X
        user_id: null as string | null,
      };

      // Let the store handle online/offline syncing
      try {
        void addQuestionLog(newLog as any);
      } catch (err) {
        console.warn("⚠️ Failed to add question log locally:", err);
      }
    }
  };

  /** 🔹 Proceed to next question or finish section */
  const handleNextQuestion = async () => {
    setShowExplanation(false);
    setSelectedKey(null);
    setIsCorrect(false);

    // Still more questions in this section
    if (currentQuestionIndex + 1 < sectionQuestions.length) {
      setCurrentQuestionIndex((i) => i + 1);
      return;
    }

    // ✅ All questions completed for this section
    setSessionStatus("Completed");
    await endSession();

    if (relatedLesson && currentSection && currentChild?.id) {
      const lessonLog = {
        id: generateUUID(),
        childid: currentChild.id,
        completedlesson: relatedLesson.id,
        completedat: new Date().toISOString(),
        user_id: null as string | null,
      };

      try {
        void addLessonLog(lessonLog as any);
      } catch (err) {
        console.warn("⚠️ Failed to add lesson log locally:", err);
      }
    }

    // Optional: trigger unlock logic based on logs
    await fetchLessonLogs();

    const lessonName = relatedLesson?.title ?? "Unknown Lesson";
    const sectionName = currentSection?.title ?? "Unknown Section";
    setSessionDetails(
      `Completed lesson "${lessonName}" section "${sectionName}"`
    );

    Alert.alert("✅ Section Complete", "All questions answered!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  /* -----------------------
   * Loading / Error States
   * ----------------------- */
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

  /* -----------------------
   * Main Question Rendering
   * ----------------------- */
  const currentQuestion = sectionQuestions[currentQuestionIndex];
  const answerChoices = parseAnswerChoices(currentQuestion.answerchoices);
  const selectedText =
    selectedKey && answerChoices[selectedKey]
      ? answerChoices[selectedKey]
      : null;

  const explanationText = parseExplanation(
    currentQuestion.choicedescription ?? null,
    selectedKey,
    selectedText,
    answerChoices
  );

  const progressPercent =
    totalQuestions > 0
      ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
      : 0;

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

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

        {/* Progress Bar (Below Header) */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercentText}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFillContainer,
                { width: animatedWidth },
              ]}
            >
              <LinearGradient
                colors={["#22C55E", "#16A34A"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
          <Text style={styles.progressQuestionText}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentBox}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            {Object.entries(answerChoices).map(([key, text]) => {
              const isSelected = selectedKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceSelected,
                  ]}
                  onPress={() => setSelectedKey(key)}
                >
                  <Text style={styles.choiceText}>
                    {key}. {text}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={handleSubmitAnswer}
              disabled={!selectedKey}
              style={[styles.submitButton, !selectedKey && { opacity: 0.6 }]}
            >
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Explanation Modal */}
        <Modal visible={showExplanation} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
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

  // Progress bar styles
  progressWrapper: {
    paddingHorizontal: responsive.screenWidth * 0.05,
    paddingTop: responsive.screenHeight * 0.015,
    paddingBottom: responsive.screenHeight * 0.01,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: responsive.screenHeight * 0.005,
  },
  progressLabel: {
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.9,
    color: "#111827",
  },
  progressPercentText: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize * 0.9,
    color: "#16A34A",
  },
  progressBarBackground: {
    width: "100%",
    height: responsive.isNarrowScreen ? 10 : 12,
    borderRadius: 9999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressBarFillContainer: {
    height: "100%",
    borderRadius: 9999,
    overflow: "hidden",
  },
  progressQuestionText: {
    marginTop: responsive.screenHeight * 0.005,
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#4B5563",
    textAlign: "center",
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
