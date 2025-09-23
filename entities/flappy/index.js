/* entities/flappy/index.js — world setup */
import Matter from 'matter-js';
import Bird from './Bird';              // use the juiced Bird we made earlier
import Floor from './Floor';
import { makePipePair } from './Pipes';
import { getPipeSizePosPair } from '@/utils/random';
import { Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

export default function flappy_restart() {
  const engine = Matter.Engine.create({ enableSleeping: false });
  const world = engine.world;
  engine.gravity.y = 0.4;

  // initial pipes
  const pairA = getPipeSizePosPair();
  const pairB = getPipeSizePosPair(W * 0.9);

  // add a score sensor centered between each pair
  const mkSensor = (x) => ({
    pos: { x, y: H / 2 },
    size: { width: 8, height: H },
  });

  const Pipes1 = makePipePair(
    world,
    'Pipes1',
    'teal',
    pairA.pipeTop,
    pairA.pipeBottom,
    mkSensor(pairA.pipeTop.pos.x + pairA.pipeTop.size.width / 2)
  );
  const Pipes2 = makePipePair(
    world,
    'Pipes2',
    'teal',
    pairB.pipeTop,
    pairB.pipeBottom,
    mkSensor(pairB.pipeTop.pos.x + pairB.pipeTop.size.width / 2)
  );

 return {
  physics: { engine, world },
  meta: {
    speed: 3,
    score: 0,
    difficulty: 1,
  },

  Bird: Bird(world, 'blue', { x: 50, y: 400 }, { height: 40, width: 40 }),
  Floor: Floor(world, '#7fbf7f', { x: W / 2, y: H }, { height: 175, width: W }),

  // Keep the pair objects for Physics logic…
  Pipes1,
  Pipes2,

  // …but ALSO expose the actual renderers at top level so RNGE draws them:
  Pipes1Top: Pipes1.top,
  Pipes1Bottom: Pipes1.bottom,
  Pipes2Top: Pipes2.top,
  Pipes2Bottom: Pipes2.bottom,
};
}
