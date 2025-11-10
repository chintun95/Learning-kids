import React, { useState } from "react";
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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSignUp } from "@clerk/clerk-expo";
import { z } from "zod";
import Button from "@/components/Button";
import InputBox from "@/components/InputBox";
import { useAuthStore } from "@/lib/store/authStore";
import { responsive } from "@/utils/responsive";
import { signUpSchema, sanitizeInput } from "@/utils/formatter";

type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Utility: unwrap inner object from ZodEffects (so we can use .shape)
 */
function unwrapSchema<T extends z.ZodTypeAny>(
  schema: T
): z.AnyZodObject | null {
  return schema._def?.schema && schema._def.schema instanceof z.ZodObject
    ? (schema._def.schema as z.AnyZodObject)
    : schema instanceof z.ZodObject
    ? schema
    : null;
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const setRole = useAuthStore((state) => state.setRole);

  const [form, setForm] = useState<SignUpInput>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    code: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof SignUpInput, string>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [successModal, showSuccessModal] = useState(false);

  // Unwrap the Zod object shape for field-level validation
  const innerSchema = unwrapSchema(signUpSchema);

  /**
   * Real-time validation per field
   */
  const handleChange = (field: keyof SignUpInput, value: string) => {
    const sanitized = sanitizeInput(value);
    setForm((prev) => ({ ...prev, [field]: sanitized }));

    try {
      const fieldSchema =
        innerSchema && field in innerSchema.shape
          ? innerSchema.shape[field as keyof typeof innerSchema.shape]
          : null;

      if (fieldSchema) {
        fieldSchema.parse(sanitized);
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }

      // Cross-check confirm password
      if (field === "confirmPassword" && sanitized !== form.password) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords must match",
        }));
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          [field]: err.errors[0]?.message || "Invalid input",
        }));
      }
    }
  };

  /**
   * Validate full form before submission
   */
  const validateForm = () => {
    const result = signUpSchema.safeParse(form);
    if (!result.success) {
      const newErrors: Partial<Record<keyof SignUpInput, string>> = {};
      result.error.errors.forEach((e) => {
        const path = e.path[0] as keyof SignUpInput;
        newErrors[path] = e.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSwitchToLogin = () => router.push("../");

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (!validateForm()) return;

    try {
      await signUp.create({
        firstName: form.firstName,
        lastName: form.lastName,
        emailAddress: form.email,
        password: form.password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerificationPending(true);
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Unknown error");
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code: form.code,
      });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        setRole("parent");
        showSuccessModal(true);
      } else {
        Alert.alert(
          "Verification Failed",
          "Please check your code and try again."
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Verification Error",
        err.errors?.[0]?.longMessage || "Error verifying code"
      );
    }
  };

  const { width, height } = responsive.logoSize();

  return (
    <ImageBackground
      source={require("@/assets/images/app-background.png")}
      resizeMode="cover"
      imageStyle={{ transform: [{ scale: 1.22 }] }} // slight zoom
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
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingBottom: insets.bottom + responsive.screenHeight * 0.05 },
            ]}
            showsVerticalScrollIndicator={false}
          >
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
                <View style={styles.halfInput}>
                  <InputBox
                    label="First Name"
                    placeholder="First Name"
                    value={form.firstName}
                    onChangeText={(v) => handleChange("firstName", v)}
                    error={errors.firstName}
                  />
                </View>
                <View style={styles.halfInput}>
                  <InputBox
                    label="Last Name"
                    placeholder="Last Name"
                    value={form.lastName}
                    onChangeText={(v) => handleChange("lastName", v)}
                    error={errors.lastName}
                  />
                </View>
              </View>

              <InputBox
                label="Email"
                placeholder="Enter your email"
                value={form.email}
                onChangeText={(v) => handleChange("email", v)}
                error={errors.email}
                iconLeft="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <InputBox
                label="Password"
                placeholder="Enter your password"
                value={form.password}
                onChangeText={(v) => handleChange("password", v)}
                error={errors.password}
                secureTextEntry={!showPassword}
                iconLeft="lock-closed-outline"
                iconRight={showPassword ? "eye-off" : "eye"}
                onIconRightPress={() => setShowPassword(!showPassword)}
              />

              <InputBox
                label="Confirm Password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChangeText={(v) => handleChange("confirmPassword", v)}
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
                marginTop={responsive.screenHeight * 0.015}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you accept our{" "}
                <Text style={styles.linkText}>Terms of Service</Text>
              </Text>
              <Text style={styles.footer2Text}>
                and <Text style={styles.link2Text}>Terms of Conduct</Text>
              </Text>
            </View>

            {/* Verification Modal */}
            <Modal
              visible={verificationPending}
              transparent
              animationType="slide"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Verify Your Email</Text>
                  <Text style={styles.modalText}>
                    We’ve sent a verification code to your email.
                  </Text>

                  <InputBox
                    placeholder="Enter verification code"
                    value={form.code}
                    onChangeText={(v) => handleChange("code", v)}
                    error={errors.code}
                    keyboardType="number-pad"
                  />

                  <Button
                    title="Verify"
                    onPress={onVerifyPress}
                    backgroundColor="#000"
                    textColor="#fff"
                  />
                </View>
              </View>
            </Modal>

            {/* Success Modal */}
            <Modal visible={successModal} transparent animationType="slide">
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
  container: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: responsive.screenWidth * 0.05,
  },
  logoWrapper: {
    alignItems: "center",
    marginTop: responsive.screenHeight * 0.02,
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
