import type { QTable } from "@/lib/rl/qLearning";
import type { Position } from "@/lib/rl/types";
import type { CompetitionWorld } from "./world";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type Phase = "lobby" | "training" | "finished";

/** First → last value of ε, α, γ over the training that produced the best result, plus how often they were changed. */
export interface ParamSummary {
  epsilon: [number, number];
  alpha: [number, number];
  gamma: [number, number];
  changes: number;
}

/** One entry per change: [fromEpisode, ε, α, γ]. */
export type ParamLog = Array<[number, number, number, number]>;

export interface LeaderboardRow {
  id: string;
  name: string;
  episodes: number;
  submitted: boolean;
  totalReward: number | null;
  steps: number | null;
  reachedGoal: boolean;
  rank: number | null;
  /** Only sent once the round is finished. */
  params?: ParamSummary | null;
}

export interface TotalsRow {
  id: string;
  name: string;
  total: number;
  rank: number;
  /** Rank points per round. */
  rounds: number[];
}

export interface VoteState {
  open: boolean;
  minutesOptions: number[];
  budgetOptions: number[];
  tally: { minutes: Record<string, number>; budget: Record<string, number> };
  voters: number;
  mine: { minutes?: number; budget?: number } | null;
}

export interface RoomSettings {
  trainingMinutes: number;
  episodeBudget: number;
  size: number;
  obstacles: number;
  rewards: number;
  punishments: number;
  minDistance: number;
}

export interface RoomState {
  code: string;
  phase: Phase;
  settings: RoomSettings;
  round: number;
  seed: number;
  serverNow: number;
  trainingEndsAt: number;
  trainingMs: number;
  episodeBudget: number;
  world: CompetitionWorld;
  playerCount: number;
  leaderboard: LeaderboardRow[];
  /** Level world picked by the teacher (1–10), or null for a random world. */
  levelId?: number | null;
  /** Overall standings, only from round 2 on. */
  totals?: TotalsRow[] | null;
  vote?: VoteState;
  me: { id: string; name: string; rank: number | null } | null;
}

export interface SubmitResult {
  totalReward: number;
  steps: number;
  reachedGoal: boolean;
  improved: boolean;
  bestReward: number;
}

export interface Replay {
  name: string;
  totalReward: number;
  steps: number;
  reachedGoal: boolean;
  path: Position[];
  paramLog?: ParamLog | null;
}

export interface CustomWorldInput {
  size: number;
  agent: Position;
  goal: Position;
  tiles: Array<{ x: number; y: number; type: "obstacle" | "reward" | "punishment" }>;
}

export interface PlayerSession {
  playerId: string;
  token: string;
}

async function call<T>(path: string, options?: RequestInit & { hostKey?: string }): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.hostKey ? { "x-host-key": options.hostKey } : {}),
    },
  });
  const data = await res.json().catch(() => ({ error: "Network error" }));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

export const competitionApi = {
  createRoom: (password: string, settings: Partial<RoomSettings> = {}) =>
    call<{ code: string; hostKey: string }>("/rooms", { method: "POST", body: JSON.stringify({ ...settings, password }) }),

  /** Lobby only. `reroll` builds a new world; `seed` pins a specific one. */
  updateSettings: (code: string, hostKey: string, patch: Partial<RoomSettings> & { reroll?: boolean; seed?: number; levelId?: null }) =>
    call<{ ok: true }>(`/rooms/${code}/settings`, { method: "PATCH", hostKey, body: JSON.stringify(patch) }),

  /** Lobby: use an exact world (e.g. a level world) instead of a random one. */
  setCustomWorld: (code: string, hostKey: string, world: CustomWorldInput, levelId: number | null, settings: Pick<RoomSettings, "trainingMinutes" | "episodeBudget">) =>
    call<{ ok: true }>(`/rooms/${code}/settings`, { method: "PATCH", hostKey, body: JSON.stringify({ ...settings, customWorld: world, levelId }) }),

  restart: (code: string, hostKey: string, newWorld: boolean) =>
    call<{ ok: true; round: number }>(`/rooms/${code}/restart`, { method: "POST", hostKey, body: JSON.stringify({ newWorld }) }),

  join: (code: string, name: string) =>
    call<PlayerSession>(`/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ name }) }),

  getRoom: (code: string, session?: PlayerSession | null) =>
    call<RoomState>(
      `/rooms/${code}${session ? `?playerId=${session.playerId}&token=${session.token}` : ""}`,
    ),

  start: (code: string, hostKey: string) => call<{ ok: true }>(`/rooms/${code}/start`, { method: "POST", hostKey }),
  finish: (code: string, hostKey: string) => call<{ ok: true }>(`/rooms/${code}/finish`, { method: "POST", hostKey }),
  kick: (code: string, hostKey: string, playerId: string) =>
    call<{ ok: true }>(`/rooms/${code}/players/${playerId}`, { method: "DELETE", hostKey }),

  submit: (code: string, session: PlayerSession, qTable: QTable, episodes: number, paramLog?: ParamLog) =>
    call<SubmitResult>(`/rooms/${code}/submit`, {
      method: "POST",
      body: JSON.stringify({ ...session, qTable, episodes, paramLog }),
    }),

  /** The teacher may pass the host key to watch replays while the round is still running (beamer view). */
  replay: (code: string, playerId: string, hostKey?: string) => call<Replay>(`/rooms/${code}/replay/${playerId}`, { hostKey }),

  /** Teacher: open or close the lobby vote on training time and budget. */
  openVote: (code: string, hostKey: string, open: boolean, reset = false) =>
    call<{ ok: true }>(`/rooms/${code}/vote/open`, { method: "POST", hostKey, body: JSON.stringify({ open, reset }) }),
  applyVote: (code: string, hostKey: string) =>
    call<{ ok: true; trainingMinutes: number; episodeBudget: number }>(`/rooms/${code}/vote/apply`, { method: "POST", hostKey, body: "{}" }),
  vote: (code: string, session: PlayerSession, choice: { minutes?: number; budget?: number }) =>
    call<{ ok: true }>(`/rooms/${code}/vote`, { method: "POST", body: JSON.stringify({ ...session, ...choice }) }),
};

// ── Browser-side session memory (so a reload does not kick anyone out) ────────

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode etc. — the page still works, just without reload recovery */
  }
};

export const sessionStore = {
  getPlayer: (code: string) => read<PlayerSession>(`rr-class-player-${code}`),
  setPlayer: (code: string, s: PlayerSession) => write(`rr-class-player-${code}`, s),
  getHostKey: (code: string) => read<string>(`rr-class-host-${code}`),
  setHostKey: (code: string, key: string) => write(`rr-class-host-${code}`, key),
  // Budget is per round, so a restarted round starts with a full budget again.
  getUsedEpisodes: (code: string, round: number) => read<number>(`rr-class-used-${code}-${round}`) ?? 0,
  setUsedEpisodes: (code: string, round: number, n: number) => write(`rr-class-used-${code}-${round}`, n),
};
