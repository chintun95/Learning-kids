import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Platform,
  FlatList,
  Animated,
  TouchableOpacity,
} from "react-native";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileIcon from "@/components/ProfileIcon";
import SwitchAccount from "@/components/SwitchAccount";
import Button from "@/components/Button";
import SignOutButton from "@/components/SignOutButton";
import { responsive } from "@/utils/responsive";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { useChildAchievementStore } from "@/lib/store/childAchievementStore";

export default function ChildHome() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const childId = String(id);

  const { children, getCurrentChild } = useChildAuthStore();
  const child = children.find((c) => c.id === childId) ?? getCurrentChild();

  const { achievementsByChild, fetchChildAchievements, loading } =
    useChildAchievementStore();

  useEffect(() => {
    if (childId) fetchChildAchievements(childId);
  }, [childId, fetchChildAchievements]);

  const childAchievements = achievementsByChild[childId] || [];
  const sortedAchievements = [...childAchievements].sort(
    (a, b) =>
      new Date(b.dateearned).getTime() - new Date(a.dateearned).getTime()
  );
  const recentAchievements = sortedAchievements.slice(0, 5);

  const scrollY = useRef(new Animated.Value(0)).current;
  const [blurVisible, setBlurVisible] = useState(false);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setBlurVisible(value < 50);
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY]);

  if (!child) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Child not found</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("@/assets/images/app-background.png")}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* --- Blurred overlay near top for Android status bar --- */}
      {Platform.OS === "android" && blurVisible && (
        <BlurView
          tint="light"
          intensity={70}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.overlay}>
          {/* --- Profile Container --- */}
          <View style={styles.profileContainer}>
            <TouchableOpacity
              onPress={() => router.push("/(protected)/(child)/profile-select")}
              style={styles.editButton}
            >
              <Ionicons
                name="pencil"
                size={responsive.screenWidth * 0.055}
                color="#111827"
              />
            </TouchableOpacity>

            <Text style={styles.welcomeText}>Welcome</Text>
            <ProfileIcon
              source={child.profilePicture}
              size={responsive.screenWidth * 0.15}
              style={styles.profileIcon}
            />
            <Text style={styles.childName}>
              {child.firstName} {child.lastName}
            </Text>
            <View style={styles.switchWrapper}>
              <SwitchAccount />
            </View>
          </View>

          {/* --- Achievements Container --- */}
          <View style={styles.achievementContainer}>
            <View style={styles.achievementHeader}>
              <Text style={styles.achievementTitle}>Recent Achievements</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/achievements/[id]",
                    params: { id: childId },
                  })
                }
                style={styles.moreButton}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={responsive.screenWidth * 0.05}
                  color="#4B5563"
                />
              </TouchableOpacity>
            </View>

            {loading ? (
              <Text style={styles.loadingText}>Loading achievements...</Text>
            ) : recentAchievements.length === 0 ? (
              <Text style={styles.noAchievementsText}>
                No Achievements Recorded
              </Text>
            ) : (
              <FlatList
                data={recentAchievements}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.achievementList}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.achievementItem}>
                    <View style={styles.achievementRow}>
                      <Text numberOfLines={1} style={styles.achievementName}>
                        {item.achievement?.title ?? "Untitled Achievement"}
                      </Text>
                      <Text style={styles.achievementDate}>
                        {new Date(item.dateearned).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>

          {/* --- Lessons Container --- */}
          <View style={styles.lessonContainer}>
            <Text style={styles.sectionTitle}>Lessons</Text>
            <Button
              title="Go to Lessons"
              backgroundColor="#000"
              textColor="#FFFFFF"
              onPress={() => router.push("/lessons")}
              marginTop={responsive.screenHeight * 0.01}
            />
          </View>

          {/* --- Games Container --- */}
          <View style={styles.gameContainer}>
            <Text style={styles.sectionTitle}>Games</Text>
            <Button
              title="Play Games"
              backgroundColor="#000"
              textColor="#FFFFFF"
              onPress={() => router.push("/games")}
              marginTop={responsive.screenHeight * 0.01}
            />
          </View>

          {/* --- Sign Out Button --- */}
          <View style={styles.signOutWrapper}>
            <SignOutButton />
          </View>
        </View>
      </Animated.ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backgroundImage: {
    transform: [{ scale: 1.22 }],
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingBottom: responsive.screenHeight * 0.05,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 0) + responsive.screenHeight * 0.025
        : responsive.screenHeight * 0.045,
  },
  profileContainer: {
    width: responsive.screenWidth * 0.9,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    paddingVertical: responsive.screenHeight * 0.015,
    paddingHorizontal: responsive.screenWidth * 0.04,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    position: "relative",
  },
  editButton: {
    position: "absolute",
    top: responsive.screenHeight * 0.012,
    right: responsive.screenWidth * 0.035,
    padding: 6,
  },
  welcomeText: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize * 1.1,
    color: "#111827",
    marginBottom: responsive.screenHeight * 0.006,
    textAlign: "center",
  },
  profileIcon: {
    borderRadius: responsive.screenWidth * 0.1,
    aspectRatio: 1,
  },
  childName: {
    marginTop: responsive.screenHeight * 0.006,
    fontSize: responsive.isNarrowScreen ? 17 : 20,
    color: "#111827",
    textAlign: "center",
  },
  switchWrapper: {
    marginTop: responsive.screenHeight * 0.005,
    marginBottom: responsive.screenHeight * 0.004,
  },
  achievementContainer: {
    width: responsive.screenWidth * 0.9,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    marginTop: responsive.screenHeight * 0.03,
    paddingVertical: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.04,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  achievementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: responsive.screenHeight * 0.012,
  },
  achievementTitle: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize * 1.15,
    color: "#111827",
  },
  moreButton: {
    padding: 4,
  },
  achievementList: {
    width: "100%",
  },
  achievementItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: responsive.screenHeight * 0.01,
    paddingHorizontal: responsive.screenWidth * 0.04,
    marginBottom: responsive.screenHeight * 0.012,
    width: "100%",
  },
  achievementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  achievementName: {
    flex: 1,
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize,
    color: "#111827",
  },
  achievementDate: {
    flexShrink: 0,
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#374151",
    textAlign: "right",
    marginLeft: responsive.screenWidth * 0.08,
  },
  lessonContainer: {
    width: responsive.screenWidth * 0.9,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.03,
    paddingVertical: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.04,
  },
  gameContainer: {
    width: responsive.screenWidth * 0.9,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.03,
    paddingVertical: responsive.screenHeight * 0.02,
    paddingHorizontal: responsive.screenWidth * 0.04,
  },
  sectionTitle: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize * 1.05,
    color: "#111827",
  },
  signOutWrapper: {
    marginTop: responsive.screenHeight * 0.04,
    marginBottom: responsive.screenHeight * 0.03,
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "Fredoka-Regular",
    color: "#4F46E5",
    textAlign: "center",
  },
  noAchievementsText: {
    fontFamily: "Fredoka-Medium",
    color: "#6B7280",
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize,
    color: "#6B7280",
  },
});
