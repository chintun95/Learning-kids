import { StyleSheet, ImageStyle } from "react-native";

/** ---------- Type Definitions ---------- **/
interface StyleParams {
  xBody: number;
  yBody: number;
  widthBody: number;
  heightBody: number;
  color: string;
}

interface ObstacleStyles {
  obstacle: ImageStyle;
}

/** ---------- Styles Factory ---------- **/
export const styles = ({ xBody, yBody, widthBody, heightBody }: StyleParams) =>
  StyleSheet.create<ObstacleStyles>({
    obstacle: {
      position: "absolute",
      left: xBody,
      top: yBody,
      width: widthBody,
      height: heightBody,
      resizeMode: "cover",
    },
  });
