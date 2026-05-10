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

import {
  chooseAction,
  getTileReward,
  getQValue,
  setQValue,
  getDisplayQValue,
  getMaxQValue,
  posToActionIndex,
  type QTable,
} from "../lib/rl/qLearning";
import {
  findPortals,
  teleportThroughPortal,
  getPortalKey,
  decrementPortalCooldowns,
  withPortalCooldowns,
  isPortalOnCooldown,
} from "../lib/rl/portalUtils";
import { cloneGrid } from "../lib/rl/gridUtils";

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

// ── Core Step Function ────────────────────────────────────────────────────────

const MAX_EPISODE_HISTORY = 20;

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

  const reward = getTileReward(state.grid, [state.goal], nextPos);
  const newGrid = cloneGrid(state.grid);

  // Capture tile type before consumption for animation hint
  const movedTileType = state.grid[nextPos.y][nextPos.x].type;

  if (params.consumeRewards) {
    if (movedTileType === "reward" || movedTileType === "punishment") {
      newGrid[nextPos.y][nextPos.x] = { ...newGrid[nextPos.y][nextPos.x], type: "empty", value: 0 };
    }
  }

  const isPortalWait = nextPos.x === current.x && nextPos.y === current.y;
  let newQTable = state.qTable;
  const currentCell = newGrid[current.y][current.x];

  if (!isPortalWait) {
    const actionIdx = posToActionIndex(current, nextPos);
    const currentQ = getQValue(state.qTable, current, actionIdx);
    const maxNextQ = getMaxQValue(newGrid, nextPos, state.qTable);
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

  const hasMoved = nextPos.x !== current.x || nextPos.y !== current.y;
  const rewardTileMoved: SnapshotPayload["rewardTileMoved"] =
    hasMoved && (movedTileType === "reward" || movedTileType === "punishment")
      ? { x: nextPos.x, y: nextPos.y, tileType: movedTileType }
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
        episodeHistory: [...state.episodeHistory.slice(-(MAX_EPISODE_HISTORY - 1)), episodeStat],
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
      state = msg.state;
      if (state.isRunning && intervalId === null) {
        intervalId = setInterval(step, delayMs);
      }
      break;
  }
};
