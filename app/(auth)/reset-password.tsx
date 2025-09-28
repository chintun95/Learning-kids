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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import InputBox from "@/components/InputBox";
import Button from "@/components/Button";
import * as WebBrowser from "expo-web-browser";
import { responsive } from "@/utils/responsive";

export default function ResetPassword() {
  const router = useRouter();
  const { width: logoWidth, height: logoHeight } = responsive.logoSize();

  const [email, setEmail] = useState("");

  const handleResetPassword = () => {
    console.log("Reset password for:", email);
    // TODO: Add reset password logic
  };

  const handleTermsOfService = () => {
    WebBrowser.openBrowserAsync("https://yourapp.com/terms-of-service");
  };

  const handleTermsOfConduct = () => {
    WebBrowser.openBrowserAsync("https://yourapp.com/terms-of-conduct");
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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={require("@/assets/images/app-logo.png")}
              style={{
                width: logoWidth,
                height: logoHeight,
                marginBottom: -50,
              }}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.headerText,
                { fontSize: Math.min(24, responsive.signUpFontSize) },
              ]}
            >
              Reset Your Password
            </Text>
            <Text
              style={[
                styles.subText,
                { fontSize: Math.min(14, responsive.footerFontSize) },
              ]}
            >
              Enter your email to receive password reset instructions
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

            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              backgroundColor="#000"
              textColor="#fff"
              fontSize={responsive.buttonFontSize}
              paddingVertical={12}
            />
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoWrapper: { alignItems: "center" },
  headerText: {
    fontFamily: "Fredoka-Bold",
    color: "#000",
    marginVertical: 12,
    textAlign: "center",
  },
  subText: {
    fontFamily: "Fredoka-Regular",
    color: "#000",
    textAlign: "center",
    marginBottom: 16,
  },
  formContainer: {
    justifyContent: "center",
    marginTop: 16,
  },
  footer: {
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 16,
    marginBottom: 8,
  },
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
