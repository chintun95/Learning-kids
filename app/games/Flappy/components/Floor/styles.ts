import { StyleSheet, ViewStyle } from "react-native";

/** ---------- Type Definitions ---------- **/
interface StyleParams {
  xBody: number;
  yBody: number;
  widthBody: number;
  heightBody: number;
  color: string;
}

interface FloorStyles {
  floor: ViewStyle;
}

/** ---------- Styles Factory ---------- **/
export const styles = ({
  xBody,
  yBody,
  widthBody,
  heightBody,
  color,
}: StyleParams) =>
  StyleSheet.create<FloorStyles>({
    floor: {
      position: "absolute",
      left: xBody,
      top: yBody,
      width: widthBody,
      height: heightBody,
      backgroundColor: color,
    },
  });
