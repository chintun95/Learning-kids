// app/Games/FruitNinjaGame.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  Animated,
  PanResponder,
  Pressable,
  Easing,
} from "react-native";

const { width, height } = Dimensions.get("window");

const FRUIT_EMOJIS = ["🍎", "🍌", "🍉", "🍓", "🍊", "🍒"];
const FRUIT_SIZE = 64;
const HALF = FRUIT_SIZE / 2;
const HITBOX = FRUIT_SIZE * 0.9;

const ROUND_SECONDS = 30;
const BASE_SPAWN_MS = 1000;
const MIN_SPAWN_MS = 650;
const EDGE_PADDING = 24;
const OFFSCREEN_Y = height + 160;
const MAX_FRUITS_ON_SCREEN = 7;

const START_Y_MIN = height * 0.62;
const START_Y_MAX = height * 0.82;
const PEAK_Y_MIN = height * 0.18;
const PEAK_Y_MAX = height * 0.32;

type LaunchPattern = "bottomUp" | "leftToRight" | "rightToLeft" | "diagUpRight" | "diagUpLeft";
type Vec2 = { x: number; y: number };

interface Fruit {
  id: number;
  x: Animated.Value;  // top-left (render)
  y: Animated.Value;
  currentX: number;   // center (hit-test)
  currentY: number;
  progress: Animated.Value;
  scale: Animated.Value;
  fade: Animated.Value;
  p0: Vec2; p1: Vec2; p2: Vec2;
  driftAmp: number;
  driftFreq: number;
  emoji: string;
  sliced: boolean;
}

interface EffectBurst { id: number; x: number; y: number; }

