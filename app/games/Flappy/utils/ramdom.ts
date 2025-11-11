import { Dimensions } from "react-native";

/** ---------- Window Dimensions ---------- **/
const windowHeight = Dimensions.get("window").height;
const windowWidth = Dimensions.get("window").width;

/** ---------- Utility: Random Integer ---------- **/
export const getRandom = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/** ---------- Types ---------- **/
interface Pipe {
  pos: { x: number; y: number };
  size: { height: number; width: number };
}

interface PipePair {
  pipeTop: Pipe;
  pipeBottom: Pipe;
}

/** ---------- Utility: Generate Pipe Positions ---------- **/
export const getPipeSizePosPair = (addToPosX: number = 0): PipePair => {
  const yPosTop = -getRandom(220, windowHeight - 900);

  const pipeTop: Pipe = {
    pos: { x: windowWidth + addToPosX, y: yPosTop },
    size: { height: 450, width: 55 },
  };

  const pipeBottom: Pipe = {
    pos: { x: windowWidth + addToPosX, y: windowHeight - 100 + yPosTop },
    size: { height: 450, width: 55 },
  };

  return { pipeTop, pipeBottom };
};
