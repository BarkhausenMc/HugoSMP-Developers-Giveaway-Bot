const Database = require("better-sqlite3");
const path = require("node:path");
const fs = require("node:fs");

const databaseDirectory = path.join(__dirname, "../../database");

if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
}

const databasePath = path.join(databaseDirectory, "database.sqlite");

const db = new Database(databasePath);

// SQLite-Einstellungen
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Tabellen erstellen
db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,

        prize TEXT NOT NULL,
        winner_count INTEGER NOT NULL,

        end_at INTEGER NOT NULL,

        ended INTEGER NOT NULL DEFAULT 0,

        created_by TEXT NOT NULL,

        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
        giveaway_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,

        PRIMARY KEY (giveaway_id, user_id),

        FOREIGN KEY (giveaway_id)
            REFERENCES giveaways(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_giveaways_active
        ON giveaways(ended, end_at);

    CREATE INDEX IF NOT EXISTS idx_participants_giveaway
        ON participants(giveaway_id);
`);

module.exports = db;