export default function FruitNinjaGame() {
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [effects, setEffects] = useState<EffectBurst[]>([]);
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [isRunning, setIsRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [debug, setDebug] = useState(false); // debug toggle

  const nextFruitId = useRef(0);
  const nextEffectId = useRef(0);

  const fruitsRef = useRef<Fruit[]>([]);
  const slicingIds = useRef<Set<number>>(new Set());
  const rafSlice = useRef<number | null>(null);
  const spawnTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeLeftRef = useRef(timeLeft);
  const isRunningRef = useRef(isRunning);
  const gameOverRef = useRef(gameOver);

  useEffect(() => { fruitsRef.current = fruits; }, [fruits]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  useEffect(() => () => {
    if (rafSlice.current) cancelAnimationFrame(rafSlice.current);
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
  }, []);

  // slice (why: prevent double-slice + remove cleanly)
  const sliceFruit = useCallback((fruit: Fruit) => {
    if (slicingIds.current.has(fruit.id) || fruit.sliced) return;
    slicingIds.current.add(fruit.id);

    setScore((s) => s + 1);
    spawnEffect(fruit.currentX, fruit.currentY);
    setFruits((prev) => prev.map((f) => (f.id === fruit.id ? { ...f, sliced: true } : f)));

    Animated.parallel([
      Animated.sequence([
        Animated.timing(fruit.scale, { toValue: 1.25, duration: 110, useNativeDriver: false }),
        Animated.timing(fruit.scale, { toValue: 0.1, duration: 200, useNativeDriver: false }),
      ]),
      Animated.timing(fruit.fade, { toValue: 0, duration: 230, useNativeDriver: false }),
    ]).start(() => {
      setFruits((curr) => curr.filter((f) => f.id !== fruit.id));
      slicingIds.current.delete(fruit.id);
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, g) => {
        if (!isRunning || gameOver) return;
        const { moveX, moveY } = g;
        if (rafSlice.current != null) return;
        rafSlice.current = requestAnimationFrame(() => {
          rafSlice.current = null;
          const candidates = fruitsRef.current;
          for (let i = 0; i < candidates.length; i++) {
            const f = candidates[i];
            if (
              !f.sliced &&
              !slicingIds.current.has(f.id) &&
              Math.abs(f.currentX - moveX) < HITBOX &&
              Math.abs(f.currentY - moveY) < HITBOX
            ) { sliceFruit(f); }
          }
        });
      },
    })
  ).current;

  // timer
  useEffect(() => {
    if (!isRunning || gameOver) return;
    setTimeLeft(ROUND_SECONDS);
    const t = setInterval(() => {
      setTimeLeft((sec) => {
        if (sec <= 1) { clearInterval(t); endGame(); return 0; }
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning, gameOver]);

  // spawner
  useEffect(() => {
    if (!isRunning || gameOver) return;
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      const progress = 1 - timeLeftRef.current / ROUND_SECONDS;
      const ms = Math.max(MIN_SPAWN_MS, Math.round(BASE_SPAWN_MS - (BASE_SPAWN_MS - MIN_SPAWN_MS) * progress));
      spawnTimeout.current = setTimeout(loop, ms);
    };

    const loop = () => {
      if (!isRunningRef.current || gameOverRef.current) return;
      if (fruitsRef.current.length < MAX_FRUITS_ON_SCREEN) spawnFruit();
      scheduleNext();
    };

    spawnFruit();
    spawnTimeout.current = setTimeout(loop, 350);

    return () => { cancelled = true; if (spawnTimeout.current) clearTimeout(spawnTimeout.current); };
  }, [isRunning, gameOver]);

  const endGame = () => {
    setIsRunning(false);
    setGameOver(true);
    setHiScore((h) => Math.max(h, score));
  };

  const resetGame = () => {
    setFruits([]); setEffects([]); slicingIds.current.clear();
    if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
    setScore(0); setTimeLeft(ROUND_SECONDS); setGameOver(false); setIsRunning(true);
  };

  // arcs
  const choosePattern = (): LaunchPattern => {
    const r = Math.random();
    if (r < 0.35) return "bottomUp";
    if (r < 0.55) return "leftToRight";
    if (r < 0.75) return "rightToLeft";
    if (r < 0.88) return "diagUpRight";
    return "diagUpLeft";
  };
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  const makePath = (pattern: LaunchPattern): {
    p0: Vec2; p1: Vec2; p2: Vec2;
    riseMs: number; holdMs: number; fallMs: number;
  } => {
    const startY = rand(START_Y_MIN, START_Y_MAX);
    const peakY = rand(PEAK_Y_MIN, PEAK_Y_MAX);
    const wobble = (Math.random() - 0.5) * 100;
    const riseMs = rand(650, 900);
    const holdMs = rand(120, 220);
    const fallMs = rand(740, 980);

    if (pattern === "bottomUp") {
      const startX = rand(EDGE_PADDING, width - EDGE_PADDING);
      return { p0: { x: startX, y: startY }, p1: { x: startX + wobble, y: peakY }, p2: { x: startX + wobble * 1.4, y: OFFSCREEN_Y }, riseMs, holdMs, fallMs };
    }
    if (pattern === "leftToRight") {
      const p0 = { x: -EDGE_PADDING, y: startY };
      const midX = width * 0.45 + Math.random() * width * 0.25;
      const p1 = { x: midX, y: peakY };
      const p2 = { x: width + EDGE_PADDING * 2, y: OFFSCREEN_Y };
      return { p0, p1, p2, riseMs, holdMs, fallMs };
    }
    if (pattern === "rightToLeft") {
      const p0 = { x: width + EDGE_PADDING, y: startY };
      const midX = width * 0.55 - Math.random() * width * 0.25;
      const p1 = { x: midX, y: peakY };
      const p2 = { x: -EDGE_PADDING * 2, y: OFFSCREEN_Y };
      return { p0, p1, p2, riseMs, holdMs, fallMs };
    }
    if (pattern === "diagUpRight") {
      const p0 = { x: -EDGE_PADDING, y: rand(START_Y_MIN, START_Y_MAX) };
      const p1 = { x: width * 0.45, y: peakY };
      const p2 = { x: width + EDGE_PADDING * 2, y: OFFSCREEN_Y };
      return { p0, p1, p2, riseMs, holdMs, fallMs };
    }
    const p0 = { x: width + EDGE_PADDING, y: rand(START_Y_MIN, START_Y_MAX) };
    const p1 = { x: width * 0.55, y: peakY };
    const p2 = { x: -EDGE_PADDING * 2, y: OFFSCREEN_Y };
    return { p0, p1, p2, riseMs, holdMs, fallMs };
  };

  const quadBezier = (t: number, p0: Vec2, p1: Vec2, p2: Vec2): Vec2 => {
    const u = 1 - t, uu = u * u, tt = t * t;
    return { x: uu * p0.x + 2 * u * t * p1.x + tt * p2.x, y: uu * p0.y + 2 * u * t * p1.y + tt * p2.y };
  };

  const apexT = (p0y: number, p1y: number, p2y: number) => {
    const denom = p0y - 2 * p1y + p2y;
    if (Math.abs(denom) < 1e-6) return 0.5;
    const t = (p0y - p1y) / denom;
    return Math.max(0.05, Math.min(0.95, t));
  };

  // spawn
  const spawnFruit = () => {
    const id = nextFruitId.current++;
    const pattern = choosePattern();
    const { p0, p1, p2, riseMs, holdMs, fallMs } = makePath(pattern);

    const progress = new Animated.Value(0);
    const x = new Animated.Value(p0.x - HALF);
    const y = new Animated.Value(p0.y - HALF);

    const driftAmp = rand(10, 22);
    const driftFreq = rand(0.8, 1.6);

    const fruit: Fruit = {
      id, x, y,
      currentX: p0.x, currentY: p0.y,
      progress,
      scale: new Animated.Value(0.88),
      fade: new Animated.Value(0),
      p0, p1, p2,
      driftAmp, driftFreq,
      emoji: FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)],
      sliced: false,
    };

    setFruits((prev) => [...prev, fruit]);

    const sub = progress.addListener(({ value }) => {
      const pos = quadBezier(value, fruit.p0, fruit.p1, fruit.p2);
      const drift = Math.sin(value * Math.PI * 2 * fruit.driftFreq) * fruit.driftAmp;
      const cx = pos.x + drift;
      const cy = pos.y;
      fruit.currentX = cx;
      fruit.currentY = cy;
      fruit.x.setValue(cx - HALF);
      fruit.y.setValue(cy - HALF);
    });

    Animated.timing(fruit.fade, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    Animated.timing(fruit.scale, { toValue: 1, duration: 200, easing: Easing.out(Easing.back(1.2)), useNativeDriver: false }).start();

    const tStar = apexT(p0.y, p1.y, p2.y);
    Animated.sequence([
      Animated.timing(progress, { toValue: tStar, duration: riseMs, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.delay(holdMs),
      Animated.timing(progress, { toValue: 1, duration: fallMs, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start(() => {
      progress.removeListener(sub);
      setFruits((prev) => prev.filter((f) => f.id !== fruit.id));
    });
  };

  // effects
  const spawnEffect = (x: number, y: number) => {
    const id = nextEffectId.current++;
    setEffects((prev) => [...prev, { id, x, y }]);
  };
  const handleEffectDone = useCallback((id: number) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // debug overlay for latest fruit
  const renderDebugOverlay = () => {
    if (!debug || fruits.length === 0) return null;
    const f = fruits[fruits.length - 1];
    const tStar = apexT(f.p0.y, f.p1.y, f.p2.y);

    // sample arc (no drift for clarity)
    const samples: Vec2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      samples.push(quadBezier(t, f.p0, f.p1, f.p2));
    }
    const apexPt = quadBezier(tStar, f.p0, f.p1, f.p2);

    const Dot = ({ p, size = 6, color = "#111" }: { p: Vec2; size?: number; color?: string }) => (
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: p.x - size / 2,
          top: p.y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.9,
        }}
      />
    );

    return (
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 1500 }}>
        {/* sampled path */}
        {samples.map((p, idx) => (
          <Dot key={`s-${idx}`} p={p} size={4} color="#444" />
        ))}

        {/* control points + apex */}
        <Dot p={f.p0} size={8} color="#e53935" />
        <Dot p={f.p1} size={8} color="#43a047" />
        <Dot p={f.p2} size={8} color="#1e88e5" />
        <Dot p={apexPt} size={8} color="#fdd835" />

        {/* labels */}
        <Text style={[styles.debugLabel, { left: f.p0.x + 6, top: f.p0.y - 10 }]}>p0</Text>
        <Text style={[styles.debugLabel, { left: f.p1.x + 6, top: f.p1.y - 10 }]}>p1</Text>
        <Text style={[styles.debugLabel, { left: f.p2.x + 6, top: f.p2.y - 10 }]}>p2</Text>
        <Text style={[styles.debugLabel, { left: apexPt.x + 6, top: apexPt.y - 10 }]}>{`apex t*=${tStar.toFixed(2)}`}</Text>

        {/* info box */}
        <View style={styles.debugBox}>
          <Text style={styles.debugText}>
            id:{f.id}  prog:{(f as any).progress?._value?.toFixed?.(2) ?? ""}  driftAmp:{f.driftAmp.toFixed(1)}  driftFreq:{f.driftFreq.toFixed(2)}
          </Text>
          <Text style={styles.debugText}>
            p0({Math.round(f.p0.x)},{Math.round(f.p0.y)})  p1({Math.round(f.p1.x)},{Math.round(f.p1.y)})  p2({Math.round(f.p2.x)},{Math.round(f.p2.y)})
          </Text>
          <Text style={styles.debugText}>
            apex t*={tStar.toFixed(3)}  now({Math.round(f.currentX)},{Math.round(f.currentY)})
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* touch layer (high z so swipes always register) */}
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
        pointerEvents={gameOver ? "none" : "auto"}
        {...panResponder.panHandlers}
      />

      {/* bg */}
      <Text style={[styles.bgEmoji, { left: 16, top: 90, opacity: 0.14 }]}>☁️</Text>
      <Text style={[styles.bgEmoji, { right: 26, top: 160, opacity: 0.12 }]}>☁️</Text>
      <Text style={[styles.bgEmoji, { left: 42, bottom: 160, opacity: 0.1 }]}>🌈</Text>

      {/* HUD */}
      <View style={styles.hudRow}>
        <View style={[styles.pill, { backgroundColor: "#E6F7FF", borderColor: "#98D5FF" }]}><Text style={styles.pillText}>⏱ {timeLeft}s</Text></View>
        <View style={[styles.pill, { backgroundColor: "#E8F8EF", borderColor: "#9AD9B9" }]}><Text style={styles.pillText}>🍉 {score}</Text></View>
        <View style={[styles.pill, { backgroundColor: "#FFF6E6", borderColor: "#FFD28C" }]}><Text style={styles.pillText}>⭐ {hiScore}</Text></View>
      </View>

      {/* Fruits */}
      {fruits.map((fruit) => {
        const spins = 1.6 + fruit.driftFreq * 0.5;
        const rotateDeg = fruit.progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${360 * spins}deg`] });
        return (
          <Animated.Text
            key={fruit.id}
            pointerEvents="none"
            style={[styles.fruit, { left: fruit.x, top: fruit.y, opacity: fruit.fade, transform: [{ rotate: rotateDeg }, { scale: fruit.scale }] }]}
          >
            {fruit.emoji}
          </Animated.Text>
        );
      })}

      {/* Effects */}
      {effects.map((e) => (
        <SliceEffect key={e.id} id={e.id} x={e.x} y={e.y} onDone={handleEffectDone} />
      ))}

      {!gameOver && <Text style={styles.footer}>Swipe to slice fruits!</Text>}

      {/* Debug toggle button (above touch layer) */}
      <Pressable
        onPress={() => setDebug((d) => !d)}
        style={styles.debugBtn}
        hitSlop={8}
      >
        <Text style={styles.debugBtnText}>{debug ? "DBG✓" : "DBG"}</Text>
      </Pressable>

      {/* Debug overlay (non-blocking) */}
      {renderDebugOverlay()}

      {gameOver && (
        <View style={[styles.overlay, { zIndex: 1000 }]} pointerEvents="auto">
          <View style={styles.modal}>
            <Text style={styles.endTitle}>Great job! 🎉</Text>
            <Text style={styles.endScore}>Score: {score}</Text>
            <Text style={styles.endSub}>Best: {hiScore}</Text>
            <Pressable onPress={resetGame} style={styles.btn}><Text style={styles.btnText}>Play Again</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

/* Slice effect */
function SliceEffect({ id, x, y, onDone }: { id: number; x: number; y: number; onDone: (id: number) => void; }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 550, useNativeDriver: false }).start(() => onDone(id));
  }, [id, onDone, progress]);

  const angles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
  const distances = [28, 34, 40, 36, 32, 38];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{ position: "absolute", left: x - 10, top: y - 10 }}>
        {angles.map((a, i) => {
          const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * distances[i]] });
          const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * distances[i]] });
          const scale = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.4, 1.1, 0.6] });
          const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 1, 0] });
          return <Animated.Text key={`spark-${i}`} style={{ position: "absolute", fontSize: 20, transform: [{ translateX: tx }, { translateY: ty }, { scale }], opacity }}>✨</Animated.Text>;
        })}
        {angles.map((a, i) => {
          const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a + Math.PI / 6) * (distances[i] * 0.7)] });
          const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a + Math.PI / 6) * (distances[i] * 0.7)] });
          const scale = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 1.0, 0.7] });
          const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.9, 0.9, 0] });
          return <Animated.Text key={`drop-${i}`} style={{ position: "absolute", fontSize: 18, transform: [{ translateX: tx }, { translateY: ty }, { scale }], opacity }}>💦</Animated.Text>;
        })}
      </Animated.View>
    </View>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#BDE7FF", alignItems: "center", justifyContent: "flex-end" },
  bgEmoji: { position: "absolute", fontSize: 48, color: "#fff", textShadowColor: "rgba(0,0,0,0.07)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  hudRow: { position: "absolute", top: 36, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 2 },
  pillText: { fontSize: 18, fontWeight: "800", color: "#1C2333" },
  fruit: { position: "absolute", fontSize: FRUIT_SIZE, textShadowColor: "rgba(0,0,0,0.15)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  footer: { fontSize: 18, marginBottom: 28, color: "#0F2C63", fontWeight: "700", backgroundColor: "rgba(255,255,255,0.5)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 2, borderColor: "rgba(0,0,0,0.1)", overflow: "hidden", zIndex: 10 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },

  // Debug UI
  debugBtn: {
    position: "absolute",
    top: 36,
    right: 14,
    zIndex: 2000, // above the touch layer
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fff",
  },
  debugBtnText: { color: "#fff", fontWeight: "800" },
  debugBox: {
    position: "absolute",
    left: 14,
    top: 100,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
  },
  debugText: { color: "#fff", fontSize: 12 },
  debugLabel: {
    position: "absolute",
    color: "#111",
    fontSize: 12,
    fontWeight: "800",
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },

  modal: { width: Math.min(width * 0.82, 360), padding: 20, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#000", alignItems: "center" },
  endTitle: { fontSize: 28, fontWeight: "900", color: "#1E1E1E", marginBottom: 6 },
  endScore: { fontSize: 22, fontWeight: "800", color: "#2E7D32", marginBottom: 4 },
  endSub: { fontSize: 18, color: "#444", marginBottom: 14 },
  btn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#FF9F1C", borderWidth: 2, borderColor: "#000" },
  btnText: { fontSize: 18, fontWeight: "900", color: "#111" },
});
