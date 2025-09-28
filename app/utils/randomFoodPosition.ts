//for snake, randomFooPosition.ts
import { Coordinate } from "../types/types";

export const randomFoodPosition = (xMax: number, yMax: number): Coordinate => {
  return {
    x: Math.floor(Math.random() * xMax),
    y: Math.floor(Math.random() * yMax),
  };
};
