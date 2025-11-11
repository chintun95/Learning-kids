import React, { useEffect } from "react";
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
import { useLessonStore } from "@/lib/store/lessonStore";
import { useSectionStore } from "@/lib/store/sectionStore";
import LessonCard from "@/app/lessons/UI/LessonCard";

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 40;

export default function LessonIndex() {
  const router = useRouter();
  const { lessons, fetchLessons, loading } = useLessonStore();
  const { fetchSections, loading: sectionsLoading } = useSectionStore();

  useEffect(() => {
    fetchLessons();
    fetchSections();
  }, []);

  const handleClose = () => {
    router.back();
  };

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
      {/* Header background fills status bar area */}
      <View style={styles.headerBackground} />

      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* --- Header --- */}
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

        {/* --- Lesson List --- */}
        <ScrollView
          style={styles.scrollContainer}
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
