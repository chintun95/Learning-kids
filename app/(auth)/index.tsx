// app/(auth)/index.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSSO, useSignIn } from "@clerk/clerk-expo";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { formatSignIn, signInSchema } from "@/utils/formatter";
import { useAuthStore } from "@/lib/store/authStore";
import { useChildAuthStore } from "@/lib/store/childAuthStore";
import { z } from "zod";

// --- Warm up browser for Android SSO
const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => void WebBrowser.coolDownAsync();
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function AuthIndex() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: logoWidth, height: logoHeight } = responsive.logoSize();

  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();

  const setRole = useAuthStore((r) => r.setRole);
  const hydrateChildren = useChildAuthStore((s) => s.hydrate);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [loadingSSO, setLoadingSSO] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useWarmUpBrowser();

  // --- Validation ---
  useEffect(() => {
    try {
      signInSchema.shape.email.parse(email);
      setEmailError("");
    } catch (err) {
      if (err instanceof z.ZodError && email.length > 0)
        setEmailError(err.errors[0]?.message || "Invalid email format");
      else setEmailError("");
    }
  }, [email]);

  useEffect(() => {
    try {
      signInSchema.shape.password.parse(password);
      setPasswordError("");
    } catch (err) {
      if (err instanceof z.ZodError && password.length > 0)
        setPasswordError(err.errors[0]?.message || "Invalid password format");
      else setPasswordError("");
    }
  }, [password]);

  // --- Email/Password Login ---
  const handleLogin = async (role: "parent" | "child") => {
    if (!isLoaded) return;
    try {
      const parsed = formatSignIn({ email, password });
      const signInAttempt = await signIn.create({
        identifier: parsed.email,
        password: parsed.password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        setRole(role);

        if (role === "parent") {
          router.replace("./(protected)/(parent)");
          return;
        }

        if (role === "child") {
          setLoadingChildren(true);
          try {
            await hydrateChildren(parsed.email);
            router.replace("./(protected)/(child)");
          } catch {
            Alert.alert(
              "Error",
              "Failed to load child profiles. Please try again."
            );
          } finally {
            setLoadingChildren(false);
          }
        }
      } else {
        Alert.alert(
          "Sign-in Incomplete",
          "Please complete verification steps."
        );
      }
    } catch {
      Alert.alert(
        "Login Failed",
        "Invalid email or password. Please try again."
      );
    }
  };

  // --- SSO Login Handler ---
  const handleSSOLogin = useCallback(
    async (strategy: "oauth_google" | "oauth_apple" | "oauth_facebook") => {
      setLoadingSSO(true);
      try {
        const result = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        // User cancels
        if (!result || (result as any)?.type === "dismiss") {
          Alert.alert("Cancelled", "Sign-in cancelled.");
          setLoadingSSO(false);
          return;
        }

        const { createdSessionId, setActive } = result;

        if (!createdSessionId) {
          router.push("./(auth)/ssoContinue");
          return;
        }

        // Activate Clerk session
        await setActive!({ session: createdSessionId });

        // Show role selection modal instead of auto-redirect
        setShowRoleModal(true);
      } catch (err: any) {
        console.error("SSO Error:", err);
        if (
          err?.message?.includes("dismiss") ||
          err?.error === "user_cancelled"
        ) {
          Alert.alert("Cancelled", "SSO sign-in was cancelled.");
        } else {
          Alert.alert("Error", "Failed to sign in with selected provider.");
        }
      } finally {
        setLoadingSSO(false);
      }
    },
    [startSSOFlow]
  );

  // --- Role selection after SSO ---
  const handleSelectRole = async (role: "parent" | "child") => {
    setRole(role);
    setShowRoleModal(false);

    if (role === "parent") {
      router.replace("./(protected)/(parent)");
    } else {
      router.replace("./(protected)/(child)");
    }
  };

  const handleTermsOfService = async () =>
    await WebBrowser.openBrowserAsync(
      "https://en.wikipedia.org/wiki/Inigo_Montoya"
    );

  const handleTermsOfConduct = async () =>
    await WebBrowser.openBrowserAsync(
      "https://en.wikipedia.org/wiki/Oscar_Nunez"
    );

  const handleForgotPassword = () => router.push("./(auth)/reset-password");
  const handleSignUp = () => router.push("./(auth)/sign-up");

  const showGlobalLoader = loadingSSO || loadingChildren;

  if (showGlobalLoader) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>
          {loadingSSO ? "Signing in with SSO..." : "Loading child profiles..."}
        </Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("@/assets/images/app-background.png")}
      resizeMode="cover"
      imageStyle={{ transform: [{ scale: 1.22 }] }}
      style={[
        styles.background,
        {
          paddingTop: Math.max(insets.top, 6),
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {/* --- Role Selection Modal --- */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Continue as</Text>
            <View style={styles.modalButtonRow}>
              <Button
                title="Parent"
                onPress={() => handleSelectRole("parent")}
                backgroundColor="#000"
                textColor="#fff"
                fontSize={responsive.buttonFontSize}
                marginRight={responsive.buttonGap / 2}
              />
              <Button
                title="Child"
                onPress={() => handleSelectRole("child")}
                backgroundColor="#000"
                textColor="#fff"
                fontSize={responsive.buttonFontSize}
              />
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 45 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={styles.main}>
              {/* Logo */}
              <View style={styles.logoWrapper}>
                <Image
                  source={require("@/assets/images/app-logo.png")}
                  style={{
                    width: logoWidth * 0.9,
                    height: logoHeight * 0.9,
                    marginTop: responsive.screenHeight * -0.015,
                    marginBottom: responsive.screenHeight * -0.035,
                  }}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.loginText,
                    { fontSize: Math.min(24, responsive.signUpFontSize) },
                  ]}
                >
                  Log In with Email
                </Text>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                <InputBox
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  iconLeft="mail-outline"
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={emailError}
                />

                <InputBox
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  iconLeft="lock-closed-outline"
                  iconRight={showPassword ? "eye-off" : "eye"}
                  onIconRightPress={() => setShowPassword(!showPassword)}
                  error={passwordError}
                />

                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <Text style={styles.separator}>Log in as</Text>

                <View style={styles.buttonRow}>
                  <Button
                    title="Parent"
                    onPress={() => handleLogin("parent")}
                    backgroundColor="#000"
                    textColor="#fff"
                    fontSize={responsive.buttonFontSize}
                    marginRight={responsive.buttonGap / 2}
                  />
                  <Button
                    title="Child"
                    onPress={() => handleLogin("child")}
                    backgroundColor="#000"
                    textColor="#fff"
                    fontSize={responsive.buttonFontSize}
                  />
                </View>

                <View style={styles.separatorView}>
                  <View style={styles.line} />
                  <Text style={styles.orText}>Or Use</Text>
                  <View style={styles.line} />
                </View>

                {/* --- SSO Buttons --- */}
                <View style={styles.iconRow}>
                  <TouchableOpacity
                    onPress={() => handleSSOLogin("oauth_google")}
                    disabled={loadingSSO}
                  >
                    <Image
                      source={require("@/assets/icons/google-icon.png")}
                      style={styles.socialIcon}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSSOLogin("oauth_apple")}
                    disabled={loadingSSO}
                  >
                    <Image
                      source={require("@/assets/icons/apple-icon.png")}
                      style={styles.socialIcon}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSSOLogin("oauth_facebook")}
                    disabled={loadingSSO}
                  >
                    <Image
                      source={require("@/assets/icons/facebook-icon.png")}
                      style={styles.socialIcon}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.signUpPrompt}
                  onPress={handleSignUp}
                >
                  <Text style={styles.signUpText}>
                    Don’t have an account?{" "}
                    <Text style={styles.signUpLink}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footerContainer}>
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    By continuing, you accept our{" "}
                    <Text
                      style={styles.linkText}
                      onPress={handleTermsOfService}
                    >
                      Terms of Service
                    </Text>
                  </Text>
                  <Text style={styles.footer2Text}>
                    and{" "}
                    <Text
                      style={styles.link2Text}
                      onPress={handleTermsOfConduct}
                    >
                      Terms of Conduct
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontFamily: "Fredoka-SemiBold",
    fontSize: responsive.buttonFontSize,
  },
  main: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: responsive.screenWidth * 0.05,
    paddingBottom: responsive.screenHeight * 0.012,
  },
  logoWrapper: { alignItems: "center" },
  loginText: {
    fontFamily: "Fredoka-Bold",
    color: "#000",
  },
  formContainer: {
    justifyContent: "center",
    marginTop: responsive.screenHeight * 0.036,
  },
  forgotPasswordText: {
    alignSelf: "flex-end",
    fontFamily: "Fredoka-SemiBold",
    textDecorationLine: "underline",
    color: "#000",
    marginVertical: 5,
  },
  separator: {
    textAlign: "center",
    color: "#000",
    fontFamily: "Fredoka-Bold",
    marginVertical: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    alignItems: "center",
  },
  separatorView: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  line: {
    flex: 1,
    borderBottomColor: "black",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orText: {
    marginHorizontal: 5,
    fontFamily: "Fredoka-SemiBold",
    color: "#000",
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 6,
  },
  socialIcon: {
    width: responsive.socialIconSize * 0.75,
    height: responsive.socialIconSize * 0.75,
    resizeMode: "contain",
  },
  signUpPrompt: { alignItems: "center", marginTop: 22 },
  signUpText: { color: "#000", fontFamily: "Fredoka-SemiBold" },
  signUpLink: {
    color: "#fff",
    textDecorationLine: "underline",
    fontFamily: "Fredoka-Bold",
  },
  footerContainer: {
    marginTop: "auto",
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
    paddingBottom: responsive.screenHeight * 0.008,
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

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: responsive.screenWidth * 0.08,
    alignItems: "center",
    elevation: 8,
    width: "80%",
  },
  modalTitle: {
    fontFamily: "Fredoka-Bold",
    fontSize: responsive.signUpFontSize,
    color: "#000",
    marginBottom: responsive.screenHeight * 0.025,
    textAlign: "center",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
