import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  format,
  differenceInYears,
  parseISO,
  compareDesc,
  isToday,
  isWithinInterval,
} from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import ProfileIcon from "@/components/ProfileIcon";
import EmergencyContactModal from "@/components/EmergencyContactModal";
import { responsive } from "@/utils/responsive";
import InputBox from "@/components/InputBox";
import { useChildById } from "@/services/fetchChildren";
import { useUpdateChildByParent } from "@/services/updateChild";
import { useSessionsByChildId } from "@/services/fetchSession";

export default function ManageChildIndex() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // State management
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Data fetching
  const { data: child, isLoading: isLoadingChild } = useChildById(id);
  const { mutate: updateChildByParent } = useUpdateChildByParent();
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    isError: isSessionError,
    error: sessionError,
  } = useSessionsByChildId(id ?? null);

  // Loading & Error
  if (isLoadingChild || isLoadingSessions) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading child data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Child not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isSessionError) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>
            Failed to load session data: {(sessionError as Error)?.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Data prep ---
  const dob = parseISO(child.dateOfBirth);
  const age = differenceInYears(new Date(), dob);
  const formattedDob = format(dob, "MM/dd/yyyy");

  // --- Filter sessions ---
  let filteredSessions = sessions.filter((s) => s.childid === child.id);
  if (startDate && endDate) {
    filteredSessions = filteredSessions.filter((s) =>
      isWithinInterval(parseISO(s.date), { start: startDate, end: endDate })
    );
  }
  filteredSessions.sort((a, b) =>
    compareDesc(
      parseISO(`${a.date}T${a.starttime}`),
      parseISO(`${b.date}T${b.starttime}`)
    )
  );

  // --- Group sessions ---
  const groupedSessions: Record<string, typeof filteredSessions> = {};
  filteredSessions.forEach((session) => {
    const sessionDate = parseISO(session.date);
    const key = isToday(sessionDate)
      ? "Today"
      : format(sessionDate, "MMMM yyyy");
    if (!groupedSessions[key]) groupedSessions[key] = [];
    groupedSessions[key].push(session);
  });
  if (!groupedSessions["Today"]) groupedSessions["Today"] = [];

  const groupKeys = Object.keys(groupedSessions).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    return compareDesc(
      parseISO(groupedSessions[a][0].date),
      parseISO(groupedSessions[b][0].date)
    );
  });

  const hasAnySession = filteredSessions.length > 0;

  // --- Edit Name ---
  const handleEditNamePress = () => {
    setFirstName(child.firstName);
    setLastName(child.lastName);
    setShowEditNameModal(true);
  };

  const handleSaveName = () => {
    updateChildByParent({
      childId: child.id,
      updates: { firstname: firstName.trim(), lastname: lastName.trim() },
    });
    setShowEditNameModal(false);
  };

  // --- Navigate back ---
  const handleGoBack = () => {
    router.push("/(protected)/(parent)/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* Header */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: Platform.OS === "android" ? insets.top + 4 : insets.top,
          },
        ]}
      >
        <Text style={styles.headerTitle}>
          Manage {child.firstName} {child.lastName} Data
        </Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.closeButton}>
          <Ionicons
            name="close"
            size={responsive.screenWidth * 0.06}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      {/* ScrollView */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          paddingBottom: insets.bottom + responsive.screenHeight * 0.05,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Child Info */}
        <View style={styles.headerSection}>
          <ProfileIcon
            source={child.profilePicture}
            size={responsive.screenWidth * 0.25}
          />
          <View style={styles.headerRight}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>
                {child.firstName} {child.lastName}
              </Text>
              <TouchableOpacity
                onPress={handleEditNamePress}
                style={styles.editIconButton}
              >
                <Ionicons
                  name="pencil"
                  size={responsive.screenWidth * 0.05}
                  color="#4F46E5"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.dobText}>
              Date of Birth: {formattedDob} ({age} yrs)
            </Text>
            <TouchableOpacity
              onPress={() => setShowEmergencyModal(true)}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Emergency Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Activity Tracker */}
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>Activity Tracker</Text>
        </View>

        <View style={styles.activityList}>
          {!hasAnySession ? (
            <Text style={styles.noActivityText}>
              No Activity Logged for {child.firstName}
            </Text>
          ) : (
            groupKeys.map((key) => (
              <View key={key} style={styles.group}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.groupTitle}>{key}</Text>
                  {key === "Today" && (
                    <Text style={styles.todayNote}> (Always included)</Text>
                  )}
                </View>

                {groupedSessions[key].map((session) => {
                  const startTime = session.starttime;
                  const endTime = session.endtime ?? "__";
                  const sessionDate = format(
                    parseISO(session.date),
                    "MM/dd/yyyy"
                  );

                  return (
                    <View key={session.id} style={styles.sessionItem}>
                      <View style={styles.sessionHeader}>
                        <Text style={styles.activityType}>
                          {session.activitytype}
                        </Text>
                        <Text style={styles.sessionStatus}>
                          {session.sessionstatus}
                        </Text>
                      </View>
                      <Text style={styles.sessionDate}>
                        {sessionDate} | {startTime} - {endTime}
                      </Text>
                      <Text style={styles.sessionDetails}>
                        {session.sessiondetails || "No details"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    fontFamily: "Fredoka-Regular",
    color: "#4F46E5",
    marginTop: 8,
  },
  notFoundText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize,
    color: "#6B7280",
  },
  topHeader: {
    backgroundColor: "#F3F4F6",
    paddingVertical: responsive.screenHeight * 0.015,
    paddingHorizontal: responsive.screenWidth * 0.05,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: responsive.buttonFontSize * 1.05,
    fontFamily: "Fredoka-SemiBold",
    color: "#111827",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: responsive.screenWidth * 0.05,
    top: responsive.screenHeight * 0.018,
    padding: 4,
  },
  headerSection: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    padding: responsive.screenWidth * 0.05,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerRight: {
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.015,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconButton: { marginLeft: responsive.screenWidth * 0.01 },
  nameText: {
    fontSize: responsive.buttonFontSize * 1.1,
    fontFamily: "Fredoka-Bold",
    color: "#111827",
    textAlign: "center",
  },
  dobText: {
    fontSize: responsive.buttonFontSize * 0.85,
    fontFamily: "Fredoka-Medium",
    marginTop: responsive.screenHeight * 0.005,
    color: "#374151",
    textAlign: "center",
  },
  linkButton: { marginTop: responsive.screenHeight * 0.01 },
  linkText: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Medium",
    color: "#4F46E5",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: responsive.screenHeight * 0.02,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: responsive.screenWidth * 0.05,
    marginBottom: responsive.screenHeight * 0.015,
  },
  activityTitle: {
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-SemiBold",
    color: "#111827",
  },
  activityList: { paddingHorizontal: responsive.screenWidth * 0.05 },
  group: { marginBottom: responsive.screenHeight * 0.03 },
  groupTitle: {
    fontSize: responsive.buttonFontSize * 0.9,
    fontFamily: "Fredoka-SemiBold",
    marginBottom: responsive.screenHeight * 0.01,
    color: "#111827",
  },
  todayNote: {
    fontSize: responsive.buttonFontSize * 0.7,
    color: "#4F46E5",
    marginLeft: responsive.screenWidth * 0.015,
  },
  sessionItem: {
    marginBottom: responsive.screenHeight * 0.015,
    backgroundColor: "#FFFFFF",
    padding: responsive.screenWidth * 0.03,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: responsive.screenHeight * 0.005,
  },
  activityType: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Medium",
    color: "#111827",
  },
  sessionStatus: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Medium",
    color: "#4F46E5",
  },
  sessionDate: {
    fontSize: responsive.buttonFontSize * 0.7,
    fontFamily: "Fredoka-Regular",
    color: "#6B7280",
    marginBottom: responsive.screenHeight * 0.002,
  },
  sessionDetails: {
    fontSize: responsive.buttonFontSize * 0.7,
    fontFamily: "Fredoka-Regular",
    color: "#374151",
  },
  noActivityText: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginTop: responsive.screenHeight * 0.02,
  },
});
