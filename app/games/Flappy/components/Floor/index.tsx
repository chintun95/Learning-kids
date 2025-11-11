import React from "react";
import { View } from "react-native";
import Matter, {
  Body,
  World,
  Bodies,
  IChamferableBodyDefinition,
} from "matter-js";
import { styles } from "./styles";

/** ---------- Props for Floor Renderer ---------- **/
interface FloorProps {
  body: Body;
  color: string;
}

/** ---------- Floor Renderer ---------- **/
const Floor: React.FC<FloorProps> = ({ body, color }) => {
  const widthBody = body.bounds.max.x - body.bounds.min.x;
  const heightBody = body.bounds.max.y - body.bounds.min.y;

  const xBody = body.position.x - widthBody / 2;
  const yBody = body.position.y - heightBody / 2;

  return (
    <View
      style={
        styles({
          widthBody,
          heightBody,
          xBody,
          yBody,
          color,
        }).floor
      }
    />
  );
};

/** ---------- Entity Factory Function ---------- **/
interface FloorEntity {
  body: Body;
  color: string;
  pos: { x: number; y: number };
  renderer: React.FC<FloorProps>;
}

export default function createFloor(
  world: World,
  color: string,
  pos: { x: number; y: number },
  size: { width: number; height: number }
): FloorEntity {
  const initialFloor = Bodies.rectangle(pos.x, pos.y, size.width, size.height, {
    label: "Floor",
    isStatic: true,
  } as IChamferableBodyDefinition);

  World.add(world, [initialFloor]);

  return {
    body: initialFloor,
    color,
    pos,
    renderer: (props) => <Floor {...props} />,
  };
}
