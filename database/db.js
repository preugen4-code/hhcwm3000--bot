const Database = require("better-sqlite3");

const db = new Database("database/database.sqlite");

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    inviteCode TEXT,
    invites INTEGER DEFAULT 0
)
`).run();

module.exports = db;
