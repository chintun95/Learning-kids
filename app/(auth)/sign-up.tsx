import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Modal,
  Alert,
  StatusBar as RNStatusBar,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Button from "@/components/Button";
import InputBox from "@/components/InputBox";
import { useSignUp } from "@clerk/clerk-expo";
import { useAuthStore } from "@/lib/store/authStore";
import { responsive } from "@/utils/responsive";
import { z } from "zod";
import { signUpSchema } from "@/utils/formatter"; // define your Zod schema for signup validation

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const setRole = useAuthStore((state) => state.setRole);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verification, setVerification] = useState({
    state: "default",
    error: "",
    code: "",
  });
  const [successModal, showSuccessModal] = useState(false);

  // Real-time validation using Zod
  useEffect(() => {
    try {
      signUpSchema.shape.firstName.parse(form.firstName);
      setErrors((prev) => ({ ...prev, firstName: "" }));
    } catch (err) {
      if (err instanceof z.ZodError && form.firstName.length > 0) {
        setErrors((prev) => ({
          ...prev,
          firstName: err.errors[0]?.message || "Invalid first name",
        }));
      }
    }
  }, [form.firstName]);

  useEffect(() => {
    try {
      signUpSchema.shape.lastName.parse(form.lastName);
      setErrors((prev) => ({ ...prev, lastName: "" }));
    } catch (err) {
      if (err instanceof z.ZodError && form.lastName.length > 0) {
        setErrors((prev) => ({
          ...prev,
          lastName: err.errors[0]?.message || "Invalid last name",
        }));
      }
    }
  }, [form.lastName]);

  useEffect(() => {
    try {
      signUpSchema.shape.email.parse(form.email);
      setErrors((prev) => ({ ...prev, email: "" }));
    } catch (err) {
      if (err instanceof z.ZodError && form.email.length > 0) {
        setErrors((prev) => ({
          ...prev,
          email: err.errors[0]?.message || "Invalid email",
        }));
      }
    }
  }, [form.email]);

  useEffect(() => {
    try {
      signUpSchema.shape.password.parse(form.password);
      setErrors((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      if (err instanceof z.ZodError && form.password.length > 0) {
        setErrors((prev) => ({
          ...prev,
          password: err.errors[0]?.message || "Invalid password",
        }));
      }
    }
  }, [form.password]);

  useEffect(() => {
    if (form.confirmPassword && form.confirmPassword !== form.password) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  }, [form.confirmPassword, form.password]);

  const handleSwitchToLogin = () => router.push("../");

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (form.password !== form.confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Passwords do not match. Please try again."
      );
      return;
    }

    try {
      await signUp.create({
        firstName: form.firstName,
        lastName: form.lastName,
        emailAddress: form.email,
        password: form.password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerification((prev) => ({ ...prev, state: "pending" }));
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Unknown error");
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code: verification.code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        setRole("parent");
        setVerification((prev) => ({ ...prev, state: "success", error: "" }));
        showSuccessModal(true);
      } else {
        setVerification((prev) => ({
          ...prev,
          error: "Verification failed. Please try again.",
          state: "failed",
        }));
      }
    } catch (err: any) {
      setVerification((prev) => ({
        ...prev,
        error: err.errors?.[0]?.longMessage || "Verification error",
        state: "failed",
      }));
    }
  };

  const handleTermsOfService = () => console.log("Terms of Service pressed");
  const handleTermsOfConduct = () => console.log("Terms of Conduct pressed");

  const { width, height } = responsive.logoSize();

  return (
    <ImageBackground
      source={require("@/assets/images/app-background.png")}
      resizeMode="cover"
      style={styles.background}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <StatusBar style="dark" translucent backgroundColor="transparent" />

            {/* Logo */}
            <View style={styles.logoWrapper}>
              <Image
                source={require("@/assets/images/app-logo.png")}
                style={{
                  width,
                  height,
                  marginBottom: responsive.screenHeight * -0.08,
                }}
                resizeMode="contain"
              />
              <TouchableOpacity onPress={handleSwitchToLogin}>
                <Text style={styles.switchText}>Already have an account?</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formHeader}>
                Parent or Guardian's Information
              </Text>

              {/* First / Last Name */}
              <View style={styles.nameRow}>
                <View style={[styles.halfInput]}>
                  <InputBox
                    label="First Name"
                    placeholder="First Name"
                    value={form.firstName}
                    onChangeText={(v) => setForm({ ...form, firstName: v })}
                    error={errors.firstName}
                  />
                </View>
                <View style={[styles.halfInput]}>
                  <InputBox
                    label="Last Name"
                    placeholder="Last Name"
                    value={form.lastName}
                    onChangeText={(v) => setForm({ ...form, lastName: v })}
                    error={errors.lastName}
                  />
                </View>
              </View>

              {/* Email */}
              <InputBox
                label="Email"
                placeholder="Enter your email"
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                error={errors.email}
                iconLeft="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Password */}
              <InputBox
                label="Password"
                placeholder="Enter your password"
                value={form.password}
                onChangeText={(v) => setForm({ ...form, password: v })}
                error={errors.password}
                secureTextEntry={!showPassword}
                iconLeft="lock-closed-outline"
                iconRight={showPassword ? "eye-off" : "eye"}
                onIconRightPress={() => setShowPassword(!showPassword)}
              />

              {/* Confirm Password */}
              <InputBox
                label="Confirm Password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
                error={errors.confirmPassword}
                secureTextEntry={!showConfirmPassword}
                iconLeft="lock-closed-outline"
                iconRight={showConfirmPassword ? "eye-off" : "eye"}
                onIconRightPress={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              />

              <Button
                title="Sign Up"
                onPress={onSignUpPress}
                backgroundColor="#000"
                textColor="#fff"
                fontSize={responsive.buttonFontSize}
                paddingVertical={responsive.buttonHeight * 0.25}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you accept our{" "}
                <Text style={styles.linkText} onPress={handleTermsOfService}>
                  Terms of Service
                </Text>
              </Text>
              <Text style={styles.footer2Text}>
                and{" "}
                <Text style={styles.link2Text} onPress={handleTermsOfConduct}>
                  Terms of Conduct
                </Text>
              </Text>
            </View>

            {/* Verification Modal */}
            <Modal
              visible={verification.state === "pending"}
              transparent
              animationType="slide"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Verify Your Email</Text>
                  <Text style={styles.modalText}>
                    We’ve sent a verification code to your email. Please enter
                    it below.
                  </Text>

                  <InputBox
                    placeholder="Enter verification code"
                    value={verification.code}
                    onChangeText={(code) =>
                      setVerification({ ...verification, code })
                    }
                    error={verification.error}
                    keyboardType="number-pad"
                  />

                  <Button
                    title="Verify"
                    onPress={onVerifyPress}
                    backgroundColor="#000"
                    textColor="#fff"
                    fontSize={responsive.buttonFontSize}
                    paddingVertical={responsive.buttonHeight * 0.25}
                  />
                </View>
              </View>
            </Modal>

            {/* Success Modal */}
            <Modal
              visible={successModal && verification.state === "success"}
              transparent
              animationType="slide"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Verification Successful</Text>
                  <Text style={styles.modalText}>
                    Your email has been verified successfully! You can now log
                    in.
                  </Text>
                  <Button
                    title="Go to Home Screen"
                    onPress={() => {
                      showSuccessModal(false);
                      router.replace("./(protected)/(parent)");
                    }}
                    backgroundColor="#000"
                    textColor="#fff"
                    fontSize={responsive.buttonFontSize}
                    paddingVertical={responsive.buttonHeight * 0.25}
                  />
                </View>
              </View>
            </Modal>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: responsive.screenWidth * 0.05,
  },
  logoWrapper: {
    alignItems: "center",
    marginTop: responsive.screenHeight * -0.02,
  },
  switchText: {
    fontSize: responsive.signUpFontSize * 0.9,
    fontFamily: "Fredoka-SemiBold",
    textDecorationLine: "underline",
    color: "#ffffff",
    textAlign: "center",
    marginTop: responsive.screenHeight * 0.01,
  },
  formContainer: { marginTop: responsive.screenHeight * 0.02 },
  formHeader: {
    fontSize: responsive.signUpFontSize * 0.9,
    fontFamily: "Fredoka-SemiBold",
    color: "#000",
    marginBottom: responsive.screenHeight * 0.01,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: responsive.screenWidth * 0.04,
  },
  halfInput: { flex: 1 },
  footer: {
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.02,
    marginBottom: responsive.screenHeight * 0.04,
  },
  footerText: {
    color: "#000",
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  linkText: {
    fontFamily: "Fredoka-SemiBold",
    color: "#ffffff",
    textDecorationLine: "underline",
  },
  footer2Text: {
    color: "#000",
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  link2Text: {
    fontFamily: "Fredoka-SemiBold",
    color: "#ffffff",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: responsive.screenWidth * 0.05,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: responsive.signUpFontSize,
    fontFamily: "Fredoka-Bold",
    color: "#000",
    marginBottom: responsive.screenHeight * 0.01,
  },
  modalText: {
    fontSize: responsive.signUpFontSize * 0.9,
    fontFamily: "Fredoka-Regular",
    color: "#000",
    textAlign: "center",
    marginBottom: responsive.screenHeight * 0.02,
  },
});
