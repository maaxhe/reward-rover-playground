import { Router } from "express";
import crypto from "crypto";
import {
  buildWorld,
  evaluateGreedy,
  isValidQTable,
  compareResults,
  normalizeWorldSettings,
  buildCustomWorld,
  DEFAULT_WORLD_SETTINGS,
} from "../lib/competition.js";
import { markDirty, forget, loadAll } from "../lib/roomStore.js";

// Classroom competition rooms. Anonymous (nickname only), no personal data. Rooms live in memory and are
// written through to SQLite (lib/roomStore.js), so a restart or deploy does not end a running class.
// They still expire 24 h after creation.

const router = Router();

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ROOMS = 200;
const MAX_PLAYERS = 80;
const ROOMS_PER_IP_PER_HOUR = 10;
const SUBMIT_MIN_INTERVAL_MS = 2000;
/** Submissions are still accepted this long after the timer ran out (slow tabs, network lag). */
const SUBMIT_GRACE_MS = 8000;

/** @type {Map<string, any>} */
const rooms = new Map();
const roomCreations = new Map();
for (const room of loadAll()) rooms.set(room.code, room);

/** Fixed choices for the lobby vote (the teacher has to open the vote first). */
const VOTE_MINUTES = [3, 5, 8, 12];
const VOTE_BUDGET = [30, 60, 100, 200];
/** Rank points per round for the overall standings: 1st = 10, 2nd = 8, …; finishing at all = 1. */
const RANK_POINTS = [10, 8, 6, 5, 4, 3, 2];
const MAX_PARAM_SEGMENTS = 600;

const randomToken = () => crypto.randomBytes(16).toString("hex");

const newRoomCode = () => {
  for (let i = 0; i < 100; i += 1) {
    const code = String(crypto.randomInt(0, 10000)).padStart(4, "0");
    if (!rooms.has(code)) return code;
  }
  return null;
};

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

const newSeed = () => crypto.randomInt(1, 2 ** 31);

/** Round settings = training time + budget + the world recipe. */
const normalizeSettings = (input = {}, base = null) => {
  const prev = base ?? { trainingMinutes: 5, episodeBudget: 30, ...DEFAULT_WORLD_SETTINGS };
  return {
    trainingMinutes: clampInt(input.trainingMinutes, 1, 30, prev.trainingMinutes),
    episodeBudget: clampInt(input.episodeBudget, 10, 500, prev.episodeBudget),
    ...normalizeWorldSettings(input, prev),
  };
};

const worldSettingsOf = (settings) => ({
  size: settings.size,
  obstacles: settings.obstacles,
  rewards: settings.rewards,
  punishments: settings.punishments,
  minDistance: settings.minDistance,
});

/** Phase is derived lazily so a room finishes even if nobody calls /finish. */
const currentPhase = (room, now = Date.now()) => {
  if (room.phase === "training" && !room.pausedAt && now >= room.trainingEndsAt + SUBMIT_GRACE_MS) {
    room.phase = "finished";
    markDirty(room, true);
  }
  return room.phase;
};

const loadRoom = (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room || Date.now() - room.createdAt > ROOM_TTL_MS) {
    rooms.delete(req.params.code);
    forget(req.params.code);
    res.status(404).json({ error: "Room not found" });
    return null;
  }
  currentPhase(room);
  return room;
};

const requireHost = (req, res, room) => {
  const given = String(req.headers["x-host-key"] || "");
  const ok =
    given.length === room.hostKey.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(room.hostKey));
  if (!ok) res.status(403).json({ error: "Host key required" });
  return ok;
};

const findPlayer = (room, id, token) => {
  const player = room.players.get(String(id));
  if (!player || player.token !== String(token)) return null;
  return player;
};

/** Keeps a client-sent parameter log if it is well-formed: [[fromEpisode, ε, α, γ], …]; otherwise null. */
const sanitizeParamLog = (log) => {
  if (!Array.isArray(log) || log.length === 0 || log.length > MAX_PARAM_SEGMENTS) return null;
  const out = [];
  let lastFrom = -1;
  for (const entry of log) {
    if (!Array.isArray(entry) || entry.length !== 4) return null;
    const [from, e, a, g] = entry.map(Number);
    if (![from, e, a, g].every(Number.isFinite) || from < lastFrom || from > 100000) return null;
    if ([e, a, g].some((v) => v < 0 || v > 1)) return null;
    out.push([Math.round(from), Math.round(e * 100) / 100, Math.round(a * 100) / 100, Math.round(g * 100) / 100]);
    lastFrom = from;
  }
  return out;
};

