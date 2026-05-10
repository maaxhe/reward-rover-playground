import { Router } from "express";
import { statements } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const RATE_LIMIT_MS = 30 * 1000;
const submissionThrottle = new Map();

const DAILY_GRID_SIZE = 8;
const MAX_ACTIONS = 10000;

const hashDateToSeed = (dateKey) => {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let value = t;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const buildDailyConfig = (seed) => {
  const rng = mulberry32(seed);
  const size = DAILY_GRID_SIZE;
  const total = size * size;
  const tiles = [];
  const used = new Set();

  const key = (x, y) => `${x},${y}`;
  const randomInt = (max) => Math.floor(rng() * max);

  const pickPosition = () => {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const x = randomInt(size);
      const y = randomInt(size);
      const posKey = key(x, y);
      if (!used.has(posKey)) {
        used.add(posKey);
        return { x, y };
      }
    }
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const posKey = key(x, y);
        if (!used.has(posKey)) {
          used.add(posKey);
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  };

  const placeTiles = (count, type) => {
    for (let i = 0; i < count; i += 1) {
      const pos = pickPosition();
      tiles.push({ ...pos, type });
    }
  };

  const agent = pickPosition();
  const goal = pickPosition();

  let remaining = total - 2;
  const obstacleCount = Math.min(Math.max(8, Math.floor(total * 0.18)), remaining);
  remaining -= obstacleCount;
  const rewardCount = Math.min(Math.max(5, Math.floor(total * 0.1)), remaining);
  remaining -= rewardCount;
  const punishmentCount = Math.min(Math.max(4, Math.floor(total * 0.07)), remaining);
  remaining -= punishmentCount;
  const portalCount = Math.min(2, remaining);

  placeTiles(obstacleCount, "obstacle");
  placeTiles(rewardCount, "reward");
  placeTiles(punishmentCount, "punishment");
  placeTiles(portalCount, "portal");

  return { size, tiles, agent, goal };
};

router.get("/daily/current", (req, res) => {
  const dateKey = new Date().toISOString().slice(0, 10);
  let challenge = statements.getDailyByDate.get(dateKey);
  if (!challenge) {
    const seed = hashDateToSeed(dateKey);
    const config = buildDailyConfig(seed);
    const info = statements.createDaily.run({
      date_key: dateKey,
      seed,
      config_json: JSON.stringify(config),
    });
    challenge = statements.getDailyById.get(info.lastInsertRowid);
  }

  return res.json({
    id: challenge.id,
    date: challenge.date_key,
    seed: challenge.seed,
    config: JSON.parse(challenge.config_json),
  });
});

router.post("/daily/submit", authenticate, (req, res) => {
  const { challengeId, score, steps, replayData } = req.body || {};
  if (!challengeId || score === undefined || steps === undefined || !replayData) {
    return res.status(400).json({ error: "challengeId, score, steps, and replayData are required" });
  }

  const numericChallengeId = Number(challengeId);
  if (!Number.isInteger(numericChallengeId) || numericChallengeId <= 0) {
    return res.status(400).json({ error: "challengeId must be a positive integer" });
  }

  const numericScore = Number(score);
  const numericSteps = Number(steps);
  if (!Number.isFinite(numericScore) || !Number.isInteger(numericSteps) || numericSteps <= 0) {
    return res.status(400).json({ error: "score must be a number and steps must be a positive integer" });
  }

  if (!Array.isArray(replayData.actions) || replayData.actions.length === 0) {
    return res.status(400).json({ error: "replayData.actions must be a non-empty array" });
  }

  if (!replayData.actions.every((action) => typeof action === "string")) {
    return res.status(400).json({ error: "replayData.actions must contain only strings" });
  }

  if (replayData.actions.length > MAX_ACTIONS) {
    return res.status(400).json({ error: "replayData.actions is too large" });
  }

  if (!Number.isFinite(replayData.initial_seed)) {
    return res.status(400).json({ error: "replayData.initial_seed is required" });
  }

  const now = Date.now();
  const lastSubmission = submissionThrottle.get(req.user.id);
  if (lastSubmission && now - lastSubmission < RATE_LIMIT_MS) {
    return res.status(429).json({ error: "Please wait before submitting again" });
  }
  submissionThrottle.set(req.user.id, now);

  const challenge = statements.getDailyById.get(numericChallengeId);
  if (!challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  const existing = statements.getDailySubmissionByUser.get(req.user.id, challenge.id);
  const replay_json = JSON.stringify({
    actions: replayData.actions,
    initial_seed: replayData.initial_seed,
  });

  if (!existing) {
    statements.createDailySubmission.run({
      user_id: req.user.id,
      challenge_id: challenge.id,
      score: numericScore,
      steps: numericSteps,
      replay_json,
    });
    return res.status(201).json({ ok: true, accepted: true });
  }

  const isBetter =
    numericScore > existing.score ||
    (numericScore === existing.score && numericSteps < existing.steps);

  if (!isBetter) {
    return res.json({ ok: true, accepted: false });
  }

  statements.updateDailySubmission.run({
    id: existing.id,
    score: numericScore,
    steps: numericSteps,
    replay_json,
  });

  return res.json({ ok: true, accepted: true });
});

router.get("/leaderboard/daily", (req, res) => {
  const dateKey = new Date().toISOString().slice(0, 10);
  const challenge = statements.getDailyByDate.get(dateKey);
  if (!challenge) {
    return res.json({ items: [] });
  }

  const rows = statements.listDailyLeaderboard.all(challenge.id);
  const items = rows.map((row) => ({
    userId: row.user_id,
    username: row.username,
    score: row.score,
    steps: row.steps,
    replayData: JSON.parse(row.replay_json),
  }));

  return res.json({ items });
});

export default router;
