import { db } from "../db.js";

// Persistence for classroom rooms. Rooms still live in memory (fast polling); every change is
// written through to SQLite in small batches so a server restart or deploy does not end a running class.
// Only nickname-level data is stored (no accounts, no personal data), same as before.

db.exec(`
  CREATE TABLE IF NOT EXISTS ClassRooms (
    code TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const upsert = db.prepare(
  "INSERT INTO ClassRooms (code, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
);
const remove = db.prepare("DELETE FROM ClassRooms WHERE code = ?");
const selectAll = db.prepare("SELECT data FROM ClassRooms");

const serialize = (room) =>
  JSON.stringify({
    ...room,
    players: [...room.players.values()],
    vote: { open: room.vote.open, votes: Object.fromEntries(room.vote.votes) },
  });

const revive = (raw) => {
  const room = JSON.parse(raw);
  room.players = new Map((room.players || []).map((p) => [p.id, p]));
  room.vote = { open: Boolean(room.vote?.open), votes: new Map(Object.entries(room.vote?.votes || {})) };
  room.levelId = room.levelId ?? null;
  return room;
};

const dirty = new Set();

/** Marks a room as changed; it is written on the next flush (every 2 s) or immediately with `now`. */
export const markDirty = (room, now = false) => {
  dirty.add(room);
  if (now) flush();
};

export const flush = () => {
  for (const room of dirty) {
    try {
      upsert.run(room.code, serialize(room), Date.now());
    } catch (e) {
      console.error("[rooms] could not persist room", room.code, e.message);
    }
  }
  dirty.clear();
};

export const forget = (code) => {
  for (const room of dirty) if (room.code === code) dirty.delete(room);
  try {
    remove.run(code);
  } catch (e) {
    console.error("[rooms] could not delete room", code, e.message);
  }
};

/** Loads all stored rooms (called once at startup). Broken rows are skipped. */
export const loadAll = () => {
  const rooms = [];
  for (const row of selectAll.all()) {
    try {
      rooms.push(revive(row.data));
    } catch {
      /* skip unreadable row */
    }
  }
  return rooms;
};

setInterval(flush, 2000).unref();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    flush();
    process.exit(0);
  });
}
process.on("beforeExit", flush);
