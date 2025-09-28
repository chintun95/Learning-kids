import React from "react";
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
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useRouter } from "expo-router";
import Button from "@/components/Button";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const footerFontSize = Math.min(wp("3.5%"), 24);

export default function SignUpScreen() {
  const router = useRouter();

  // Responsive logo
  const logoWidth =
    SCREEN_WIDTH < 350 ? SCREEN_WIDTH * 0.6 : SCREEN_WIDTH * 0.8;
  const logoHeight =
    SCREEN_HEIGHT < 600 ? SCREEN_HEIGHT * 0.15 : SCREEN_HEIGHT * 0.35;

  // Handlers
  const handleSwitchToLogin = () => {
    console.log("Switch to login pressed");
    router.push("../");
  };

  const handleSignUp = () => {
    console.log("Sign Up pressed");
    // TODO: Add sign-up logic here
    router.push("./(protected)/(parent)");
  };

  const handleTermsOfService = () => {
    console.log("Terms of Service pressed");
    // TODO: Navigate or open link
  };

  const handleTermsOfConduct = () => {
    console.log("Terms of Conduct pressed");
    // TODO: Navigate or open link
  };

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
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <StatusBar style="dark" translucent backgroundColor="transparent" />

            {/* Logo */}
            <View style={styles.logoWrapper}>
              <Image
                source={require("@/assets/images/app-logo.png")}
                style={{
                  width: logoWidth,
                  height: logoHeight,
                  marginBottom: hp("-10%"),
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

              {/* Name Row */}
              <View style={styles.nameRow}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    placeholder="First Name"
                    placeholderTextColor="#999"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    placeholder="Last Name"
                    placeholderTextColor="#999"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  style={styles.input}
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.phoneRow}>
                  <TextInput
                    placeholder="+1"
                    placeholderTextColor="#999"
                    style={[styles.input, styles.countryCodeInput]}
                  />
                  <TextInput
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    style={[styles.input, styles.phoneNumberInput]}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  placeholder="Confirm your password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              {/* Sign Up Button */}
              <Button
                title="Sign Up"
                onPress={handleSignUp}
                backgroundColor="#000"
                textColor="#fff"
                fontSize={wp("4.2%")}
                paddingVertical={hp("1.7%")}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { fontSize: footerFontSize }]}>
                By continuing, you accept our{" "}
                <Text style={styles.linkText} onPress={handleTermsOfService}>
                  Terms of Service
                </Text>
              </Text>
              <Text style={[styles.footer2Text, { fontSize: footerFontSize }]}>
                and{" "}
                <Text style={styles.link2Text} onPress={handleTermsOfConduct}>
                  Terms of Conduct
                </Text>
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: hp("5%"),
    paddingHorizontal: wp("5%"),
  },

  logoWrapper: {
    alignItems: "center",
    marginTop: hp("-2%"),
  },
  switchText: {
    fontSize: wp("4%"),
    fontFamily: "Fredoka-SemiBold",
    textDecorationLine: "underline",
    color: "#ffffffff",
    textAlign: "center",
    marginTop: hp("1%"),
  },
  formContainer: {
    marginTop: hp("2%"),
  },
  formHeader: {
    fontSize: wp("4.2%"),
    fontFamily: "Fredoka-SemiBold",
    color: "#000",
    marginBottom: hp("1%"),
  },

  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp("4%"),
  },
  halfInput: { flex: 1 },

  inputGroup: {
    marginBottom: hp("2%"),
  },
  inputLabel: {
    fontSize: wp("4%"),
    fontFamily: "Fredoka-SemiBold",
    color: "#000",
    marginBottom: hp("0.5%"),
  },
  input: {
    backgroundColor: "#D9D9D9",
    borderRadius: 13,
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("4%"),
    fontSize: wp("4%"),
    fontFamily: "Fredoka-Regular",
    borderWidth: 2,
    borderColor: "#000",
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("3%"),
  },
  countryCodeInput: {
    width: wp("20%"),
    textAlign: "center",
  },
  phoneNumberInput: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: hp("3.5%"),
  },
  footerText: {
    color: "#000",
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  linkText: {
    fontFamily: "Fredoka-SemiBold",
    color: "#ffffffff",
    textDecorationLine: "underline",
  },
  footer2Text: {
    color: "#000",
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  link2Text: {
    fontFamily: "Fredoka-SemiBold",
    color: "#ffffffff",
    textDecorationLine: "underline",
  },
});
