// file: app/ProgressionChart.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Alert,
} from "react-native";

import { LineChart } from "react-native-chart-kit";
import { supabase } from "../backend/supabase";
import { auth } from "../firebase";
import { useFocusEffect } from "@react-navigation/native";

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { captureRef } from "react-native-view-shot";

const screenWidth = Dimensions.get("window").width;

interface ChildProfile {
  id: string;
  child_name: string;
}

const ProgressionChart: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Flappy Bird");
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [selectedChildId, setSelectedChildId] = useState("all");
  const [loading, setLoading] = useState(true);

  const parentUid = auth.currentUser?.uid;
  const exportRef = useRef(null);

  const tabs = ["Flappy Bird", "Snake", "Quiz"];

  // Date-range
  const [rangeLabel, setRangeLabel] = useState("All time");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const applyPreset = (preset: "7d" | "30d" | "6m" | "1y" | "all") => {
    const end = new Date();
    let start: Date | null = null;

    if (preset === "7d") {
      start = new Date();
      start.setDate(end.getDate() - 7);
      setRangeLabel("Last 7 days");
    } else if (preset === "30d") {
      start = new Date();
      start.setDate(end.getDate() - 30);
      setRangeLabel("Last 30 days");
    } else if (preset === "6m") {
      start = new Date();
      start.setMonth(end.getMonth() - 6);
      setRangeLabel("Last 6 months");
    } else if (preset === "1y") {
      start = new Date();
      start.setFullYear(end.getFullYear() - 1);
      setRangeLabel("Last 1 year");
    } else {
      setRangeLabel("All time");
    }

    setRangeStart(start);
    setRangeEnd(end);
  };

  useEffect(() => {
    applyPreset("all");
  }, []);

  // Fetch children
  useFocusEffect(
    useCallback(() => {
      const loadChildren = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from("child_profiles")
            .select("id, child_name")
            .eq("parent_user_id", parentUid);

          if (!error) setChildren(data || []);
        } catch (e) {
          console.log(e);
        }
        setLoading(false);
      };
      loadChildren();
    }, [parentUid])
  );

  // Fetch game data
  useEffect(() => {
    if (parentUid) {
      loadGameData(activeTab, selectedChildId, rangeStart, rangeEnd);
    }
  }, [activeTab, selectedChildId, rangeStart, rangeEnd]);

  const loadGameData = async (
    gameName: string,
    childId: string,
    startDate: Date | null,
    endDate: Date | null
  ) => {
    setLoading(true);
    try {
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
          child_id,
          questions ( question ),
          child_profiles ( child_name )
        `
        )
        .eq("user_id", parentUid)
        .eq("game_name", gameName);

      if (childId !== "all") query = query.eq("child_id", childId);
      if (startDate) query = query.gte("answered_at", startDate.toISOString());
      if (endDate) {
        const endMax = new Date(endDate);
        endMax.setHours(23, 59, 59, 999);
        query = query.lte("answered_at", endMax.toISOString());
      }

      const { data: results, error } = await query.order("answered_at", {
        ascending: true,
      });

      if (error) throw error;

      const filtered = results.filter(
        (r) => r.questions?.question && r.questions.question !== "Unknown question"
      );

      const grouped = filtered.reduce((acc: any, row: any) => {
        const day = new Date(row.answered_at).toLocaleDateString();
        if (!acc[day]) acc[day] = { correct: 0, incorrect: 0 };
        row.is_correct ? acc[day].correct++ : acc[day].incorrect++;
        return acc;
      }, {});

      const labels = Object.keys(grouped).reverse();
      const correct = labels.map((d) => grouped[d].correct);
      const incorrect = labels.map((d) => grouped[d].incorrect);

      setData({
        labels,
        datasets: [
          { data: correct, color: () => "#4CAF50", strokeWidth: 2 },
          { data: incorrect, color: () => "#F44336", strokeWidth: 2 },
        ],
      });

      setQuestions(
        filtered
          .map((r) => ({
            question: r.questions?.question,
            is_correct: r.is_correct,
            answered_at: r.answered_at,
            childName: r.child_profiles?.child_name || "Unknown",
          }))
          .reverse()
      );
    } catch (e) {
      console.log(e);
      setData(null);
      setQuestions([]);
    }
    setLoading(false);
  };

  // ---------------- Export Helpers ----------------

  const formatRange = () => {
    if (!rangeStart) return "All time";
    return `${rangeStart.toLocaleDateString()} — ${rangeEnd?.toLocaleDateString()}`;
  };

  const getIncorrectList = () => questions.filter((q) => !q.is_correct);

  // ---------------- CSV -----------------
  const shareCSV = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing not available on this platform");
      return;
    }

    const header = ["Child", "Game", "Question", "Correct", "Date"];
    const rows = questions.map((q) => [
      q.childName,
      activeTab,
      (q.question || "").replace(/[\n\r]/g, " "),
      q.is_correct ? "TRUE" : "FALSE",
      new Date(q.answered_at).toISOString(),
    ]);

    const csvString = [header, ...rows].map((r) => r.join(",")).join("\n");
    const fileUri = `${FileSystem.documentDirectory}progress_${Date.now()}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: "utf8" });
    await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Export CSV" });
  };

  // ---------------- PDF -----------------
  const sharePDF = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing not available on this platform");
      return;
    }

    if (!exportRef.current) return Alert.alert("Nothing to capture");

    const imgUri = await captureRef(exportRef.current, { format: "png", quality: 1 });
    const b64 = await FileSystem.readAsStringAsync(imgUri, { encoding: "base64" });
    const imgData = `data:image/png;base64,${b64}`;

    const incorrect = getIncorrectList();
    const html = `
      <html>
        <body>
          <h1>Learning Kids — Progress Report</h1>
          <p><b>Game:</b> ${activeTab}</p>
          <p><b>Date Range:</b> ${formatRange()}</p>
          <img src="${imgData}" style="width:100%;height:auto;"/>
          <h2>Incorrect Questions</h2>
          ${
            incorrect.length === 0
              ? "<p>None</p>"
              : `<ul>${incorrect
                  .map(
                    (q) =>
                      `<li>${q.childName}: ${q.question} — ${new Date(
                        q.answered_at
                      ).toLocaleString()}</li>`
                  )
                  .join("")}</ul>`
          }
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Progress PDF" });
  };

  // ---------------- Image -----------------
  const shareImage = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing not available on this platform");
      return;
    }

    if (!exportRef.current) return Alert.alert("Nothing to capture");

    const uri = await captureRef(exportRef.current, { format: "png", quality: 1 });
    await Sharing.shareAsync(uri, { dialogTitle: `Progress - ${activeTab}` });
  };

  // ---------------- UI ----------------
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Date Range</Text>
      <View style={styles.presetRow}>
        {["7d", "30d", "6m", "1y", "all"].map((p) => (
          <TouchableOpacity key={p} style={styles.presetButton} onPress={() => applyPreset(p as any)}>
            <Text>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.rangeLabel}>{rangeLabel}</Text>

      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportBtn} onPress={shareCSV}>
          <Text style={styles.exportText}>CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={sharePDF}>
          <Text style={styles.exportText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={shareImage}>
          <Text style={styles.exportText}>Image</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t)}
            style={[styles.tabBtn, activeTab === t && styles.activeTabBtn]}
          >
            <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Child filters */}
      <Text style={styles.sectionTitle}>Filter by Child</Text>
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setSelectedChildId("all")}
          style={[styles.tabBtn, selectedChildId === "all" && styles.activeTabBtn]}
        >
          <Text style={[styles.tabText, selectedChildId === "all" && styles.activeTabText]}>All Children</Text>
        </TouchableOpacity>
        {children.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setSelectedChildId(c.id)}
            style={[styles.tabBtn, selectedChildId === c.id && styles.activeTabBtn]}
          >
            <Text style={[styles.tabText, selectedChildId === c.id && styles.activeTabText]}>{c.child_name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart + Questions */}
      <View ref={exportRef} collapsable={false}>
        <View style={styles.chartContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : data && data.labels.length > 0 ? (
            <LineChart
              data={data}
              width={screenWidth - 40}
              height={250}
              chartConfig={{
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                color: () => "#000",
                labelColor: () => "#333",
                propsForDots: { r: "5" },
              }}
              bezier
              style={{ borderRadius: 12 }}
            />
          ) : (
            <Text style={styles.noData}>No data available</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Questions Answered in {activeTab}</Text>
        <ScrollView>
          {questions.map((q, i) => (
            <View
              key={i}
              style={[
                styles.questionItem,
                { backgroundColor: q.is_correct ? "#E8F5E9" : "#FFEBEE" },
              ]}
            >
              {selectedChildId === "all" && <Text style={styles.childName}>{q.childName}</Text>}
              <Text style={styles.qText}>Q: {q.question}</Text>
              <Text style={[styles.qStatus, { color: q.is_correct ? "green" : "red" }]}>
                {q.is_correct ? "Correct" : "Incorrect"}
              </Text>
              <Text style={styles.qDate}>{new Date(q.answered_at).toLocaleString()}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default ProgressionChart;

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#FFF9F4',padding:12},
  sectionTitle:{fontSize:18,fontWeight:'700',marginVertical:8,color:'#333'},
  presetRow:{flexDirection:'row',justifyContent:'center',marginVertical:6,gap:10},
  presetButton:{paddingVertical:6,paddingHorizontal:12,backgroundColor:'#FFF3E0',borderRadius:14,borderWidth:1,borderColor:'#FFE0B2'},
  presetText:{color:'#F57C00',fontWeight:'700'},
  rangeLabel:{textAlign:'center',fontSize:14,color:'#555',marginBottom:10},
  exportRow:{flexDirection:'row',justifyContent:'center',marginBottom:12,gap:10},
  exportBtn:{paddingVertical:8,paddingHorizontal:14,borderRadius:14,shadowColor:'#000',shadowOpacity:0.2,shadowOffset:{width:0,height:3},elevation:3},
  exportText:{color:'#fff',fontWeight:'700'},
  tabRow:{flexDirection:'row',flexWrap:'wrap',marginVertical:10,gap:8},
  tabBtn:{paddingVertical:6,paddingHorizontal:14,borderRadius:20,backgroundColor:'#FFF3F8',borderWidth:1,borderColor:'#FCE4EC'},
  activeTabBtn:{backgroundColor:'#FFD54F',borderColor:'#FFC107'},
  tabText:{color:'#666',fontWeight:'700'},
  activeTabText:{color:'#333'},
  childScroll:{marginVertical:8},
  childBtn:{paddingHorizontal:12,paddingVertical:6,borderRadius:20,backgroundColor:'#E1F5FE',marginRight:6},
  childBtnActive:{backgroundColor:'#4FC3F7'},
  childText:{fontWeight:'700',color:'#333'},
  childTextActive:{color:'#fff'},
  chartContainer:{alignItems:'center',marginVertical:8,backgroundColor:'#FFF8E1',padding:10,borderRadius:16,borderWidth:1,borderColor:'#FFECB3'},
  noData:{textAlign:'center',color:'#999',marginVertical:12},
  questionItem:{padding:10,borderRadius:12,marginVertical:6,borderWidth:1,borderColor:'#EFEFEF',shadowColor:'#000',shadowOpacity:0.06,shadowOffset:{width:0,height:2},elevation:2},
  childName:{fontWeight:'700',color:'#00796B',marginBottom:4},
  qText:{fontSize:15,color:'#222',marginBottom:4},
  qStatus:{fontSize:14,fontWeight:'700'},
  qDate:{fontSize:12,color:'#555',marginTop:4}
});