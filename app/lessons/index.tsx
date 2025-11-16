import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { responsive } from "@/utils/responsive";

import { supabase } from "@/lib/supabase";

import { useLessonStore } from "@/lib/store/lessonStore";
import { useSectionStore } from "@/lib/store/sectionStore";
import { useLessonLogStore } from "@/lib/store/lessonLogStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useChildAchievementStore } from "@/lib/store/childAchievementStore";

import LessonCard from "@/app/lessons/UI/LessonCard";

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

// ---------------------------------------------
// 🔥 MAP EACH LESSON → ITS COMPLETION ACHIEVEMENT
// ---------------------------------------------
const LESSON_TO_ACHIEVEMENT: Record<string, string> = {
  // Replace with your real lesson IDs
  "fire-safety": "45fd27f1-29e5-4105-90f1-f88114581821",
  "earthquake-safety": "178ce2df-f484-4538-99c6-2db346911b4a",
  "health-hygiene": "5d0295ac-c6ad-4fa0-a3f5-79f1450a688b",
  "public-safety": "e74faae2-35ed-4ae0-859c-e584fe66bed9",
  "intro-safety": "a282b5c2-371b-4f04-864a-3d1bc626e28e",
};

export default function LessonIndex() {
  const router = useRouter();

  const { lessons, fetchLessons, loading } = useLessonStore();
  const {
    fetchSections,
    sections,
    loading: sectionsLoading,
  } = useSectionStore();
  const { logs: lessonLogs } = useLessonLogStore();

  const currentChildId = useChildAuthStore((s) => s.currentChildId);

  const {
    allAchievements,
    achievementsByChild,
    loadGlobalAchievementsOnce,
    fetchChildAchievements,
  } = useChildAchievementStore();

  /** ---------------------------------------------
   * Load required data on mount
   --------------------------------------------- */
  useEffect(() => {
    fetchLessons();
    fetchSections();
    loadGlobalAchievementsOnce();
    if (currentChildId) fetchChildAchievements(currentChildId);
  }, []);

  /** ---------------------------------------------
   * Memo: which achievements child already has
   --------------------------------------------- */
  const childEarned = useMemo(() => {
    if (!currentChildId) return new Set<string>();
    return new Set(
      achievementsByChild[currentChildId]?.map((a) => a.achievement?.id) || []
    );
  }, [achievementsByChild, currentChildId]);

  /** ---------------------------------------------
   * Check if a lesson is completed
   --------------------------------------------- */
  const isLessonCompleted = (lessonId: string): boolean => {
    return lessonLogs.some(
      (l) => l.childid === currentChildId && l.completedlesson === lessonId
    );
  };

  /** ---------------------------------------------
   * Award a child an achievement (safe, once)
   --------------------------------------------- */
  const awardAchievement = async (achievementId: string) => {
    if (!currentChildId) return;
    if (childEarned.has(achievementId)) return;

    const achievement = allAchievements.find((a) => a.id === achievementId);
    if (!achievement) return;

    await supabase.from("ChildAchievement").insert({
      id: crypto.randomUUID(),
      achievementearned: achievementId,
      childid: currentChildId,
      dateearned: new Date().toISOString(),
      user_id: null,
    });

    fetchChildAchievements(currentChildId);
  };

  /** ---------------------------------------------
   * Award achievements when lessons are completed
   --------------------------------------------- */
  useEffect(() => {
    if (!currentChildId || lessons.length === 0) return;

    lessons.forEach((lesson) => {
      if (!isLessonCompleted(lesson.id)) return;

      const achievementId = LESSON_TO_ACHIEVEMENT[lesson.id];
      if (achievementId) {
        awardAchievement(achievementId);
      }
    });
  }, [lessonLogs, lessons, currentChildId]);

  /** --------------------------------------------- */

  const handleClose = () => router.back();

  if (loading || sectionsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading lessons...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      <View style={styles.headerBackground} />

      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Lesson Selection</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={responsive.isNarrowScreen ? 20 : 24}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {lessons.length === 0 ? (
            <Text style={styles.emptyText}>No lessons available.</Text>
          ) : (
            lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))
          )}
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

/** ---------- Styles ---------- **/
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#fff" },

  background: { flex: 1, width: "100%", height: "100%" },
  backgroundImage: { transform: [{ scale: 1.22 }] },

  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: statusBarHeight + 40,
    backgroundColor: "rgba(217,217,217,0.85)",
    zIndex: 1,
  },

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

  scrollContent: {
    flexGrow: 1,
    paddingVertical: responsive.screenHeight * 0.03,
    paddingHorizontal: responsive.screenWidth * 0.04,
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

  emptyText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize,
    color: "#000",
    textAlign: "center",
    marginTop: responsive.screenHeight * 0.05,
  },
});
