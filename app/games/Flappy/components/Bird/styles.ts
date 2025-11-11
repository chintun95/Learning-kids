import { StyleSheet, ImageStyle } from "react-native";

/** ---------- Type Definitions ---------- **/
interface StyleParams {
  xBody: number;
  yBody: number;
  widthBody: number;
  heightBody: number;
  color: string;
}

interface BirdStyles {
  bird: ImageStyle;
}

/** ---------- Styles Factory ---------- **/
export const styles = ({ xBody, yBody, widthBody, heightBody }: StyleParams) =>
  StyleSheet.create<BirdStyles>({
    bird: {
      position: "absolute",
      left: xBody,
      top: yBody,
      width: widthBody,
      height: heightBody,
      resizeMode: "contain",
    },
  });
