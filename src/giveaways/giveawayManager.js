const {
    MessageFlags
} = require("discord.js");

const {
    DateTime
} = require("luxon");

const giveaways = require("../database/giveaways");

const {
    buildGiveawayContainer
} = require("./giveawayMessage");

const TIMEZONE = process.env.TIMEZONE || "Europe/Berlin";

/**
 * Erstellt ein Giveaway aus den Modal-Daten.
 */
async function createGiveawayFromModal(interaction) {
    const prize = interaction.fields
        .getTextInputValue("prize")
        .trim();

    const winnerCountString = interaction.fields
        .getTextInputValue("winner_count")
        .trim();

    const endAtString = interaction.fields
        .getTextInputValue("end_at")
        .trim();

    const winnerCount = Number(winnerCountString);

    if (
        !Number.isInteger(winnerCount) ||
        winnerCount < 1 ||
        winnerCount > 99
    ) {
        throw new Error(
            "Die Anzahl der Gewinner muss eine ganze Zahl zwischen 1 und 99 sein."
        );
    }

    const endDate = DateTime.fromFormat(
        endAtString,
        "dd.MM.yyyy HH:mm",
        {
            zone: TIMEZONE
        }
    );

    if (!endDate.isValid) {
        throw new Error(
            `Ungültiges Datum.\n\nVerwende dieses Format:\n\`01.10.2026 18:30\``
        );
    }

    if (endDate.toMillis() <= Date.now()) {
        throw new Error(
            "Das Ende des Giveaways muss in der Zukunft liegen."
        );
    }

    const giveaway = giveaways.createGiveaway({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        prize,
        winnerCount,
        endAt: endDate.toMillis(),
        createdBy: interaction.user.id
    });

    const container = buildGiveawayContainer(
        giveaway,
        0,
        false
    );

    const message = await interaction.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });

    giveaways.setMessageId(
        giveaway.id,
        message.id
    );

    return giveaways.getGiveaway(giveaway.id);
}

/**
 * User nimmt an einem Giveaway teil.
 */
async function joinGiveaway(interaction, giveawayId) {
    const giveaway = giveaways.getGiveaway(giveawayId);

    if (!giveaway) {
        await interaction.reply({
            content: "❌ Dieses Giveaway existiert nicht mehr.",
            flags: MessageFlags.Ephemeral
        });

        return;
    }

    if (giveaway.ended === 1) {
        await interaction.reply({
            content: "❌ Dieses Giveaway ist bereits beendet.",
            flags: MessageFlags.Ephemeral
        });

        return;
    }

    if (Date.now() >= giveaway.end_at) {
        await interaction.reply({
            content: "❌ Dieses Giveaway ist bereits abgelaufen.",
            flags: MessageFlags.Ephemeral
        });

        return;
    }

    const added = giveaways.addParticipant(
        giveaway.id,
        interaction.user.id
    );

    if (!added) {
        await interaction.reply({
            content: "ℹ️ Du nimmst bereits an diesem Giveaway teil.",
            flags: MessageFlags.Ephemeral
        });

        return;
    }

    const participantCount =
        giveaways.getParticipantCount(giveaway.id);

    await updateGiveawayMessage(
        interaction.client,
        giveaway.id
    );

    await interaction.reply({
        content: `🎉 Du nimmst jetzt am Giveaway **#${giveaway.id}** teil!`,
        flags: MessageFlags.Ephemeral
    });
}

/**
 * Aktualisiert die Discord-Nachricht.
 */
