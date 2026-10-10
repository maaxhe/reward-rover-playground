import { Router } from "express";
import crypto from "crypto";
import {
  buildWorld,
  evaluateGreedy,
  isValidQTable,
  compareResults,
  normalizeWorldSettings,
  DEFAULT_WORLD_SETTINGS,
} from "../lib/competition.js";

// Classroom competition rooms. Deliberately in-memory and anonymous (nickname only):
// rooms vanish after 24 h or on server restart, and no personal data is stored.

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
  const prev = base ?? { trainingMinutes: 5, episodeBudget: 60, ...DEFAULT_WORLD_SETTINGS };
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
  if (room.phase === "training" && now >= room.trainingEndsAt + SUBMIT_GRACE_MS) {
    room.phase = "finished";
  }
  return room.phase;
};

const loadRoom = (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room || Date.now() - room.createdAt > ROOM_TTL_MS) {
    rooms.delete(req.params.code);
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

const leaderboardOf = (room) => {
  const rows = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    episodes: p.episodes,
    submitted: p.best !== null,
    totalReward: p.best?.totalReward ?? null,
    steps: p.best?.steps ?? null,
    reachedGoal: p.best?.reachedGoal ?? false,
    at: p.best?.at ?? 0,
  }));
  rows.sort((a, b) => {
    if (!a.submitted || !b.submitted) return Number(b.submitted) - Number(a.submitted);
    return compareResults(b, a) || a.at - b.at;
  });
  return rows.map((row, i) => ({ ...row, rank: row.submitted ? i + 1 : null }));
};

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
    phase: "lobby",
    trainingEndsAt: 0,
    players: new Map(),
  };
  rooms.set(code, room);
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
  };
  room.players.set(player.id, player);
  return res.status(201).json({ playerId: player.id, token: player.token });
});

router.get("/rooms/:code", (req, res) => {
  const room = loadRoom(req, res);
  if (!room) return;
  const leaderboard = leaderboardOf(room);
  const me = req.query.playerId ? findPlayer(room, req.query.playerId, req.query.token) : null;
  return res.json({
    code: room.code,
    phase: room.phase,
    serverNow: Date.now(),
    trainingEndsAt: room.trainingEndsAt,
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
  return res.json({ ok: true, trainingEndsAt: room.trainingEndsAt });
});

router.post("/rooms/:code/finish", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase === "training") {
    room.trainingEndsAt = Date.now() - SUBMIT_GRACE_MS;
    room.phase = "finished";
  }
  return res.json({ ok: true });
});

/** Lobby only: change time, budget and the world recipe; `reroll` (or an explicit `seed`) builds a new world. */
router.patch("/rooms/:code/settings", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase !== "lobby") return res.status(409).json({ error: "Settings can only change in the lobby" });

  const settings = normalizeSettings(req.body, room.settings);
  const requestedSeed = Number(req.body?.seed);
  const seed = Number.isInteger(requestedSeed) && requestedSeed > 0 && requestedSeed < 2 ** 31
    ? requestedSeed
    : req.body?.reroll
      ? newSeed()
      : room.seed;
  try {
    room.world = buildWorld(seed, worldSettingsOf(settings));
  } catch {
    return res.status(400).json({ error: "These world settings cannot be built, try fewer walls" });
  }
  room.settings = settings;
  room.seed = seed;
  return res.json({ ok: true });
});

/** After a finished round: same room and players, results cleared, back to the lobby (optionally a new world). */
router.post("/rooms/:code/restart", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  if (room.phase !== "finished") return res.status(409).json({ error: "Round is still running" });

  if (req.body?.newWorld) {
    room.seed = newSeed();
    try {
      room.world = buildWorld(room.seed, worldSettingsOf(room.settings));
    } catch {
      return res.status(400).json({ error: "Could not build a new world" });
    }
  }
  for (const player of room.players.values()) {
    player.best = null;
    player.episodes = 0;
    player.lastSubmitAt = 0;
  }
  room.round += 1;
  room.phase = "lobby";
  room.trainingEndsAt = 0;
  return res.json({ ok: true, round: room.round });
});

router.delete("/rooms/:code/players/:playerId", (req, res) => {
  const room = loadRoom(req, res);
  if (!room || !requireHost(req, res, room)) return;
  room.players.delete(req.params.playerId);
  return res.json({ ok: true });
});

router.post("/rooms/:code/submit", (req, res) => {
  const room = loadRoom(req, res);
  if (!room) return;
  const { playerId, token, qTable, episodes } = req.body || {};
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
  if (improved) player.best = { ...result, at: now };

  return res.json({
    totalReward: result.totalReward,
    steps: result.steps,
    reachedGoal: result.reachedGoal,
    improved,
    bestReward: player.best.totalReward,
  });
});

router.get("/rooms/:code/replay/:playerId", (req, res) => {
  const room = loadRoom(req, res);
  if (!room) return;
  if (room.phase !== "finished") return res.status(409).json({ error: "Replays unlock after the competition" });
  const player = room.players.get(req.params.playerId);
  if (!player?.best) return res.status(404).json({ error: "No result" });
  return res.json({ name: player.name, ...player.best });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) rooms.delete(code);
  }
  for (const [ip, times] of failedAttempts) {
    if (times.every((t) => now - t > 10 * 60 * 1000)) failedAttempts.delete(ip);
  }
  for (const [ip, times] of roomCreations) {
    if (times.every((t) => now - t > 60 * 60 * 1000)) roomCreations.delete(ip);
  }
}, 10 * 60 * 1000).unref();

export default router;