/** First and last value per parameter plus how often they were changed. */
const summarizeParams = (log) => {
  if (!log) return null;
  const first = log[0];
  const last = log[log.length - 1];
  return {
    epsilon: [first[1], last[1]],
    alpha: [first[2], last[2]],
    gamma: [first[3], last[3]],
    changes: log.length - 1,
  };
};

const rankPoints = (rank) => (rank ? (RANK_POINTS[rank - 1] ?? 1) : 0);

const leaderboardOf = (room) => {
  const finished = room.phase === "finished";
  const rows = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    episodes: p.episodes,
    submitted: p.best !== null,
    totalReward: p.best?.totalReward ?? null,
    steps: p.best?.steps ?? null,
    reachedGoal: p.best?.reachedGoal ?? false,
    at: p.best?.at ?? 0,
    // Parameters stay hidden until the round is over so nobody just copies the leader's settings.
    params: finished ? summarizeParams(p.best?.params ?? null) : null,
  }));
  rows.sort((a, b) => {
    if (!a.submitted || !b.submitted) return Number(b.submitted) - Number(a.submitted);
    return compareResults(b, a) || a.at - b.at;
  });
  return rows.map((row, i) => ({ ...row, rank: row.submitted ? i + 1 : null }));
};

/** Overall standings over all rounds (points from past rounds + the current one once it is finished). */
const totalsOf = (room, leaderboard) => {
  if (room.round <= 1) return null;
  const finished = room.phase === "finished";
  const rows = [...room.players.values()].map((p) => {
    const current = finished ? rankPoints(leaderboard.find((r) => r.id === p.id)?.rank ?? null) : null;
    const rounds = [...(p.roundPoints || []), ...(current === null ? [] : [current])];
    return { id: p.id, name: p.name, total: rounds.reduce((sum, n) => sum + n, 0), rounds };
  });
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  let lastTotal = null;
  let lastRank = 0;
  return rows.map((row, i) => {
    if (row.total !== lastTotal) {
      lastRank = i + 1;
      lastTotal = row.total;
    }
    return { ...row, rank: lastRank };
  });
};

const voteOf = (room, me) => {
  const tally = { minutes: {}, budget: {} };
  for (const n of VOTE_MINUTES) tally.minutes[n] = 0;
  for (const n of VOTE_BUDGET) tally.budget[n] = 0;
  for (const v of room.vote.votes.values()) {
    if (v.minutes in tally.minutes) tally.minutes[v.minutes] += 1;
    if (v.budget in tally.budget) tally.budget[v.budget] += 1;
  }
  return {
    open: room.vote.open && room.phase === "lobby",
    minutesOptions: VOTE_MINUTES,
    budgetOptions: VOTE_BUDGET,
    tally,
    voters: room.vote.votes.size,
    mine: me ? (room.vote.votes.get(me.id) ?? null) : null,
  };
};

/** Winner of one vote category: most votes; ties go to the current setting, otherwise the smaller option. */
const pluralityWinner = (counts, current) => {
  const entries = Object.entries(counts).map(([value, n]) => [Number(value), n]);
  const top = Math.max(0, ...entries.map(([, n]) => n));
  if (top === 0) return null;
  const leaders = entries.filter(([, n]) => n === top).map(([value]) => value);
  return leaders.includes(current) ? current : Math.min(...leaders);
};

const persist = (room, now = false) => markDirty(room, now);

/** Creating a room needs the teacher password from ROOM_CREATE_PASSWORD (.env). Unset = creation disabled. */
const passwordMatches = (given) => {
  const expected = process.env.ROOM_CREATE_PASSWORD;
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(String(given ?? "")).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};
const failedAttempts = new Map();
const MAX_FAILED_PER_10_MIN = 8;

