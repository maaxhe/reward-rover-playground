import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const resolveDbPath = () => {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  return path.join(process.cwd(), "data", "reward-rover.db");
};

const dbPath = resolveDbPath();
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    provider TEXT NOT NULL DEFAULT 'local',
    provider_id TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS SavedStates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT,
    grid_config TEXT NOT NULL,
    progress_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS EnvironmentTemplates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    grid_config TEXT NOT NULL,
    is_global INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES Users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS GlobalConfig (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS DailyChallenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL UNIQUE,
    seed INTEGER NOT NULL,
    config_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS DailySubmissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    score REAL NOT NULL,
    steps INTEGER NOT NULL,
    replay_json TEXT NOT NULL,
    UNIQUE(user_id, challenge_id),
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY(challenge_id) REFERENCES DailyChallenges(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_savedstates_user_id ON SavedStates(user_id);
  CREATE INDEX IF NOT EXISTS idx_templates_global ON EnvironmentTemplates(is_global);
  CREATE INDEX IF NOT EXISTS idx_daily_submissions_challenge_score
    ON DailySubmissions (challenge_id, score DESC, steps ASC);
`);

const userColumns = db.prepare("PRAGMA table_info(Users)").all().map((col) => col.name);
if (!userColumns.includes("provider")) {
  db.exec("ALTER TABLE Users ADD COLUMN provider TEXT");
}
if (!userColumns.includes("provider_id")) {
  db.exec("ALTER TABLE Users ADD COLUMN provider_id TEXT");
}
if (!userColumns.includes("email")) {
  db.exec("ALTER TABLE Users ADD COLUMN email TEXT");
}
db.exec("UPDATE Users SET provider = 'local' WHERE provider IS NULL");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider ON Users(provider, provider_id) WHERE provider_id IS NOT NULL");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON Users(email) WHERE email IS NOT NULL");

db.exec("UPDATE Users SET role = 'admin' WHERE username = 'max';");

const savedStatesColumns = db.prepare("PRAGMA table_info(SavedStates)").all().map((col) => col.name);
if (!savedStatesColumns.includes("name")) {
  db.exec("ALTER TABLE SavedStates ADD COLUMN name TEXT");
}
db.exec("UPDATE SavedStates SET name = 'Umgebung' WHERE name IS NULL OR name = ''");

const statements = {
  getUserByUsername: db.prepare("SELECT id, username, password_hash, role, provider, provider_id, email FROM Users WHERE username = ?"),
  getUserByEmail: db.prepare("SELECT id, username, password_hash, role, provider, provider_id, email FROM Users WHERE email = ?"),
  getUserByProvider: db.prepare(
    "SELECT id, username, password_hash, role, provider, provider_id, email FROM Users WHERE provider = ? AND provider_id = ?",
  ),
  createUser: db.prepare(
    "INSERT INTO Users (username, password_hash, role, provider, provider_id, email) VALUES (@username, @password_hash, @role, @provider, @provider_id, @email)",
  ),
  createOAuthUser: db.prepare(
    "INSERT INTO Users (username, password_hash, role, provider, provider_id, email) VALUES (@username, @password_hash, @role, @provider, @provider_id, @email)",
  ),
  promoteUserToAdmin: db.prepare("UPDATE Users SET role = 'admin' WHERE username = ?"),
  getAllUsers: db.prepare("SELECT id, username, role, email, provider FROM Users ORDER BY id DESC"),
  createSavedState: db.prepare(
    "INSERT INTO SavedStates (user_id, name, grid_config, progress_data) VALUES (@user_id, @name, @grid_config, @progress_data)",
  ),
  updateSavedState: db.prepare(
    "UPDATE SavedStates SET name = @name, grid_config = @grid_config, progress_data = @progress_data WHERE id = @id AND user_id = @user_id",
  ),
  deleteSavedState: db.prepare("DELETE FROM SavedStates WHERE id = ? AND user_id = ?"),
  deleteSavedStateAdmin: db.prepare("DELETE FROM SavedStates WHERE id = ?"),
  listSavedStatesByUser: db.prepare(
    "SELECT id, name, grid_config, progress_data, created_at FROM SavedStates WHERE user_id = ? ORDER BY created_at DESC",
  ),
  getAllSavedStates: db.prepare(
    "SELECT s.id, s.name, s.grid_config, s.progress_data, s.created_at, u.username FROM SavedStates s JOIN Users u ON s.user_id = u.id ORDER BY s.created_at DESC",
  ),
  createTemplate: db.prepare(
    "INSERT INTO EnvironmentTemplates (name, description, grid_config, is_global, created_by) VALUES (@name, @description, @grid_config, @is_global, @created_by)",
  ),
  updateTemplate: db.prepare(
    "UPDATE EnvironmentTemplates SET name = @name, description = @description, grid_config = @grid_config, is_global = @is_global WHERE id = @id",
  ),
  deleteTemplate: db.prepare("DELETE FROM EnvironmentTemplates WHERE id = ?"),
  listTemplates: db.prepare(
    "SELECT id, name, description, grid_config, is_global, created_by, created_at FROM EnvironmentTemplates ORDER BY is_global DESC, created_at DESC",
  ),
  listGlobalTemplates: db.prepare(
    "SELECT id, name, description, grid_config, created_at FROM EnvironmentTemplates WHERE is_global = 1 ORDER BY created_at DESC",
  ),
  getGlobalConfig: db.prepare("SELECT key, value, updated_at FROM GlobalConfig WHERE key = ?"),
  upsertGlobalConfig: db.prepare(
    `INSERT INTO GlobalConfig (key, value, updated_at)
     VALUES (@key, @value, CURRENT_TIMESTAMP)
     ON CONFLICT(key)
     DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
  ),
  getDailyByDate: db.prepare("SELECT id, date_key, seed, config_json FROM DailyChallenges WHERE date_key = ?"),
  getDailyById: db.prepare("SELECT id, date_key, seed, config_json FROM DailyChallenges WHERE id = ?"),
  createDaily: db.prepare(
    "INSERT INTO DailyChallenges (date_key, seed, config_json) VALUES (@date_key, @seed, @config_json)",
  ),
  getDailySubmissionByUser: db.prepare(
    "SELECT id, score, steps FROM DailySubmissions WHERE user_id = ? AND challenge_id = ?",
  ),
  createDailySubmission: db.prepare(
    "INSERT INTO DailySubmissions (user_id, challenge_id, score, steps, replay_json) VALUES (@user_id, @challenge_id, @score, @steps, @replay_json)",
  ),
  updateDailySubmission: db.prepare(
    "UPDATE DailySubmissions SET score = @score, steps = @steps, replay_json = @replay_json WHERE id = @id",
  ),
  listDailyLeaderboard: db.prepare(
    `SELECT ds.user_id, ds.score, ds.steps, ds.replay_json, u.username
     FROM DailySubmissions ds
     JOIN Users u ON ds.user_id = u.id
     WHERE ds.challenge_id = ?
     ORDER BY ds.score DESC, ds.steps ASC
     LIMIT 50`,
  ),
};

export { db, statements };
