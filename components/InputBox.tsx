import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { responsive } from "@/utils/responsive";

interface InputBoxProps extends TextInputProps {
  label?: string;
  error?: string;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  onIconRightPress?: () => void;
  iconSize?: number;
  iconColor?: string;
  fontFamily?: string;
}

const InputBox: React.FC<InputBoxProps> = ({
  label,
  error,
  iconLeft,
  iconRight,
  onIconRightPress,
  iconSize = 20,
  iconColor = "#666",
  fontFamily = "Fredoka-Bold",
  style,
  onFocus, // include onFocus prop (important for EmergencyContactModal)
  ...props
}) => {
  const inputHeight = responsive.buttonHeight;

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { fontFamily }]}>{label}</Text>}

      <View style={[styles.inputWrapper, { borderRadius: inputHeight / 3 }]}>
        {/* Left Icon */}
        {iconLeft && (
          <Ionicons
            name={iconLeft}
            size={iconSize}
            color={iconColor}
            style={styles.iconLeft}
          />
        )}

        {/* Input Field */}
        <TextInput
          style={[
            styles.input,
            {
              fontFamily: "Fredoka-SemiBold",
              fontSize: responsive.buttonFontSize,
              paddingVertical: inputHeight * 0.25,
              paddingHorizontal: inputHeight * 0.4,
            },
            style,
          ]}
          placeholderTextColor="#999"
          onFocus={onFocus} // allow parent components to handle scroll behavior
          {...props}
        />

        {/* Right Icon */}
        {iconRight && (
          <TouchableOpacity onPress={onIconRightPress}>
            <Ionicons
              name={iconRight}
              size={iconSize}
              color={iconColor}
              style={styles.iconRight}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Text */}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: responsive.buttonHeight * 0.15,
  },
  label: {
    fontSize: responsive.buttonFontSize * 0.85,
    marginBottom: responsive.buttonHeight * 0.1,
    color: "#333",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D9D9D9",
    borderWidth: 2,
    borderColor: "#000",
  },
  input: {
    flex: 1,
    color: "#000",
  },
  iconLeft: {
    marginLeft: 10,
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
    marginRight: 10,
  },
  error: {
    color: "red",
    fontSize: responsive.buttonFontSize * 0.7,
    marginTop: responsive.buttonHeight * 0.1,
  },
});

export default InputBox;
