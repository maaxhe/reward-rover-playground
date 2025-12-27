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
    role TEXT NOT NULL DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS SavedStates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    grid_config TEXT NOT NULL,
    progress_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS GlobalConfig (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_savedstates_user_id ON SavedStates(user_id);
`);

db.exec("UPDATE Users SET role = 'admin' WHERE username = 'max';");

const statements = {
  getUserByUsername: db.prepare("SELECT id, username, password_hash, role FROM Users WHERE username = ?"),
  createUser: db.prepare(
    "INSERT INTO Users (username, password_hash, role) VALUES (@username, @password_hash, @role)",
  ),
  promoteUserToAdmin: db.prepare("UPDATE Users SET role = 'admin' WHERE username = ?"),
  createSavedState: db.prepare(
    "INSERT INTO SavedStates (user_id, grid_config, progress_data) VALUES (@user_id, @grid_config, @progress_data)",
  ),
  listSavedStatesByUser: db.prepare(
    "SELECT id, grid_config, progress_data, created_at FROM SavedStates WHERE user_id = ? ORDER BY id DESC",
  ),
  getGlobalConfig: db.prepare("SELECT key, value, updated_at FROM GlobalConfig WHERE key = ?"),
  upsertGlobalConfig: db.prepare(
    `INSERT INTO GlobalConfig (key, value, updated_at)
     VALUES (@key, @value, CURRENT_TIMESTAMP)
     ON CONFLICT(key)
     DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
  ),
};

export { db, statements };
