import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";

import { useFetchLessons } from "@/services/fetchLessons";
import { useFetchSections } from "@/services/fetchSections";

export default function AddQuestionScreen() {
  const router = useRouter();

  // ----------------------------
  // STATE
  // ----------------------------
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const [questionText, setQuestionText] = useState("");

  const [answers, setAnswers] = useState<
    { text: string; description: string }[]
  >([
    { text: "", description: "" },
    { text: "", description: "" },
  ]);

  const maxAnswers = 4;

  // NEW → Track correct answer index
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  // ----------------------------
  // FETCH DATA
  // ----------------------------
  const { data: lessons } = useFetchLessons();
  const { data: sections } = useFetchSections();

  const filteredSections = useMemo(() => {
    if (!selectedLesson || !sections) return [];
    return sections.filter((s) => s.lessonid === selectedLesson);
  }, [selectedLesson, sections]);

  // ----------------------------
  // ANSWERS
  // ----------------------------
  const updateAnswerField = (
    index: number,
    field: "text" | "description",
    value: string
  ) => {
    const updated = [...answers];
    updated[index][field] = value;

    // If editing a choice that was previously marked correct → keep it correct
    setAnswers(updated);
  };

  const addAnswer = () => {
    if (answers.length >= maxAnswers) return;
    setAnswers([...answers, { text: "", description: "" }]);
  };

  // ----------------------------
  // SUBMIT
  // ----------------------------
  const handleSubmit = () => {
    if (!selectedLesson) return alert("Select a lesson.");
    if (!selectedSection) return alert("Select a section.");
    if (!questionText.trim()) return alert("Enter question text.");

    const filled = answers.filter((a) => a.text.trim() && a.description.trim());

    if (filled.length < 2) {
      return alert("At least 2 answer choices with descriptions required.");
    }

    if (correctAnswer === null) {
      return alert("Please select a correct answer using the checkbox.");
    }

    const correctText = answers[correctAnswer].text;

    console.log("Submitting:", {
      section_id: selectedSection,
      question: questionText,
      answerchoices: answers.map((a) => a.text),
      choicedescription: answers.map((a) => a.description),
      correctanswer: correctText,
      questiontype: null,
      user_id: null,
    });

    alert("Question Created!");
    router.back();
  };

  // ----------------------------
  // RENDER
  // ----------------------------
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: "#fff" }}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        hitSlop={20}
      >
        <Ionicons name="close" size={32} color="#000" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create New Question</Text>

        {/* Lesson Dropdown */}
        <Text style={styles.label}>Lesson</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowLessonModal(true)}
        >
          <Text style={styles.dropdownText}>
            {selectedLesson
              ? lessons?.find((l) => l.id === selectedLesson)?.title
              : "Select Lesson"}
          </Text>
          <Ionicons name="caret-down" size={22} color="#000" />
        </TouchableOpacity>

        {/* Section Dropdown */}
        <Text style={styles.label}>Section</Text>
        <TouchableOpacity
          disabled={!selectedLesson}
          style={[styles.dropdown, !selectedLesson && { opacity: 0.5 }]}
          onPress={() => setShowSectionModal(true)}
        >
          <Text style={styles.dropdownText}>
            {selectedSection
              ? filteredSections.find((s) => s.id === selectedSection)?.title
              : "Select Section"}
          </Text>
          <Ionicons name="caret-down" size={22} color="#000" />
        </TouchableOpacity>

        {/* Question Text */}
        <InputBox
          label="Question"
          placeholder="Enter question"
          value={questionText}
          onChangeText={setQuestionText}
        />

        {/* Answer Choices */}
        <Text style={styles.subtitle}>Answer Choices</Text>

        <Text style={styles.helperNote}>
          Tap the checkbox to mark an answer as the correct one.
        </Text>

        {answers.map((ans, idx) => (
          <View key={idx} style={styles.answerBlock}>
            {/* Checkbox + Label */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setCorrectAnswer(idx)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={correctAnswer === idx ? "checkbox" : "square-outline"}
                size={26}
                color={correctAnswer === idx ? "#10b981" : "#555"}
              />

              <Text style={styles.checkboxLabel}>Mark as correct answer</Text>
            </TouchableOpacity>

            {/* Answer Text */}
            <InputBox
              label={`Answer Choice ${idx + 1}`}
              placeholder="Choice text"
              value={ans.text}
              onChangeText={(t) => updateAnswerField(idx, "text", t)}
            />

            {/* Description */}
            <InputBox
              label="Description"
              placeholder="Explain why this answer"
              value={ans.description}
              onChangeText={(t) => updateAnswerField(idx, "description", t)}
            />
          </View>
        ))}

        {answers.length < maxAnswers && (
          <TouchableOpacity style={styles.addChoiceBtn} onPress={addAnswer}>
            <Ionicons name="add-circle-outline" size={26} color="#000" />
            <Text style={styles.addChoiceText}>Add Answer Choice</Text>
          </TouchableOpacity>
        )}

        <Button
          title="Create Question"
          backgroundColor="#000"
          marginTop={responsive.screenHeight * 0.03}
          onPress={handleSubmit}
        />

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Lesson Modal */}
      <Modal visible={showLessonModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Lesson</Text>

            <FlatList
              data={lessons ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedLesson(item.id);
                    setSelectedSection(null);
                    setShowLessonModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLessonModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Section Modal */}
      <Modal visible={showSectionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Section</Text>

            <FlatList
              data={filteredSections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedSection(item.id);
                    setShowSectionModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowSectionModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  closeBtn: {
    position: "absolute",
    top: responsive.screenHeight * 0.035,
    right: responsive.screenWidth * 0.04,
    zIndex: 20,
  },
  container: {
    paddingTop: responsive.screenHeight * 0.08,
    paddingHorizontal: responsive.screenWidth * 0.05,
  },
  title: {
    fontSize: responsive.isNarrowScreen ? 22 : 26,
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
    marginBottom: responsive.screenHeight * 0.02,
    color: "#111",
  },
  label: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize,
    marginBottom: 6,
    color: "#000",
  },
  dropdown: {
    backgroundColor: "#D9D9D9",
    borderWidth: 2,
    borderColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize,
    color: "#000",
  },

  subtitle: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    marginTop: responsive.screenHeight * 0.02,
    marginBottom: 4,
    color: "#111",
  },

  helperNote: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#4b5563",
    marginBottom: responsive.screenHeight * 0.015,
  },

  answerBlock: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#999",
    marginBottom: 16,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive.screenHeight * 0.01,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize,
    color: "#111",
  },

  addChoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: responsive.screenHeight * 0.03,
  },
  addChoiceText: {
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize,
    marginLeft: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  modalContent: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#999",
  },
  modalTitle: {
    fontFamily: "Fredoka-Bold",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 10,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalOptionText: {
    fontFamily: "Fredoka-Medium",
    fontSize: 16,
    color: "#111",
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  cancelText: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: 16,
    color: "#EF4444",
  },
});
