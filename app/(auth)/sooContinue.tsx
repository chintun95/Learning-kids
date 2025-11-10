import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSignUp, useUser } from "@clerk/clerk-expo";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { useAuthStore } from "@/lib/store/authStore";

export default function SSOContinue() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { user } = useUser();
  const setRole = useAuthStore((state) => state.setRole);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Prevent direct access if user didn’t come from SSO
  useEffect(() => {
    if (!isLoaded) return;
    if (!signUp?.id) {
      router.replace("./");
      return;
    }
  }, [isLoaded, signUp]);

  // Handle continue after SSO (complete signup)
  const handleContinue = async () => {
    if (!isLoaded) return;
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    try {
      const updated = await signUp?.update({ password });

      if (updated?.status === "complete") {
        await setActive?.({
          session: updated.createdSessionId,
        });

        // ✅ Set parent role before navigating
        setRole("parent");

        // ✅ Navigate directly after signup (no Supabase interaction)
        router.replace("/(protected)/(parent)/(tabs)");
      } else {
        Alert.alert("Incomplete", "Please complete all required fields.");
      }
    } catch (err: any) {
      console.error("SSO Continue Error:", err);
      Alert.alert(
        "Error",
        err.errors?.[0]?.longMessage || "Failed to complete sign-up."
      );
    }
  };

  const { width, height } = responsive.logoSize();

  return (
    <ImageBackground
      source={require("@/assets/images/app-background.png")}
      resizeMode="cover"
      imageStyle={{ transform: [{ scale: 1.22 }] }}
      style={[
        styles.background,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: responsive.screenHeight * 0.05 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoWrapper}>
              <Image
                source={require("@/assets/images/app-logo.png")}
                style={{
                  width: width * 0.9,
                  height: height * 0.9,
                  marginBottom: responsive.screenHeight * -0.06,
                }}
                resizeMode="contain"
              />
              <Text style={styles.header}>Continue Sign-Up</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.instructions}>
                Please create a password to finish setting up your account.
              </Text>

              <InputBox
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError("");
                }}
                iconLeft="lock-closed-outline"
              />

              <InputBox
                label="Confirm Password"
                placeholder="Confirm your password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setError("");
                }}
                iconLeft="lock-closed-outline"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button
                title="Continue"
                onPress={handleContinue}
                backgroundColor="#000"
                textColor="#fff"
                fontSize={responsive.buttonFontSize}
                marginTop={responsive.screenHeight * 0.02}
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: responsive.screenWidth * 0.05,
  },
  logoWrapper: {
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.02,
  },
  header: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.signUpFontSize,
    color: "#000",
    marginBottom: responsive.screenHeight * 0.01,
  },
  formContainer: {
    marginTop: responsive.screenHeight * 0.03,
  },
  instructions: {
    fontFamily: "Fredoka-Regular",
    fontSize: responsive.signUpFontSize * 0.9,
    color: "#000",
    marginBottom: responsive.screenHeight * 0.015,
    textAlign: "center",
  },
  errorText: {
    color: "red",
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.footerFontSize,
    marginTop: responsive.screenHeight * 0.005,
    textAlign: "center",
  },
});
