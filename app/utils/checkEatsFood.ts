//for snake, checkEatsFood.ts
import { Coordinate } from "../types/types";

export const checkEatsFood = (head: Coordinate, food: Coordinate): boolean => {
  // Exact tile matching to prevent false positives with snake body
  return head.x === food.x && head.y === food.y;
};
