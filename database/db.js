const Database = require("better-sqlite3");
const path = require("path");

// Use the project database even if the bot is started from another folder.
const db = new Database(
    process.env.DATABASE_PATH || path.join(__dirname, "database.sqlite")
);

// ==========================
// Users
// ==========================

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    inviteCode TEXT,
    invites INTEGER DEFAULT 0
)
`).run();

// ==========================
// Invite Codes
// ==========================

db.prepare(`
CREATE TABLE IF NOT EXISTS invites (
    code TEXT PRIMARY KEY,
    ownerId TEXT,
    uses INTEGER DEFAULT 0
)
`).run();

// ==========================
// Giveaways
// ==========================

db.prepare(`
CREATE TABLE IF NOT EXISTS giveaways (
    messageId TEXT PRIMARY KEY,
    channelId TEXT NOT NULL,
    guildId TEXT NOT NULL,
    prize TEXT NOT NULL,
    winners INTEGER NOT NULL,
    endTime INTEGER NOT NULL,
    ended INTEGER DEFAULT 0,
    testMode INTEGER DEFAULT 0,
    reminderSent INTEGER DEFAULT 0
)
`).run();

// Safe migrations for databases created by earlier versions.
for (const column of [
    "testMode INTEGER DEFAULT 0",
    "reminderSent INTEGER DEFAULT 0"
]) {
    try {
        db.prepare(`ALTER TABLE giveaways ADD COLUMN ${column}`).run();
    } catch (error) {
        if (!String(error.message).includes("duplicate column")) throw error;
    }
}

// ==========================
// Giveaway Entries
// ==========================

db.prepare(`
CREATE TABLE IF NOT EXISTS giveaway_entries (
    messageId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (messageId, userId)
)
`).run();

module.exports = db;
