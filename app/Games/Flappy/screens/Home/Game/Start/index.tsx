import React from "react";
import {
  View,
  Image,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { styles } from "./styles";

import LOGO from "../../../../assets/images/logo.png";
import PLAY from "../../../../assets/images/play.png";

/** ---------- Props ---------- **/
interface StartProps {
  handleOnStartGame: () => void;
}

/** ---------- Component ---------- **/
const Start: React.FC<StartProps> = ({ handleOnStartGame }) => {
  const router = useRouter();

  const handleQuit = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image source={LOGO} style={styles.logo} />

      {/* Start Button */}
      <TouchableWithoutFeedback onPress={handleOnStartGame}>
        <Image source={PLAY} style={styles.playButton} />
      </TouchableWithoutFeedback>

      {/* ---------- RULES UNDER PLAY BUTTON ---------- */}
      <View
        style={{
          marginTop: 20,
          paddingHorizontal: 30,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "Fredoka-Bold",
            fontSize: 22,
            color: "#fff",
            marginBottom: 10,
          }}
        >
          How to Play
        </Text>

        <Text
          style={{
            fontFamily: "Fredoka-Regular",
            fontSize: 16,
            color: "#fff",
            textAlign: "center",
            marginBottom: 5,
          }}
        >
          • Tap to make the bird fly upward.
        </Text>

        <Text
          style={{
            fontFamily: "Fredoka-Regular",
            fontSize: 16,
            color: "#fff",
            textAlign: "center",
            marginBottom: 5,
          }}
        >
          • Avoid hitting the pipes or the ground.
        </Text>

        <Text
          style={{
            fontFamily: "Fredoka-Regular",
            fontSize: 16,
            color: "#fff",
            textAlign: "center",
            marginBottom: 5,
          }}
        >
          • Earn points by passing through pipes.
        </Text>

        <Text
          style={{
            fontFamily: "Fredoka-Regular",
            fontSize: 16,
            color: "#fff",
            textAlign: "center",
          }}
        >
          • Every 5 points, answer a question!
        </Text>

        <Text
          style={{
            fontFamily: "Fredoka-Regular",
            fontSize: 16,
            color: "#fff",
            textAlign: "center",
            marginTop: 5,
          }}
        >
          ✔ Correct → Continue playing ❌ Wrong → Game over
        </Text>
      </View>

      {/* Quit Text Button */}
      <TouchableOpacity onPress={handleQuit}>
        <Text
          style={{
            marginTop: 25,
            fontFamily: "Fredoka-SemiBold",
            fontSize: 20,
            color: "#fff",
            textDecorationLine: "underline",
          }}
        >
          Quit
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export { Start };