router.post("/rooms", (req, res) => {
  const now = Date.now();
  const ip = req.ip || "unknown";
  if (!process.env.ROOM_CREATE_PASSWORD) {
    return res.status(503).json({ error: "Room creation is not configured" });
  }
  const fails = (failedAttempts.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (fails.length >= MAX_FAILED_PER_10_MIN) {
    return res.status(429).json({ error: "Too many wrong passwords, try again in a few minutes" });
  }
  if (!passwordMatches(req.body?.password)) {
    fails.push(now);
    failedAttempts.set(ip, fails);
    return res.status(401).json({ error: "Wrong password" });
  }
  const recent = (roomCreations.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= ROOMS_PER_IP_PER_HOUR) {
    return res.status(429).json({ error: "Too many rooms created, try again later" });
  }
  if (rooms.size >= MAX_ROOMS) {
    return res.status(503).json({ error: "Server is full, try again later" });
  }
  const code = newRoomCode();
  if (!code) return res.status(503).json({ error: "No free room code" });

  const settings = normalizeSettings(req.body);
  const seed = newSeed();
  let world;
  try {
    world = buildWorld(seed, worldSettingsOf(settings));
  } catch {
    return res.status(400).json({ error: "These world settings cannot be built, try fewer walls" });
  }
  const room = {
    code,
    hostKey: randomToken(),
    createdAt: now,
    seed,
    round: 1,
    settings,
    world,
    levelId: null,
    phase: "lobby",
    trainingEndsAt: 0,
    players: new Map(),
    vote: { open: false, votes: new Map() },
  };
  rooms.set(code, room);
  persist(room, true);
  recent.push(now);
  roomCreations.set(ip, recent);
  return res.status(201).json({ code, hostKey: room.hostKey });
});

router.post("/rooms/:code/join", (req, res) => {
  const room = loadRoom(req, res);
  if (!room) return;
  if (room.phase === "finished") return res.status(409).json({ error: "Competition is over" });
  if (room.players.size >= MAX_PLAYERS) return res.status(409).json({ error: "Room is full" });

  const name = String(req.body?.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 20) {
    return res.status(400).json({ error: "Name must be 2–20 characters" });
  }
  const taken = [...room.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase());
  if (taken) return res.status(409).json({ error: "Name already taken" });

  const player = {
    id: crypto.randomBytes(4).toString("hex"),
    token: randomToken(),
    name,
    joinedAt: Date.now(),
    episodes: 0,
    lastSubmitAt: 0,
    best: null,
    roundPoints: Array(room.round - 1).fill(0),
  };
  room.players.set(player.id, player);
  persist(room);
  return res.status(201).json({ playerId: player.id, token: player.token });
});

router.get("/rooms/:code", (req, res) => {
  const room = loadRoom(req, res);
  if (!room) return;
  const leaderboard = leaderboardOf(room);
  const me = req.query.playerId ? findPlayer(room, req.query.playerId, req.query.token) : null;
  return res.json({
    levelId: room.levelId,
    totals: totalsOf(room, leaderboard),
    vote: voteOf(room, me),
    code: room.code,
    phase: room.phase,
    serverNow: Date.now(),
    trainingEndsAt: room.trainingEndsAt,
    pausedAt: room.pausedAt || null,
    trainingMs: room.settings.trainingMinutes * 60 * 1000,
    episodeBudget: room.settings.episodeBudget,
    settings: room.settings,
    round: room.round,
    seed: room.seed,
    world: room.world,
    playerCount: room.players.size,
    leaderboard,
    me: me ? { id: me.id, name: me.name, rank: leaderboard.find((r) => r.id === me.id)?.rank ?? null } : null,
  });
});

router.post("/rooms/:code/start", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase !== "lobby") return res.status(409).json({ error: "Already started" });
  room.phase = "training";
  room.trainingEndsAt = Date.now() + room.settings.trainingMinutes * 60 * 1000;
  room.vote.open = false;
  persist(room, true);
  return res.json({ ok: true, trainingEndsAt: room.trainingEndsAt });
});

/** Freeze or resume the training clock. While paused nobody can submit, and the pause does not eat training time. */
router.post("/rooms/:code/pause", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase !== "training") return res.status(409).json({ error: "Not in training" });
  const paused = Boolean(req.body?.paused);
  const now = Date.now();
  if (paused && !room.pausedAt) {
    room.pausedAt = now;
  } else if (!paused && room.pausedAt) {
    room.trainingEndsAt += now - room.pausedAt;
    room.pausedAt = null;
  }
  persist(room, true);
  return res.json({ ok: true, pausedAt: room.pausedAt || null, trainingEndsAt: room.trainingEndsAt });
});

router.post("/rooms/:code/finish", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase === "training") {
    room.pausedAt = null;
    room.trainingEndsAt = Date.now() - SUBMIT_GRACE_MS;
    room.phase = "finished";
    persist(room, true);
  }
  return res.json({ ok: true });
});

