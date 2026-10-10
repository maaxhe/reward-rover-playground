import { Router } from "express";
import crypto from "crypto";
import { buildWorld, evaluateGreedy, isValidQTable, compareResults, WORLD_SIZE } from "../lib/competition.js";

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

router.post("/rooms", (req, res) => {
  const now = Date.now();
  const ip = req.ip || "unknown";
  const recent = (roomCreations.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= ROOMS_PER_IP_PER_HOUR) {
    return res.status(429).json({ error: "Too many rooms created, try again later" });
  }
  if (rooms.size >= MAX_ROOMS) {
    return res.status(503).json({ error: "Server is full, try again later" });
  }
  const code = newRoomCode();
  if (!code) return res.status(503).json({ error: "No free room code" });

  const seed = crypto.randomInt(1, 2 ** 31);
  const room = {
    code,
    hostKey: randomToken(),
    createdAt: now,
    seed,
    world: buildWorld(seed),
    trainingMs: clampInt(req.body?.trainingMinutes, 1, 30, 5) * 60 * 1000,
    episodeBudget: clampInt(req.body?.episodeBudget, 10, 500, 60),
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
    trainingMs: room.trainingMs,
    episodeBudget: room.episodeBudget,
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
  room.trainingEndsAt = Date.now() + room.trainingMs;
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
  if (!isValidQTable(qTable, WORLD_SIZE)) {
    return res.status(400).json({ error: "Invalid Q-table" });
  }
  player.lastSubmitAt = now;
  player.episodes = Math.max(player.episodes, clampInt(episodes, 0, room.episodeBudget, 0));

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
  for (const [ip, times] of roomCreations) {
    if (times.every((t) => now - t > 60 * 60 * 1000)) roomCreations.delete(ip);
  }
}, 10 * 60 * 1000).unref();

export default router;
