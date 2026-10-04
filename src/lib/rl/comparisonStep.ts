import {
  chooseAction,
  getTileReward,
  getQValue,
  setQValue,
  getDisplayQValue,
  getMaxQValue,
  posToActionIndex,
} from "./qLearning";
import { teleportThroughPortal, withPortalCooldowns, decrementPortalCooldowns, isPortalOnCooldown } from "./portalUtils";
import { cloneGrid } from "./gridUtils";
import { recordConsumedTile, restoreConsumedTiles } from "./consumedTiles";
import type { ComparisonRoverState, EpisodeStats } from "./types";

export const runComparisonRoverStep = (
  state: ComparisonRoverState,
  consumeRewards = true,
): ComparisonRoverState => {
  const current = state.agent;
  let nextPos = chooseAction(state.grid, current, state.qTable, state.explorationRate, null);
  const cooledCooldowns = decrementPortalCooldowns(state.portalCooldowns);
  let portalCooldowns = cooledCooldowns;

  // Check for portal teleportation
  if (
    state.grid[nextPos.y][nextPos.x].type === "portal" &&
    !isPortalOnCooldown(portalCooldowns, nextPos)
  ) {
    const entryPortal = nextPos;
    const targetPortal = teleportThroughPortal(state.grid, nextPos);
    portalCooldowns = withPortalCooldowns(portalCooldowns, [entryPortal, targetPortal]);
    nextPos = targetPortal;
  }

  const reward = getTileReward(state.grid, [state.goal], nextPos);

  const newGrid = cloneGrid(state.grid);

  // Belohnungen und Strafen verschwinden beim Einsammeln (optional)
  let consumedTiles = state.consumedTiles ?? [];
  if (consumeRewards) {
    const tileType = state.grid[nextPos.y][nextPos.x].type;
    if (tileType === "reward" || tileType === "punishment") {
      consumedTiles = recordConsumedTile(consumedTiles, nextPos.x, nextPos.y, state.grid[nextPos.y][nextPos.x]);
      newGrid[nextPos.y][nextPos.x] = {
        ...newGrid[nextPos.y][nextPos.x],
        type: "empty",
        value: 0,
      };
    }
  }

  // Q-Learning update: Q(s,a) ← Q(s,a) + α[R + γ·max_a' Q(s',a') − Q(s,a)]
  const actionIdx = posToActionIndex(current, nextPos);
  const currentQ = getQValue(state.qTable, current, actionIdx);
  const maxNextQ = getMaxQValue(newGrid, nextPos, state.qTable);
  const newQ = currentQ + state.alpha * (reward + state.gamma * maxNextQ - currentQ);
  const newQTable = setQValue(state.qTable, current, actionIdx, newQ);

  const currentCell = newGrid[current.y][current.x];
  newGrid[current.y][current.x] = {
    ...currentCell,
    qValue: getDisplayQValue(newQTable, current),
    value: getDisplayQValue(newQTable, current),
    visits: currentCell.visits + 1,
  };

  const reachedGoal = nextPos.x === state.goal.x && nextPos.y === state.goal.y;
  const newSteps = state.currentSteps + 1;

  if (reachedGoal) {
    restoreConsumedTiles(newGrid, consumedTiles);
    const episodeStat: EpisodeStats = {
      episode: state.episode + 1,
      steps: newSteps,
      reward: state.totalReward + reward,
      success: true,
      mode: "playground",
    };
    const newHistory = [...state.episodeHistory.slice(-19), episodeStat];

    return {
      ...state,
      consumedTiles: [],
      agent: { ...state.spawn },
      grid: newGrid,
      qTable: newQTable,
      totalReward: 0,
      episode: state.episode + 1,
      currentSteps: 0,
      episodeHistory: newHistory,
      portalCooldowns: {},
    };
  }

  return {
    ...state,
    consumedTiles,
    agent: nextPos,
    grid: newGrid,
    qTable: newQTable,
    totalReward: state.totalReward + reward,
    currentSteps: newSteps,
    portalCooldowns,
  };
};
