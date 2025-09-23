/* entities/flappy/Floor.js — improved visuals, same physics */
import Matter from 'matter-js';
import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const Floor = (props) => {
  const { body, color } = props;
  const w = body.bounds.max.x - body.bounds.min.x;
  const h = body.bounds.max.y - body.bounds.min.y;
  const x = body.position.x - w / 2;
  const y = body.position.y - h / 2;

  return (
    <View style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
      {/* dirt gradient */}
      <LinearGradient
        colors={[color || '#6fbf73', '#4caf50', '#2e7d32']}
        locations={[0, 0.25, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      {/* top grass lip */}
      <View style={{
        position: 'absolute',
        top: -8,
        left: 0,
        right: 0,
        height: 12,
        backgroundColor: '#7ED957',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderWidth: 2,
        borderColor: '#175e1f'
      }}/>
    </View>
  );
};

export default (world, color, pos, size) => {
  const body = Matter.Bodies.rectangle(pos.x, pos.y, size.width, size.height, {
    label: 'Floor',
    isStatic: true,
    restitution: 0,
  });
  Matter.World.add(world, body);

  return {
    body,
    color,
    pos,
    renderer: <Floor body={body} color={color} />,
  };
};
