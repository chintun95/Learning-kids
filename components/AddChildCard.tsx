import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InputBox from "@/components/InputBox";
import EmergencyContactModal from "@/components/EmergencyContactModal";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { sanitizeInput } from "@/utils/formatter";
import { responsive } from "@/utils/responsive";
import { EmergencyContact } from "@/types/types";

interface AddChildCardProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  onUpdate: (data: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    emergencyContact: EmergencyContact;
  }) => void;
}

const AddChildCard: React.FC<AddChildCardProps> = ({
  index,
  onRemove,
  canRemove,
  onUpdate,
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: "",
    relationship: "",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    state: "",
  });

  const handleConfirmDate = (date: Date) => {
    const formatted = date.toISOString().split("T")[0]; // YYYY-MM-DD
    setDateOfBirth(formatted);
    setShowDatePicker(false);
    handleUpdate({ dateOfBirth: formatted });
  };

  const handleUpdate = (
    field: Partial<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      emergencyContact: EmergencyContact;
    }>
  ) => {
    const updated = {
      firstName,
      lastName,
      dateOfBirth,
      emergencyContact,
      ...field,
    };
    onUpdate(updated);
  };

  const handleEmergencyUpdate = (contact: EmergencyContact) => {
    setEmergencyContact(contact);
    handleUpdate({ emergencyContact: contact });
  };

  return (
    <View style={styles.card}>
      {/* Remove icon */}
      {canRemove && (
        <TouchableOpacity style={styles.removeIcon} onPress={onRemove}>
          <Ionicons
            name="trash-outline"
            size={responsive.screenWidth * 0.06}
            color="#000"
          />
        </TouchableOpacity>
      )}

      <Text style={styles.title}>Child {index + 1}</Text>

      {/* Name row */}
      <View style={styles.nameRow}>
        <View style={styles.halfBox}>
          <InputBox
            label="First Name"
            value={firstName}
            onChangeText={(text) => {
              const sanitized = sanitizeInput(text);
              setFirstName(sanitized);
              handleUpdate({ firstName: sanitized });
            }}
            placeholder="Enter First Name"
          />
        </View>
        <View style={styles.halfBox}>
          <InputBox
            label="Last Name"
            value={lastName}
            onChangeText={(text) => {
              const sanitized = sanitizeInput(text);
              setLastName(sanitized);
              handleUpdate({ lastName: sanitized });
            }}
            placeholder="Enter Last Name"
          />
        </View>
      </View>

      {/* Date of Birth */}
      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <InputBox
          label="Age"
          value={dateOfBirth ? dateOfBirth : ""}
          placeholder="Select Date of Birth"
          editable={false}
          iconRight="calendar-outline"
        />
      </TouchableOpacity>

      {/* Emergency Contact */}
      <TouchableOpacity
        style={styles.emergencyContactBtn}
        onPress={() => setShowEmergencyModal(true)}
      >
        <Text style={styles.emergencyContactText}>+ Emergency Contact</Text>
      </TouchableOpacity>

      {/* Date Picker */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Emergency Contact Modal */}
      <EmergencyContactModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        contact={emergencyContact}
        onUpdate={handleEmergencyUpdate}
      />
    </View>
  );
};

export default AddChildCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 15,
    padding: responsive.screenWidth * 0.04,
    marginBottom: responsive.screenHeight * 0.02,
    position: "relative",
  },
  title: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.signUpFontSize,
    color: "#000",
    marginBottom: responsive.screenHeight * 0.01,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: responsive.screenWidth * 0.03,
  },
  halfBox: { flex: 1 },
  removeIcon: {
    position: "absolute",
    right: responsive.screenWidth * 0.04,
    top: responsive.screenHeight * 0.01,
    zIndex: 10,
  },
  emergencyContactBtn: {
    marginTop: responsive.screenHeight * 0.015,
  },
  emergencyContactText: {
    fontFamily: "Fredoka-SemiBold",
    color: "#6C47FF",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