/**
 * Lobby only: change time, budget and the world. Without `customWorld` the world is the random recipe
 * (`reroll` or `seed` builds a new one). With `customWorld` (e.g. a level world picked by the teacher) that exact
 * world is used; a later request without `reroll`/`seed`/`levelId: null` keeps it and only updates time and budget.
 */
router.patch("/rooms/:code/settings", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase !== "lobby") return res.status(409).json({ error: "Settings can only change in the lobby" });

  if (req.body?.customWorld) {
    const world = buildCustomWorld(req.body.customWorld);
    if (!world) return res.status(400).json({ error: "This world is not valid" });
    const levelId = clampInt(req.body.levelId, 1, 10, 0) || null;
    const count = (type) => world.tiles.filter((t) => t.type === type).length;
    room.settings = {
      ...normalizeSettings({ trainingMinutes: req.body.trainingMinutes, episodeBudget: req.body.episodeBudget }, room.settings),
      size: world.size,
      obstacles: count("obstacle"),
      rewards: count("reward"),
      punishments: count("punishment"),
    };
    room.world = world;
    room.levelId = levelId;
    room.seed = newSeed();
    persist(room, true);
    return res.json({ ok: true });
  }

  const backToRandom = req.body?.reroll || req.body?.levelId === null || (req.body?.seed != null && Number.isInteger(Number(req.body.seed)));
  if (room.levelId && !backToRandom) {
    // A level world stays as it is; only time and budget can change.
    room.settings = {
      ...room.settings,
      trainingMinutes: clampInt(req.body?.trainingMinutes, 1, 30, room.settings.trainingMinutes),
      episodeBudget: clampInt(req.body?.episodeBudget, 10, 500, room.settings.episodeBudget),
    };
    persist(room, true);
    return res.json({ ok: true });
  }

  const settings = normalizeSettings(req.body, room.settings);
  const requestedSeed = Number(req.body?.seed);
  const seed = Number.isInteger(requestedSeed) && requestedSeed > 0 && requestedSeed < 2 ** 31
    ? requestedSeed
    : req.body?.reroll || room.levelId
      ? newSeed()
      : room.seed;
  try {
    room.world = buildWorld(seed, worldSettingsOf(settings));
  } catch {
    return res.status(400).json({ error: "These world settings cannot be built, try fewer walls" });
  }
  room.settings = settings;
  room.seed = seed;
  room.levelId = null;
  persist(room, true);
  return res.json({ ok: true });
});

/** After a finished round: same room and players, results cleared, back to the lobby (optionally a new world). */
router.post("/rooms/:code/restart", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase !== "finished") return res.status(409).json({ error: "Round is still running" });

  if (req.body?.newWorld && !room.levelId) {
    room.seed = newSeed();
    try {
      room.world = buildWorld(room.seed, worldSettingsOf(room.settings));
    } catch {
      return res.status(400).json({ error: "Could not build a new world" });
    }
  }
  // Bank this round's rank points for the overall standings before the results are cleared.
  const finalBoard = leaderboardOf(room);
  for (const player of room.players.values()) {
    const rank = finalBoard.find((r) => r.id === player.id)?.rank ?? null;
    player.roundPoints = [...(player.roundPoints || []), rankPoints(rank)];
  }
  for (const player of room.players.values()) {
    player.best = null;
    player.episodes = 0;
    player.lastSubmitAt = 0;
  }
  room.round += 1;
  room.phase = "lobby";
  room.trainingEndsAt = 0;
  room.pausedAt = null;
  room.vote = { open: false, votes: new Map() };
  persist(room, true);
  return res.json({ ok: true, round: room.round });
});

router.delete("/rooms/:code/players/:playerId", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  room.players.delete(req.params.playerId);
  room.vote.votes.delete(req.params.playerId);
  persist(room);
  return res.json({ ok: true });
});

