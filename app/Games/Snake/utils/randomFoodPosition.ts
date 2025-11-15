import { Coordinate } from "../types/types";

/**
 * Returns true if two tiles are touching / adjacent
 */
function isAdjacent(a: Coordinate, b: Coordinate): boolean {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
}

/**
 * Ensure food does NOT spawn:
 *  - on the snake
 *  - on the previous food
 *  - adjacent to previous food
 */
export function generateSafeFoodPosition(
  xMax: number,
  yMax: number,
  prevFood: Coordinate,
  snake: Coordinate[]
): Coordinate {
  let pos: Coordinate;

  do {
    const x = Math.floor(Math.random() * (xMax - 3)) + 2;
    const y = Math.floor(Math.random() * (yMax - 3)) + 2;
    pos = { x, y };
  } while (
    isAdjacent(pos, prevFood) || // prevent ❓ next to 🟡
    snake.some((s) => s.x === pos.x && s.y === pos.y) // avoid snake body
  );

  return pos;
}
