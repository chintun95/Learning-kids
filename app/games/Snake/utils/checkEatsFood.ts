<<<<<<< HEAD:app/utils/checkEatsFood.ts
//for snake, checkEatsFood.ts
import { Coordinate } from "../types/types";

export const checkEatsFood = (head: Coordinate, food: Coordinate): boolean => {
  return head.x === food.x && head.y === food.y;
=======
import { Coordinate } from "../types/types";

export const checkEatsFood = (
  head: Coordinate,
  food: Coordinate,
  area: number
): boolean => {
  const distanceBetweenFoodAndSnakeX: number = Math.abs(head.x - food.x);
  const distanceBetweenFoodAndSnakeY: number = Math.abs(head.y - food.y);
  return (
    distanceBetweenFoodAndSnakeX < area && distanceBetweenFoodAndSnakeY < area
  );
>>>>>>> project-reset:app/games/Snake/utils/checkEatsFood.ts
};
