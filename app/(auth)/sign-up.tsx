import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Image,
  ImageBackground,
  TextInput,
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
import { useSignUp, useUser } from "@clerk/clerk-expo";
import { useAuthStore } from "@/lib/store/authStore";
import { responsive } from "@/utils/responsive";

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { user } = useUser();
  const setRole = useAuthStore((state) => state.setRole);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successModal, showSuccessModal] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [verification, setVerification] = useState({
    state: "default",
    error: "",
    code: "",
  });

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
          <View style={styles.innerContainer}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <StatusBar
                style="dark"
                translucent
                backgroundColor="transparent"
              />

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
                  <Text style={styles.switchText}>
                    Already have an account?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                <Text style={styles.formHeader}>
                  Parent or Guardian's Information
                </Text>

                {/* First / Last Name */}
                <View style={styles.nameRow}>
                  <View style={[styles.inputGroup, styles.halfInput]}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                      placeholder="First Name"
                      placeholderTextColor="#999"
                      style={styles.input}
                      value={form.firstName}
                      onChangeText={(v) => setForm({ ...form, firstName: v })}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfInput]}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                      placeholder="Last Name"
                      placeholderTextColor="#999"
                      style={styles.input}
                      value={form.lastName}
                      onChangeText={(v) => setForm({ ...form, lastName: v })}
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputIconWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#000"
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Enter your email"
                      placeholderTextColor="#999"
                      style={styles.inputInner}
                      value={form.email}
                      onChangeText={(v) => setForm({ ...form, email: v })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputIconWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#000"
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showPassword}
                      style={styles.inputInner}
                      value={form.password}
                      onChangeText={(v) => setForm({ ...form, password: v })}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#000"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.inputIconWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#000"
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Confirm your password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showConfirmPassword}
                      style={styles.inputInner}
                      value={form.confirmPassword}
                      onChangeText={(v) =>
                        setForm({ ...form, confirmPassword: v })
                      }
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#000"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

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

                    <TextInput
                      placeholder="Enter verification code"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      style={[
                        styles.input,
                        { marginBottom: responsive.screenHeight * 0.02 },
                      ]}
                      value={verification.code}
                      onChangeText={(code) =>
                        setVerification({ ...verification, code })
                      }
                      returnKeyType="done"
                    />
                    {verification.error ? (
                      <Text style={styles.errorText}>{verification.error}</Text>
                    ) : null}

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
                    <Text style={styles.modalTitle}>
                      Verification Successful
                    </Text>
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
          </View>
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
  innerContainer: { flex: 1 },
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
  inputGroup: { marginBottom: responsive.screenHeight * 0.02 },
  inputLabel: {
    fontSize: responsive.signUpFontSize * 0.9,
    fontFamily: "Fredoka-SemiBold",
    color: "#000",
    marginBottom: responsive.screenHeight * 0.005,
  },
  inputIconWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D9D9D9",
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#000",
    paddingHorizontal: responsive.screenWidth * 0.03,
  },
  inputInner: {
    flex: 1,
    paddingVertical: responsive.screenHeight * 0.015,
    fontSize: responsive.signUpFontSize * 0.9,
    fontFamily: "Fredoka-Regular",
    color: "#000",
  },
  iconStyle: { marginRight: responsive.screenWidth * 0.02 },
  input: {
    backgroundColor: "#D9D9D9",
    borderRadius: 13,
    paddingVertical: responsive.screenHeight * 0.015,
    paddingHorizontal: responsive.screenWidth * 0.04,
    fontSize: responsive.signUpFontSize * 0.9,
    fontFamily: "Fredoka-Regular",
    borderWidth: 2,
    borderColor: "#000",
  },
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
  errorText: {
    fontSize: responsive.signUpFontSize * 0.8,
    fontFamily: "Fredoka-Regular",
    color: "red",
    marginBottom: responsive.screenHeight * 0.01,
  },
});
