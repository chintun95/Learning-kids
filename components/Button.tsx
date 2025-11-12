import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { responsive } from "@/utils/responsive";

interface ButtonProps {
  title: string;
  onPress: () => void;
  backgroundColor?: string;
  textColor?: string;
  outlined?: boolean;
  borderColor?: string;
  borderWidth?: number;
  // individual margins
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  // individual paddings
  paddingVertical?: number;
  paddingHorizontal?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  fontSize?: number;
  fontFamily?: string;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  accessibilityLabel?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  backgroundColor = "#2196F3",
  textColor = "#fff",
  outlined = false,
  borderColor = "#2196F3",
  borderWidth = 2,
  marginTop = 0,
  marginBottom = 0,
  marginLeft = 0,
  marginRight = 0,
  paddingVertical,
  paddingHorizontal,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  fontSize = responsive.buttonFontSize,
  fontFamily = "Fredoka-SemiBold",
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  iconSize = 20,
  accessibilityLabel,
}) => {
  const effectiveIconColor = textColor;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderWidth: outlined ? borderWidth : 0,
          borderColor: outlined ? borderColor : "transparent",
          opacity: disabled || loading ? 0.6 : 1,
          borderRadius: 9999,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          paddingVertical: paddingVertical ?? responsive.buttonHeight * 0.25,
          paddingHorizontal: paddingHorizontal ?? responsive.buttonHeight * 1.0,
          paddingTop: paddingTop ?? undefined,
          paddingBottom: paddingBottom ?? undefined,
          paddingLeft: paddingLeft ?? undefined,
          paddingRight: paddingRight ?? undefined,
        },
      ]}
      onPress={!disabled && !loading ? onPress : undefined}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={effectiveIconColor} />
      ) : (
        <View style={styles.content}>
          {iconLeft && (
            <Ionicons
              name={iconLeft}
              size={iconSize}
              color={effectiveIconColor}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[styles.text, { color: textColor, fontSize, fontFamily }]}
          >
            {title}
          </Text>
          {iconRight && (
            <Ionicons
              name={iconRight}
              size={iconSize}
              color={effectiveIconColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    textAlign: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
});

export default Button;
