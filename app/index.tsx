import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Text,
  Image,
} from "react-native";
import { useVideoPlayer, VideoView, VideoSource } from "expo-video";
import Button from "../components/Button";
import { useRouter } from "expo-router";
import { responsive } from "../utils/responsive";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "@/lib/store/authStore";

const assetId = require("../assets/video/app-welcome-page.mp4");
const logo = require("../assets/images/app-logo.png");
const videoSource: VideoSource = { assetId };

export default function Index() {
  const router = useRouter();
  const onBoardedStatus = useAuthStore((state) => state.onBoardedStatus);
  const setOnBoardedStatus = useAuthStore((state) => state.setOnBoardedStatus);

  const player = useVideoPlayer(videoSource);

  useEffect(() => {
    player.muted = true;
    player.loop = true;
    player.play();
  }, [player]);

  const onTermsPress = async () => {
    await WebBrowser.openBrowserAsync(
      "https://en.wikipedia.org/wiki/Inigo_Montoya"
    );
  };

  const onBeginPress = () => {
    if (onBoardedStatus === "pending") {
      setOnBoardedStatus("completed");
    }
  };

  useEffect(() => {
    if (onBoardedStatus === "completed") {
      router.push("/(auth)");
    }
  }, [onBoardedStatus, router]);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={styles.overlay}>
        <Text style={styles.welcomeText}>Welcome to</Text>
        <Image source={logo} style={styles.logo} resizeMode="cover" />
        <Text style={styles.tagline}>
          where we make learning safety information fun
        </Text>

        <Button
          title="Let's Begin !"
          onPress={onBeginPress}
          outlined
          borderColor="black"
          borderWidth={3}
          backgroundColor="#93DEFF"
          textColor="black"
          fontSize={25}
          paddingVertical={responsive.screenHeight * 0.016}
          paddingHorizontal={responsive.screenWidth * 0.12}
          marginTop={responsive.screenHeight * 0.05}
        />

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you accept our{" "}
            <Text style={styles.termsLink} onPress={onTermsPress}>
              Terms of Service
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    paddingTop:
      Platform.OS === "android"
        ? responsive.screenHeight * 0.2
        : responsive.screenHeight * 0.1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: responsive.screenWidth * 0.05,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  welcomeText: {
    fontSize: responsive.screenWidth * 0.15,
    fontFamily: "Fredoka-Bold",
    color: "black",
    marginBottom: responsive.screenHeight * 0.015,
  },
  logo: {
    width: responsive.screenWidth * 0.9,
    height: responsive.screenWidth * 0.35,
    marginBottom: responsive.screenHeight * 0.004,
  },
  tagline: {
    fontSize: responsive.screenWidth * 0.065,
    fontFamily: "Fredoka-SemiBold",
    color: "black",
    textAlign: "center",
    marginTop: responsive.screenHeight * 0.01,
    marginBottom: responsive.screenHeight * 0.05,
  },
  termsContainer: {
    position: "absolute",
    bottom:
      Platform.OS === "android"
        ? responsive.screenHeight * 0.09
        : responsive.screenHeight * 0.03,
    alignSelf: "center",
    paddingHorizontal: responsive.screenWidth * 0.05,
  },
  termsText: {
    color: "black",
    fontSize: responsive.screenWidth * 0.035,
    textAlign: "center",
  },
  termsLink: {
    color: "white",
    textDecorationLine: "underline",
  },
});
