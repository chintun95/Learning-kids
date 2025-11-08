import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  ActivityIndicator,
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
import ProfileIcon from "@/components/ProfileIcon";
import EmergencyContactModal from "@/components/EmergencyContactModal";
import { responsive } from "@/utils/responsive";
import Button from "@/components/Button";
import InputBox from "@/components/InputBox";
import sessionData from "@/test/data/session";
import { useChildById } from "@/services/fetchChildren";
import { useUpdateChildByParent } from "@/services/updateChild";

export default function ManageChildIndex() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditPinModal, setShowEditPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Fetch child data (real-time)
  const { data: child, isLoading } = useChildById(id);
  const { mutate: updateChildByParent } = useUpdateChildByParent();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading child data...</Text>
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Child not found</Text>
      </View>
    );
  }

  // Prepare DOB
  const dob = parseISO(child.dateOfBirth);
  const age = differenceInYears(new Date(), dob);
  const formattedDob = format(dob, "MM/dd/yyyy");

  // --- Filter sessions (mock data for now) ---
  let childSessions = sessionData.filter((s) => s.childId === child.id);
  if (startDate && endDate) {
    childSessions = childSessions.filter((s) =>
      isWithinInterval(parseISO(s.date), { start: startDate, end: endDate })
    );
  }
  childSessions.sort((a, b) =>
    compareDesc(
      parseISO(`${a.date}T${a.startTime}`),
      parseISO(`${b.date}T${b.startTime}`)
    )
  );

  // Group sessions
  const groupedSessions: Record<string, typeof sessionData> = {};
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
    return compareDesc(
      parseISO(groupedSessions[a][0].date),
      parseISO(groupedSessions[b][0].date)
    );
  });

  const hasAnySession = childSessions.length > 0;

  // ------------------------------
  // Handle Edit Child Name
  // ------------------------------
  const handleEditNamePress = () => {
    setFirstName(child.firstName);
    setLastName(child.lastName);
    setShowEditNameModal(true);
  };

  const handleSaveName = () => {
    updateChildByParent({
      childId: child.id,
      updates: {
        firstname: firstName.trim(),
        lastname: lastName.trim(),
      },
    });
    setShowEditNameModal(false);
  };

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

        {/* Activity Section */}
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

        {/* Edit Name Modal */}
        <Modal
          visible={showEditNameModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditNameModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowEditNameModal(false)}
              >
                <Ionicons
                  name="close"
                  size={responsive.screenWidth * 0.06}
                  color="#111827"
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Child Name</Text>
              <InputBox
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
              />
              <InputBox
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
              />
              <Button
                title="Save"
                onPress={handleSaveName}
                backgroundColor="#000"
                marginTop={responsive.screenHeight * 0.02}
              />
            </View>
          </View>
        </Modal>

        {/* Profile Pin Modal */}
        <Modal visible={showPinModal} transparent animationType="slide">
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
                Current Profile Pin: {child.profilePin ?? "Not Set"}
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

        {/* Emergency Contact Modal */}
        <EmergencyContactModal
          visible={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          contact={child.emergencyContact}
          childId={child.id}
          onUpdate={(updated) => console.log("Updated contact:", updated)}
        />

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
  editIconButton: {
    marginLeft: responsive.screenWidth * 0.001,
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
