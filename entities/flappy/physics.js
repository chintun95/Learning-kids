/* systems/Physics.js — movement, scoring, collisions */
import { getPipeSizePosPair } from '@/utils/random';
import Matter from 'matter-js';
import { Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const TERMINAL_FALL = 12;      // clamp fall speed
const FLAP_VY = -6.2;          // upward vel on tap
const SPEED_STEP_EVERY = 5;    // increase speed every N points
const SPEED_STEP = 0.25;       // increment amount

function movePair(pair, dx) {
  Matter.Body.translate(pair.top.body, { x: dx, y: 0 });
  Matter.Body.translate(pair.bottom.body, { x: dx, y: 0 });
  Matter.Body.translate(pair.gate.body, { x: dx, y: 0 });
}

function recyclePair(world, pair, offsetX) {
  const next = getPipeSizePosPair(offsetX);
  // reposition pipes
  Matter.Body.setPosition(pair.top.body, next.pipeTop.pos);
  Matter.Body.setPosition(pair.bottom.body, next.pipeBottom.pos);
  // reposition sensor centered between the pair
  const gateX = next.pipeTop.pos.x + next.pipeTop.size.width / 2;
  Matter.Body.setPosition(pair.gate.body, { x: gateX, y: H / 2 });
  Matter.Body.setVertices(pair.top.body, Matter.Vertices.fromPath(
    `0 0 ${next.pipeTop.size.width} 0 ${next.pipeTop.size.width} ${next.pipeTop.size.height} 0 ${next.pipeTop.size.height}`
  ));
  Matter.Body.setVertices(pair.bottom.body, Matter.Vertices.fromPath(
    `0 0 ${next.pipeBottom.size.width} 0 ${next.pipeBottom.size.width} ${next.pipeBottom.size.height} 0 ${next.pipeBottom.size.height}`
  ));
  // IMPORTANT: clear awarded flag so the new pass can score again
  pair.awarded = false;
}

const Physics = (entities, { touches, time, dispatch }) => {
  const { engine, world } = entities.physics;
  const meta = entities.meta;

  // input: flap
  touches.filter(t => t.type === 'press').forEach(() => {
    const b = entities.Bird.body;
    Matter.Body.setVelocity(b, { x: b.velocity.x, y: FLAP_VY });
    entities.Bird.flap?.();              // trigger squash/trail (from juiced Bird)
  });

  // clamp terminal fall (feels nicer)
  if (entities.Bird?.body) {
    const b = entities.Bird.body;
    if (b.velocity.y > TERMINAL_FALL) {
      Matter.Body.setVelocity(b, { x: b.velocity.x, y: TERMINAL_FALL });
    }
    // mirror velocity to renderer for tilt
    entities.Bird.velY = b.velocity.y;
  }

  Matter.Engine.update(engine, time.delta);

  // speed can scale with score/difficulty
  const speed = -(meta.speed || 3);

  // iterate both pipe groups
  ['Pipes1', 'Pipes2'].forEach((key) => {
    const pair = entities[key];
    if (!pair) return;

    // move left
    movePair(pair, speed);

    // award score when Bird overlaps sensor ONCE
    const gate = pair.gate.body;
    const birdBody = entities.Bird.body;

    if (!pair.awarded && Matter.Bounds.overlaps(birdBody.bounds, gate.bounds)) {
      // narrow-phase check using SAT if you want: Matter.SAT.collides(birdBody, gate).collided
      // But bounds overlap is fine for a tall thin sensor.
      pair.awarded = true;
      meta.score += 1;
      dispatch({ type: 'new_point' });

      // difficulty step-up
      if (meta.score % SPEED_STEP_EVERY === 0) {
        meta.speed = (meta.speed || 3) + SPEED_STEP;
        meta.difficulty += 1;
      }
    }

    // recycle when offscreen
    const rightmost =
      pair.top.body.bounds.max.x < 0 &&
      pair.bottom.body.bounds.max.x < 0 &&
      pair.gate.body.position.x < 0;

    if (rightmost) {
      recyclePair(world, pair, W * 0.9);
    }
  });

  // register collision handler ONCE (no per-frame leak)
  if (!engine._hasCollisionHandler) {
    engine._hasCollisionHandler = true;
    Matter.Events.on(engine, 'collisionStart', (evt) => {
      const pairs = evt.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const a = pairs[i].bodyA;
        const b = pairs[i].bodyB;
        // ignore the score sensors (isSensor true)
        if (a.isSensor || b.isSensor) continue;
        // any other contact is game over
        dispatch({ type: 'game_over' });
        break;
      }
    });
  }

  return entities;
};

export default Physics;
