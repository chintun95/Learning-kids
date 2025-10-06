// app/(parent)/manage-child/[id].tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  format,
  differenceInYears,
  parseISO,
  compareDesc,
  isToday,
  isWithinInterval,
} from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import childData from "@/test/data/child";
import sessionData from "@/test/data/session";
import ProfileIcon from "@/components/ProfileIcon";
import { Child, Session } from "@/types/types";

export default function ManageChildIndex() {
  const { id } = useLocalSearchParams();
  const child: Child | undefined = childData.find((c) => c.id === id);

  const [showPinModal, setShowPinModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  if (!child) {
    return (
      <View style={styles.centered}>
        <Text>Child not found</Text>
      </View>
    );
  }

  const dob = parseISO(child.dateOfBirth);
  const age = differenceInYears(new Date(), dob);
  const formattedDob = format(dob, "MM/dd/yyyy");

  // Filter sessions for this child
  let childSessions: Session[] = sessionData.filter(
    (s) => s.childId === child.id
  );

  // Apply date range filter if selected
  if (startDate && endDate) {
    childSessions = childSessions.filter((s) => {
      const sessionDate = parseISO(s.date);
      return isWithinInterval(sessionDate, { start: startDate, end: endDate });
    });
  }

  // Sort by date & startTime descending
  childSessions.sort((a, b) => {
    const dateA = parseISO(`${a.date}T${a.startTime}`);
    const dateB = parseISO(`${b.date}T${b.startTime}`);
    return compareDesc(dateA, dateB);
  });

  // Group sessions by month and today
  const groupedSessions: Record<string, Session[]> = {};
  childSessions.forEach((session) => {
    const sessionDate = parseISO(session.date);
    const groupKey = isToday(sessionDate)
      ? "Today"
      : format(sessionDate, "MMMM yyyy");
    if (!groupedSessions[groupKey]) groupedSessions[groupKey] = [];
    groupedSessions[groupKey].push(session);
  });

  // Ensure "Today" group exists even if empty
  if (!groupedSessions["Today"]) groupedSessions["Today"] = [];

  // Sort the group keys: Today first, then descending month
  const groupKeys = Object.keys(groupedSessions).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (groupedSessions[a].length === 0) return 1;
    if (groupedSessions[b].length === 0) return -1;
    const dateA = parseISO(groupedSessions[a][0].date);
    const dateB = parseISO(groupedSessions[b][0].date);
    return compareDesc(dateA, dateB);
  });

  // Check if there are no sessions at all
  const hasAnySession = childSessions.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <ScrollView style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <ProfileIcon source={child.profilePicture} size={135} />
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowPinModal(true)}
              style={styles.pinButton}
            >
              <Text style={styles.linkText}>Manage Profile Pin</Text>
            </TouchableOpacity>

            <View style={styles.infoBlock}>
              <Text style={styles.nameText}>
                {child.firstName} {child.lastName}
              </Text>
              <Text style={styles.dobText}>
                Date of Birth: {formattedDob} ({age} yrs)
              </Text>
              <TouchableOpacity onPress={() => setShowEmergencyModal(true)}>
                <Text style={styles.linkText}>Emergency Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Activity Tracker Title & Filter */}
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>Activity Tracker</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.filterText}>Filter by Date</Text>
            <Ionicons
              name="filter"
              size={18}
              color="#4F46E5"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>

        {/* Grouped Activities */}
        <View style={styles.activityList}>
          {!hasAnySession ? (
            <Text style={styles.noActivityText}>
              No Activity Logged for {child.firstName}
            </Text>
          ) : (
            groupKeys.map((groupKey) => (
              <View key={groupKey} style={styles.group}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.groupTitle}>{groupKey}</Text>
                  {groupKey === "Today" && (
                    <Text style={styles.todayNote}> (Always included)</Text>
                  )}
                </View>

                {groupedSessions[groupKey].length === 0 ? (
                  <Text style={styles.noActivityText}>
                    No Activity Logged for {child.firstName}
                  </Text>
                ) : (
                  groupedSessions[groupKey].map((session) => {
                    const startTime = session.startTime;
                    const endTime = session.endTime ?? "__";
                    const sessionDate = format(
                      parseISO(session.date),
                      "MM/dd/yyyy"
                    );

                    return (
                      <View key={session.id} style={styles.sessionItem}>
                        <View style={styles.sessionHeader}>
                          <Text style={styles.activityType}>
                            {session.activityType}
                          </Text>
                          <Text style={styles.sessionStatus}>
                            {session.sessionStatus}
                          </Text>
                        </View>
                        <Text style={styles.sessionDate}>
                          {sessionDate} | {startTime} - {endTime}
                        </Text>
                        <Text style={styles.sessionDetails}>
                          {session.sessionDetails}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            ))
          )}
        </View>

        {/* Profile Pin Modal */}
        <Modal
          visible={showPinModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowPinModal(false)}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Profile Pin</Text>
              <Text style={styles.modalText}>
                Current Profile Pin: {child.profilePin ?? "Profile Pin Not set"}
              </Text>
            </View>
          </View>
        </Modal>

        {/* Emergency Contact Modal */}
        <Modal
          visible={showEmergencyModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEmergencyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowEmergencyModal(false)}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Emergency Contact</Text>
              <Text style={styles.modalText}>
                Name: {child.emergencyContact.name}
              </Text>
              <Text style={styles.modalText}>
                Relationship: {child.emergencyContact.relationship}
              </Text>
              <Text style={styles.modalText}>
                Phone: {child.emergencyContact.phoneNumber}
              </Text>
              <Text style={styles.modalText}>
                Address: {child.emergencyContact.streetAddress},{" "}
                {child.emergencyContact.city}, {child.emergencyContact.state}
              </Text>
            </View>
          </View>
        </Modal>

        {/* Date Pickers */}
        <DateTimePickerModal
          isVisible={showStartPicker}
          mode="date"
          onConfirm={(date) => {
            setStartDate(date);
            setShowStartPicker(false);
            setShowEndPicker(true);
          }}
          onCancel={() => setShowStartPicker(false)}
        />
        <DateTimePickerModal
          isVisible={showEndPicker}
          mode="date"
          onConfirm={(date) => {
            setEndDate(date);
            setShowEndPicker(false);
          }}
          onCancel={() => setShowEndPicker(false)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F3F4F6",
    padding: 20,
  },
  headerRight: { marginLeft: 16, flex: 1 },
  pinButton: { marginTop: -10, marginBottom: 5, alignSelf: "flex-start" },
  infoBlock: { marginTop: 0 },
  nameText: { fontSize: 24, fontWeight: "700", color: "#111827" },
  dobText: { fontSize: 16, marginTop: 4, color: "#374151" },
  linkText: {
    marginTop: 8,
    fontSize: 16,
    color: "#4F46E5",
    textDecorationLine: "underline",
  },
  separator: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 20 },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  activityTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  filterButton: { flexDirection: "row", alignItems: "center" },
  filterText: {
    fontSize: 16,
    color: "#4F46E5",
    textDecorationLine: "underline",
  },
  activityList: { paddingHorizontal: 20 },
  group: { marginBottom: 24 },
  groupTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },
  todayNote: { fontSize: 14, color: "#4F46E5", marginLeft: 6 },
  sessionItem: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
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
    marginBottom: 4,
  },
  activityType: { fontSize: 16, fontWeight: "600", color: "#111827" },
  sessionStatus: { fontSize: 16, fontWeight: "600", color: "#4F46E5" },
  sessionDate: { fontSize: 14, color: "#6B7280", marginBottom: 4 },
  sessionDetails: { fontSize: 14, color: "#374151" },
  noActivityText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  modalClose: { position: "absolute", top: 12, right: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  modalText: { fontSize: 16, marginBottom: 8, color: "#111827" },
});