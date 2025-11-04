import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { z } from "zod";
import { emergencyContactSchema } from "@/utils/formatter";

// Infer type directly from schema
type EmergencyContact = z.infer<typeof emergencyContactSchema>;

interface EmergencyContactModalProps {
  visible: boolean;
  onClose: () => void;
  contact: EmergencyContact;
  onUpdate: (contact: EmergencyContact) => void;
}

const EmergencyContactModal: React.FC<EmergencyContactModalProps> = ({
  visible,
  onClose,
  contact,
  onUpdate,
}) => {
  const [form, setForm] = useState<EmergencyContact>(contact);
  const [errors, setErrors] = useState<
    Partial<Record<keyof EmergencyContact, string>>
  >({});

  // When modal opens, load a fresh copy of the contact
  useEffect(() => {
    if (visible) setForm(contact);
  }, [visible, contact]);

  const handleChange = (field: keyof EmergencyContact, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);

    // Real-time validation for individual fields
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

  const handleDone = () => {
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

    // Save validated changes and close
    onUpdate(form);
    console.log("✅ Saved emergency contact:", form);
    onClose();
  };

  const handleCancel = () => {
    // Discard unsaved edits and close modal
    setForm(contact);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close / Cancel Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleCancel}>
            <Ionicons
              name="close"
              size={responsive.screenWidth * 0.06}
              color="#111827"
            />
          </TouchableOpacity>

          <Text style={styles.title}>Emergency Contact</Text>

          {/* Form Fields */}
          <InputBox
            label="Name"
            value={form.name}
            onChangeText={(text) => handleChange("name", text)}
            error={errors.name}
          />
          <InputBox
            label="Relationship"
            value={form.relationship}
            onChangeText={(text) => handleChange("relationship", text)}
            error={errors.relationship}
          />
          <InputBox
            label="Phone Number"
            keyboardType="phone-pad"
            value={form.phoneNumber}
            onChangeText={(text) => handleChange("phoneNumber", text)}
            error={errors.phoneNumber}
          />
          <InputBox
            label="Street Address"
            value={form.streetAddress}
            onChangeText={(text) => handleChange("streetAddress", text)}
            error={errors.streetAddress}
          />
          <InputBox
            label="City"
            value={form.city}
            onChangeText={(text) => handleChange("city", text)}
            error={errors.city}
          />
          <InputBox
            label="State"
            value={form.state}
            onChangeText={(text) => handleChange("state", text)}
            error={errors.state}
          />

          {/* Done Button */}
          <Button
            title="Done"
            onPress={handleDone}
            backgroundColor="#000"
            marginTop={responsive.screenHeight * 0.02}
          />
        </View>
      </View>
    </Modal>
  );
};

export default EmergencyContactModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: "85%",
    padding: responsive.screenWidth * 0.05,
  },
  closeBtn: { alignSelf: "flex-end" },
  title: {
    fontSize: responsive.signUpFontSize,
    fontFamily: "Fredoka-Bold",
    color: "#111827",
    marginBottom: responsive.screenHeight * 0.02,
    textAlign: "center",
  },
});
