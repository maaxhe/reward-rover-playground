import type { QTable } from "@/lib/rl/qLearning";
import type { Position } from "@/lib/rl/types";
import type { CompetitionWorld } from "./world";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type Phase = "lobby" | "training" | "finished";

export interface LeaderboardRow {
  id: string;
  name: string;
  episodes: number;
  submitted: boolean;
  totalReward: number | null;
  steps: number | null;
  reachedGoal: boolean;
  rank: number | null;
}

export interface RoomState {
  code: string;
  phase: Phase;
  serverNow: number;
  trainingEndsAt: number;
  trainingMs: number;
  episodeBudget: number;
  world: CompetitionWorld;
  playerCount: number;
  leaderboard: LeaderboardRow[];
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
  createRoom: (trainingMinutes: number, episodeBudget: number) =>
    call<{ code: string; hostKey: string }>("/rooms", {
      method: "POST",
      body: JSON.stringify({ trainingMinutes, episodeBudget }),
    }),

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

  submit: (code: string, session: PlayerSession, qTable: QTable, episodes: number) =>
    call<SubmitResult>(`/rooms/${code}/submit`, {
      method: "POST",
      body: JSON.stringify({ ...session, qTable, episodes }),
    }),

  replay: (code: string, playerId: string) => call<Replay>(`/rooms/${code}/replay/${playerId}`),
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
  getUsedEpisodes: (code: string) => read<number>(`rr-class-used-${code}`) ?? 0,
  setUsedEpisodes: (code: string, n: number) => write(`rr-class-used-${code}`, n),
};
