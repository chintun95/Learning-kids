// file: app/ProgressionChart.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { supabase } from "../backend/supabase";
import { auth } from "../firebase";

const screenWidth = Dimensions.get("window").width;

const ProgressionChart: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Flappy Bird");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);

  const tabs = ["Flappy Bird", "Snake", "Quiz"];

  useEffect(() => {
    fetchGameData(activeTab);
  }, [activeTab]);

  const fetchGameData = async (gameName: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const { data: results, error } = await supabase
        .from("answer_log")
        .select(
          `
          id,
          user_id,
          is_correct,
          answered_at,
          game_name,
          question_id,
          questions ( question )
        `
        )
        .eq("user_id", user.uid)
        .eq("game_name", gameName)
        .order("answered_at", { ascending: true });

      if (error) throw error;

      const groupedByDay = results.reduce((acc: any, row: any) => {
        const day = new Date(row.answered_at).toLocaleDateString();
        if (!acc[day]) acc[day] = { correct: 0, incorrect: 0 };
        row.is_correct ? acc[day].correct++ : acc[day].incorrect++;
        return acc;
      }, {});

      const labels = Object.keys(groupedByDay);
      const correctData = labels.map((day) => groupedByDay[day].correct);
      const incorrectData = labels.map((day) => groupedByDay[day].incorrect);

      setData({
        labels,
        datasets: [
          { data: correctData, color: () => "#4CAF50", strokeWidth: 2 },
          { data: incorrectData, color: () => "#F44336", strokeWidth: 2 },
        ],
      });

      const questionsData = results.map((r: any) => ({
        question: r.questions?.question || "Unknown question",
        is_correct: r.is_correct,
        answered_at: r.answered_at,
      }));

      setQuestions(questionsData);
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (loading)
      return <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />;
    if (!data || data.labels.length === 0)
      return <Text style={styles.noDataText}>No progress data for {activeTab}</Text>;

    return (
      <LineChart
        data={data}
        width={screenWidth - 40}
        height={250}
        chartConfig={{
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
          labelColor: () => "#333",
          propsForDots: { r: "5" },
        }}
        bezier
        style={{ borderRadius: 16, marginVertical: 8 }}
      />
    );
  };

  const renderQuestionList = () => (
    <ScrollView style={{ marginTop: 10 }}>
      {questions.map((q, index) => (
        <View
          key={index}
          style={[
            styles.questionItem,
            { backgroundColor: q.is_correct ? "#E8F5E9" : "#FFEBEE" },
          ]}
        >
          <Text style={styles.questionText}>Q: {q.question}</Text>
          <Text
            style={[
              styles.answerStatus,
              { color: q.is_correct ? "green" : "red" },
            ]}
          >
            {q.is_correct ? "✅ Correct" : "❌ Incorrect"}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(q.answered_at).toLocaleString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTabButton,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartContainer}>{renderChart()}</View>
      <Text style={styles.subTitle}>Questions Answered in {activeTab}</Text>
      {renderQuestionList()}
    </View>
  );
};

export default ProgressionChart;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    padding: 10,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
    marginTop: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  activeTabButton: {
    backgroundColor: "#4CAF50",
  },
  tabText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
    color: "#999",
  },
  subTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
    textAlign: "center",
    color: "#333",
  },
  questionItem: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  answerStatus: {
    fontSize: 14,
    marginTop: 5,
  },
  timestamp: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },
});