router.post("/rooms/:code/submit", (req, res) => {
  const room = loadRoom(req, res);
  if (!room) return;
  const { playerId, token, qTable, episodes, paramLog } = req.body || {};
  const player = findPlayer(room, playerId, token);
  if (!player) return res.status(403).json({ error: "Unknown player" });

  const now = Date.now();
  if (room.phase !== "training" || now > room.trainingEndsAt + SUBMIT_GRACE_MS) {
    return res.status(409).json({ error: "Training is not running" });
  }
  if (now - player.lastSubmitAt < SUBMIT_MIN_INTERVAL_MS) {
    return res.status(429).json({ error: "Too fast" });
  }
  if (!isValidQTable(qTable, room.world.size)) {
    return res.status(400).json({ error: "Invalid Q-table" });
  }
  player.lastSubmitAt = now;
  player.episodes = Math.max(player.episodes, clampInt(episodes, 0, room.settings.episodeBudget, 0));

  // The server runs the test itself, so a client cannot claim a score it did not earn.
  const result = evaluateGreedy(room.world, qTable);
  const improved = !player.best || compareResults(result, player.best) > 0;
  // The parameter log is a hint for the discussion afterwards, not part of the score (the server cannot verify it).
  if (improved) player.best = { ...result, at: now, params: sanitizeParamLog(paramLog) };
  persist(room);

  return res.json({
    totalReward: result.totalReward,
    steps: result.steps,
    reachedGoal: result.reachedGoal,
    improved,
    bestReward: player.best.totalReward,
  });
});

/** Replays unlock after the round; the teacher (host key) can watch them live, e.g. on the beamer view. */
router.get("/rooms/:code/replay/:playerId", (req, res) => {
  const room = loadRoom(req, res);
  if (!room) return;
  if (room.phase !== "finished") {
    const given = String(req.headers["x-host-key"] || "");
    const isHost = given.length === room.hostKey.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(room.hostKey));
    if (!isHost) return res.status(409).json({ error: "Replays unlock after the competition" });
  }
  const player = room.players.get(req.params.playerId);
  if (!player?.best) return res.status(404).json({ error: "No result" });
  const { params, ...result } = player.best;
  return res.json({ name: player.name, ...result, paramLog: room.phase === "finished" ? params ?? null : null });
});

// ── Lobby vote (time and budget) ───────────────────────────────────────────

router.post("/rooms/:code/vote/open", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase !== "lobby") return res.status(409).json({ error: "Voting is only possible in the lobby" });
  room.vote.open = Boolean(req.body?.open);
  if (req.body?.reset) room.vote.votes = new Map();
  persist(room, true);
  return res.json({ ok: true });
});

router.post("/rooms/:code/vote", (req, res) => {
  const room = loadRoom(req, res);
  if (!room) return;
  const player = findPlayer(room, req.body?.playerId, req.body?.token);
  if (!player) return res.status(403).json({ error: "Unknown player" });
  if (room.phase !== "lobby" || !room.vote.open) return res.status(409).json({ error: "Voting is closed" });

  const next = { ...(room.vote.votes.get(player.id) || {}) };
  if (req.body?.minutes !== undefined) {
    if (!VOTE_MINUTES.includes(Number(req.body.minutes))) return res.status(400).json({ error: "Invalid option" });
    next.minutes = Number(req.body.minutes);
  }
  if (req.body?.budget !== undefined) {
    if (!VOTE_BUDGET.includes(Number(req.body.budget))) return res.status(400).json({ error: "Invalid option" });
    next.budget = Number(req.body.budget);
  }
  room.vote.votes.set(player.id, next);
  persist(room);
  return res.json({ ok: true });
});

/** Teacher adopts the winners of the vote as the new settings and closes the vote. */
router.post("/rooms/:code/vote/apply", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase !== "lobby") return res.status(409).json({ error: "Voting is only possible in the lobby" });
  const { tally } = voteOf(room, null);
  const minutes = pluralityWinner(tally.minutes, room.settings.trainingMinutes);
  const budget = pluralityWinner(tally.budget, room.settings.episodeBudget);
  room.settings = {
    ...room.settings,
    trainingMinutes: minutes ?? room.settings.trainingMinutes,
    episodeBudget: budget ?? room.settings.episodeBudget,
  };
  room.vote.open = false;
  persist(room, true);
  return res.json({ ok: true, trainingMinutes: room.settings.trainingMinutes, episodeBudget: room.settings.episodeBudget });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(code);
      forget(code);
    }
  }
  for (const [ip, times] of failedAttempts) {
    if (times.every((t) => now - t > 10 * 60 * 1000)) failedAttempts.delete(ip);
  }
  for (const [ip, times] of roomCreations) {
    if (times.every((t) => now - t > 60 * 60 * 1000)) roomCreations.delete(ip);
  }
}, 10 * 60 * 1000).unref();

export default router;
