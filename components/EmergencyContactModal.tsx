import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { z } from "zod";
import { emergencyContactSchema } from "@/utils/formatter";
import { useUpdateEmergencyContact } from "@/services/updateEmergencyContact";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type EmergencyContact = z.infer<typeof emergencyContactSchema>;

interface EmergencyContactModalProps {
  visible: boolean;
  onClose: () => void;
  contact: EmergencyContact;
  onUpdate: (contact: EmergencyContact) => void;
  childId?: string | null; // <-- optional for create mode
}

const EmergencyContactModal: React.FC<EmergencyContactModalProps> = ({
  visible,
  onClose,
  contact,
  onUpdate,
  childId,
}) => {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<EmergencyContact>(contact);
  const [errors, setErrors] = useState<
    Partial<Record<keyof EmergencyContact, string>>
  >({});
  const { mutate: updateEmergencyContact, isPending } =
    useUpdateEmergencyContact();

  useEffect(() => {
    if (visible) setForm(contact);
  }, [visible, contact]);

  const handleChange = (field: keyof EmergencyContact, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    try {
      emergencyContactSchema.shape[field].parse(value);
      setErrors((prev) => ({ ...prev, [field]: "" }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          [field]: err.errors[0]?.message || "Invalid input",
        }));
      }
    }
  };

  const handleSave = () => {
    const result = emergencyContactSchema.safeParse(form);
    if (!result.success) {
      const newErrors: Partial<Record<keyof EmergencyContact, string>> = {};
      result.error.errors.forEach((e) => {
        const path = e.path[0] as keyof EmergencyContact;
        newErrors[path] = e.message;
      });
      setErrors(newErrors);
      return;
    }

    // --- CREATE MODE ---
    if (!childId || childId.trim() === "") {
      console.log("🟡 No childId provided — local mode (create only)");
      onUpdate(form); // pass data locally back to parent
      onClose();
      return;
    }

    // --- UPDATE MODE ---
    updateEmergencyContact(
      { childId, contact: form },
      {
        onSuccess: () => {
          console.log("✅ Emergency contact updated:", form);
          onUpdate(form);
          onClose();
        },
        onError: (error) => {
          console.error("❌ Failed to update emergency contact:", error);
          Alert.alert(
            "Error",
            "Failed to update emergency contact information."
          );
        },
      }
    );
  };

  const handleCancel = () => {
    setForm(contact);
    setErrors({});
    onClose();
  };

  const renderInput = (
    field: keyof EmergencyContact,
    label: string,
    keyboardType: "default" | "number-pad" | "phone-pad" = "default"
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[field] || ""}
        placeholder={`Enter ${label}`}
        placeholderTextColor="#666"
        keyboardType={keyboardType}
        onChangeText={(text) => handleChange(field, text)}
      />
      {errors[field] && <Text style={styles.error}>{errors[field]}</Text>}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          style={[
            styles.container,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Emergency Contact</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Ionicons
                name="close"
                size={responsive.screenWidth * 0.06}
                color="#000"
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable Form */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderInput("name", "Name (Full Name)")}
            {renderInput("relationship", "Relationship")}
            {renderInput(
              "phoneNumber",
              "Phone Number (xxx-xxx-xxxx)",
              "phone-pad"
            )}
            {renderInput("streetAddress", "Street Address")}
            {renderInput("city", "City")}
            {renderInput("state", "State")}
            {renderInput("zipcode", "Zip Code", "number-pad")}

            <Button
              title={isPending ? "Saving..." : "Save"}
              onPress={handleSave}
              backgroundColor="#000"
              marginTop={responsive.screenHeight * 0.02}
              disabled={isPending}
              loading={isPending}
              textColor="#fff"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default EmergencyContactModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(217,217,217,0.85)",
    borderColor: "#999",
    borderWidth: 2,
    borderTopWidth: 0,
    paddingHorizontal: responsive.screenWidth * 0.05,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomColor: "#999",
    borderBottomWidth: 2,
    paddingVertical: responsive.screenHeight * 0.015,
    marginBottom: responsive.screenHeight * 0.015,
  },
  title: {
    fontSize: responsive.buttonFontSize * 1.1,
    fontFamily: "Fredoka-Bold",
    color: "#000",
    textAlign: "center",
  },
  closeBtn: {
    position: "absolute",
    right: responsive.screenWidth * 0.02,
    top: "50%",
    transform: [{ translateY: -responsive.screenHeight * 0.012 }],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: responsive.screenHeight * 0.05,
  },
  inputContainer: {
    width: "100%",
    marginBottom: responsive.screenHeight * 0.015,
  },
  label: {
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize * 0.85,
    color: "#000",
    marginBottom: responsive.screenHeight * 0.005,
  },
  input: {
    backgroundColor: "#D9D9D9",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: responsive.screenWidth * 0.03,
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize,
    color: "#000",
    paddingVertical: responsive.screenHeight * 0.01,
    paddingHorizontal: responsive.screenWidth * 0.04,
  },
  error: {
    color: "red",
    fontSize: responsive.buttonFontSize * 0.75,
    marginTop: responsive.screenHeight * 0.003,
  },
});
