// app/(protected)/(parent)/progress-chart/[id].tsx
/* --- FULL DROP-IN REPLACEMENT WITH GAME TOGGLE & GAME CHART --- */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";

import { useChildById } from "@/services/fetchChildren";
import { useFetchLessons } from "@/services/fetchLessons";
import { useFetchSections } from "@/services/fetchSections";
import { useFetchQuestionLogsWithSections } from "@/services/fetchQuestionLog";
import { useFetchGameStoreByChild } from "@/services/fetchGameStore";

import { responsive } from "@/utils/responsive";

const screenWidth = Dimensions.get("window").width;

/** Distinct colors — no repeats */
const SECTION_COLORS = [
  "#4CAF50",
  "#F44336",
  "#2196F3",
  "#FF9800",
  "#9C27B0",
  "#009688",
  "#E91E63",
  "#3F51B5",
  "#8BC34A",
  "#795548",
];

type GameFilter = "flappy" | "snake";

export default function ProgressChartScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [toggle, setToggle] = useState<"lessons" | "games">("lessons");
  const [lessonFilter, setLessonFilter] = useState<number>(1);
  const [gameFilter, setGameFilter] = useState<GameFilter>("flappy");

  /* --------------------------------------------------------------
     FETCH DATA
  -------------------------------------------------------------- */
  const { data: child, isLoading: childLoading } = useChildById(id);
  const { data: lessons, isLoading: lessonsLoading } = useFetchLessons();
  const { data: sections, isLoading: sectionsLoading } = useFetchSections();
  const { data: logsWithSections, isLoading: logsLoading } =
    useFetchQuestionLogsWithSections();

  const {
    data: gameStoreRows,
    isLoading: gameLoading,
    error: gameError,
  } = useFetchGameStoreByChild(id);

  const isLessonsLoading =
    childLoading || lessonsLoading || sectionsLoading || logsLoading;

  const handleClose = () => router.push("/(protected)/(parent)/(tabs)");

  /* --------------------------------------------------------------
     1) SORT LESSONS BY NUMBER
  -------------------------------------------------------------- */
  const sortedLessons = useMemo(() => {
    if (!lessons) return [];
    return lessons
      .map((l) => {
        const match = l.title.match(/Lesson\s+(\d+)/i);
        return { ...l, lessonNumber: match ? Number(match[1]) : 999 };
      })
      .sort((a, b) => a.lessonNumber - b.lessonNumber);
  }, [lessons]);

  /* LESSON UUID */
  const selectedLessonId = sortedLessons[lessonFilter - 1]?.id ?? null;

  /* FILTER SECTIONS */
  const sectionsForLesson = useMemo(() => {
    if (!sections || !selectedLessonId) return [];
    return sections.filter((s) => s.lessonid === selectedLessonId);
  }, [sections, selectedLessonId]);

  /* FILTER LOGS FOR THIS CHILD + LESSON */
  const logsForLesson = useMemo(() => {
    if (!child || !logsWithSections) return [];

    return logsWithSections.filter(
      (log) =>
        log.childid === child.id &&
        log.question?.lessonid === selectedLessonId &&
        !!log.section?.id
    );
  }, [child, logsWithSections, selectedLessonId]);

  /* --------------------------------------------------------------
     LESSONS CHART DATA
  -------------------------------------------------------------- */
  const chartData = useMemo(() => {
    if (!logsForLesson.length || sectionsForLesson.length === 0) return null;

    const sectionDateMap: Record<string, Record<string, number>> = {};
    sectionsForLesson.forEach((sec) => (sectionDateMap[sec.id] = {}));

    logsForLesson.forEach((log) => {
      const sec = log.section;
      if (!sec) return;

      const dateString = log.completedat ?? null;
      if (!dateString) return;

      const date = dateString.split("T")[0];
      if (!date) return;

      sectionDateMap[sec.id][date] = (sectionDateMap[sec.id][date] ?? 0) + 1;
    });

    const allDates = Array.from(
      new Set(Object.values(sectionDateMap).flatMap((d) => Object.keys(d)))
    ).sort();

    const datasets = sectionsForLesson.map((sec, idx) => ({
      data: allDates.map((d) => sectionDateMap[sec.id][d] ?? 0),
      color: () => SECTION_COLORS[idx % SECTION_COLORS.length],
      strokeWidth: 2,
    }));

    return { labels: allDates, datasets };
  }, [logsForLesson, sectionsForLesson]);

  const dynamicChartWidth = chartData?.labels?.length
    ? Math.max(screenWidth, chartData.labels.length * 90)
    : screenWidth;

  /* --------------------------------------------------------------
     GROUP QUESTIONS BY SECTION (for LESSONS LIST)
  -------------------------------------------------------------- */
  const questionsBySection = useMemo(() => {
    const groups: Record<string, typeof logsForLesson> = {};

    sectionsForLesson.forEach((s) => (groups[s.id] = []));

    logsForLesson.forEach((log) => {
      const secId = log.section?.id;
      if (secId && groups[secId]) groups[secId].push(log);
    });

    return groups;
  }, [logsForLesson, sectionsForLesson]);

  /* --------------------------------------------------------------
     GAME CHART DATA (daily aggregation)
  -------------------------------------------------------------- */
  const gameChartData = useMemo(() => {
    if (!gameStoreRows || gameStoreRows.length === 0) return null;

    // Filter by current game (flappy/snake)
    const rowsForGame = gameStoreRows.filter(
      (row) => row.gametitle === gameFilter
    );

    if (!rowsForGame.length) return null;

    type DailyAgg = { score: number; points: number };

    const byDate: Record<string, DailyAgg> = {};

    rowsForGame.forEach((row) => {
      if (!row.completedat) return;

      const date = new Date(row.completedat);
      if (isNaN(date.getTime())) return;

      const dayKey = date.toISOString().split("T")[0];

      if (!byDate[dayKey]) {
        byDate[dayKey] = { score: 0, points: 0 };
      }

      byDate[dayKey].score += row.score ?? 0;
      byDate[dayKey].points += row.points ?? 0;
    });

    const labels = Object.keys(byDate).sort();
    if (labels.length === 0) return null;

    const scoreSeries = labels.map((d) => byDate[d].score);
    const pointsSeries = labels.map((d) => byDate[d].points);

    return {
      labels,
      datasets: [
        {
          data: scoreSeries,
          color: () => "#4F46E5", // Score line
          strokeWidth: 2,
        },
        {
          data: pointsSeries,
          color: () => "#FF9800", // Points line
          strokeWidth: 2,
        },
      ],
    };
  }, [gameStoreRows, gameFilter]);

  const dynamicGameChartWidth = gameChartData?.labels?.length
    ? Math.max(screenWidth, gameChartData.labels.length * 90)
    : screenWidth;

  /* --------------------------------------------------------------
     SAFE DATE FORMATTER
  -------------------------------------------------------------- */
  function formatDate(d: string | null): string {
    if (!d) return "Unknown time";
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return "Invalid date";
    return parsed.toLocaleString();
  }

  /* --------------------------------------------------------------
     UI
  -------------------------------------------------------------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* CLOSE */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={32} color="#000" />
      </TouchableOpacity>

      {/* TITLE */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>
          {child
            ? `Progress Chart for ${child.firstName} ${child.lastName}`
            : "Progress Chart"}
        </Text>
      </View>

      <View style={styles.separator} />

      {/* MAIN TOGGLE: LESSONS / GAMES */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            toggle === "lessons" && styles.toggleActive,
          ]}
          onPress={() => setToggle("lessons")}
        >
          <Ionicons name="book" size={26} color="#000" />
          <Text
            style={[
              styles.toggleText,
              toggle === "lessons" && styles.toggleTextActive,
            ]}
          >
            Lessons
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            toggle === "games" && styles.toggleActive,
          ]}
          onPress={() => setToggle("games")}
        >
          <Ionicons name="game-controller" size={26} color="#666" />
          <Text
            style={[
              styles.toggleText,
              toggle === "games" && styles.toggleTextActive,
            ]}
          >
            Games
          </Text>
        </TouchableOpacity>
      </View>

      {/* LESSON NUMBER FILTER */}
      {toggle === "lessons" && (
        <View style={styles.lessonSelectorRow}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity
              key={num}
              onPress={() => setLessonFilter(num)}
              style={[
                styles.lessonBtn,
                lessonFilter === num && styles.lessonBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.lessonBtnText,
                  lessonFilter === num && styles.lessonBtnTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* GAME FILTER TOGGLE (FLAPPY / SNAKE) */}
      {toggle === "games" && (
        <View style={styles.gameToggleRow}>
          {(["flappy", "snake"] as GameFilter[]).map((game) => (
            <TouchableOpacity
              key={game}
              onPress={() => setGameFilter(game)}
              style={[
                styles.gameBtn,
                gameFilter === game && styles.gameBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.gameBtnText,
                  gameFilter === game && styles.gameBtnTextActive,
                ]}
              >
                {game === "flappy" ? "Flappy" : "Snake"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* MAIN SCROLL */}
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.chartWrapper}>
          {toggle === "games" ? (
            gameLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" />
            ) : gameError ? (
              <Text style={styles.noData}>Error loading game data</Text>
            ) : gameChartData ? (
              <>
                <View style={styles.chartCard}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={gameChartData}
                      width={dynamicGameChartWidth}
                      height={260}
                      bezier
                      chartConfig={{
                        backgroundGradientFrom: "#fff",
                        backgroundGradientTo: "#fff",
                        color: () => "#000",
                        labelColor: () => "#444",
                        decimalPlaces: 0,
                        propsForDots: { r: "5" },
                      }}
                      style={styles.chartStyle}
                    />
                  </ScrollView>
                  <Text style={styles.legendTitle}>
                    Daily Score & Points (
                    {gameFilter === "flappy" ? "Flappy Bird" : "Snake"})
                  </Text>

                  <View style={styles.legendGrid}>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: "#4F46E5" },
                        ]}
                      />
                      <Text style={styles.legendText}>Score</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: "#FF9800" },
                        ]}
                      />
                      <Text style={styles.legendText}>Points</Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.noData}>No game data available</Text>
            )
          ) : isLessonsLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : chartData ? (
            <>
              {/* LESSONS CHART */}
              <View style={styles.chartCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={chartData}
                    width={dynamicChartWidth}
                    height={260}
                    bezier
                    chartConfig={{
                      backgroundGradientFrom: "#fff",
                      backgroundGradientTo: "#fff",
                      color: () => "#000",
                      labelColor: () => "#444",
                      decimalPlaces: 0,
                      propsForDots: { r: "5" },
                    }}
                    style={styles.chartStyle}
                  />
                </ScrollView>
              </View>

              {/* LESSONS LEGEND */}
              <Text style={styles.legendTitle}>Section Breakdown</Text>

              <View style={styles.legendGrid}>
                {sectionsForLesson.map((sec, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor:
                            SECTION_COLORS[idx % SECTION_COLORS.length],
                        },
                      ]}
                    />
                    <Text style={styles.legendText}>{sec.title}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.largeSeparator} />

              {/* QUESTIONS ANSWERED BY SECTION */}
              <Text style={styles.questionsHeader}>Questions Answered</Text>

              {sectionsForLesson.map((sec, idx) => {
                const logs = questionsBySection[sec.id];
                if (!logs || logs.length === 0) return null;

                return (
                  <View key={idx} style={styles.sectionBlock}>
                    <Text style={styles.sectionTitleText}>{sec.title}</Text>

                    {logs.map((log) => {
                      const q = log.question;
                      if (!q) return null;

                      const choices = Array.isArray(q.answerchoices)
                        ? q.answerchoices
                        : [];

                      return (
                        <View key={log.id} style={styles.questionCard}>
                          <Text style={styles.questionText}>{q.question}</Text>

                          {choices.map((choice, i) => {
                            const isCorrect = log.iscorrect;
                            const isSelected = q.correctanswer === choice;

                            return (
                              <View
                                key={i}
                                style={[
                                  styles.choiceRow,
                                  isSelected &&
                                    (isCorrect
                                      ? styles.choiceCorrect
                                      : styles.choiceIncorrect),
                                ]}
                              >
                                <Text style={styles.choiceText}>{choice}</Text>
                              </View>
                            );
                          })}

                          <Text style={styles.timestamp}>
                            {formatDate(log.completedat)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={styles.noData}>No data available</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF9F4" },

  closeButton: {
    position: "absolute",
    top: responsive.screenHeight * 0.04,
    right: responsive.screenWidth * 0.04,
    zIndex: 10,
  },

  headerContainer: {
    marginTop: responsive.screenHeight * 0.06,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontFamily: "Fredoka-SemiBold",
    color: "#333",
  },

  separator: {
    width: "88%",
    height: 2,
    backgroundColor: "#000",
    opacity: 0.2,
    alignSelf: "center",
    marginVertical: 10,
  },

  largeSeparator: {
    width: "90%",
    height: 2,
    backgroundColor: "#CCC",
    opacity: 0.5,
    alignSelf: "center",
    marginVertical: 20,
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 10,
  },

  toggleActive: { borderBottomWidth: 2, borderColor: "#000", paddingBottom: 4 },

  toggleButton: { alignItems: "center" },

  toggleText: { marginTop: 4, fontFamily: "Fredoka-Medium", color: "#666" },
  toggleTextActive: { color: "#000", fontFamily: "Fredoka-SemiBold" },

  /* LESSON NUMBER TOGGLE */
  lessonSelectorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },

  lessonBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DDD",
    justifyContent: "center",
    alignItems: "center",
  },

  lessonBtnActive: { backgroundColor: "#000" },

  lessonBtnText: {
    fontFamily: "Fredoka-Medium",
    fontSize: 16,
    color: "#000",
  },

  lessonBtnTextActive: {
    color: "#fff",
    fontFamily: "Fredoka-SemiBold",
  },

  /* GAME TOGGLE (FLAPPY / SNAKE) */
  gameToggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },

  gameBtn: {
    width: 90,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DDD",
    justifyContent: "center",
    alignItems: "center",
  },

  gameBtnActive: {
    backgroundColor: "#000",
  },

  gameBtnText: {
    fontFamily: "Fredoka-Medium",
    fontSize: 14,
    color: "#000",
  },

  gameBtnTextActive: {
    color: "#fff",
    fontFamily: "Fredoka-SemiBold",
  },

  chartWrapper: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 40,
  },

  chartCard: {
    backgroundColor: "#FFF8E1",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFECB3",
    width: screenWidth - 40,
    alignItems: "center",
  },

  chartStyle: { borderRadius: 12 },

  legendTitle: {
    fontSize: 16,
    fontFamily: "Fredoka-SemiBold",
    color: "#000",
    marginTop: 14,
    marginBottom: 8,
    textAlign: "center",
  },

  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 20,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    width: screenWidth * 0.4,
    marginVertical: 4,
  },

  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },

  legendText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "Fredoka-Regular",
  },

  questionsHeader: {
    fontSize: 20,
    fontFamily: "Fredoka-SemiBold",
    color: "#000",
    marginBottom: 10,
    paddingHorizontal: 20,
  },

  sectionBlock: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  sectionTitleText: {
    fontSize: 18,
    fontFamily: "Fredoka-SemiBold",
    marginBottom: 8,
    color: "#444",
  },

  questionCard: {
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },

  questionText: {
    fontSize: 15,
    fontFamily: "Fredoka-Medium",
    marginBottom: 8,
    color: "#333",
  },

  choiceRow: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#EEE",
    marginBottom: 6,
  },

  choiceCorrect: {
    backgroundColor: "#C8E6C9",
  },

  choiceIncorrect: {
    backgroundColor: "#FFCDD2",
  },

  choiceText: {
    fontSize: 14,
    color: "#222",
  },

  timestamp: {
    marginTop: 6,
    fontSize: 12,
    color: "#777",
  },

  noData: {
    marginTop: 30,
    fontSize: 16,
    fontFamily: "Fredoka-Regular",
    color: "#999",
  },
});
