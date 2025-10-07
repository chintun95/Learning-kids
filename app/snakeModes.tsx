// app/Games/snakeModes.ts
export type SnakeModeKey = 'classic' | 'borderless' | 'walls' | 'bigBites';

export type SnakeMode = {
  label: string;
  wrap: boolean;           // pass-through at edges
  hasWalls: boolean;       // draw inner obstacles
  baseSpeedMs: number;     // starting move interval
  foods: Array<{ emoji?: string; points: number; weight: number }>;
  foodCount: number;       // (kept for future multiple-foods; we use 1 for now)
};

export const SNAKE_MODES: Record<SnakeModeKey, SnakeMode> = {
  classic: {
    label: 'Classic',
    wrap: false,
    hasWalls: false,
    baseSpeedMs: 90,
    foods: [{ points: 10, weight: 1 }], // single food, no emoji yet
    foodCount: 1,
  },
  borderless: {
    label: 'Borderless',
    wrap: true,
    hasWalls: false,
    baseSpeedMs: 80,
    foods: [{ points: 10, weight: 1 }],
    foodCount: 1,
  },
  walls: {
    label: 'Walls',
    wrap: false,
    hasWalls: true,
    baseSpeedMs: 85,
    foods: [{ points: 12, weight: 1 }],
    foodCount: 1,
  },
  bigBites: {
    label: 'Big Bites',
    wrap: false,
    hasWalls: false,
    baseSpeedMs: 95,
    foods: [{ points: 25, weight: 1 }],
    foodCount: 1,
  },
};
