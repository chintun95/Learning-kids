/* This file defines the bird that is used in the Flappy game */

import Matter from 'matter-js';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

// If you have a sprite, swap it here. Otherwise the colored circle renders.
const BIRD_IMG = null; // e.g., require('@/assets/images/bird.png')

/** -------- Bird Renderer (Animated) -------- */
const Bird = (props) => {
  const { body, color, radius: propRadius, onReady, velY = 0, reducedMotion = false } = props;

  // sizes/position from your original code
  const radius = propRadius || body.circleRadius || 20;
  const widthBody  = radius * 2;
  const heightBody = radius * 2;
  const xBody = body.position.x - radius;
  const yBody = body.position.y - radius;

  // --- animation state ---
  const flapScale = useRef(new Animated.Value(1)).current;    // squash on flap
  const tilt      = useRef(new Animated.Value(0)).current;    // -1..1 => rotation
  const shimmer   = useRef(new Animated.Value(0)).current;    // gentle idle scale

  // tiny particle pool (cheap trail)
  const pool = useRef(
    new Array(8).fill(0).map(() => ({
      a: new Animated.Value(0),
      dx: new Animated.Value(0),
      dy: new Animated.Value(0),
      s: new Animated.Value(1),
    }))
  ).current;
  const nextIdx = useRef(0);

  // expose a flap() method to Physics via the entity
  useEffect(() => {
    const api = {
      flap: () => {
        if (!reducedMotion) {
          flapScale.stopAnimation();
          Animated.sequence([
            Animated.timing(flapScale, { toValue: 0.86, duration: 60, useNativeDriver: true }),
            Animated.spring(flapScale, { toValue: 1, useNativeDriver: true }),
          ]).start();
        }
        spawnPuff(-6, 2);
      },
    };
    onReady?.(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReady, reducedMotion]);

  // map velY -> tilt (-600..+600) => (-1..+1)
  useEffect(() => {
    const clamped = Math.max(-600, Math.min(600, velY || 0));
    Animated.timing(tilt, { toValue: clamped / 600, duration: 80, useNativeDriver: true }).start();
  }, [velY]);

  // idle micro-shimmer
  useEffect(() => {
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion]);

  // spawn a tiny particle behind the bird
  const spawnPuff = (dx = -6, dy = 0) => {
    if (reducedMotion) return;
    const i = nextIdx.current;
    nextIdx.current = (i + 1) % pool.length;
    const p = pool[i];
    p.dx.setValue(0); p.dy.setValue(0); p.s.setValue(1); p.a.setValue(0.75);
    Animated.parallel([
      Animated.timing(p.dx, { toValue: dx, duration: 380, useNativeDriver: true }),
      Animated.timing(p.dy, { toValue: dy, duration: 380, useNativeDriver: true }),
      Animated.timing(p.s,  { toValue: 0.6, duration: 380, useNativeDriver: true }),
      Animated.timing(p.a,  { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  };

  // small “dust” when diving fast
  useEffect(() => {
    if (!reducedMotion && velY > 280) spawnPuff(-4, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [velY]);

  // transforms
  const rot = tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-15deg', '20deg'] });
  const shimX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const shimY = shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  const containerStyle = useMemo(
    () => [styles.wrap, { left: xBody, top: yBody, width: widthBody, height: heightBody }],
    [xBody, yBody, widthBody, heightBody]
  );

  return (
    <View pointerEvents="none" style={containerStyle}>
      {/* particle trail */}
      {!reducedMotion &&
        pool.map((p, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.puff,
              {
                backgroundColor: color || '#ffd84d',
                opacity: p.a,
                transform: [
                  { translateX: Animated.add(p.dx, new Animated.Value(widthBody * -0.35)) },
                  { translateY: Animated.add(p.dy, new Animated.Value(heightBody * 0.2)) },
                  { scale: p.s },
                ],
              },
            ]}
          />
        ))}

      {/* bird */}
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: BIRD_IMG ? 'transparent' : color || '#ffd84d',
          borderWidth: BIRD_IMG ? 0 : 2,
          borderColor: '#000',
          transform: [
            { rotate: rot },
            { scaleX: Animated.multiply(shimX, flapScale.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] })) },
            { scaleY: Animated.multiply(shimY, flapScale) },
          ],
        }}
      >
        {BIRD_IMG && <Image source={BIRD_IMG} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  puff: { position: 'absolute', width: 6, height: 6, borderRadius: 3, opacity: 0 },
});

/** -------- Entity Factory (unchanged API, plus velY + onReady) -------- */
export default (world, color, pos, size) => {
  const radius = Math.min(size.width, size.height) / 2;
  const body = Matter.Bodies.circle(pos.x, pos.y, radius, {
    label: 'Bird',
    restitution: 0.2,
    friction: 0.01,
    frictionAir: 0.01,
  });

  Matter.World.add(world, body);

  // We keep a reference to the entity so the renderer can hand back its API (flap)
  const entity = {
    body,
    color,
    pos,
    radius,
    velY: 0,              // Physics should keep this updated each tick
    reducedMotion: false, // toggle if you like
    api: null,            // will be set by renderer via onReady()
    flap() { this.api?.flap?.(); }, // Physics can call entities.Bird.flap()
    renderer: (
      <Bird
        body={body}
        color={color}
        radius={radius}
        velY={0}
        reducedMotion={false}
        onReady={(api) => { entity.api = api; }}
      />
    ),
  };

  return entity;
};
