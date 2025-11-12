import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import InputBox from "@/components/InputBox";
import { responsive } from "@/utils/responsive";
import {
  americanDateSchema,
  childPinSchema,
  sanitizeInput as sanitizeString,
} from "@/utils/formatter";
import EmergencyContactModal from "@/components/EmergencyContactModal";

type EmergencyContact = {
  name: string;
  relationship: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  zipcode: string;
};

export type ChildDraft = {
  id: string;
  firstName: string;
  lastName: string;
  dobISO: string | null;
  dobDisplay: string;
  pin: string;
  emergencyContact: EmergencyContact | null;
  collapsed: boolean;
};

type Props = {
  index: number;
  canDelete: boolean;
  data: ChildDraft;
  onChange: (updated: ChildDraft) => void;
  onDelete: (id: string) => void;
  onCollapseToggle?: (id: string, collapsed: boolean) => void;
};

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function AddChildCard({
  index,
  canDelete,
  data,
  onChange,
  onDelete,
  onCollapseToggle,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [pinError, setPinError] = useState<string>("");
  const [ageError, setAgeError] = useState<string>("");
  const [ecVisible, setEcVisible] = useState(false);

  const handleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = { ...data, collapsed: !data.collapsed };
    onChange(next);
    onCollapseToggle?.(data.id, next.collapsed);
  };

  const age = useMemo(() => {
    if (!data.dobISO) return null;
    const birth = new Date(data.dobISO);
    if (isNaN(+birth)) return null;
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
    return years;
  }, [data.dobISO]);

  const validateAgeInRange = (dateISO: string) => {
    const y = (() => {
      const d = new Date(dateISO);
      const t = new Date();
      let years = t.getFullYear() - d.getFullYear();
      const m = t.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && t.getDate() < d.getDate())) years--;
      return years;
    })();
    if (y < 6 || y > 18) {
      setAgeError("Age must be between 6 and 18. Please try again.");
      return false;
    }
    setAgeError("");
    return true;
  };

  const handleConfirmDate = (picked: Date) => {
    setShowPicker(false);
    const iso = picked.toISOString();
    const display = americanDateSchema.parse(picked.toISOString());
    if (!validateAgeInRange(iso)) return;
    onChange({ ...data, dobISO: iso, dobDisplay: display });
  };

  const openPicker = () => {
    setAgeError("");
    setShowPicker(true);
  };

  const handleFirstName = (txt: string) => {
    onChange({ ...data, firstName: sanitizeString(txt) });
  };

  const handleLastName = (txt: string) => {
    onChange({ ...data, lastName: sanitizeString(txt) });
  };

  const handlePin = (txt: string) => {
    const clean = sanitizeString(txt);
    onChange({ ...data, pin: clean });
    try {
      childPinSchema.parse(clean);
      setPinError("");
    } catch (e: any) {
      setPinError(e.errors?.[0]?.message ?? "Invalid PIN");
    }
  };

  const setEmergency = (ec: EmergencyContact) => {
    onChange({ ...data, emergencyContact: ec });
  };

  return (
    <View style={styles.card}>
      {canDelete && (
        <TouchableOpacity
          onPress={() => onDelete(data.id)}
          accessibilityLabel="Remove this child"
          style={styles.trash}
        >
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      )}

      {data.collapsed ? (
        <TouchableOpacity
          onPress={handleCollapse}
          style={styles.collapsedRow}
          accessibilityLabel="Open to edit"
        >
          <Text style={styles.collapsedText}>Open to edit</Text>
          <Text style={styles.chev}>▼</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.row}>
            <View style={[styles.half, { marginRight: 8 }]}>
              <InputBox
                label="First name"
                value={data.firstName}
                onChangeText={handleFirstName}
                placeholder="e.g. Alex"
              />
            </View>
            <View style={[styles.half, { marginLeft: 8 }]}>
              <InputBox
                label="Last name"
                value={data.lastName}
                onChangeText={handleLastName}
                placeholder="e.g. Kim"
              />
            </View>
          </View>

          <InputBox
            label="Date of birth"
            value={data.dobDisplay}
            editable={false}
            placeholder="MM/DD/YYYY"
            iconRight="calendar-outline"
            onIconRightPress={openPicker}
            onFocus={openPicker}
          />
          {!!ageError && <Text style={styles.error}>{ageError}</Text>}

          <InputBox
            label="Child profile PIN"
            value={data.pin}
            onChangeText={handlePin}
            placeholder="4 digits"
            keyboardType="number-pad"
            maxLength={4}
            error={pinError}
          />

          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={() => setEcVisible(true)}>
              <Text style={styles.emergencyText}>Emergency Contact</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCollapse} style={styles.chevBtn}>
              <Text style={styles.chev}>{data.collapsed ? "▼" : "▲"}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <DateTimePickerModal
        isVisible={showPicker}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setShowPicker(false)}
      />

      <EmergencyContactModal
        visible={ecVisible}
        onClose={() => setEcVisible(false)}
        contact={
          data.emergencyContact ?? {
            name: "",
            relationship: "",
            phoneNumber: "",
            streetAddress: "",
            city: "",
            state: "",
            zipcode: "",
          }
        }
        onUpdate={(c) => {
          setEmergency(c);
          setEcVisible(false);
        }}
        childId={""}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(217,217,217,0.85)",
    borderRadius: responsive.screenWidth * 0.04,
    borderWidth: 2,
    borderColor: "#999",
    padding: responsive.screenWidth * 0.05,
    marginVertical: responsive.screenHeight * 0.015,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  trash: {
    position: "absolute",
    right: responsive.screenWidth * 0.03,
    top: responsive.screenHeight * 0.008,
    zIndex: 10,
  },
  row: { flexDirection: "row" },
  half: { flex: 1 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: responsive.screenHeight * 0.015,
  },
  emergencyText: {
    color: "#000",
    textDecorationLine: "underline",
    fontFamily: "Fredoka-Medium",
    fontSize: responsive.buttonFontSize * 0.9,
  },
  chevBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  chev: {
    fontSize: responsive.isNarrowScreen ? 16 : 20,
    color: "#000",
    fontFamily: "Fredoka-Bold",
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: responsive.screenHeight * 0.012,
  },
  collapsedText: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.buttonFontSize,
    color: "#000",
  },
  error: {
    color: "#EF4444",
    fontSize: responsive.buttonFontSize * 0.75,
    marginTop: 4,
    fontFamily: "Fredoka-Regular",
  },
});