async function updateGiveawayMessage(client, giveawayId, disabled = false) {
    const giveaway = giveaways.getGiveaway(giveawayId);

    if (!giveaway) {
        return;
    }

    if (!giveaway.message_id) {
        return;
    }

    const participantCount =
        giveaways.getParticipantCount(giveaway.id);

    try {
        const channel = await client.channels.fetch(
            giveaway.channel_id
        );

        if (!channel || !channel.isTextBased()) {
            return;
        }

        const message = await channel.messages.fetch(
            giveaway.message_id
        );

        const container = buildGiveawayContainer(
            giveaway,
            participantCount,
            disabled
        );

        await message.edit({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    } catch (error) {
        console.error(
            `Fehler beim Aktualisieren von Giveaway #${giveaway.id}:`,
            error
        );
    }
}

/**
 * Beendet ein Giveaway.
 */
async function endGiveaway(client, giveaway) {
    // Noch einmal prüfen, damit kein Giveaway
    // versehentlich doppelt verarbeitet wird.
    const currentGiveaway =
        giveaways.getGiveaway(giveaway.id);

    if (!currentGiveaway || currentGiveaway.ended === 1) {
        return;
    }

    if (Date.now() < currentGiveaway.end_at) {
        return;
    }

    const participants =
        giveaways.getParticipants(currentGiveaway.id);

    const participantIds =
        participants.map(participant => participant.user_id);

    let winners = [];

    if (participantIds.length > 0) {
        winners = pickRandomWinners(
            participantIds,
            currentGiveaway.winner_count
        );
    }

    // Erst als beendet markieren.
    giveaways.finishGiveaway(currentGiveaway.id);

    // Giveaway-Nachricht deaktivieren.
    await updateGiveawayMessage(
        client,
        currentGiveaway.id,
        true
    );

    await announceWinners(
        client,
        currentGiveaway,
        winners,
        participantIds.length
    );
}

/**
 * Zufällige Gewinner auswählen.
 */
function pickRandomWinners(participantIds, winnerCount) {
    const shuffled = [...participantIds];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex =
            Math.floor(Math.random() * (i + 1));

        [
            shuffled[i],
            shuffled[randomIndex]
        ] = [
            shuffled[randomIndex],
            shuffled[i]
        ];
    }

    return shuffled.slice(
        0,
        Math.min(winnerCount, shuffled.length)
    );
}

/**
 * Gewinner bekanntgeben.
 */
async function announceWinners(
    client,
    giveaway,
    winners,
    participantCount
) {
    try {
        const channel = await client.channels.fetch(
            giveaway.channel_id
        );

        if (!channel || !channel.isTextBased()) {
            return;
        }

        if (winners.length === 0) {
            await channel.send({
                content:
                    `😕 Das Giveaway **#${giveaway.id}** ist beendet, ` +
                    `aber es gab keine Teilnehmer.`
            });

            return;
        }

        const winnerMentions = winners
            .map(userId => `<@${userId}>`)
            .join(", ");

        await channel.send({
            content:
                `🎉 **Giveaway #${giveaway.id} ist beendet!**\n\n` +
                `🎁 Gewinn: **${giveaway.prize}**\n` +
                `👥 Teilnehmer: **${participantCount}**\n` +
                `🏆 Gewinner: ${winnerMentions}`
        });
    } catch (error) {
        console.error(
            `Fehler beim Bekanntgeben der Gewinner von Giveaway #${giveaway.id}:`,
            error
        );
    }
}

/**
 * Prüft alle aktiven Giveaways.
 */
async function checkGiveaways(client) {
    const activeGiveaways =
        giveaways.getActiveGiveaways();

    for (const giveaway of activeGiveaways) {
        if (Date.now() >= giveaway.end_at) {
            await endGiveaway(client, giveaway);
        }
    }
}

async function rerollWinner(
    giveawayId
) {
    const giveaway =
        giveaways.getGiveaway(giveawayId);

    if (!giveaway) {
        throw new Error(
            `Giveaway #${giveawayId} wurde nicht gefunden.`
        );
    }

    if (giveaway.ended !== 1) {
        throw new Error(
            `Giveaway #${giveawayId} ist noch nicht beendet.`
        );
    }

    /*
     * Aktuelle Gewinner holen
     */
    const currentWinners =
        giveaways.getWinners(giveawayId);

    if (currentWinners.length === 0) {
        throw new Error(
            `Giveaway #${giveawayId} hat keinen aktuellen Gewinner.`
        );
    }

    /*
     * Alle Teilnehmer holen
     */
    const participants =
        giveaways.getParticipants(
            giveawayId
        );

    const participantIds =
        participants.map(
            participant => participant.user_id
        );

    /*
     * Alle bisherigen Gewinner werden
     * von der neuen Auswahl ausgeschlossen.
     *
     * Dadurch kann ein alter Gewinner
     * nicht erneut gewinnen.
     */
    const allWinners =
        giveaways.getAllWinners(
            giveawayId
        );

    const excludedIds = new Set(
        allWinners.map(
            winner => winner.user_id
        )
    );

    /*
     * Nur Teilnehmer, die noch nie
     * Gewinner waren, dürfen gewinnen.
     */
    const possibleNewWinners =
        participantIds.filter(
            userId => !excludedIds.has(userId)
        );

    if (possibleNewWinners.length === 0) {
        throw new Error(
            "Es gibt keinen Teilnehmer mehr, der noch nicht Gewinner war."
        );
    }

    /*
     * Wir ersetzen jeden aktuellen Gewinner.
     *
     * Bei winner_count = 1 gibt es hier
     * natürlich genau einen Gewinner.
     */
    const rerolledWinners = [];

    for (const oldWinner of currentWinners) {
        /*
         * Noch verfügbare Kandidaten.
         */
        const available =
            possibleNewWinners.filter(
                userId =>
                    !rerolledWinners.includes(userId)
            );

        if (available.length === 0) {
            break;
        }

        const newWinner =
            available[
                Math.floor(
                    Math.random() *
                    available.length
                )
            ];

        /*
         * Alten Gewinner markieren
         */
        giveaways.markWinnerAsRerolled(
            giveawayId,
            oldWinner.user_id
        );

        /*
         * Neuen Gewinner speichern
         */
        giveaways.addWinner(
            giveawayId,
            newWinner
        );

        rerolledWinners.push(
            newWinner
        );
    }

    return {
        giveaway,
        oldWinners: currentWinners.map(
            winner => winner.user_id
        ),
        newWinners: rerolledWinners
    };
}



module.exports = {
    createGiveawayFromModal,
    joinGiveaway,
    checkGiveaways,
    endGiveaway,
    rerollWinner
};


