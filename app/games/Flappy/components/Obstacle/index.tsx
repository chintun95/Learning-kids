import React from "react";
import { Image } from "react-native";
import Matter, {
  Body,
  World,
  Bodies,
  IChamferableBodyDefinition,
} from "matter-js";
import { styles } from "./styles";

import PIPE_GREEN from "../../assets/images/pipe-green.png";
import PIPE_GREEN_INVERTED from "../../assets/images/pipe-green-inverted.png";
import PIPE_ORANGE from "../../assets/images/pipe-orange.png";
import PIPE_ORANGE_INVERTED from "../../assets/images/pipe-orange-inverted.png";

/** ---------- Props for Obstacle Renderer ---------- **/
interface ObstacleProps {
  body: Body;
  color: "green" | "orange";
  isTop?: boolean;
}

/** ---------- Obstacle Renderer ---------- **/
const Obstacle: React.FC<ObstacleProps> = ({ body, color, isTop = false }) => {
  const widthBody = body.bounds.max.x - body.bounds.min.x;
  const heightBody = body.bounds.max.y - body.bounds.min.y;

  const xBody = body.position.x - widthBody / 2;
  const yBody = body.position.y - heightBody / 2;

  const imageSource =
    color === "green"
      ? isTop
        ? PIPE_GREEN_INVERTED
        : PIPE_GREEN
      : isTop
      ? PIPE_ORANGE_INVERTED
      : PIPE_ORANGE;

  return (
    <Image
      source={imageSource}
      style={
        styles({
          widthBody,
          heightBody,
          xBody,
          yBody,
          color,
        }).obstacle
      }
    />
  );
};

/** ---------- Entity Factory Function ---------- **/
interface ObstacleEntity {
  body: Body;
  color: "green" | "orange";
  pos: { x: number; y: number };
  isTop: boolean;
  renderer: React.FC<ObstacleProps>;
}

export default function createObstacle(
  world: World,
  label: string,
  color: "green" | "orange",
  pos: { x: number; y: number },
  size: { width: number; height: number },
  isTop: boolean = false
): ObstacleEntity {
  const initialObstacle = Bodies.rectangle(
    pos.x,
    pos.y,
    size.width,
    size.height,
    {
      label,
      isStatic: true,
    } as IChamferableBodyDefinition
  );

  World.add(world, [initialObstacle]);

  return {
    body: initialObstacle,
    color,
    pos,
    isTop,
    renderer: (props) => <Obstacle {...props} />,
  };
}
