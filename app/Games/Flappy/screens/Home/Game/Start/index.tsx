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
    // Go back to the previous screen
    router.back();
  };

  return (
    <View style={styles.container}>
      <Image source={LOGO} style={styles.logo} />

      {/* Start Button */}
      <TouchableWithoutFeedback onPress={handleOnStartGame}>
        <Image source={PLAY} style={styles.playButton} />
      </TouchableWithoutFeedback>

      {/* Quit Text Button */}
      <TouchableOpacity onPress={handleQuit}>
        <Text
          style={{
            marginTop: 20,
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
