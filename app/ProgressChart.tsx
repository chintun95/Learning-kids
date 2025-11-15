// file: app/ProgressionChart.tsx

import React, { useState, useEffect, useCallback } from "react";
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
import { useFocusEffect } from '@react-navigation/native';

const screenWidth = Dimensions.get("window").width;

interface ChildProfile {
  id: string;
  child_name: string; // <-- FIX: Renamed from 'name'
}

const ProgressionChart: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Flappy Bird");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);

  // --- NEW STATE ---
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("all"); // 'all' or a child's UUID
  // --- END NEW STATE ---

  const tabs = ["Flappy Bird", "Snake", "Quiz"];
  const parentUid = auth.currentUser?.uid;

  // 1. Fetch children profiles
  useFocusEffect(
    useCallback(() => {
      const fetchChildren = async () => {
        if (!parentUid) return;
        setLoading(true);
        try {
          const { data: childData, error } = await supabase
            .from("child_profiles")
            .select("id, child_name") // <-- FIX: Changed from 'name'
            .eq("parent_user_id", parentUid); // Use 'parent_user_id' from your schema

          if (error) throw error;
          setChildren(childData || []);
        } catch (error) {
          console.error("Error fetching children:", error); // This is one of the errors you saw
        } finally {
          setLoading(false);
        }
      };
      fetchChildren();
    }, [parentUid])
  );

  // 2. Fetch game data when tab or child filter changes
  useEffect(() => {
    if (parentUid) {
      fetchGameData(activeTab, selectedChildId);
    }
  }, [activeTab, selectedChildId, parentUid]);

  const fetchGameData = async (gameName: string, childId: string) => {
    setLoading(true);
    try {
      if (!parentUid) return;

      // Base query
      let query = supabase
        .from("answer_log")
        .select(
          `
          id,
          user_id,
          is_correct,
          answered_at,
          game_name,
          question_id,
          questions ( question ),
          child_profiles ( child_name ) 
        ` // <-- FIX: Changed from 'name' to 'child_name'
        )
        .eq("user_id", parentUid) // Filter by parent
        .eq("game_name", gameName);

      // Add child filter if not 'all'
      if (childId !== "all") {
        query = query.eq("child_id", childId);
      }

      // Order and execute
      const { data: results, error } = await query.order("answered_at", {
        ascending: true,
      });

      if (error) throw error; // This is the other error you saw

      // Filter out deleted/unknown questions
      const validResults = results.filter(
        (r: any) => r.questions?.question && r.questions.question !== "Unknown question"
      );

      // Group valid results by day for chart
      const groupedByDay = validResults.reduce((acc: any, row: any) => {
        const day = new Date(row.answered_at).toLocaleDateString();
        if (!acc[day]) acc[day] = { correct: 0, incorrect: 0 };
        row.is_correct ? acc[day].correct++ : acc[day].incorrect++;
        return acc;
      }, {});

      // Prepare chart data with newest first
      const labels = Object.keys(groupedByDay).reverse();
      const correctData = labels.map((day) => groupedByDay[day].correct);
      const incorrectData = labels.map((day) => groupedByDay[day].incorrect);

      setData({
        labels,
        datasets: [
          { data: correctData, color: () => "#4CAF50", strokeWidth: 2 },
          { data: incorrectData, color: () => "#F44336", strokeWidth: 2 },
        ],
      });

      // Prepare question list (newest first)
      const questionsData = validResults
        .map((r: any) => ({
          question: r.questions?.question,
          is_correct: r.is_correct,
          answered_at: r.answered_at,
          childName: r.child_profiles?.child_name || "Unknown Child", // <-- FIX: Get child_name
        }))
        .reverse();

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
      return (
        <Text style={styles.noDataText}>
          No progress data for {activeTab}
          {selectedChildId !== 'all' && ` for ${children.find(c => c.id === selectedChildId)?.child_name}`} {/* <-- FIX */}
        </Text>
      );

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
          {/* --- SHOW CHILD NAME --- */}
          {selectedChildId === 'all' && (
             <Text style={styles.childNameText}>{q.childName}</Text>
          )}
          {/* --- END --- */}

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

  // --- NEW CHILD FILTER RENDER ---
  const renderChildFilters = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        onPress={() => setSelectedChildId("all")}
        style={[
          styles.tabButton,
          selectedChildId === "all" && styles.activeTabButton,
        ]}
      >
        <Text
          style={[
            styles.tabText,
            selectedChildId === "all" && styles.activeTabText,
          ]}
        >
          All Children
        </Text>
      </TouchableOpacity>

      {children.map((child) => (
        <TouchableOpacity
          key={child.id}
          onPress={() => setSelectedChildId(child.id)}
          style={[
            styles.tabButton,
            selectedChildId === child.id && styles.activeTabButton,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              selectedChildId === child.id && styles.activeTabText,
            ]}
          >
            {child.child_name} {/* <-- FIX */}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  // --- END NEW RENDER ---

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

      {/* --- ADD CHILD FILTERS --- */}
      <Text style={styles.filterTitle}>Filter by Child:</Text>
      {renderChildFilters()}
      {/* --- END --- */}

      <View style={styles.chartContainer}>{renderChart()}</View>
      <Text style={styles.subTitle}>Questions Answered in {activeTab}</Text>
      {renderQuestionList()}
    </View>
  );
};

export default ProgressionChart;

// ... (styles remain unchanged) ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    padding: 10,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap", // Allow wrapping
    marginBottom: 10,
    marginTop: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    margin: 4, // Add margin for wrapping
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
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginLeft: 10,
    marginTop: 10,
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
    paddingHorizontal: 20,
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
  childNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00796B',
    marginBottom: 5,
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