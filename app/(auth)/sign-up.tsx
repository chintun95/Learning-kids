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
import {
  signUpSchema,
  verificationCodeSchema,
  sanitizeInput,
} from "@/utils/formatter";

type SignUpInput = z.infer<typeof signUpSchema>;
type VerificationInput = z.infer<typeof verificationCodeSchema>;

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
  });
  const [code, setCode] = useState<string>("");

  const [errors, setErrors] = useState<
    Partial<Record<keyof SignUpInput | "code", string>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [successModal, showSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const innerSchema = unwrapSchema(signUpSchema);

  // --- Field-level validation ---
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

  // --- Form validation ---
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

  // --- Sign Up ---
  const onSignUpPress = async () => {
    if (!isLoaded) {
      console.log("❌ Clerk not loaded yet.");
      return;
    }

    console.log("🟢 [SignUp] Button pressed — beginning sign-up process.");

    if (!validateForm()) {
      console.log("⚠️ [SignUp] Form validation failed.");
      return;
    }

    try {
      setLoading(true);
      console.log("⏳ [SignUp] Creating account with Clerk...");

      const created = await signUp.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        emailAddress: form.email.trim().toLowerCase(),
        password: form.password,
      });

      console.log("✅ [SignUp] Clerk account created:", created?.id);

      console.log("📧 [SignUp] Requesting email verification code...");
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      console.log("📨 [SignUp] Verification code sent!");

      // Show modal
      setTimeout(() => {
        setVerificationPending(true);
        console.log("🟣 [UI] Showing verification modal.");
      }, 300);
    } catch (err: any) {
      console.error("❌ [SignUp] Clerk sign-up error:", err);
      Alert.alert(
        "Sign Up Error",
        err?.errors?.[0]?.longMessage ||
          err?.message ||
          "Unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Verification ---
  const onVerifyPress = async () => {
    if (!isLoaded) {
      console.log("❌ Clerk not loaded during verification.");
      return;
    }

    console.log("🟡 [Verify] Button pressed — verifying code...");

    const result = verificationCodeSchema.safeParse({ code });
    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        code: result.error.errors[0]?.message || "Code required",
      }));
      Alert.alert(
        "Error",
        "Please enter the verification code sent to your email."
      );
      return;
    }

    try {
      setLoading(true);
      console.log("⏳ [Verify] Attempting email verification...");

      const attempt = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (attempt.status === "complete") {
        console.log("✅ [Verify] Email verified successfully!");
        await setActive({ session: attempt.createdSessionId });
        setRole("parent");
        showSuccessModal(true);
        console.log("🎉 [SignUp] Sign-up and verification complete.");
      } else {
        console.warn("⚠️ [Verify] Verification incomplete:", attempt.status);
        Alert.alert(
          "Verification Failed",
          "Please check your code and try again."
        );
      }
    } catch (err: any) {
      console.error("❌ [Verify] Error verifying code:", err);
      Alert.alert(
        "Verification Error",
        err?.errors?.[0]?.longMessage ||
          err?.message ||
          "Invalid verification code."
      );
    } finally {
      setLoading(false);
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
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
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

            {/* --- Sign-Up Form --- */}
            {!verificationPending && (
              <View style={styles.formContainer}>
                <Text style={styles.formHeader}>
                  Parent or Guardian's Information
                </Text>

                {/* First & Last Name */}
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

                <View style={{ marginTop: responsive.screenHeight * 0.015 }}>
                  <Button
                    title={loading ? "Creating Account..." : "Sign Up"}
                    onPress={() => {
                      console.log(
                        "🟢 [Button] Press detected — calling onSignUpPress()"
                      );
                      onSignUpPress();
                    }}
                    backgroundColor="#000"
                    textColor="#fff"
                    fontSize={responsive.buttonFontSize}
                    disabled={false}
                    loading={loading}
                  />
                </View>
              </View>
            )}

            {/* --- Verification Modal --- */}
            {verificationPending && (
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Verify Your Email</Text>
                  <Text style={styles.modalText}>
                    A verification code has been sent to your email.
                  </Text>

                  <InputBox
                    placeholder="Enter verification code"
                    value={code}
                    onChangeText={(v) => setCode(v)}
                    error={errors.code}
                    keyboardType="number-pad"
                  />

                  <Button
                    title={loading ? "Verifying..." : "Verify"}
                    onPress={() => {
                      console.log("🟡 [Button] Verify button pressed.");
                      onVerifyPress();
                    }}
                    backgroundColor="#000"
                    textColor="#fff"
                    disabled={false}
                    loading={loading}
                  />
                </View>
              </View>
            )}

            {/* --- Success Modal --- */}
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
                      console.log(
                        "🏁 [Flow] Redirecting to parent dashboard..."
                      );
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
