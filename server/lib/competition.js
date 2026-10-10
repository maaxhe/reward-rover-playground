// Classroom competition: seeded world + deterministic "test run" of a submitted Q-table.
//
// The test run is a JS port of the greedy policy used by the client
// (chooseAction with ε = 0 + stepPlayground with consumeRewards on).
// src/lib/competition/evaluate.test.ts checks both implementations against each other.

export const DEFAULT_WORLD_SETTINGS = {
  size: 8,
  obstacles: 11,
  rewards: 6,
  punishments: 5,
  minDistance: 8,
};

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

/** Clamps world settings to values that can always be built (falls back to `base` for missing fields). */
export const normalizeWorldSettings = (input = {}, base = DEFAULT_WORLD_SETTINGS) => {
  const size = clampInt(input.size, 5, 12, base.size);
  const obstacles = clampInt(input.obstacles, 0, Math.floor(size * size * 0.3), Math.min(base.obstacles, Math.floor(size * size * 0.3)));
  const rewards = clampInt(input.rewards, 0, 12, base.rewards);
  const punishments = clampInt(input.punishments, 0, 12, base.punishments);
  const minDistance = clampInt(input.minDistance, 2, 2 * size - 4, Math.min(base.minDistance, 2 * size - 4));
  return { size, obstacles, rewards, punishments, minDistance };
};

/** Test-run length scales with the board so bigger worlds get enough steps. */
export const maxStepsFor = (size) => size * size * 2;

const STEP_PENALTY = -1;
const REWARD_VALUE = 12;
const PUNISHMENT_VALUE = -15;
const GOAL_REWARD = REWARD_VALUE * 2;

// Same order as ACTION_DIRS in src/lib/rl/qLearning.ts: up, down, left, right.
const DIRS = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let value = t;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const key = (x, y) => `${x},${y}`;

const isReachable = (size, blocked, from, to) => {
  const seen = new Set([key(from.x, from.y)]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) return true;
    for (const d of DIRS) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const k = key(nx, ny);
      if (blocked.has(k) || seen.has(k)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
};

/** Seeded world without portals (portal teleports are random, which would make the test run unfair). */
export const buildWorld = (seed, settings = DEFAULT_WORLD_SETTINGS) => {
  const { size, obstacles: obstacleCount, rewards: rewardCount, punishments: punishmentCount, minDistance } =
    normalizeWorldSettings(settings, DEFAULT_WORLD_SETTINGS);
  const rng = mulberry32(seed);
  const randomInt = (max) => Math.floor(rng() * max);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const used = new Set();
    const pick = (filter = () => true) => {
      for (let i = 0; i < 500; i += 1) {
        const pos = { x: randomInt(size), y: randomInt(size) };
        if (!used.has(key(pos.x, pos.y)) && filter(pos)) {
          used.add(key(pos.x, pos.y));
          return pos;
        }
      }
      return null;
    };

    const agent = pick();
    const goal = pick((p) => Math.abs(p.x - agent.x) + Math.abs(p.y - agent.y) >= minDistance);
    if (!agent || !goal) continue;

    const tiles = [];
    const obstacles = new Set();
    for (let i = 0; i < obstacleCount; i += 1) {
      const pos = pick();
      if (!pos) break;
      obstacles.add(key(pos.x, pos.y));
      tiles.push({ ...pos, type: "obstacle" });
    }
    if (!isReachable(size, obstacles, agent, goal)) continue;

    for (let i = 0; i < rewardCount; i += 1) {
      const pos = pick();
      if (pos) tiles.push({ ...pos, type: "reward" });
    }
    for (let i = 0; i < punishmentCount; i += 1) {
      const pos = pick();
      if (pos) tiles.push({ ...pos, type: "punishment" });
    }
    return { size, agent, goal, tiles, maxSteps: maxStepsFor(size) };
  }
  throw new Error("Could not build a solvable world");
};

const tileMap = (world) => {
  const map = new Map();
  for (const t of world.tiles) map.set(key(t.x, t.y), t.type);
  return map;
};

/** A valid Q-table: at most size×size entries "x,y" → 4 finite numbers. */
export const isValidQTable = (qTable, size = DEFAULT_WORLD_SETTINGS.size) => {
  if (!qTable || typeof qTable !== "object" || Array.isArray(qTable)) return false;
  const keys = Object.keys(qTable);
  if (keys.length > size * size) return false;
  return keys.every((k) => {
    const m = /^(\d+),(\d+)$/.exec(k);
    if (!m || Number(m[1]) >= size || Number(m[2]) >= size) return false;
    const v = qTable[k];
    return Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === "number" && Number.isFinite(n));
  });
};

/** Greedy run (ε = 0) of a Q-table through the world. Reward/punishment tiles are eaten once. */
export const evaluateGreedy = (world, qTable) => {
  const types = tileMap(world);
  let pos = { ...world.agent };
  let totalReward = 0;
  let reachedGoal = false;
  const path = [{ ...pos }];

  const maxSteps = world.maxSteps ?? maxStepsFor(world.size);
  for (let step = 0; step < maxSteps; step += 1) {
    const possible = [];
    DIRS.forEach((d, idx) => {
      const nx = pos.x + d.x;
      const ny = pos.y + d.y;
      if (nx >= 0 && ny >= 0 && nx < world.size && ny < world.size && types.get(key(nx, ny)) !== "obstacle") {
        possible.push({ x: nx, y: ny, idx });
      }
    });
    if (possible.length === 0) possible.push({ x: pos.x, y: pos.y, idx: 0 });

    const q = qTable[key(pos.x, pos.y)] ?? [0, 0, 0, 0];
    let best = possible[0];
    for (let i = 1; i < possible.length; i += 1) {
      if (q[possible[i].idx] > q[best.idx]) best = possible[i];
    }

    pos = { x: best.x, y: best.y };
    path.push({ ...pos });

    if (pos.x === world.goal.x && pos.y === world.goal.y) {
      totalReward += GOAL_REWARD;
      reachedGoal = true;
      break;
    }
    const type = types.get(key(pos.x, pos.y));
    if (type === "reward") {
      totalReward += REWARD_VALUE;
      types.delete(key(pos.x, pos.y));
    } else if (type === "punishment") {
      totalReward += PUNISHMENT_VALUE;
      types.delete(key(pos.x, pos.y));
    } else {
      totalReward += STEP_PENALTY;
    }
  }

  return { totalReward, steps: path.length - 1, reachedGoal, path };
};

/** Positive when `a` beats `b`: higher reward first, then fewer steps. */
export const compareResults = (a, b) => {
  if (a.totalReward !== b.totalReward) return a.totalReward - b.totalReward;
  return b.steps - a.steps;
};
