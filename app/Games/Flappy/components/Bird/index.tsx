import React from "react";
import { Image } from "react-native";
import Matter, {
  Body,
  World,
  IChamferableBodyDefinition,
  Bodies,
} from "matter-js";

import { styles } from "./styles";
import BIRD from "../../assets/images/bird.png";

/** ---------- Props for Bird Renderer ---------- **/
interface BirdProps {
  body: Body;
  color: string;
}

/** ---------- Bird Renderer ---------- **/
const Bird: React.FC<BirdProps> = ({ body, color }) => {
  const widthBody = body.bounds.max.x - body.bounds.min.x;
  const heightBody = body.bounds.max.y - body.bounds.min.y;
  const xBody = body.position.x - widthBody / 2;
  const yBody = body.position.y - heightBody / 2;

  return (
    <Image
      source={BIRD}
      style={
        styles({
          widthBody,
          heightBody,
          xBody,
          yBody,
          color,
        }).bird
      }
    />
  );
};

/** ---------- Entity Factory Function ---------- **/
interface BirdEntity {
  body: Body;
  color: string;
  pos: { x: number; y: number };
  renderer: React.FC<BirdProps>;
}

export default function createBird(
  world: World,
  color: string,
  pos: { x: number; y: number },
  size: { width: number; height: number }
): BirdEntity {
  const initialBird = Bodies.rectangle(pos.x, pos.y, size.width, size.height, {
    label: "Bird",
  } as IChamferableBodyDefinition);

  World.add(world, [initialBird]);

  return {
    body: initialBird,
    color,
    pos,
    renderer: (props) => <Bird {...props} />,
  };
}
