import { Dimensions } from "react-native";
import Matter, { Body, Engine, Events, IEventCollision } from "matter-js";
import { getPipeSizePosPair } from "./ramdom";

/** ---------- Window Dimensions ---------- **/
const windowHeight = Dimensions.get("window").height;
const windowWidth = Dimensions.get("window").width;

/** ---------- Entity Type Definitions ---------- **/
interface GameEntity {
  body: Body;
  [key: string]: any;
}

interface GameEntities {
  [key: string]: GameEntity | { engine: Engine };
  physics: { engine: Engine };
  Bird: { body: Body };
  ObstacleTop1: GameEntity;
  ObstacleTop2: GameEntity;
  ObstacleBottom1: GameEntity;
  ObstacleBottom2: GameEntity;
}

/** ---------- System Props ---------- **/
interface GameLoopParams {
  touches: { type: string }[];
  time: { delta: number };
  dispatch: (event: { type: string }) => void;
}

/** ---------- Physics System ---------- **/
export const Physics = (
  entities: GameEntities,
  { touches, time, dispatch }: GameLoopParams
): GameEntities => {
  const engine = entities.physics.engine;
  const bird = entities.Bird.body;

  // --- Bird Jump on Touch ---
  touches
    .filter((t) => t.type === "press")
    .forEach(() => {
      Body.setVelocity(bird, { x: 0, y: -4 });
    });

  // --- Move and Recycle Pipes ---
  for (let index = 1; index <= 2; index++) {
    const topKey = `ObstacleTop${index}` as keyof GameEntities;
    const bottomKey = `ObstacleBottom${index}` as keyof GameEntities;

    const top = entities[topKey] as GameEntity;
    const bottom = entities[bottomKey] as GameEntity;

    // ✅ Initialize scored flag if missing
    if (top.scored === undefined) top.scored = false;

    // When pipe goes off screen, recycle it
    if (top.body.bounds.max.x <= 0) {
      const pipeSizePos = getPipeSizePosPair(windowWidth * 0.9);

      Body.setPosition(top.body, pipeSizePos.pipeTop.pos);
      Body.setPosition(bottom.body, pipeSizePos.pipeBottom.pos);

      // Reset scored flag for recycled pipe
      top.scored = false;
    }

    // Move both pipes left
    Body.translate(top.body, { x: -3, y: 0 });
    Body.translate(bottom.body, { x: -3, y: 0 });

    // ✅ Check if the bird passed this pipe
    if (
      !top.scored && // not yet scored
      top.body.position.x + top.body.bounds.max.x - top.body.bounds.min.x / 2 <
        bird.position.x
    ) {
      top.scored = true;
      dispatch({ type: "score" }); // 🔥 tell GameEngine to increment score
    }
  }

  // --- Update Physics Engine ---
  Engine.update(engine, time.delta);

  // --- Collision Detection ---
  Events.on(engine, "collisionStart", (_event: IEventCollision<Engine>) => {
    dispatch({ type: "game_over" });
  });

  return entities;
};
