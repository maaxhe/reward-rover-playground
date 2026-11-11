import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { sendFeedbackMail } from "../lib/mailer.js";
import { createRateLimiter } from "../lib/rateLimit.js";

const router = Router();
const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const file = path.join(dataDir, "feedback.jsonl");

const MAX_LENGTH = 600;
const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

// Anonymous classroom feedback: no names, just the text, the level and a timestamp.
router.post("/feedback", (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, MAX_LENGTH) : "";
  if (!text) return res.status(400).json({ error: "text is required" });

  if (!limiter.take(req.ip)) return res.status(429).json({ error: "too many messages" });
  const now = Date.now();

  const level = Number.isInteger(req.body?.level) ? req.body.level : null;
  fs.mkdirSync(dataDir, { recursive: true });
  const entry = { at: new Date(now).toISOString(), level, text };
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`);
  sendFeedbackMail(entry).catch((err) => console.error("feedback mail failed:", err.message));
  return res.status(201).json({ ok: true });
});

router.get("/admin/feedback", authenticate, isAdmin, (_req, res) => {
  if (!fs.existsSync(file)) return res.json({ items: [] });
  const items = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .reverse();
  return res.json({ items });
});

export default router;
