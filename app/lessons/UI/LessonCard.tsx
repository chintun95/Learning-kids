import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { responsive } from "@/utils/responsive";
import { Lesson } from "@/services/fetchLessons";
import { useSectionStore } from "@/lib/store/sectionStore";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface LessonCardProps {
  lesson: Lesson;
}

/**
 * LessonCard
 * - Displays lesson information
 * - Shows ALL linked sections using new schema:
 *      sections.lessonid === lesson.id
 */
const LessonCard: React.FC<LessonCardProps> = ({ lesson }) => {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const { sections } = useSectionStore();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  /**
   * NEW MATCHING LOGIC:
   * -------------------
   * Each section has:
   *    section.lessonid → lesson.id
   * So we find all sections that belong to this lesson.
   */
  const relatedSections = useMemo(() => {
    return sections.filter((sec) => sec.lessonid === lesson.id);
  }, [sections, lesson.id]);

  const handleSectionPress = (sectionId: string) => {
    router.push({
      pathname: "/lessons/learn/[id]",
      params: { id: sectionId },
    });
  };

  return (
    <View style={styles.cardWrapper}>
      {/* Lesson summary */}
      <View style={styles.cardContainer}>
        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{lesson.title}</Text>
          <Text style={styles.descriptionText}>
            {lesson.description || "No description available."}
          </Text>
        </View>

        <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
          <Text style={styles.expandButtonText}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>
      </View>

      {/* Drawer */}
      {expanded && (
        <View style={styles.drawer}>
          <Text style={[styles.drawerText, styles.drawerTitle]}>
            Lesson Sections
          </Text>

          {relatedSections.length === 0 ? (
            <Text style={styles.drawerText}>
              No sections linked to this lesson.
            </Text>
          ) : (
            relatedSections.map((section) => (
              <TouchableOpacity
                key={section.id}
                onPress={() => handleSectionPress(section.id)}
                style={styles.sectionRow}
              >
                <Text style={styles.drawerText}>{section.title}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={responsive.buttonFontSize * 1.1}
                  color="#000"
                />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
};

export default LessonCard;

/** ---------- Styles ---------- **/
const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: responsive.screenHeight * 0.012,
  },
  cardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    padding: responsive.screenWidth * 0.04,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: responsive.buttonFontSize,
    color: "#000",
    fontFamily: "Fredoka-SemiBold",
  },
  descriptionText: {
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#333",
    fontFamily: "Fredoka-Regular",
    marginTop: responsive.screenHeight * 0.005,
  },
  expandButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsive.screenWidth * 0.03,
  },
  expandButtonText: {
    fontSize: responsive.isNarrowScreen ? 16 : 20,
    color: "#000",
    fontFamily: "Fredoka-Medium",
  },
  drawer: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderWidth: 2,
    borderColor: "#999",
    borderBottomLeftRadius: responsive.screenWidth * 0.04,
    borderBottomRightRadius: responsive.screenWidth * 0.04,
    padding: responsive.screenWidth * 0.04,
    marginTop: 4,
  },
  drawerText: {
    color: "#000",
    fontSize: responsive.buttonFontSize * 0.85,
    fontFamily: "Fredoka-Regular",
  },
  drawerTitle: {
    fontFamily: "Fredoka-SemiBold",
    marginBottom: responsive.screenHeight * 0.01,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: responsive.screenHeight * 0.006,
  },
});
