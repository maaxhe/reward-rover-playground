/**
 * RL Training Worker
 *
 * Runs the Q-Learning step loop off the main thread.
 * Receives commands (START, PAUSE, UPDATE_PARAMS, SYNC_STATE, …) and posts
 * SNAPSHOT messages back whenever the state changes.
 *
 * Only playground mode is handled here; random/comparison modes continue to
 * use setInterval on the main thread.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type TileType = "empty" | "obstacle" | "reward" | "punishment" | "goal" | "portal";

interface TileState {
  type: TileType;
  qValue: number;
  visits: number;
  value: number;
}

interface Position {
  x: number;
  y: number;
}

/** QTable maps state key "x,y" → [Q_up, Q_down, Q_left, Q_right] */
type QTable = Record<string, [number, number, number, number]>;

interface EpisodeStats {
  episode: number;
  steps: number;
  reward: number;
  success: boolean;
  mode: "playground" | "random" | "speedrun";
}

interface PlaygroundState {
  agent: Position;
  goal: Position;
  grid: TileState[][];
  isRunning: boolean;
  episode: number;
  totalReward: number;
  currentSteps: number;
  episodeHistory: EpisodeStats[];
  spawn: Position;
  portalCooldowns: Record<string, number>;
  pendingPortalTeleport: { from: Position; to: Position; waitCounter: number } | null;
  qTable: QTable;
}

interface RLParams {
  explorationRate: number;
  alpha: number;
  gamma: number;
  consumeRewards: boolean;
  autoRestart: boolean;
  directionBias: Position | null;
}

export type ToWorkerMsg =
  | { type: "INIT"; state: PlaygroundState; params: RLParams; delayMs: number }
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "STEP_ONCE" }
  | { type: "SET_DELAY"; delayMs: number }
  | { type: "UPDATE_PARAMS"; params: Partial<RLParams> }
  | { type: "SYNC_STATE"; state: PlaygroundState };

export interface SnapshotPayload {
  state: PlaygroundState;
  /** Tile type at the agent's new position (for animation, if agent moved) */
  rewardTileMoved: { x: number; y: number; tileType: TileType } | null;
}

export type FromWorkerMsg = { type: "SNAPSHOT"; payload: SnapshotPayload };

// ── QTable Helpers (duplicated from RLGame.tsx to keep worker self-contained) ─

const ACTION_DIRS = [
  { dx: 0, dy: -1 }, // 0: up
  { dx: 0, dy: 1 },  // 1: down
  { dx: -1, dy: 0 }, // 2: left
  { dx: 1, dy: 0 },  // 3: right
] as const;

const qStateKey = (pos: Position) => `${pos.x},${pos.y}`;

const getQValues = (qTable: QTable, pos: Position): [number, number, number, number] =>
  qTable[qStateKey(pos)] ?? [0, 0, 0, 0];

const getQValue = (qTable: QTable, pos: Position, action: number): number =>
  getQValues(qTable, pos)[action];

const setQValue = (qTable: QTable, pos: Position, action: number, value: number): QTable => {
  const key = qStateKey(pos);
  const current = qTable[key] ?? [0, 0, 0, 0];
  const updated = [...current] as [number, number, number, number];
  updated[action] = value;
  return { ...qTable, [key]: updated };
};

const getDisplayQValue = (qTable: QTable, pos: Position): number =>
  Math.max(...getQValues(qTable, pos));

const getMaxQFromTable = (qTable: QTable, grid: TileState[][], pos: Position): number => {
  const size = grid.length;
  let max = 0;
  ACTION_DIRS.forEach(({ dx, dy }, idx) => {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx].type !== "obstacle") {
      const q = getQValue(qTable, pos, idx);
      if (q > max) max = q;
    }
  });
  return max;
};

const posToActionIndex = (from: Position, to: Position): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dy === -1) return 0;
  if (dy === 1) return 1;
  if (dx === -1) return 2;
  return 3;
};

// ── Pure RL Functions ─────────────────────────────────────────────────────────

const STEP_PENALTY = -1;
const REWARD_VALUE = 12;
const PUNISHMENT_VALUE = -15;
const OBSTACLE_PENALTY = -20;
const GOAL_REWARD = REWARD_VALUE * 2;
const PORTAL_COOLDOWN_STEPS = 4;

const cloneGrid = (grid: TileState[][]): TileState[][] =>
  grid.map((row) => row.map((cell) => ({ ...cell })));

const getPossibleActions = (grid: TileState[][], pos: Position): Position[] => {
  const actions: Position[] = [];
  const size = grid.length;
  ACTION_DIRS.forEach(({ dx, dy }) => {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx].type !== "obstacle") {
      actions.push({ x: nx, y: ny });
    }
  });
  if (actions.length === 0) actions.push(pos);
  return actions;
};

