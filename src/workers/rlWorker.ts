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

import { stepPlayground, type PlaygroundParams, type PlaygroundStepResult } from "../lib/rl/playgroundStep";
import type { PlaygroundState } from "../lib/rl/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type RLParams = PlaygroundParams;

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
  rewardTileMoved: PlaygroundStepResult["rewardTileMoved"];
}

export type FromWorkerMsg = { type: "SNAPSHOT"; payload: SnapshotPayload };

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
  const { nextState, rewardTileMoved } = stepPlayground(state, params);
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
