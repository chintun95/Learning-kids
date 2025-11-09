import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  SectionList,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { responsive } from "@/utils/responsive";
import { useChildAchievementStore } from "@/lib/store/childAchievementStore";

export default function ChildAchievementsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const childId = String(id);

  const { achievementsByChild, fetchChildAchievements, loading } =
    useChildAchievementStore();

  const [showEarnedOnly, setShowEarnedOnly] = useState(true);
  const [earnedCollapsed, setEarnedCollapsed] = useState(false);
  const [notEarnedCollapsed, setNotEarnedCollapsed] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    if (childId) fetchChildAchievements(childId);
  }, [childId, fetchChildAchievements]);

  const allAchievements = achievementsByChild[childId] || [];

  // Split and sort achievements
  const earnedAchievements = useMemo(
    () =>
      [...allAchievements]
        .filter((a) => a.dateearned)
        .sort(
          (a, b) =>
            new Date(b.dateearned).getTime() - new Date(a.dateearned).getTime()
        ),
    [allAchievements]
  );

  const notEarnedAchievements = useMemo(
    () => [...allAchievements].filter((a) => !a.dateearned),
    [allAchievements]
  );

  // Group earned by month-year for SectionList
  const groupedEarned = useMemo(() => {
    const groups: Record<string, typeof earnedAchievements> = {};
    earnedAchievements.forEach((a) => {
      const date = new Date(a.dateearned);
      const key = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [earnedAchievements]);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* --- Title Row with Close Icon --- */}
      <View style={styles.titleRow}>
        <Text style={styles.mainTitle}>Achievements</Text>
        <TouchableOpacity
          onPress={() => router.push(`/home/${childId}`)}
          style={styles.closeButton}
        >
          <Ionicons
            name="close"
            size={responsive.screenWidth * 0.06}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            showEarnedOnly && styles.toggleButtonActive,
          ]}
          onPress={() => setShowEarnedOnly(true)}
        >
          <Text
            style={[
              styles.toggleText,
              showEarnedOnly && styles.toggleTextActive,
            ]}
          >
            Earned
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            !showEarnedOnly && styles.toggleButtonActive,
          ]}
          onPress={() => setShowEarnedOnly(false)}
        >
          <Text
            style={[
              styles.toggleText,
              !showEarnedOnly && styles.toggleTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- Earned Only Section --- */}
      {loading ? (
        <Text style={styles.loadingText}>Loading achievements...</Text>
      ) : allAchievements.length === 0 ? (
        <Text style={styles.noAchievementsText}>No achievements found.</Text>
      ) : showEarnedOnly ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <SectionList
            sections={groupedEarned}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            renderItem={({ item }) => (
              <View style={styles.achievementCard}>
                <View style={styles.row}>
                  <Text style={styles.achievementTitle}>
                    {item.achievement?.title ?? "Untitled Achievement"}
                  </Text>
                  <Text style={styles.achievementDate}>
                    {new Date(item.dateearned).toLocaleDateString()}
                  </Text>
                </View>
                {item.achievement?.description ? (
                  <Text style={styles.achievementDescription}>
                    {item.achievement.description}
                  </Text>
                ) : null}
              </View>
            )}
          />
        </ScrollView>
      ) : (
        // --- All Section ---
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* EARNED SECTION */}
          <TouchableOpacity
            onPress={() => setEarnedCollapsed(!earnedCollapsed)}
            style={styles.collapsibleHeader}
          >
            <Text style={styles.sectionHeaderText}>Earned</Text>
            <Ionicons
              name={earnedCollapsed ? "chevron-down" : "chevron-up"}
              size={responsive.screenWidth * 0.05}
              color="#111827"
            />
          </TouchableOpacity>

          {!earnedCollapsed &&
            (earnedAchievements.length > 0 ? (
              earnedAchievements.map((item) => (
                <View key={item.id} style={styles.achievementCard}>
                  <View style={styles.row}>
                    <Text style={styles.achievementTitle}>
                      {item.achievement?.title ?? "Untitled Achievement"}
                    </Text>
                    <Text style={[styles.statusText, styles.statusEarned]}>
                      Earned
                    </Text>
                  </View>
                  {item.achievement?.description ? (
                    <Text style={styles.achievementDescription}>
                      {item.achievement.description}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.noAchievementsText}>
                No earned achievements yet.
              </Text>
            ))}

          {/* NOT EARNED SECTION */}
          <TouchableOpacity
            onPress={() => setNotEarnedCollapsed(!notEarnedCollapsed)}
            style={styles.collapsibleHeader}
          >
            <Text style={styles.sectionHeaderText}>Not Earned</Text>
            <Ionicons
              name={notEarnedCollapsed ? "chevron-down" : "chevron-up"}
              size={responsive.screenWidth * 0.05}
              color="#111827"
            />
          </TouchableOpacity>

          {!notEarnedCollapsed &&
            (notEarnedAchievements.length > 0 ? (
              notEarnedAchievements.map((item) => (
                <View key={item.id} style={styles.achievementCard}>
                  <View style={styles.row}>
                    <Text style={styles.achievementTitle}>
                      {item.achievement?.title ?? "Untitled Achievement"}
                    </Text>
                    <Text style={[styles.statusText, styles.statusNotEarned]}>
                      Not Earned
                    </Text>
                  </View>
                  {item.achievement?.description ? (
                    <Text style={styles.achievementDescription}>
                      {item.achievement.description}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.congratsText}>
                All Achievements Earned. Congrats 🎉!!
              </Text>
            ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: responsive.screenWidth * 0.06,
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 0) + responsive.screenHeight * 0.025
        : responsive.screenHeight * 0.045,
  },

  /** Header Title Row **/
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: responsive.screenHeight * 0.015,
  },
  mainTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.25,
    color: "#111827",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    padding: 6,
  },

  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    marginBottom: responsive.screenHeight * 0.02,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: responsive.screenHeight * 0.01,
    borderRadius: 20,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#111827",
  },
  toggleText: {
    fontFamily: "Fredoka-Medium",
    color: "#374151",
    fontSize: responsive.buttonFontSize * 0.9,
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },

  scrollContent: {
    paddingBottom: responsive.screenHeight * 0.05,
  },

  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: responsive.screenHeight * 0.012,
    paddingHorizontal: responsive.screenWidth * 0.04,
    marginBottom: responsive.screenHeight * 0.01,
  },
  sectionHeaderText: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#111827",
  },

  sectionHeader: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize * 1.05,
    color: "#1F2937",
    marginTop: responsive.screenHeight * 0.02,
    marginBottom: responsive.screenHeight * 0.01,
  },

  achievementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: responsive.screenHeight * 0.012,
    paddingHorizontal: responsive.screenWidth * 0.04,
    marginBottom: responsive.screenHeight * 0.012,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  achievementTitle: {
    flex: 1,
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize,
    color: "#111827",
    textAlign: "left",
  },
  achievementDate: {
    flexShrink: 0,
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#6B7280",
    textAlign: "right",
  },
  achievementDescription: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#4B5563",
    marginTop: responsive.screenHeight * 0.005,
  },
  statusText: {
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.9,
  },
  statusEarned: {
    color: "#16A34A",
  },
  statusNotEarned: {
    color: "#DC2626",
  },
  congratsText: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize,
    color: "#16A34A",
    textAlign: "center",
    marginVertical: responsive.screenHeight * 0.02,
  },
  loadingText: {
    textAlign: "center",
    fontFamily: "Fredoka-Regular",
    color: "#4F46E5",
    marginTop: responsive.screenHeight * 0.02,
  },
  noAchievementsText: {
    textAlign: "center",
    fontFamily: "Fredoka-Medium",
    color: "#6B7280",
    marginTop: responsive.screenHeight * 0.02,
  },
});
