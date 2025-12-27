import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { statements } from "./db.js";
import { authenticate, getJwtSecret } from "./middleware/auth.js";
import { isAdmin } from "./middleware/isAdmin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = "/api";
const GLOBAL_ENV_KEY = "global_env";
const JWT_SECRET = getJwtSecret();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));

const createToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
};

app.post(`${API_PREFIX}/auth/register`, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const existing = statements.getUserByUsername.get(username);
  if (existing) {
    return res.status(409).json({ error: "User already exists" });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const role = username === "max" ? "admin" : "user";
  const info = statements.createUser.run({ username, password_hash, role });
  const user = { id: info.lastInsertRowid, username, role };
  const token = createToken(user);
  return res.status(201).json({ token, user });
});

app.post(`${API_PREFIX}/auth/login`, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = statements.getUserByUsername.get(username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.username === "max" && user.role !== "admin") {
    statements.promoteUserToAdmin.run("max");
    user.role = "admin";
  }

  const token = createToken(user);
  return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.post(`${API_PREFIX}/save`, authenticate, (req, res) => {
  const { gridConfig, progressData } = req.body || {};
  if (!gridConfig) {
    return res.status(400).json({ error: "gridConfig is required" });
  }

  const grid_config = JSON.stringify(gridConfig);
  const progress_data = progressData ? JSON.stringify(progressData) : null;
  const info = statements.createSavedState.run({
    user_id: req.user.id,
    grid_config,
    progress_data,
  });
  return res.status(201).json({ id: info.lastInsertRowid });
});

app.get(`${API_PREFIX}/load`, authenticate, (req, res) => {
  const rows = statements.listSavedStatesByUser.all(req.user.id);
  const payload = rows.map((row) => ({
    id: row.id,
    gridConfig: JSON.parse(row.grid_config),
    progressData: row.progress_data ? JSON.parse(row.progress_data) : null,
    createdAt: row.created_at,
  }));
  return res.json({ items: payload });
});

app.get(`${API_PREFIX}/global-env`, (req, res) => {
  const row = statements.getGlobalConfig.get(GLOBAL_ENV_KEY);
  if (!row) {
    return res.json({ config: null });
  }
  return res.json({ config: JSON.parse(row.value), updatedAt: row.updated_at });
});

app.post(`${API_PREFIX}/admin/global-env`, authenticate, isAdmin, (req, res) => {
  const { config } = req.body || {};
  if (!config) {
    return res.status(400).json({ error: "config is required" });
  }
  statements.upsertGlobalConfig.run({ key: GLOBAL_ENV_KEY, value: JSON.stringify(config) });
  return res.status(200).json({ ok: true });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Reward Rover API listening on :${PORT}`);
});
