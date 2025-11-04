import React, { useState, useEffect } from "react";
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
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import { responsive } from "@/utils/responsive";
import { useSignIn } from "@clerk/clerk-expo";
import { formatSignIn, signInSchema } from "@/utils/formatter";
import { useAuthStore } from "@/lib/store/authStore";
import { z } from "zod";

export default function AuthIndex() {
  const router = useRouter();
  const { width: logoWidth, height: logoHeight } = responsive.logoSize();
  const { signIn, setActive, isLoaded } = useSignIn();

  const setRole = useAuthStore((role) => role.setRole);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Real-time validation
  useEffect(() => {
    try {
      signInSchema.shape.email.parse(email);
      setEmailError("");
    } catch (err) {
      if (err instanceof z.ZodError && email.length > 0) {
        setEmailError(err.errors[0]?.message || "Invalid email format");
      } else {
        setEmailError("");
      }
    }
  }, [email]);

  useEffect(() => {
    try {
      signInSchema.shape.password.parse(password);
      setPasswordError("");
    } catch (err) {
      if (err instanceof z.ZodError && password.length > 0) {
        setPasswordError(err.errors[0]?.message || "Invalid password format");
      } else {
        setPasswordError("");
      }
    }
  }, [password]);

  // Secure login handling
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

        // Set rolre After Authentication
        setRole(role);

        router.replace(
          role === "parent" ? "./(protected)/(parent)" : "./(protected)/(child)"
        );
      } else {
        Alert.alert(
          "Sign-in Incomplete",
          "Please complete the additional verification steps."
        );
      }
    } catch (err) {
      console.error("Login failed:", err);
      // Vague error message for security
      Alert.alert("Login Failed", "Invalid email or password. Please try again.");
    }
  };

  const handleForgotPassword = () => router.push("./(auth)/reset-password");
  const handleGoogleLogin = () => console.log("Google login pressed");
  const handleAppleLogin = () => console.log("Apple login pressed");
  const handleFacebookLogin = () => console.log("Facebook login pressed");
  const handleSignUp = () => router.push("./(auth)/sign-up");

  const handleTermsOfService = () => {
    Linking.openURL("https://en.wikipedia.org/wiki/Inigo_Montoya").catch(
      (err) => console.error("Failed to open Terms of Service URL:", err)
    );
  };

  const handleTermsOfConduct = () => {
    Linking.openURL("https://en.wikipedia.org/wiki/Oscar_Nunez").catch((err) =>
      console.error("Failed to open Terms of Conduct URL:", err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("@/assets/images/app-background.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 2 }}
      >
        <ScrollView
          contentContainerStyle={styles.main}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={require("@/assets/images/app-logo.png")}
              style={{
                width: logoWidth,
                height: logoHeight,
                marginBottom: -68,
                marginTop: -68,
              }}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.loginText,
                { fontSize: Math.min(25, responsive.signUpFontSize) },
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
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            <InputBox
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              iconLeft="lock-closed-outline"
              iconRight={showPassword ? "eye-off" : "eye"}
              onIconRightPress={() => setShowPassword(!showPassword)}
            />
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <TouchableOpacity onPress={handleForgotPassword}>
              <Text
                style={[
                  styles.forgotPasswordText,
                  { fontSize: Math.min(14, responsive.footerFontSize) },
                ]}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            <Text
              style={[
                styles.separator,
                { fontSize: Math.min(16, responsive.buttonFontSize) },
              ]}
            >
              Log in as
            </Text>

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
              <Text
                style={[
                  styles.orText,
                  { fontSize: Math.min(16, responsive.buttonFontSize) },
                ]}
              >
                Or Use
              </Text>
              <View style={styles.line} />
            </View>

            <View style={styles.iconRow}>
              <TouchableOpacity onPress={handleGoogleLogin}>
                <Image
                  source={require("@/assets/icons/google-icon.png")}
                  style={{
                    width: responsive.socialIconSize,
                    height: responsive.socialIconSize,
                    resizeMode: "contain",
                  }}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleAppleLogin}>
                <Image
                  source={require("@/assets/icons/apple-icon.png")}
                  style={{
                    width: responsive.socialIconSize,
                    height: responsive.socialIconSize,
                    resizeMode: "contain",
                  }}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleFacebookLogin}>
                <Image
                  source={require("@/assets/icons/facebook-icon.png")}
                  style={{
                    width: responsive.socialIconSize,
                    height: responsive.socialIconSize,
                    resizeMode: "contain",
                  }}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.signUpPrompt}
              onPress={handleSignUp}
            >
              <Text
                style={[
                  styles.signUpText,
                  { fontSize: responsive.signUpFontSize },
                ]}
              >
                Don’t have an account?{" "}
                <Text style={styles.signUpLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  main: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoWrapper: { alignItems: "center" },
  loginText: { fontFamily: "Fredoka-Bold", color: "#000" },
  formContainer: { justifyContent: "center" },
  forgotPasswordText: {
    alignSelf: "flex-end",
    fontFamily: "Fredoka-SemiBold",
    textDecorationLine: "underline",
    color: "#ffff",
    marginVertical: 8,
  },
  errorText: {
    color: "red",
    fontSize: responsive.footerFontSize * 0.8,
    fontFamily: "Fredoka-SemiBold",
    marginBottom: 4,
    marginLeft: 8,
  },
  separator: {
    textAlign: "center",
    color: "#000",
    fontFamily: "Fredoka-Bold",
    marginVertical: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
    alignItems: "center",
  },
  separatorView: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  line: {
    flex: 1,
    borderBottomColor: "black",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orText: {
    marginHorizontal: 8,
    fontFamily: "Fredoka-SemiBold",
    color: "#000",
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 12,
  },
  signUpPrompt: { alignItems: "center", marginTop: 15 },
  signUpText: { color: "#000", fontFamily: "Fredoka-SemiBold" },
  signUpLink: {
    color: "#ffff",
    textDecorationLine: "underline",
    fontFamily: "Fredoka-Bold",
  },
  footer: { alignItems: "center", justifyContent: "flex-end", marginTop: 8 },
  footerText: {
    color: "#000",
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  linkText: {
    fontFamily: "Fredoka-SemiBold",
    color: "#ffff",
    textDecorationLine: "underline",
  },
  footer2Text: {
    color: "#000",
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  link2Text: {
    fontFamily: "Fredoka-SemiBold",
    color: "#ffff",
    textDecorationLine: "underline",
  },
});
