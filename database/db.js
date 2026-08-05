const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Use the project database even if the bot is started from another folder.
const databasePath = process.env.DATABASE_PATH || path.join(
    __dirname,
    "database.sqlite"
);

// Railway volumes are mounted as directories and may not exist until the
// first deploy. Create the parent directory before SQLite opens the file.
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);

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

// A Discord account may only count once for each invite link. This prevents
// leave-and-rejoin farming from inflating a member's invite total.
db.prepare(`
CREATE TABLE IF NOT EXISTS invite_join_members (
    inviteCode TEXT NOT NULL,
    memberId TEXT NOT NULL,
    PRIMARY KEY (inviteCode, memberId)
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS invite_challenges (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    channelId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    target INTEGER NOT NULL,
    reward TEXT NOT NULL,
    winnerId TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS wallet_verification_sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    nonce TEXT NOT NULL,
    expiresAt INTEGER NOT NULL
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS verified_wallets (
    userId TEXT PRIMARY KEY,
    walletAddress TEXT NOT NULL UNIQUE,
    verifiedAt INTEGER NOT NULL
)
`).run();

module.exports = db;
