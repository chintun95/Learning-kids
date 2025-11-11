import { Coordinate } from "../types/types";

/**
 * Ensures the food spawns strictly within the visible play area
 * and never on the outer borders of the game field.
 */
export function randomFoodPosition(xMax: number, yMax: number): Coordinate {
  const min = 1; // one step inside from the border
  const maxX = xMax - 2; // leave space on the right border
  const maxY = yMax - 2; // leave space on the bottom border

  const x = Math.floor(Math.random() * (maxX - min + 1)) + min;
  const y = Math.floor(Math.random() * (maxY - min + 1)) + min;

  return { x, y };
}
