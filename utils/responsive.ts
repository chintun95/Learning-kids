import { Dimensions } from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export const responsive = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Logo scaling
  logoSize: () => {
    if (SCREEN_WIDTH < 350 || SCREEN_HEIGHT < 600) {
      return { width: SCREEN_WIDTH * 0.6, height: SCREEN_HEIGHT * 0.15 };
    } else if (SCREEN_WIDTH < 500 || SCREEN_HEIGHT < 900) {
      return { width: SCREEN_WIDTH * 0.8, height: SCREEN_HEIGHT * 0.35 };
    } else {
      return { width: SCREEN_WIDTH * 0.8, height: SCREEN_HEIGHT * 0.2 };
    }
  },

  // Button scaling
  buttonHeight: SCREEN_WIDTH < 350 ? hp("6%") : hp("7%"),
  buttonFontSize: SCREEN_WIDTH < 350 ? wp("4%") : wp("4.5%"),
  buttonGap: SCREEN_WIDTH < 350 ? wp("6%") : wp("18%"),

  // Social icons
  socialIconSize: Math.min(wp("22%"), 60),

  // Sign up / footer
  signUpFontSize: Math.min(wp("4.5%"), 40),
  footerFontSize: Math.min(wp("3.5%"), 24),

  isNarrowScreen: SCREEN_WIDTH < 350,
};