const chooseAction = (
  grid: TileState[][],
  pos: Position,
  qTable: QTable,
  explorationRate: number,
  biasDirection: Position | null,
): Position => {
  const possible = getPossibleActions(grid, pos);
  let biasMatch: Position | undefined;
  if (biasDirection) {
    biasMatch = possible.find(
      (a) => a.x - pos.x === biasDirection.x && a.y - pos.y === biasDirection.y,
    );
    if (biasMatch && Math.random() < 0.35) return biasMatch;
  }
  if (Math.random() < explorationRate) {
    return possible[Math.floor(Math.random() * possible.length)];
  }
  let best = possible[0];
  let bestQ =
    getQValue(qTable, pos, posToActionIndex(pos, best)) +
    (biasMatch && best.x === biasMatch.x && best.y === biasMatch.y ? 0.05 : 0);
  for (let i = 1; i < possible.length; i++) {
    const action = possible[i];
    const q = getQValue(qTable, pos, posToActionIndex(pos, action));
    const biasBonus = biasMatch && action.x === biasMatch.x && action.y === biasMatch.y ? 0.05 : 0;
    if (q + biasBonus > bestQ) {
      bestQ = q + biasBonus;
      best = action;
    }
  }
  return best;
};

const getTileReward = (grid: TileState[][], goal: Position, pos: Position): number => {
  if (pos.x === goal.x && pos.y === goal.y) return GOAL_REWARD;
  const cell = grid[pos.y][pos.x];
  switch (cell.type) {
    case "obstacle": return OBSTACLE_PENALTY;
    case "reward": return REWARD_VALUE;
    case "punishment": return PUNISHMENT_VALUE;
    case "portal": return 0;
    default: return STEP_PENALTY;
  }
};

// Portal utilities
const findPortals = (grid: TileState[][]): Position[] => {
  const portals: Position[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x].type === "portal") portals.push({ x, y });
    }
  }
  return portals;
};

const getPortalKey = (pos: Position) => `${pos.x},${pos.y}`;

const teleportThroughPortal = (grid: TileState[][], pos: Position): Position => {
  const portals = findPortals(grid);
  if (portals.length < 2) return pos;
  const others = portals.filter((p) => !(p.x === pos.x && p.y === pos.y));
  if (others.length === 0) return pos;
  return others[Math.floor(Math.random() * others.length)];
};

const decrementPortalCooldowns = (cd: Record<string, number>): Record<string, number> => {
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(cd)) {
    if (value > 1) next[key] = value - 1;
  }
  return next;
};

const withPortalCooldowns = (
  cd: Record<string, number>,
  positions: Position[],
  duration = PORTAL_COOLDOWN_STEPS,
): Record<string, number> => {
  if (positions.length === 0) return cd;
  const next = { ...cd };
  positions.forEach((p) => { next[getPortalKey(p)] = duration; });
  return next;
};

const isPortalOnCooldown = (cd: Record<string, number>, pos: Position): boolean => {
  const v = cd[getPortalKey(pos)];
  return typeof v === "number" && v > 0;
};

