import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Text,
  Image,
  Dimensions,
  Linking,
} from "react-native";
import { useVideoPlayer, VideoView, VideoSource } from "expo-video";
import PillButton from "../components/Button";
import { useRouter } from "expo-router";
import { useAuthStore } from "../lib/store/authStore"; // <-- import store

const assetId = require("../assets/video/app-welcome-page.mp4");
const logo = require("../assets/images/app-logo.png");

const videoSource: VideoSource = { assetId };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();

  const player = useVideoPlayer(videoSource, (player) => {
    player.muted = true;
    player.loop = true;
    player.play();
  });

  // Access Zustand auth store
  const { isOnboarded, setIsOnboarded } = useAuthStore();

  // Open Terms of Service link (replace with your actual URL)
  const onTermsPress = () => {
    Linking.openURL("https://en.wikipedia.org/wiki/Inigo_Montoya");
  };

  // Navigate to auth index screen
  const onBeginPress = () => {
    console.log("Let's Begin button pressed");
    setIsOnboarded(true);
    console.log("Updated auth state:", { isOnboarded: true });
    router.push("./(auth)");
  };

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

        <PillButton
          title="Let's Begin !"
          onPress={onBeginPress}
          outlined={true}
          borderColor="black"
          borderWidth={3}
          backgroundColor="#93DEFF"
          textColor="black"
          fontSize={25}
          paddingVertical={SCREEN_HEIGHT * 0.016}
          paddingHorizontal={SCREEN_WIDTH * 0.12}
          marginTop={SCREEN_HEIGHT * 0.05}
        />

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you accept our{" "}
            <Text style={styles.termsLink} onPress={onTermsPress}>
              Terms of Service
            </Text>
            .
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
      Platform.OS === "android" ? SCREEN_HEIGHT * 0.2 : SCREEN_HEIGHT * 0.1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  welcomeText: {
    fontSize: SCREEN_WIDTH * 0.15,
    fontFamily: "Fredoka-Bold",
    color: "black",
    marginBottom: SCREEN_HEIGHT * 0.015,
  },

  logo: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.35,
    marginBottom: SCREEN_HEIGHT * 0.004,
  },

  tagline: {
    fontSize: SCREEN_WIDTH * 0.065,
    fontFamily: "Fredoka-SemiBold",
    color: "black",
    fontWeight: "400",
    textAlign: "center",
    marginTop: SCREEN_HEIGHT * 0.01,
    marginBottom: SCREEN_HEIGHT * 0.05,
  },

  termsContainer: {
    position: "absolute",
    bottom:
      Platform.OS === "android" ? SCREEN_HEIGHT * 0.09 : SCREEN_HEIGHT * 0.03,
    alignSelf: "center",
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },

  termsText: {
    color: "black",
    fontSize: SCREEN_WIDTH * 0.035,
    textAlign: "center",
  },

  termsLink: {
    color: "white",
    textDecorationLine: "underline",
  },
});
