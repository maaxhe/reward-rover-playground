import {
  chooseAction,
  getTileReward,
  getQValue,
  setQValue,
  getDisplayQValue,
  getMaxQValue,
  posToActionIndex,
} from "./qLearning";
import {
  teleportThroughPortal,
  withPortalCooldowns,
  decrementPortalCooldowns,
  isPortalOnCooldown,
} from "./portalUtils";
import { cloneGrid } from "./gridUtils";
import { recordConsumedTile, restoreConsumedTiles } from "./consumedTiles";
import type { EpisodeStats, PlaygroundState, Position } from "./types";

export const MAX_EPISODE_HISTORY = 20;

export interface PlaygroundParams {
  explorationRate: number;
  alpha: number;
  gamma: number;
  consumeRewards: boolean;
  autoRestart: boolean;
  directionBias: Position | null;
}

export interface PlaygroundStepResult {
  nextState: PlaygroundState;
  /** Set when the agent moved onto a reward/punishment tile (for the pickup animation). */
  rewardTileMoved: { x: number; y: number; tileType: "reward" | "punishment" } | null;
}

/**
 * One Q-learning step in the Playground. Pure: used by the web worker and by the
 * main-thread fallback so both behave identically.
 */
export const stepPlayground = (state: PlaygroundState, params: PlaygroundParams): PlaygroundStepResult => {
  const current = state.agent;
  let nextPos = current;
  let portalCooldowns = decrementPortalCooldowns(state.portalCooldowns);
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
      // The rover waits on the portal for 2 steps before it is teleported.
      pendingPortalTeleport = { from: entryPortal, to: targetPortal, waitCounter: 2 };
    }
  }

  const reward = getTileReward(state.grid, [state.goal], nextPos);
  const newGrid = cloneGrid(state.grid);
  const movedTileType = state.grid[nextPos.y][nextPos.x].type;

  let consumedTiles = state.consumedTiles ?? [];
  if (params.consumeRewards && (movedTileType === "reward" || movedTileType === "punishment")) {
    consumedTiles = recordConsumedTile(consumedTiles, nextPos.x, nextPos.y, state.grid[nextPos.y][nextPos.x]);
    newGrid[nextPos.y][nextPos.x] = { ...newGrid[nextPos.y][nextPos.x], type: "empty", value: 0 };
  }

  // Q(s,a) ← Q(s,a) + α[R + γ·max_a' Q(s',a') − Q(s,a)]
  const isPortalWait = nextPos.x === current.x && nextPos.y === current.y;
  let newQTable = state.qTable;
  const currentCell = newGrid[current.y][current.x];
  if (!isPortalWait) {
    const actionIdx = posToActionIndex(current, nextPos);
    const currentQ = getQValue(state.qTable, current, actionIdx);
    const maxNextQ = getMaxQValue(newGrid, nextPos, state.qTable);
    newQTable = setQValue(state.qTable, current, actionIdx, currentQ + params.alpha * (reward + params.gamma * maxNextQ - currentQ));
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
  const hasMoved = !isPortalWait;
  const rewardTileMoved: PlaygroundStepResult["rewardTileMoved"] =
    hasMoved && (movedTileType === "reward" || movedTileType === "punishment")
      ? { x: nextPos.x, y: nextPos.y, tileType: movedTileType }
      : null;

  if (reachedGoal) {
    // New episode: eaten rewards/punishments come back (unless the player replaced the tile meanwhile).
    restoreConsumedTiles(newGrid, consumedTiles);
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
        consumedTiles: [],
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
      consumedTiles,
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
