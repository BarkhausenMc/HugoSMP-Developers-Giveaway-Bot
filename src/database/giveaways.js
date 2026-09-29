const db = require("./database");

/**
 * Erstellt ein neues Giveaway.
 */
function createGiveaway({
    guildId,
    channelId,
    prize,
    winnerCount,
    endAt,
    createdBy
}) {
    const statement = db.prepare(`
        INSERT INTO giveaways (
            guild_id,
            channel_id,
            prize,
            winner_count,
            end_at,
            created_by,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(
        guildId,
        channelId,
        prize,
        winnerCount,
        endAt,
        createdBy,
        Date.now()
    );

    return getGiveaway(Number(result.lastInsertRowid));
}

/**
 * Gibt ein Giveaway anhand seiner ID zurück.
 */
function getGiveaway(id) {
    return db.prepare(`
        SELECT *
        FROM giveaways
        WHERE id = ?
    `).get(id);
}

/**
 * Speichert die Discord Message-ID.
 */
function setMessageId(giveawayId, messageId) {
    db.prepare(`
        UPDATE giveaways
        SET message_id = ?
        WHERE id = ?
    `).run(messageId, giveawayId);
}

/**
 * Gibt alle aktiven Giveaways zurück,
 * deren Ende noch nicht erreicht wurde bzw. die verarbeitet werden müssen.
 */
function getActiveGiveaways() {
    return db.prepare(`
        SELECT *
        FROM giveaways
        WHERE ended = 0
        ORDER BY end_at ASC
    `).all();
}

/**
 * Fügt einen Teilnehmer hinzu.
 *
 * INSERT OR IGNORE verhindert doppelte Teilnahme.
 */
function addParticipant(giveawayId, userId) {
    const result = db.prepare(`
        INSERT OR IGNORE INTO participants (
            giveaway_id,
            user_id
        )
        VALUES (?, ?)
    `).run(giveawayId, userId);

    return result.changes > 0;
}

/**
 * Gibt die Anzahl der Teilnehmer zurück.
 */
function getParticipantCount(giveawayId) {
    const result = db.prepare(`
        SELECT COUNT(*) AS count
        FROM participants
        WHERE giveaway_id = ?
    `).get(giveawayId);

    return result.count;
}

/**
 * Gibt alle Teilnehmer zurück.
 */
function getParticipants(giveawayId) {
    return db.prepare(`
        SELECT user_id
        FROM participants
        WHERE giveaway_id = ?
    `).all(giveawayId);
}

/**
 * Markiert ein Giveaway als beendet.
 */
function finishGiveaway(giveawayId) {
    db.prepare(`
        UPDATE giveaways
        SET ended = 1
        WHERE id = ?
    `).run(giveawayId);
}

/**
 * Prüft, ob ein Giveaway bereits beendet ist.
 */
function isEnded(giveawayId) {
    const giveaway = getGiveaway(giveawayId);

    if (!giveaway) {
        return true;
    }

    return giveaway.ended === 1;
}

/**
 * Speichert einen Gewinner.
 */
function addWinner(giveawayId, userId) {
    db.prepare(`
        INSERT OR REPLACE INTO winners (
            giveaway_id,
            user_id,
            rerolled,
            won_at
        )
        VALUES (?, ?, 0, ?)
    `).run(
        giveawayId,
        userId,
        Date.now()
    );
}


/**
 * Gibt die aktuellen Gewinner zurück.
 */
function getWinners(giveawayId) {
    return db.prepare(`
        SELECT *
        FROM winners
        WHERE giveaway_id = ?
        AND rerolled = 0
    `).all(giveawayId);
}


/**
 * Gibt alle bisherigen Gewinner zurück,
 * inklusive gererollter Gewinner.
 */
function getAllWinners(giveawayId) {
    return db.prepare(`
        SELECT *
        FROM winners
        WHERE giveaway_id = ?
        ORDER BY won_at ASC
    `).all(giveawayId);
}


/**
 * Markiert einen Gewinner als gererolled.
 */
function markWinnerAsRerolled(
    giveawayId,
    userId
) {
    db.prepare(`
        UPDATE winners
        SET rerolled = 1
        WHERE giveaway_id = ?
        AND user_id = ?
        AND rerolled = 0
    `).run(
        giveawayId,
        userId
    );
}


/**
 * Prüft, ob ein User aktueller Gewinner ist.
 */
function isCurrentWinner(
    giveawayId,
    userId
) {
    const winner = db.prepare(`
        SELECT *
        FROM winners
        WHERE giveaway_id = ?
        AND user_id = ?
        AND rerolled = 0
    `).get(
        giveawayId,
        userId
    );

    return !!winner;
}

module.exports = {
    createGiveaway,
    getGiveaway,
    setMessageId,
    getActiveGiveaways,
    addParticipant,
    getParticipantCount,
    getParticipants,
    finishGiveaway,
    isEnded,

    addWinner,
    getWinners,
    getAllWinners,
    markWinnerAsRerolled,
    isCurrentWinner
};

