//for snake, randomFooPosition.ts
import { Coordinate } from "../types/types";

export const randomFoodPosition = (xMax: number, yMax: number, padding: number = 6): Coordinate => {
  // Add padding to keep food away from edges (especially important since food is now 1.5x size)
  return {
    x: Math.floor(Math.random() * (xMax - padding * 2)) + padding,
    y: Math.floor(Math.random() * (yMax - padding * 2)) + padding,
  };
};
