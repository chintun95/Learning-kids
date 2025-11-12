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
  Modal,
  ImageBackground,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
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
import Button from "@/components/Button";
import { useChildById } from "@/services/fetchChildren";
import { useUpdateChildByParent } from "@/services/updateChild";
import { useSessionsByChildId } from "@/services/fetchSession";

export default function ManageChildIndex() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditPinModal, setShowEditPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const { data: child, isLoading: isLoadingChild } = useChildById(id);
  const { mutate: updateChildByParent } = useUpdateChildByParent();
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    isError: isSessionError,
    error: sessionError,
  } = useSessionsByChildId(id ?? null);

  if (isLoadingChild || isLoadingSessions) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
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

  const dob = parseISO(child.dateOfBirth);
  const age = differenceInYears(new Date(), dob);
  const formattedDob = format(dob, "MM/dd/yyyy");

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

      {/* Header background extension */}
      <View style={[styles.headerBackground, { height: insets.top + 50 }]} />

      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Header */}
        <View
          style={[
            styles.topHeader,
            {
              paddingTop:
                Platform.OS === "android" ? insets.top + 2 : insets.top,
            },
          ]}
        >
          <Text style={styles.headerTitle}>
            Manage {child.firstName} {child.lastName}
          </Text>
          <TouchableOpacity onPress={handleGoBack} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={responsive.screenWidth * 0.06}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={{
            paddingBottom: insets.bottom + responsive.screenHeight * 0.05,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* --- Child Info Section --- */}
          <View style={styles.profileContainer}>
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
                    color="#000"
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

          {/* --- Activity Tracker Section --- */}
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Activity Tracker</Text>
            <TouchableOpacity onPress={() => setShowStartPicker(true)}>
              <Ionicons
                name="filter"
                size={responsive.screenWidth * 0.06}
                color="#000"
              />
            </TouchableOpacity>
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
                    const statusColor =
                      session.sessionstatus === "In Progress"
                        ? "#EF4444"
                        : session.sessionstatus === "Completed"
                        ? "#22C55E"
                        : "#6B7280";

                    return (
                      <View key={session.id} style={styles.sessionItem}>
                        <View style={styles.sessionHeader}>
                          <Text style={styles.activityType}>
                            {session.activitytype}
                          </Text>
                          <Text
                            style={[
                              styles.sessionStatus,
                              { color: statusColor },
                            ]}
                          >
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
      </ImageBackground>

      {/* --- Edit Name Modal --- */}
      <Modal visible={showEditNameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowEditNameModal(false)}
              style={styles.modalClose}
            >
              <Ionicons
                name="close"
                size={responsive.screenWidth * 0.06}
                color="#000"
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
              textColor="#fff"
            />
          </View>
        </View>
      </Modal>

      {/* --- Profile Pin Modal --- */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowPinModal(false)}
              style={styles.modalClose}
            >
              <Ionicons
                name="close"
                size={responsive.screenWidth * 0.06}
                color="#000"
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Profile Pin</Text>
            <Text style={styles.modalText}>
              Current Pin: {child.profilePin ?? "Not Set"}
            </Text>
            <Button
              title={child.profilePin ? "Change Pin" : "Add Pin"}
              onPress={() => setShowEditPinModal(true)}
              backgroundColor="#000"
              marginTop={responsive.screenHeight * 0.02}
              textColor="#fff"
            />
          </View>
        </View>
      </Modal>

      {/* --- Date Picker Modals --- */}
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

      {/* --- Emergency Contact Modal --- */}
      <EmergencyContactModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        contact={child.emergencyContact}
        childId={child.id}
        onUpdate={() => console.log("Updated contact")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#fff" },
  background: { flex: 1, width: "100%", height: "100%" },
  backgroundImage: { transform: [{ scale: 1.2 }] },
  scrollContainer: { flex: 1, backgroundColor: "transparent" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    fontFamily: "Fredoka-Regular",
    color: "#000",
    marginTop: 8,
  },
  notFoundText: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.buttonFontSize,
    color: "#6B7280",
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderBottomColor: "#999",
    borderBottomWidth: 2,
    zIndex: 1,
  },
  topHeader: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderBottomColor: "#999",
    borderBottomWidth: 2,
    paddingVertical: responsive.screenHeight * 0.012,
    paddingHorizontal: responsive.screenWidth * 0.05,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 2,
  },
  headerTitle: {
    fontSize: responsive.buttonFontSize * 1.05,
    fontFamily: "Fredoka-Bold",
    color: "#000",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: responsive.screenWidth * 0.05,
    top: responsive.screenHeight * 0.012,
    padding: 4,
  },
  profileContainer: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    marginTop: responsive.screenHeight * 0.03,
    marginHorizontal: responsive.screenWidth * 0.05,
    alignItems: "center",
    paddingVertical: responsive.screenHeight * 0.03,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
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
  editIconButton: { marginLeft: responsive.screenWidth * 0.015 },
  nameText: {
    fontSize: responsive.buttonFontSize * 1.1,
    fontFamily: "Fredoka-Bold",
    color: "#000",
    textAlign: "center",
  },
  dobText: {
    fontSize: responsive.buttonFontSize * 0.9,
    fontFamily: "Fredoka-Medium",
    marginTop: responsive.screenHeight * 0.005,
    color: "#000",
    textAlign: "center",
  },
  linkButton: { marginTop: responsive.screenHeight * 0.01 },
  linkText: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Medium",
    color: "#000",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  separator: {
    height: 2,
    backgroundColor: "#999",
    marginVertical: responsive.screenHeight * 0.025,
    marginHorizontal: responsive.screenWidth * 0.08,
    borderRadius: 4,
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
    fontFamily: "Fredoka-Bold",
    color: "#000",
  },
  activityList: { paddingHorizontal: responsive.screenWidth * 0.05 },
  group: { marginBottom: responsive.screenHeight * 0.03 },
  groupTitle: {
    fontSize: responsive.buttonFontSize * 0.9,
    fontFamily: "Fredoka-Bold",
    marginBottom: responsive.screenHeight * 0.01,
    color: "#000",
  },
  todayNote: {
    fontSize: responsive.buttonFontSize * 0.75,
    color: "#000",
    marginLeft: responsive.screenWidth * 0.015,
  },
  sessionItem: {
    marginBottom: responsive.screenHeight * 0.015,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    padding: responsive.screenWidth * 0.04,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: responsive.screenHeight * 0.005,
  },
  activityType: {
    fontSize: responsive.buttonFontSize * 0.9,
    fontFamily: "Fredoka-Medium",
    color: "#000",
  },
  sessionStatus: {
    fontSize: responsive.buttonFontSize * 0.9,
    fontFamily: "Fredoka-Bold",
  },
  sessionDate: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Regular",
    color: "#000",
    marginBottom: responsive.screenHeight * 0.002,
  },
  sessionDetails: {
    fontSize: responsive.buttonFontSize * 0.8,
    fontFamily: "Fredoka-Regular",
    color: "#000",
  },
  noActivityText: {
    fontSize: responsive.buttonFontSize * 0.85,
    fontFamily: "Fredoka-Regular",
    color: "#000",
    textAlign: "center",
    marginTop: responsive.screenHeight * 0.02,
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    padding: responsive.screenWidth * 0.06,
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: responsive.screenHeight * 0.012,
    right: responsive.screenWidth * 0.04,
  },
  modalTitle: {
    fontSize: responsive.buttonFontSize * 1.1,
    fontFamily: "Fredoka-Bold",
    color: "#000",
    textAlign: "center",
    marginBottom: responsive.screenHeight * 0.02,
  },
  modalText: {
    fontSize: responsive.buttonFontSize * 0.9,
    fontFamily: "Fredoka-Medium",
    color: "#000",
    marginBottom: responsive.screenHeight * 0.02,
  },
});
