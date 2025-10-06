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
import { responsive } from "@/utils/responsive";
import { Child, Session } from "@/types/types";
import Button from "@/components/Button";
import InputBox from "@/components/InputBox";

export default function ManageChildIndex() {
  const { id } = useLocalSearchParams();
  const child: Child | undefined = childData.find((c) => c.id === id);

  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditPinModal, setShowEditPinModal] = useState(false);
  const [pinValue, setPinValue] = useState(child?.profilePin ?? "");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  if (!child) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Child not found</Text>
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

  if (startDate && endDate) {
    childSessions = childSessions.filter((s) => {
      const sessionDate = parseISO(s.date);
      return isWithinInterval(sessionDate, { start: startDate, end: endDate });
    });
  }

  childSessions.sort((a, b) => {
    const dateA = parseISO(`${a.date}T${a.startTime}`);
    const dateB = parseISO(`${b.date}T${b.startTime}`);
    return compareDesc(dateA, dateB);
  });

  const groupedSessions: Record<string, Session[]> = {};
  childSessions.forEach((session) => {
    const sessionDate = parseISO(session.date);
    const groupKey = isToday(sessionDate)
      ? "Today"
      : format(sessionDate, "MMMM yyyy");
    if (!groupedSessions[groupKey]) groupedSessions[groupKey] = [];
    groupedSessions[groupKey].push(session);
  });

  if (!groupedSessions["Today"]) groupedSessions["Today"] = [];

  const groupKeys = Object.keys(groupedSessions).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (groupedSessions[a].length === 0) return 1;
    if (groupedSessions[b].length === 0) return -1;
    const dateA = parseISO(groupedSessions[a][0].date);
    const dateB = parseISO(groupedSessions[b][0].date);
    return compareDesc(dateA, dateB);
  });

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
          <ProfileIcon
            source={child.profilePicture}
            size={responsive.screenWidth * 0.25}
          />
          <View style={styles.headerRight}>
            <Text style={styles.nameText}>
              {child.firstName} {child.lastName}
            </Text>
            <Text style={styles.dobText}>
              Date of Birth: {formattedDob} ({age} yrs)
            </Text>
            <TouchableOpacity
              onPress={() => setShowPinModal(true)}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Manage Profile Pin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowEmergencyModal(true)}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Emergency Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Activity Tracker Header */}
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>Activity Tracker</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.filterText}>Filter by Date</Text>
            <Ionicons
              name="filter"
              size={responsive.screenWidth * 0.045}
              color="#4F46E5"
              style={{ marginLeft: responsive.screenWidth * 0.015 }}
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
                <Ionicons
                  name="close"
                  size={responsive.screenWidth * 0.06}
                  color="#111827"
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Profile Pin</Text>
              <Text style={styles.modalText}>
                Current Profile Pin: {child.profilePin ?? "Profile Pin Not set"}
              </Text>

              <Button
                title={child.profilePin ? "Change Pin" : "Add Pin"}
                onPress={() => setShowEditPinModal(true)}
                backgroundColor="#000"
                marginTop={responsive.screenHeight * 0.02}
              />
            </View>
          </View>
        </Modal>

        {/* Change/Add Pin Modal */}
        <Modal
          visible={showEditPinModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditPinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowEditPinModal(false)}
              >
                <Ionicons
                  name="close"
                  size={responsive.screenWidth * 0.06}
                  color="#111827"
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {child.profilePin ? "Change Profile Pin" : "Add Profile Pin"}
              </Text>
              <InputBox
                placeholder="Enter PIN"
                value={pinValue}
                onChangeText={setPinValue}
                keyboardType="numeric"
              />
              <Button
                title="Done"
                onPress={() => {
                  // Update the child's pin in local state or call API
                  console.log("New PIN:", pinValue);
                  setShowEditPinModal(false);
                  setShowPinModal(false);
                }}
                backgroundColor="#000"
                marginTop={responsive.screenHeight * 0.02}
              />
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
                <Ionicons
                  name="close"
                  size={responsive.screenWidth * 0.06}
                  color="#111827"
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Emergency Contact</Text>

              {/* Editable Fields */}
              <InputBox
                label="Name"
                value={child.emergencyContact.name}
                onChangeText={(text) => (child.emergencyContact.name = text)}
              />
              <InputBox
                label="Relationship"
                value={child.emergencyContact.relationship}
                onChangeText={(text) =>
                  (child.emergencyContact.relationship = text)
                }
              />
              <InputBox
                label="Phone Number"
                value={child.emergencyContact.phoneNumber}
                keyboardType="phone-pad"
                onChangeText={(text) =>
                  (child.emergencyContact.phoneNumber = text)
                }
              />
              <InputBox
                label="Street Address"
                value={child.emergencyContact.streetAddress}
                onChangeText={(text) =>
                  (child.emergencyContact.streetAddress = text)
                }
              />
              <InputBox
                label="City"
                value={child.emergencyContact.city}
                onChangeText={(text) => (child.emergencyContact.city = text)}
              />
              <InputBox
                label="State"
                value={child.emergencyContact.state}
                onChangeText={(text) => (child.emergencyContact.state = text)}
              />

              {/* Done Button */}
              <Button
                title="Done"
                onPress={() => {
                  console.log(
                    "Updated Emergency Contact:",
                    child.emergencyContact
                  );
                  setShowEmergencyModal(false);
                }}
                backgroundColor="#000"
                marginTop={responsive.screenHeight * 0.02}
              />
            </View>
          </View>
        </Modal>

        {/* Date Pickers */}
        <DateTimePickerModal
          isVisible={showStartPicker}
          mode="date"
          textColor="#111827"
          confirmTextIOS="Confirm"
          cancelTextIOS="Cancel"
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
          textColor="#111827"
          confirmTextIOS="Confirm"
          cancelTextIOS="Cancel"
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
  notFoundText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize,
    color: "#6B7280",
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
  filterButton: { flexDirection: "row", alignItems: "center" },
  filterText: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Medium",
    color: "#4F46E5",
    textDecorationLine: "underline",
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
    padding: responsive.screenWidth * 0.04,
  },
  modalClose: {
    position: "absolute",
    top: responsive.screenHeight * 0.01,
    right: responsive.screenWidth * 0.03,
  },
  modalTitle: {
    fontSize: responsive.buttonFontSize,
    fontFamily: "Fredoka-Bold",
    marginBottom: responsive.screenHeight * 0.015,
  },
  modalText: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Medium",
    marginBottom: responsive.screenHeight * 0.01,
    color: "#111827",
  },
});
