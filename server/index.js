import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { statements } from "./db.js";
import { authenticate, getJwtSecret } from "./middleware/auth.js";
import { isAdmin } from "./middleware/isAdmin.js";
import dailyRoutes from "./routes/daily.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = "/api";
const GLOBAL_ENV_KEY = "global_env";
const JWT_SECRET = getJwtSecret();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));

const createToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
};

const resolveOAuthUser = ({ provider, providerId, email }) => {
  const existing = statements.getUserByProvider.get(provider, providerId);
  if (existing) return existing;

  if (email) {
    const byEmail = statements.getUserByEmail.get(email);
    if (byEmail) return byEmail;
  }

  const username = email || `${provider}_${providerId.slice(0, 8)}`;
  const password_hash = crypto.randomBytes(32).toString("hex");
  const info = statements.createOAuthUser.run({
    username,
    password_hash,
    role: "user",
    provider,
    provider_id: providerId,
    email: email ?? null,
  });
  return {
    id: info.lastInsertRowid,
    username,
    role: "user",
    provider,
    provider_id: providerId,
    email: email ?? null,
  };
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
  const info = statements.createUser.run({
    username,
    password_hash,
    role,
    provider: "local",
    provider_id: null,
    email: null,
  });
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

app.post(`${API_PREFIX}/auth/oauth/google`, async (req, res) => {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: "Google auth not configured" });
  }
  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: "idToken is required" });
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    const user = resolveOAuthUser({
      provider: "google",
      providerId: payload.sub,
      email: payload.email,
    });
    const token = createToken(user);
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    return res.status(401).json({ error: "Invalid Google token" });
  }
});

app.post(`${API_PREFIX}/auth/oauth/apple`, async (req, res) => {
  if (!APPLE_CLIENT_ID) {
    return res.status(500).json({ error: "Apple auth not configured" });
  }
  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: "idToken is required" });
  }
  try {
    const payload = await appleSignin.verifyIdToken(idToken, {
      audience: APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });
    if (!payload?.sub) {
      return res.status(401).json({ error: "Invalid Apple token" });
    }
    const user = resolveOAuthUser({
      provider: "apple",
      providerId: payload.sub,
      email: payload.email,
    });
    const token = createToken(user);
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    return res.status(401).json({ error: "Invalid Apple token" });
  }
});

app.post(`${API_PREFIX}/save`, authenticate, (req, res) => {
  const { name, gridConfig, progressData } = req.body || {};
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!gridConfig) {
    return res.status(400).json({ error: "gridConfig is required" });
  }

  const grid_config = JSON.stringify(gridConfig);
  const progress_data = progressData ? JSON.stringify(progressData) : null;
  const info = statements.createSavedState.run({
    user_id: req.user.id,
    name: trimmedName,
    grid_config,
    progress_data,
  });
  return res.status(201).json({ id: info.lastInsertRowid });
});

app.put(`${API_PREFIX}/save/:id`, authenticate, (req, res) => {
  const { id } = req.params;
  const { name, gridConfig, progressData } = req.body || {};
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!gridConfig) {
    return res.status(400).json({ error: "gridConfig is required" });
  }

  const grid_config = JSON.stringify(gridConfig);
  const progress_data = progressData ? JSON.stringify(progressData) : null;
  const info = statements.updateSavedState.run({
    id: parseInt(id, 10),
    user_id: req.user.id,
    name: trimmedName,
    grid_config,
    progress_data,
  });

  if (info.changes === 0) {
    return res.status(404).json({ error: "SavedState not found or not owned by user" });
  }
  return res.status(200).json({ ok: true });
});

app.delete(`${API_PREFIX}/save/:id`, authenticate, (req, res) => {
  const { id } = req.params;
  const info = statements.deleteSavedState.run(parseInt(id, 10), req.user.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "SavedState not found or not owned by user" });
  }
  return res.status(200).json({ ok: true });
});

app.get(`${API_PREFIX}/load`, authenticate, (req, res) => {
  const rows = statements.listSavedStatesByUser.all(req.user.id);
  const payload = rows.map((row) => ({
    id: row.id,
    name: row.name,
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

app.get(`${API_PREFIX}/admin/users`, authenticate, isAdmin, (req, res) => {
  const users = statements.getAllUsers.all();
  return res.json({ users });
});

app.get(`${API_PREFIX}/admin/environments`, authenticate, isAdmin, (req, res) => {
  const rows = statements.getAllSavedStates.all();
  const environments = rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    gridConfig: JSON.parse(row.grid_config),
    progressData: row.progress_data ? JSON.parse(row.progress_data) : null,
    createdAt: row.created_at,
  }));
  return res.json({ environments });
});

app.delete(`${API_PREFIX}/admin/environments/:id`, authenticate, isAdmin, (req, res) => {
  const { id } = req.params;
  const info = statements.deleteSavedStateAdmin.run(parseInt(id, 10));
  if (info.changes === 0) {
    return res.status(404).json({ error: "Environment not found" });
  }
  return res.status(200).json({ ok: true });
});

app.get(`${API_PREFIX}/templates`, (req, res) => {
  const rows = statements.listGlobalTemplates.all();
  const templates = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    gridConfig: JSON.parse(row.grid_config),
    createdAt: row.created_at,
  }));
  return res.json({ templates });
});

app.post(`${API_PREFIX}/admin/templates`, authenticate, isAdmin, (req, res) => {
  const { name, description, gridConfig, isGlobal } = req.body || {};
  if (!name || !gridConfig) {
    return res.status(400).json({ error: "name and gridConfig are required" });
  }

  const grid_config = JSON.stringify(gridConfig);
  const info = statements.createTemplate.run({
    name,
    description: description || null,
    grid_config,
    is_global: isGlobal ? 1 : 0,
    created_by: req.user.id,
  });
  return res.status(201).json({ id: info.lastInsertRowid });
});

app.put(`${API_PREFIX}/admin/templates/:id`, authenticate, isAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, gridConfig, isGlobal } = req.body || {};
  if (!name || !gridConfig) {
    return res.status(400).json({ error: "name and gridConfig are required" });
  }

  const grid_config = JSON.stringify(gridConfig);
  const info = statements.updateTemplate.run({
    id: parseInt(id, 10),
    name,
    description: description || null,
    grid_config,
    is_global: isGlobal ? 1 : 0,
  });

  if (info.changes === 0) {
    return res.status(404).json({ error: "Template not found" });
  }
  return res.status(200).json({ ok: true });
});

app.delete(`${API_PREFIX}/admin/templates/:id`, authenticate, isAdmin, (req, res) => {
  const { id } = req.params;
  const info = statements.deleteTemplate.run(parseInt(id, 10));
  if (info.changes === 0) {
    return res.status(404).json({ error: "Template not found" });
  }
  return res.status(200).json({ ok: true });
});

app.use(API_PREFIX, dailyRoutes);

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
