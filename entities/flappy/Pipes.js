/* entities/flappy/Pipes.js — paired pipes + score sensor */
import Matter from 'matter-js';
import React from 'react';
import { View } from 'react-native';

const PipeBlock = ({ body, color }) => {
  const w = body.bounds.max.x - body.bounds.min.x;
  const h = body.bounds.max.y - body.bounds.min.y;
  const x = body.position.x - w / 2;
  const y = body.position.y - h / 2;

  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor: '#69c66d',   // easier to see than sky blue
        borderWidth: 2,
        borderColor: '#2a7d31',
        borderRadius: 6,
        zIndex: 3,                    // make sure they render above backgrounds
      }}
    />
  );
};

export const makePipePair = (world, labelPrefix, color, top, bottom, sensor) => {
  const pipeTop = Matter.Bodies.rectangle(top.pos.x, top.pos.y, top.size.width, top.size.height, {
    label: `${labelPrefix}_Top`, isStatic: true,
  });
  const pipeBottom = Matter.Bodies.rectangle(bottom.pos.x, bottom.pos.y, bottom.size.width, bottom.size.height, {
    label: `${labelPrefix}_Bottom`, isStatic: true,
  });
  const scoreGate = Matter.Bodies.rectangle(sensor.pos.x, sensor.pos.y, sensor.size.width, sensor.size.height, {
    label: `${labelPrefix}_ScoreGate`, isStatic: true, isSensor: true,
  });

  Matter.World.add(world, [pipeTop, pipeBottom, scoreGate]);

  // Group entity data so Physics can move/recycle together
  return {
    labelPrefix,
    top: { body: pipeTop, renderer: <PipeBlock body={pipeTop} color={color} /> },
    bottom: { body: pipeBottom, renderer: <PipeBlock body={pipeBottom} color={color} /> },
    gate: { body: scoreGate }, // invisible
    // book-keeping flags
    awarded: false,
  };
};
