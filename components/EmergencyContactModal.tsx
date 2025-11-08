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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { z } from "zod";
import { emergencyContactSchema } from "@/utils/formatter";
import { useUpdateEmergencyContact } from "@/services/updateEmergencyContact";

type EmergencyContact = z.infer<typeof emergencyContactSchema>;

interface EmergencyContactModalProps {
  visible: boolean;
  onClose: () => void;
  contact: EmergencyContact;
  onUpdate: (contact: EmergencyContact) => void;
  childId: string;
}

const EmergencyContactModal: React.FC<EmergencyContactModalProps> = ({
  visible,
  onClose,
  contact,
  onUpdate,
  childId,
}) => {
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

    updateEmergencyContact(
      { childId, contact: form },
      {
        onSuccess: () => {
          console.log("✅ Emergency contact saved:", form);
          onUpdate(form);
          onClose();
        },
      }
    );
  };

  const handleCancel = () => {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 2 }}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCancel}>
              <Ionicons
                name="close"
                size={responsive.screenWidth * 0.06}
                color="#111827"
              />
            </TouchableOpacity>

            <Text style={styles.title}>Emergency Contact</Text>

            <ScrollView
              contentContainerStyle={{
                paddingBottom: responsive.screenHeight * 0.03,
              }}
              showsVerticalScrollIndicator={false}
            >
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
              <InputBox
                label="Zip Code"
                keyboardType="number-pad"
                value={form.zipcode}
                onChangeText={(text) => handleChange("zipcode", text)}
                error={errors.zipcode}
              />

              <Button
                title={isPending ? "Saving..." : "Save"}
                onPress={handleDone}
                backgroundColor="#000"
                marginTop={responsive.screenHeight * 0.02}
                disabled={isPending}
                loading={isPending}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    width: "90%",
    padding: responsive.screenWidth * 0.05,
    maxHeight: "85%",
  },
  closeBtn: { alignSelf: "flex-end" },
  title: {
    fontSize: responsive.signUpFontSize,
    fontFamily: "Fredoka-Bold",
    color: "#111827",
    marginBottom: responsive.screenHeight * 0.003,
    textAlign: "center",
  },
});
