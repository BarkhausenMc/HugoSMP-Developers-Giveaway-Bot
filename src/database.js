const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'giveaways.db'));

// Tabelle erstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS giveaways (
    id TEXT PRIMARY KEY,
    message_id BIGINT UNIQUE,
    channel_id BIGINT,
    guild_id BIGINT,
    prize TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    hugosmp_amount INTEGER DEFAULT 0,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    winner_count INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_by BIGINT,
    participants TEXT DEFAULT '[]',
    winners TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_end_time ON giveaways(end_time);
  CREATE INDEX IF NOT EXISTS idx_status ON giveaways(status);
  CREATE INDEX IF NOT EXISTS idx_guild ON giveaways(guild_id);
`);

// Helper-Funktionen
const stmts = {
    insert: db.prepare(`
        INSERT INTO giveaways (
            id, message_id, channel_id, guild_id, prize, title, description,
            hugosmp_amount, start_time, end_time, winner_count, created_by, participants, winners
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    
    getById: db.prepare('SELECT * FROM giveaways WHERE id = ?'),
    
    getByMessageId: db.prepare('SELECT * FROM giveaways WHERE message_id = ?'),
    
    getActiveByGuild: db.prepare(`SELECT * FROM giveaways WHERE guild_id = ? AND status = 'active' ORDER BY end_time ASC`),
    
    getAllActive: db.prepare(`SELECT * FROM giveaways WHERE status = 'active' ORDER BY end_time ASC`),
    
    getAllCompleted: db.prepare(`SELECT * FROM giveaways WHERE status = 'completed' ORDER BY end_time DESC LIMIT 20`),
    
    updateMessageId: db.prepare('UPDATE giveaways SET message_id = ? WHERE id = ?'),
    
    updateStatus: db.prepare('UPDATE giveaways SET status = ? WHERE id = ?'),
    
    updateParticipants: db.prepare('UPDATE giveaways SET participants = ? WHERE id = ?'),
    
    updateWinners: db.prepare('UPDATE giveaways SET winners = ?, status = ? WHERE id = ?'),
    
    delete: db.prepare('DELETE FROM giveaways WHERE id = ?')
};

module.exports = { db, stmts };