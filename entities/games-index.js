// entities/games-index.js

import flappyEntities from './flappy';
import fruitEntities from './fruit';
import snakeEntities from './snake';

/**
 * Returns game-specific entities based on game name.
 * @param {'flappy' | 'fruit' | 'snake'} game
 */
export default function getGameEntities(game) {
  switch (game) {
    case 'flappy':
      return flappyEntities();

    case 'fruit':
      return fruitEntities();

    case 'snake':
      return snakeEntities();

    default:
      throw new Error(`Unknown game: ${game}`);
  }
}
