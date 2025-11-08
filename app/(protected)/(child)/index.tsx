import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import ProfileIcon from "@/components/ProfileIcon";
import { responsive } from "@/utils/responsive";
import SignOutButton from "@/components/SignOutButton";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { sanitizeInput } from "@/utils/formatter";

const ChildIndexScreen: React.FC = () => {
  const { children, getCurrentChild, selectChildUnsafe } = useChildAuthStore();
  const currentChild = getCurrentChild();
  const router = useRouter();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  const handleSelectChild = useCallback(
    (childId: string) => {
      const child = children.find((c) => c.id === childId);
      if (!child) return;

      // If the child has a stored pin, show modal
      if (child.profilePin) {
        setSelectedChildId(childId);
        setModalVisible(true);
      } else {
        // No PIN — proceed directly to home
        selectChildUnsafe(childId);
        router.push(`/home/${childId}`);
      }
    },
    [children, selectChildUnsafe, router]
  );

  const handlePinSubmit = () => {
    if (!selectedChildId) return;

    const child = children.find((c) => c.id === selectedChildId);
    if (!child) return;

    const sanitizedPin = sanitizeInput(enteredPin);

    if (sanitizedPin === child.profilePin) {
      setPinError("");
      setModalVisible(false);
      selectChildUnsafe(selectedChildId);
      setEnteredPin("");
      router.push(`/home/${selectedChildId}`);
    } else {
      setPinError("Incorrect PIN. Please try again.");
    }
  };

  const handleBack = () => {
    setEnteredPin("");
    setPinError("");
    setSelectedChildId(null);
    setModalVisible(false);
  };

  if (!children || children.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />
        <Text style={styles.emptyText}>No profiles found</Text>
        <View style={styles.signOutWrapper}>
          <SignOutButton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      <Text style={styles.header}>Select Your Profile</Text>

      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isActive = currentChild?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.iconContainer, isActive && styles.activeContainer]}
              onPress={() => handleSelectChild(item.id)}
              activeOpacity={0.8}
            >
              <ProfileIcon source={item.profilePicture} />
              <Text style={styles.nameText}>
                {item.firstName} {item.lastName}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* --- Sign Out Button at bottom --- */}
      <View style={styles.signOutWrapper}>
        <SignOutButton />
      </View>

      {/* --- PIN Modal --- */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleBack}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Enter PIN</Text>
            <InputBox
              placeholder="Enter 4-digit PIN"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={enteredPin}
              onChangeText={setEnteredPin}
              style={styles.pinInput}
            />
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
            <View style={styles.buttonRow}>
              <View style={styles.modalButtonWrapper}>
                <Button
                  title="Back"
                  onPress={handleBack}
                  backgroundColor="#E5E7EB"
                  textColor="#111827"
                  fontSize={responsive.buttonFontSize * 0.8}
                  paddingVertical={responsive.buttonHeight * 0.25}
                  paddingHorizontal={responsive.buttonHeight * 0.65}
                />
              </View>
              <View style={styles.modalButtonWrapper}>
                <Button
                  title="Done"
                  onPress={handlePinSubmit}
                  backgroundColor="#4F46E5"
                  textColor="#fff"
                  fontSize={responsive.buttonFontSize * 0.8}
                  paddingVertical={responsive.buttonHeight * 0.25}
                  paddingHorizontal={responsive.buttonHeight * 0.65}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default ChildIndexScreen;

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    fontSize: responsive.buttonFontSize * 1.2,
    fontWeight: "600",
    marginVertical: responsive.screenHeight * 0.025,
  },
  listContainer: {
    justifyContent: "center",
    paddingHorizontal: responsive.screenWidth * 0.05,
    paddingBottom: responsive.screenHeight * 0.1,
  },
  row: {
    justifyContent: "space-around",
    marginBottom: responsive.screenHeight * 0.03,
  },
  iconContainer: {
    alignItems: "center",
    marginHorizontal: responsive.screenWidth * 0.05,
  },
  activeContainer: {
    borderWidth: 2,
    borderColor: "#4A90E2",
    borderRadius: responsive.profileIconSize() / 2,
    padding: responsive.screenWidth * 0.01,
  },
  nameText: {
    marginTop: responsive.screenHeight * 0.01,
    fontSize: responsive.buttonFontSize,
    fontWeight: "500",
    textAlign: "center",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: responsive.buttonFontSize,
    color: "#999",
    marginBottom: responsive.screenHeight * 0.02,
  },
  signOutWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsive.screenWidth * 0.05,
    paddingBottom: Platform.OS === "android" ? 25 : 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsive.screenWidth * 0.08,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: responsive.screenWidth * 0.03,
    padding: responsive.screenHeight * 0.03,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: responsive.buttonFontSize * 1.2,
    fontWeight: "600",
    marginBottom: responsive.screenHeight * 0.015,
  },
  pinInput: {
    textAlign: "center",
    fontSize: responsive.buttonFontSize,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: responsive.screenHeight * 0.025,
  },
  modalButtonWrapper: {
    flex: 1,
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    marginTop: responsive.screenHeight * 0.01,
    fontSize: responsive.buttonFontSize * 0.85,
  },
});
