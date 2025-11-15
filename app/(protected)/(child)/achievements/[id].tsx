import { useChildAchievementStore } from "@/lib/store/childAchievementStore";
import type { ChildAchievementWithInfo } from "@/services/fetchAchievements";
import type { AchievementRow } from "@/services/fetchAllAchievements";
import { responsive } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/** ---------- Types for FlatList items ---------- */

type HeaderItem = {
  type: "header";
  id: string;
  title: string;
};

type EmptyItem =
  | { type: "empty-earned"; id: "no-earned" }
  | { type: "all-earned"; id: "all-earned" };

type AchievementItem = {
  type: "item";
  id: string;
  earned: boolean;
  dateearned?: string | null;
  achievement: {
    title: string;
    description: string | null;
  };
};

type ListItem = HeaderItem | EmptyItem | AchievementItem;

export default function ChildAchievementsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const childId = String(id);

  const {
    achievementsByChild,
    allAchievements,
    fetchChildAchievements,
    loading,
  } = useChildAchievementStore();

  const [showEarnedOnly, setShowEarnedOnly] = useState(true);
  const [earnedCollapsed, setEarnedCollapsed] = useState(false);
  const [notEarnedCollapsed, setNotEarnedCollapsed] = useState(false);

  useEffect(() => {
    if (childId) {
      fetchChildAchievements(childId);
    }
  }, [childId, fetchChildAchievements]);

  /** ---------- Raw child-earned achievements ---------- */
  const childAchievements: ChildAchievementWithInfo[] =
    achievementsByChild[childId] || [];

  /** ---------- Earned achievements (with valid date) ---------- */
  const earnedAchievements = useMemo<ChildAchievementWithInfo[]>(
    () =>
      [...childAchievements]
        .filter((a) => !!a.dateearned)
        .sort(
          (a, b) =>
            new Date(b.dateearned).getTime() - new Date(a.dateearned).getTime()
        ),
    [childAchievements]
  );

  /** ---------- Not earned = global achievements - child's earned ---------- */
  const notEarnedGlobalAchievements = useMemo<AchievementRow[]>(() => {
    if (!allAchievements || allAchievements.length === 0) return [];

    const earnedIds = new Set(
      childAchievements.map((a) => a.achievementearned)
    );

    return allAchievements.filter((ach) => !earnedIds.has(ach.id));
  }, [allAchievements, childAchievements]);

  /** ---------- Group earned by month/year (for Earned-only view) ---------- */
  const groupedEarnedData = useMemo<ListItem[]>(() => {
    if (earnedAchievements.length === 0) {
      return [
        {
          type: "empty-earned",
          id: "no-earned",
        },
      ];
    }

    const groups: Record<string, ChildAchievementWithInfo[]> = {};

    earnedAchievements.forEach((a) => {
      const dateObj = new Date(a.dateearned);
      const key = dateObj.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    const result: ListItem[] = [];

    Object.entries(groups).forEach(([monthYear, items]) => {
      result.push({
        type: "header",
        id: monthYear,
        title: monthYear,
      });

      items.forEach((a) => {
        result.push({
          type: "item",
          id: a.id,
          earned: true,
          dateearned: a.dateearned,
          achievement: {
            title: a.achievement?.title ?? "Untitled Achievement",
            description: a.achievement?.description ?? null,
          },
        });
      });
    });

    return result;
  }, [earnedAchievements]);

  /** ---------- Combined All view: Earned + Not Earned ---------- */
  const allData = useMemo<ListItem[]>(() => {
    const data: ListItem[] = [];

    // --- Earned section ---
    data.push({
      type: "header",
      id: "earned-header",
      title: "Earned",
    });

    if (!earnedCollapsed) {
      if (earnedAchievements.length > 0) {
        data.push(
          ...earnedAchievements.map<ListItem>((a) => ({
            type: "item",
            id: a.id,
            earned: true,
            dateearned: a.dateearned,
            achievement: {
              title: a.achievement?.title ?? "Untitled Achievement",
              description: a.achievement?.description ?? null,
            },
          }))
        );
      } else {
        data.push({ type: "empty-earned", id: "no-earned" });
      }
    }

    // --- Not Earned section (from global Achievements table) ---
    data.push({
      type: "header",
      id: "not-earned-header",
      title: "Not Earned",
    });

    if (!notEarnedCollapsed) {
      if (notEarnedGlobalAchievements.length > 0) {
        data.push(
          ...notEarnedGlobalAchievements.map<ListItem>((ach) => ({
            type: "item",
            id: ach.id,
            earned: false,
            dateearned: null,
            achievement: {
              title: ach.title,
              description: ach.description ?? null,
            },
          }))
        );
      } else {
        data.push({ type: "all-earned", id: "all-earned" });
      }
    }

    return data;
  }, [
    earnedAchievements,
    notEarnedGlobalAchievements,
    earnedCollapsed,
    notEarnedCollapsed,
  ]);

  /** ---------- Render function ---------- */
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      const isEarned = item.id === "earned-header";
      const isNotEarned = item.id === "not-earned-header";
      return (
        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => {
            if (isEarned) setEarnedCollapsed((prev) => !prev);
            if (isNotEarned) setNotEarnedCollapsed((prev) => !prev);
          }}
        >
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
          {(isEarned || isNotEarned) && (
            <Ionicons
              name={
                (isEarned && earnedCollapsed) ||
                (isNotEarned && notEarnedCollapsed)
                  ? "chevron-down"
                  : "chevron-up"
              }
              size={responsive.screenWidth * 0.05}
              color="#111827"
            />
          )}
        </TouchableOpacity>
      );
    }

    if (item.type === "empty-earned") {
      return (
        <Text style={styles.noAchievementsText}>
          No earned achievements yet.
        </Text>
      );
    }

    if (item.type === "all-earned") {
      return (
        <Text style={styles.congratsText}>
          All Achievements Earned. Congrats 🎉!!
        </Text>
      );
    }

    // item.type === "item"
    return (
      <View style={styles.achievementCard}>
        <View style={styles.row}>
          <Text style={styles.achievementTitle}>
            {item.achievement.title || "Untitled Achievement"}
          </Text>

          {showEarnedOnly ? (
            item.dateearned ? (
              <Text style={styles.achievementDate}>
                {new Date(item.dateearned).toLocaleDateString()}
              </Text>
            ) : null
          ) : (
            <Text
              style={[
                styles.statusText,
                item.earned ? styles.statusEarned : styles.statusNotEarned,
              ]}
            >
              {item.earned ? "Earned" : "Not Earned"}
            </Text>
          )}
        </View>

        {item.achievement.description ? (
          <Text style={styles.achievementDescription}>
            {item.achievement.description}
          </Text>
        ) : null}
      </View>
    );
  };

  const hasAnyGlobalAchievements = allAchievements.length > 0;

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

      {loading ? (
        <Text style={styles.loadingText}>Loading achievements...</Text>
      ) : !hasAnyGlobalAchievements ? (
        <Text style={styles.noAchievementsText}>
          No achievements configured yet.
        </Text>
      ) : (
        <FlatList
          data={showEarnedOnly ? groupedEarnedData : allData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: responsive.screenHeight * 0.05,
          }}
        />
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
  },
  achievementDate: {
    flexShrink: 0,
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#6B7280",
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
  statusEarned: { color: "#16A34A" },
  statusNotEarned: { color: "#DC2626" },
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
