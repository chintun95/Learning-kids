import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import * as WebBrowser from "expo-web-browser";
import { useSignIn } from "@clerk/clerk-expo";
import { responsive } from "@/utils/responsive";
import {
  formatPasswordReset,
  passwordResetObjectSchema,
} from "@/utils/formatter";
import { z } from "zod";

export default function ResetPassword() {
  const router = useRouter();
  const { width: logoWidth, height: logoHeight } = responsive.logoSize();
  const { signIn, setActive } = useSignIn();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ----------------------------
  // Real-time validation
  // ----------------------------
  useEffect(() => {
    try {
      passwordResetObjectSchema.shape.email.parse(email);
      setErrors((prev) => ({ ...prev, email: "" }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, email: err.errors[0]?.message || "" }));
      }
    }
  }, [email]);

  useEffect(() => {
    if (!requestSent) return;
    try {
      passwordResetObjectSchema.shape.code.parse(code);
      setErrors((prev) => ({ ...prev, code: "" }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, code: err.errors[0]?.message || "" }));
      }
    }
  }, [code, requestSent]);

  useEffect(() => {
    if (!requestSent) return;
    try {
      passwordResetObjectSchema.shape.password.parse(password);
      setErrors((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          password: err.errors[0]?.message || "",
        }));
      }
    }
  }, [password, requestSent]);

  useEffect(() => {
    if (!requestSent) return;
    if (confirmPassword.length > 0 && confirmPassword !== password) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords must match",
      }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  }, [confirmPassword, password, requestSent]);

  // ----------------------------
  // Request reset email
  // ----------------------------
  const handleRequestReset = async () => {
    setErrors({});
    try {
      formatPasswordReset({
        email,
        code: "",
        password: "AValidPassw0rd!",
        confirmPassword: "AValidPassw0rd!",
      });

      setLoading(true);
      await signIn!.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setRequestSent(true);
    } catch (err: any) {
      setErrors({
        email: err.errors?.[0]?.message || err.message || "Invalid email",
      });
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // Confirm reset
  // ----------------------------
  const handleReset = async () => {
    setErrors({});
    try {
      formatPasswordReset({ email, code, password, confirmPassword });

      setLoading(true);
      const result = await signIn!.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      await setActive!({ session: result.createdSessionId });
      alert("Password reset successfully");
      router.replace("/(auth)");
    } catch (err: any) {
      setErrors({ general: err.errors?.[0]?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTermsOfService = () =>
    WebBrowser.openBrowserAsync("https://www.youtube.com/@markiplier");
  const handleTermsOfConduct = () =>
    WebBrowser.openBrowserAsync("https://www.youtube.com/@caseoh_");

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={styles.innerContainer}>
              {/* Logo & header */}
              <View style={styles.logoWrapper}>
                <Image
                  source={require("@/assets/images/app-logo.png")}
                  style={{
                    width: logoWidth,
                    height: logoHeight,
                    marginBottom: responsive.screenHeight * 0.005,
                  }}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.headerText,
                    { fontSize: responsive.signUpFontSize },
                  ]}
                >
                  Reset Your Password
                </Text>
                {!requestSent && (
                  <Text
                    style={[
                      styles.subText,
                      { fontSize: responsive.footerFontSize },
                    ]}
                  >
                    Enter your email to receive password reset instructions
                  </Text>
                )}
              </View>

              {/* Form */}
              <View
                style={[styles.formWrapper, !requestSent && styles.centerForm]}
              >
                {!requestSent ? (
                  <>
                    <InputBox
                      label="Email"
                      placeholder="Enter your email"
                      value={email}
                      iconLeft="mail-outline"
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {errors.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}
                    <Button
                      title="Send Reset Email"
                      onPress={handleRequestReset}
                      backgroundColor="#000"
                      textColor="#fff"
                      fontSize={responsive.buttonFontSize}
                      paddingVertical={responsive.buttonHeight * 0.3}
                      loading={loading}
                    />
                  </>
                ) : (
                  <>
                    <InputBox
                      label="Code"
                      placeholder="Enter code"
                      value={code}
                      iconLeft="key-outline"
                      onChangeText={setCode}
                    />
                    {errors.code && (
                      <Text style={styles.errorText}>{errors.code}</Text>
                    )}
                    <InputBox
                      label="New Password"
                      placeholder="Enter new password"
                      value={password}
                      secureTextEntry={!showPassword}
                      iconLeft="lock-closed-outline"
                      iconRight={showPassword ? "eye-off" : "eye"}
                      onIconRightPress={() => setShowPassword(!showPassword)}
                    />
                    {errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                    <InputBox
                      label="Confirm Password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      iconLeft="lock-closed-outline"
                      iconRight={showConfirmPassword ? "eye-off" : "eye"}
                      onIconRightPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    />
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>
                        {errors.confirmPassword}
                      </Text>
                    )}
                    {errors.general && (
                      <Text style={styles.errorText}>{errors.general}</Text>
                    )}
                    <Button
                      title="Set New Password"
                      onPress={handleReset}
                      backgroundColor="#000"
                      textColor="#fff"
                      fontSize={responsive.buttonFontSize}
                      paddingVertical={responsive.buttonHeight * 0.3}
                      loading={loading}
                    />
                  </>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text
                  style={[
                    styles.footerText,
                    { fontSize: responsive.footerFontSize },
                  ]}
                >
                  By continuing, you accept our{" "}
                  <Text style={styles.linkText} onPress={handleTermsOfService}>
                    Terms of Service
                  </Text>
                </Text>
                <Text
                  style={[
                    styles.footer2Text,
                    { fontSize: responsive.footerFontSize },
                  ]}
                >
                  and{" "}
                  <Text style={styles.link2Text} onPress={handleTermsOfConduct}>
                    Terms of Conduct
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1, justifyContent: "space-between" },
  innerContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: responsive.screenWidth * 0.05,
    paddingVertical: responsive.screenHeight * 0.02,
  },
  logoWrapper: { alignItems: "center", marginBottom: -20 },
  headerText: {
    fontFamily: "Fredoka-Bold",
    color: "#000",
    marginBottom: responsive.screenHeight * 0.003,
    textAlign: "center",
  },
  subText: {
    fontFamily: "Fredoka-Regular",
    color: "#000",
    textAlign: "center",
    marginBottom: -80,
  },
  formWrapper: {
    flexGrow: 1,
    justifyContent: "flex-start",
    gap: responsive.buttonHeight * 0.025,
  },
  centerForm: {
    justifyContent: "center",
  },
  errorText: {
    color: "red",
    fontSize: responsive.footerFontSize * 0.8,
    fontFamily: "Fredoka-SemiBold",
    marginBottom: 4,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: Platform.OS === "ios" ? 10 : responsive.screenHeight * 0.002,
  },
  footerText: {
    color: "#000",
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  linkText: {
    fontFamily: "Fredoka-SemiBold",
    color: "#fff",
    textDecorationLine: "underline",
  },
  footer2Text: {
    color: "#000",
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  link2Text: {
    fontFamily: "Fredoka-SemiBold",
    color: "#fff",
    textDecorationLine: "underline",
  },
});