// The core step function (matches RLGame.tsx runPlaygroundStep)
const runPlaygroundStep = (
  state: PlaygroundState,
  params: RLParams,
): { nextState: PlaygroundState; rewardTileMoved: SnapshotPayload["rewardTileMoved"] } => {
  const current = state.agent;
  let nextPos = current;
  const cooledCooldowns = decrementPortalCooldowns(state.portalCooldowns);
  let portalCooldowns = cooledCooldowns;
  let pendingPortalTeleport = state.pendingPortalTeleport;

  if (pendingPortalTeleport) {
    if (pendingPortalTeleport.waitCounter <= 0) {
      nextPos = pendingPortalTeleport.to;
      pendingPortalTeleport = null;
    } else {
      pendingPortalTeleport = { ...pendingPortalTeleport, waitCounter: pendingPortalTeleport.waitCounter - 1 };
      nextPos = current;
    }
  } else {
    nextPos = chooseAction(state.grid, current, state.qTable, params.explorationRate, params.directionBias);
    if (state.grid[nextPos.y][nextPos.x].type === "portal" && !isPortalOnCooldown(portalCooldowns, nextPos)) {
      const entryPortal = nextPos;
      const targetPortal = teleportThroughPortal(state.grid, nextPos);
      portalCooldowns = withPortalCooldowns(portalCooldowns, [entryPortal, targetPortal]);
      pendingPortalTeleport = { from: entryPortal, to: targetPortal, waitCounter: 2 };
    }
  }

  const reward = getTileReward(state.grid, state.goal, nextPos);
  const newGrid = cloneGrid(state.grid);

  if (params.consumeRewards) {
    const tileType = state.grid[nextPos.y][nextPos.x].type;
    if (tileType === "reward" || tileType === "punishment") {
      newGrid[nextPos.y][nextPos.x] = { ...newGrid[nextPos.y][nextPos.x], type: "empty", value: 0 };
    }
  }

  const isPortalWait = nextPos.x === current.x && nextPos.y === current.y;
  let newQTable = state.qTable;
  const currentCell = newGrid[current.y][current.x];

  if (!isPortalWait) {
    const actionIdx = posToActionIndex(current, nextPos);
    const currentQ = getQValue(state.qTable, current, actionIdx);
    const maxNextQ = getMaxQFromTable(state.qTable, newGrid, nextPos);
    const newQ = currentQ + params.alpha * (reward + params.gamma * maxNextQ - currentQ);
    newQTable = setQValue(state.qTable, current, actionIdx, newQ);
    newGrid[current.y][current.x] = {
      ...currentCell,
      qValue: getDisplayQValue(newQTable, current),
      value: getDisplayQValue(newQTable, current),
      visits: currentCell.visits + 1,
    };
  } else {
    newGrid[current.y][current.x] = { ...currentCell, visits: currentCell.visits + 1 };
  }

  const reachedGoal = nextPos.x === state.goal.x && nextPos.y === state.goal.y;
  const newSteps = state.currentSteps + 1;

  // Reward animation hint
  const hasMoved = nextPos.x !== current.x || nextPos.y !== current.y;
  const newTileType = newGrid[nextPos.y][nextPos.x].type;
  const rewardTileMoved: SnapshotPayload["rewardTileMoved"] =
    hasMoved && (newTileType === "reward" || newTileType === "punishment")
      ? { x: nextPos.x, y: nextPos.y, tileType: newTileType }
      : null;

  if (reachedGoal) {
    const episodeStat: EpisodeStats = {
      episode: state.episode + 1,
      steps: newSteps,
      reward: state.totalReward + reward,
      success: true,
      mode: "playground",
    };
    return {
      nextState: {
        ...state,
        agent: { ...state.spawn },
        grid: newGrid,
        qTable: newQTable,
        totalReward: 0,
        isRunning: params.autoRestart,
        episode: state.episode + 1,
        currentSteps: 0,
        episodeHistory: [...state.episodeHistory, episodeStat],
        portalCooldowns: {},
        pendingPortalTeleport: null,
      },
      rewardTileMoved,
    };
  }

  return {
    nextState: {
      ...state,
      agent: nextPos,
      grid: newGrid,
      qTable: newQTable,
      totalReward: state.totalReward + reward,
      currentSteps: newSteps,
      portalCooldowns,
      pendingPortalTeleport,
    },
    rewardTileMoved,
  };
};

// ── Worker State ──────────────────────────────────────────────────────────────

let state: PlaygroundState | null = null;
let params: RLParams = {
  explorationRate: 0.2,
  alpha: 0.1,
  gamma: 0.85,
  consumeRewards: false,
  autoRestart: false,
  directionBias: null,
};
let delayMs = 220;
let intervalId: ReturnType<typeof setInterval> | null = null;

const post = (msg: FromWorkerMsg) => self.postMessage(msg);

const step = () => {
  if (!state) return;
  const { nextState, rewardTileMoved } = runPlaygroundStep(state, params);
  state = nextState;

  // If auto-restart is off and goal was reached (episode advanced), pause
  if (!params.autoRestart && state.episode > (nextState.episode - 1)) {
    // episode incremented means goal was reached
    if (state.currentSteps === 0 && intervalId !== null) {
      // Keep running (autoRestart handled inside runPlaygroundStep)
    }
  }

  // If the worker's own state says isRunning=false, stop the interval
  if (!state.isRunning && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  post({ type: "SNAPSHOT", payload: { state, rewardTileMoved } });
};

// ── Message Handler ───────────────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<ToWorkerMsg>) => {
  const msg = event.data;

  switch (msg.type) {
    case "INIT":
      state = msg.state;
      params = msg.params;
      delayMs = msg.delayMs;
      break;

    case "START":
      if (!state) break;
      state = { ...state, isRunning: true };
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(step, delayMs);
      break;

    case "PAUSE":
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      if (state) state = { ...state, isRunning: false };
      break;

    case "STEP_ONCE":
      step();
      break;

    case "SET_DELAY":
      delayMs = msg.delayMs;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = setInterval(step, delayMs);
      }
      break;

    case "UPDATE_PARAMS":
      params = { ...params, ...msg.params };
      break;

    case "SYNC_STATE":
      // Sync full state from main thread (e.g., after tile placement or reset)
      state = msg.state;
      // If running, restart the interval to pick up new state
      if (state.isRunning && intervalId === null) {
        intervalId = setInterval(step, delayMs);
      }
      break;
  }
};
